// Um <h1> único e descritivo por página, no HTML do servidor.
//
// O QA do lote 1b (21/11/2026) achou as páginas de jogo sem <h1> no HTML que
// o servidor entrega: os <h1> que existiam ficavam dentro dos componentes de
// jogo, que carregam com `dynamic(..., { ssr: false })`. Para quem revisa
// (AdSense) e para buscador, a página não tinha título principal; e, depois
// de o jogo montar no navegador, podia haver dois <h1> na mesma página.
//
// Agora o <h1> sai do GameInfo (componente de servidor), com texto em
// src/messages/{pt,en}.json (namespace gameHeadings), e os títulos internos
// dos jogos são <h2>.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { check, source, repoPath } from "./helpers.mjs";

const JOGOS = "src/app/[locale]/jogos";
const slugs = fs
  .readdirSync(repoPath(JOGOS))
  .filter((s) => fs.existsSync(repoPath(path.join(JOGOS, s, "page.js"))))
  .sort();

const semComentarios = (src) => src.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
const contaH1 = (src) => (semComentarios(src).match(/<h1\b/g) || []).length;

check("há páginas de jogo para conferir", () => {
  assert.ok(slugs.length >= 14, `só ${slugs.length} páginas de jogo encontradas`);
});

check("GameInfo renderiza exatamente um <h1> com o texto de gameHeadings", () => {
  const src = semComentarios(source("src/components/GameInfo.jsx"));
  assert.equal(contaH1(src), 1, "GameInfo precisa ter um <h1> e só um");
  assert.ok(/getTranslations\(\s*\{[^}]*namespace:\s*["']gameHeadings["']/.test(src), "o texto do <h1> vem do i18n (gameHeadings)");
  assert.ok(/<h1\b[^>]*>\s*\{t\(slug\)\}\s*<\/h1>/.test(src), "o <h1> mostra t(slug)");
  assert.ok(!/^\s*["']use client["']/m.test(src), "GameInfo precisa continuar componente de servidor");
});

check("o <h1> não é escondido por CSS (texto visível, nada de SEO oculto)", () => {
  const src = source("src/components/GameInfo.jsx");
  const m = src.match(/const h1Style = \{([\s\S]*?)\};/);
  assert.ok(m, "h1Style não encontrado");
  const css = m[1];
  for (const proibido of [/display:\s*["']none/, /visibility:\s*["']hidden/, /opacity:\s*0\b/, /fontSize:\s*0\b/, /clip/, /position:\s*["']absolute/, /left:\s*-/, /textIndent/, /(?<![a-zA-Z])(maxHeight|height):\s*["']?[01](px)?["']?\s*(,|$)/m]) {
    assert.ok(!proibido.test(css), `h1Style usa ${proibido}`);
  }
  const fs_ = css.match(/fontSize:\s*(\d+)/);
  assert.ok(fs_ && Number(fs_[1]) >= 12, "fonte do <h1> pequena demais para leitura");
});

check("toda página de jogo passa o próprio slug ao GameInfo", () => {
  const erradas = [];
  for (const slug of slugs) {
    const page = source(path.join(JOGOS, slug, "page.js"));
    const re = new RegExp(`<GameInfo\\s+slug="${slug.replace(/[-]/g, "\\-")}"\\s+content=\\{content\\}\\s+locale=\\{locale\\}\\s*/>`);
    if (!re.test(page)) erradas.push(slug);
  }
  assert.deepEqual(erradas, []);
});

check("gameHeadings tem texto em PT e EN para cada jogo", () => {
  const faltando = [];
  for (const loc of ["pt", "en"]) {
    const msgs = JSON.parse(source(`src/messages/${loc}.json`));
    const h = msgs.gameHeadings || {};
    for (const slug of slugs) {
      const v = h[slug];
      if (typeof v !== "string" || v.trim().length < 8) faltando.push(`${loc}:${slug}`);
      else if (/acerte a mosca\s*$|nailed the fly\s*$/i.test(v) && slug !== "acerteamosca") faltando.push(`${loc}:${slug} (marca no fim)`);
    }
  }
  assert.deepEqual(faltando, []);
});

check("os <h1> de PT e EN são diferentes (tradução de verdade)", () => {
  const pt = JSON.parse(source("src/messages/pt.json")).gameHeadings;
  const en = JSON.parse(source("src/messages/en.json")).gameHeadings;
  const iguais = slugs.filter((s) => pt[s] === en[s]);
  assert.deepEqual(iguais, []);
});

check("componentes de jogo não têm <h1> (o da página é o único)", () => {
  const dir = repoPath("src/components/games");
  const com = fs
    .readdirSync(dir)
    .filter((f) => /\.jsx?$/.test(f))
    .filter((f) => contaH1(fs.readFileSync(path.join(dir, f), "utf8")) > 0);
  assert.deepEqual(com, []);
});

check("páginas de jogo não têm <h1> próprio fora do GameInfo", () => {
  const com = [];
  for (const slug of slugs) {
    for (const f of fs.readdirSync(repoPath(path.join(JOGOS, slug)))) {
      if (!/\.jsx?$/.test(f)) continue;
      if (contaH1(source(path.join(JOGOS, slug, f))) > 0) com.push(`${slug}/${f}`);
    }
  }
  assert.deepEqual(com, []);
});

check("demais páginas têm exatamente um <h1>", () => {
  const paginas = {
    home: "src/app/[locale]/HomeClient.jsx",
    sobre: "src/app/[locale]/sobre/page.js",
    contato: "src/app/[locale]/contato/page.js",
    privacidade: "src/app/[locale]/politica-de-privacidade/page.js",
    termos: "src/app/[locale]/termos-de-uso/page.js",
  };
  const erradas = Object.entries(paginas)
    .map(([nome, rel]) => [nome, contaH1(source(rel))])
    .filter(([, n]) => n !== 1);
  assert.deepEqual(erradas, []);
});
