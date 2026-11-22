// Canonical, hreflang e os dois domínios.
//
// A auditoria AdSense de 21/11/2026 achou: canonical "/" no layout, herdado por
// toda página sem canonical próprio (as institucionais apontavam para a home);
// páginas em inglês canonicalizadas para as portuguesas; hreflang "en"
// apontando para o nailedthefly.com, que servia português. Para o Google, as
// institucionais não existiam e o inglês era duplicata.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { check, source, repoPath, loadModule } from "./helpers.mjs";

const seo = await loadModule("src/lib/seo.js");
const host = await loadModule("src/lib/host-routing.js");

const semComentarios = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Todo page.js público de src/app/[locale], com o caminho da rota. */
function paginas() {
  const base = repoPath("src/app/[locale]");
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name === "page.js") {
        const rel = path.relative(base, path.dirname(full)).split(path.sep).join("/");
        out.push({ file: path.relative(repoPath("."), full), route: rel ? `/${rel}` : "/" });
      }
    }
  };
  walk(base);
  return out;
}

check("each language lives on its own domain, without the /en prefix", () => {
  assert.equal(seo.localeUrl("pt", "/"), "https://acerteamosca.com.br");
  assert.equal(seo.localeUrl("en", "/"), "https://nailedthefly.com");
  assert.equal(seo.localeUrl("en", "/jogos/wordle"), "https://nailedthefly.com/jogos/wordle");
  assert.equal(seo.localeUrl("pt", "/sobre/"), "https://acerteamosca.com.br/sobre");
});

check("canonical is self-referencing and never crosses languages", () => {
  for (const p of seo.INDEXABLE_PATHS) {
    assert.equal(seo.pageAlternates("pt", p).canonical, seo.localeUrl("pt", p));
    const en = seo.pageAlternates("en", p).canonical;
    assert.equal(en, seo.localeUrl("en", p));
    assert.ok(en.startsWith("https://nailedthefly.com"), `canonical EN fora do domínio EN: ${en}`);
  }
});

check("hreflang is reciprocal, with x-default", () => {
  for (const p of seo.INDEXABLE_PATHS) {
    const pt = seo.pageAlternates("pt", p).languages;
    const en = seo.pageAlternates("en", p).languages;
    assert.deepEqual(pt, en, `o grupo hreflang de ${p} difere entre as versões`);
    assert.equal(pt["pt-BR"], seo.localeUrl("pt", p));
    assert.equal(pt.en, seo.localeUrl("en", p));
    assert.equal(pt["x-default"], seo.localeUrl("pt", p));
  }
});

check("the indexable list covers home, published games and institutional pages", () => {
  for (const p of ["/", "/sobre", "/contato", "/politica-de-privacidade", "/termos-de-uso", "/jogos/wordle"]) {
    assert.ok(seo.INDEXABLE_PATHS.includes(p), `${p} fora do sitemap`);
  }
  assert.ok(!seo.INDEXABLE_PATHS.includes("/jogos/kungfucastle"), "o Kung Fu Castle está em teste (noindex)");
});

check("the layout no longer hands its canonical to every page", () => {
  const layout = semComentarios(source("src/app/[locale]/layout.js"));
  assert.ok(!/canonical\s*:/.test(layout), "canonical no layout é herdado por toda página");
  assert.ok(!/alternates\s*:/.test(layout), "hreflang no layout é herdado por toda página");
});

check("every public page declares its own canonical, for its own route", () => {
  const lista = paginas();
  assert.ok(lista.length >= 19, `só ${lista.length} páginas encontradas`);
  for (const { file, route } of lista) {
    const src = semComentarios(source(file));
    const m = src.match(/alternates:\s*pageAlternates\(locale,\s*"([^"]+)"\)/);
    assert.ok(m, `${file} não declara alternates: pageAlternates(locale, ...)`);
    assert.equal(m[1], route, `${file} declara o canonical de outra rota`);
  }
});

check("no public URL carries the /en prefix on the English domain", () => {
  const offenders = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.(js|jsx|json)$/.test(e.name) && source(path.relative(repoPath("."), full)).includes("nailedthefly.com/en")) {
        offenders.push(full);
      }
    }
  };
  walk(repoPath("src"));
  assert.deepEqual(offenders, []);
});

check("the routing maps each domain to its language and does not sniff Accept-Language", () => {
  const routing = semComentarios(source("src/i18n/routing.js"));
  assert.match(routing, /domain:\s*"acerteamosca\.com\.br",\s*defaultLocale:\s*"pt"/);
  assert.match(routing, /domain:\s*"nailedthefly\.com",\s*defaultLocale:\s*"en"/);
  assert.match(routing, /localeDetection:\s*false/);
  assert.match(routing, /alternateLinks:\s*false/);
});

check("prefixed URLs on the production domains 301 to the clean URL in one hop", () => {
  const t = host.prefixRedirectTarget;
  assert.equal(t("nailedthefly.com", "/en"), "https://nailedthefly.com/");
  assert.equal(t("nailedthefly.com", "/en/jogos/pong", "?a=1"), "https://nailedthefly.com/jogos/pong?a=1");
  assert.equal(t("acerteamosca.com.br", "/en/sobre"), "https://nailedthefly.com/sobre");
  assert.equal(t("acerteamosca.com.br", "/pt/sobre"), "https://acerteamosca.com.br/sobre");
  assert.equal(t("nailedthefly.com", "/pt"), "https://acerteamosca.com.br/");
  // Não confundir com caminho que só começa com as mesmas letras.
  assert.equal(t("nailedthefly.com", "/entrar"), null);
  assert.equal(t("acerteamosca.com.br", "/jogos/pong"), null);
  // Fora de produção (prévia, localhost) /en continua servindo.
  assert.equal(t("127.0.0.1", "/en"), null);
  assert.equal(t("localhost", "/en/sobre"), null);
  // og:image gerado pelo Next carrega o segmento de idioma: serve direto.
  assert.equal(t("nailedthefly.com", "/en/opengraph-image"), null);
  assert.equal(t("acerteamosca.com.br", "/pt/jogos/wordle/opengraph-image"), null);
});

check("the host is read like next-intl reads it, without the port", () => {
  const h = (o) => ({ get: (k) => o[k] ?? null });
  assert.equal(host.requestHost(h({ host: "NailedTheFly.com:443" })), "nailedthefly.com");
  assert.equal(host.requestHost(h({ host: "x", "x-forwarded-host": "acerteamosca.com.br" })), "acerteamosca.com.br");
  assert.equal(host.requestHost(h({})), "");
});

check("www on a production domain 301s to the apex, keeping path and query", () => {
  const t = host.wwwRedirectTarget;
  assert.equal(t("www.acerteamosca.com.br", "/jogos/pong", "?x=1"), "https://acerteamosca.com.br/jogos/pong?x=1");
  assert.equal(t("www.nailedthefly.com", "/"), "https://nailedthefly.com/");
  assert.equal(t("acerteamosca.com.br", "/"), null);
  assert.equal(t("www.example.com", "/"), null);
});

check("the middleware normalizes the host before next-intl matches domains", () => {
  const mw = semComentarios(source("src/middleware.js"));
  assert.match(mw, /isProductionHost\(host\) && rawRequestHost\(request\.headers\) !== host/);
  assert.match(mw, /handleI18n\(new NextRequest\(request, \{ headers \}\)\)/);
});
