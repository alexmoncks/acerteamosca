// Anúncios: colocação, IDs de bloco e CSP.
//
// A auditoria AdSense de 21/11/2026 achou: blocos "*_between" na tela de fim
// de jogo, 12px abaixo do botão "Tentar de novo" (clique acidental, contra a
// política); data-ad-slot com nomes ("home_top"), que nunca veiculam; o bloco
// escondido com opacity 0 / max-height 0; o atributo não documentado
// data-overlays no script; e uma CSP que bloquearia parte dos criativos.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { check, source, repoPath, loadModule } from "./helpers.mjs";

const ads = await loadModule("src/lib/ads.js");
const semComentarios = (s) =>
  s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

function arquivos(dir, re = /\.(js|jsx)$/) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...arquivos(full, re));
    else if (re.test(e.name)) out.push(path.relative(repoPath("."), full));
  }
  return out;
}

check("only numeric ad unit IDs are accepted", () => {
  for (const ok of ["1234567890", " 9876543210 "]) assert.ok(ads.isValidAdSlot(ok), ok);
  for (const bad of ["home_top", "mosca_between", "", "12345", "123abc4567", undefined, null]) {
    assert.ok(!ads.isValidAdSlot(bad), String(bad));
  }
  assert.ok(ads.isValidAdClient("ca-pub-4148140889800778"));
  assert.ok(!ads.isValidAdClient("pub-4148140889800778"));
  assert.ok(!ads.isValidAdClient(""));
});

check("the publisher in code matches ads.txt", () => {
  const adsTxt = source("public/ads.txt");
  assert.ok(adsTxt.includes(ads.ADSENSE_PUBLISHER.replace(/^ca-/, "")), "ads.txt e código divergem");
});

check("no ad unit inside the games (end-of-game screens, canvas, touch controls)", () => {
  const dentro = arquivos(repoPath("src/components/games")).filter((f) => /AdBanner|adsbygoogle/.test(source(f)));
  assert.deepEqual(dentro, []);
});

check("every AdBanner uses a known placement, never a slot name", () => {
  const banner = source("src/components/AdBanner.jsx");
  const conhecidos = [...banner.matchAll(/^\s{2}(\w+): process\.env\.NEXT_PUBLIC_ADSENSE_SLOT_\w+,/gm)].map((m) => m[1]);
  assert.deepEqual(conhecidos.sort(), ["content_bottom", "game_footer", "home_bottom", "home_top"]);
  // o mapa de src/lib/ads.js e os slots do AdBanner são os mesmos placements
  assert.deepEqual(Object.keys(ads.AD_PLACEMENTS).sort(), conhecidos);
  for (const f of arquivos(repoPath("src"))) {
    const src = semComentarios(source(f));
    assert.ok(!/<AdBanner[^>]*\bslot=/.test(src), `${f} passa slot por nome`);
    for (const m of src.matchAll(/<AdBanner[^>]*placement="([^"]+)"/g)) {
      assert.ok(conhecidos.includes(m[1]), `${f}: placement desconhecido ${m[1]}`);
    }
  }
});

check("data-ad-slot is only ever filled from a validated numeric ID", () => {
  for (const f of arquivos(repoPath("src"))) {
    const src = semComentarios(source(f));
    const usos = [...src.matchAll(/data-ad-slot=\{?([^\s>}]+)/g)].map((m) => m[1]);
    if (!usos.length) continue;
    assert.equal(f, path.join("src", "components", "AdBanner.jsx"), `${f} monta data-ad-slot por conta própria`);
    assert.deepEqual(usos, ["slot"]);
    assert.match(src, /isValidAdSlot\(slot\)/);
  }
});

check("the ad block is never hidden by hand, and unfilled uses Google's CSS", () => {
  const banner = semComentarios(source("src/components/AdBanner.jsx"));
  assert.ok(!/opacity\s*:/.test(banner), "AdBanner mexe em opacity");
  assert.ok(!/maxHeight\s*:/.test(banner), "AdBanner colapsa a altura");
  assert.match(source("src/app/globals.css"), /ins\.adsbygoogle\[data-ad-status="unfilled"\]/);
});

check("the AdSense tag has no undocumented attributes", () => {
  for (const f of arquivos(repoPath("src"))) {
    assert.ok(!/data-overlays/.test(semComentarios(source(f))), `${f} usa data-overlays`);
  }
  const layout = semComentarios(source("src/app/[locale]/layout.js"));
  // desde o AJ2 a tag não está no HTML: o script consent-default a injeta
  // depois do Aceitar, como o painel entrega (async + crossorigin) e com o
  // nonce dele (tests/consent.test.mjs roda o injetor)
  assert.ok(!/AdSenseScript|adsbygoogle\.js/.test(layout), "tag do AdSense de volta no HTML");
  assert.match(layout, /consentDefaultScript\(\{ adsClient: ADSENSE_ID, gaId: GA_ID, regiao \}\)/);
  const consent = semComentarios(source("src/lib/consent.js"));
  assert.match(consent, /https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=\$\{ads\}",1\)/);
  assert.match(consent, /s\.async=true;s\.src=u;if\(n\)s\.nonce=n;if\(c\)s\.crossOrigin="anonymous"/);
  assert.match(layout, /isValidAdClient\(process\.env\.NEXT_PUBLIC_ADSENSE_ID\)/);
  assert.match(layout, /<meta name="google-adsense-account" content=\{ADSENSE_PUBLISHER\} \/>/);
});

check("the CSP lets the AdSense code in: strict CSP (nonce + strict-dynamic), creatives in frame-src", () => {
  // Desde o lote 2 a CSP é a estrita que o AdSense suporta (answer/16283098):
  // os scripts entram pelo nonce + 'strict-dynamic', sem lista de domínios.
  const csp = source("src/lib/csp.js");
  assert.match(csp, /`script-src 'nonce-\$\{nonce\}' 'strict-dynamic'/);
  const frame = csp.slice(csp.indexOf("export const ADSENSE_FRAME_SRC"), csp.indexOf("];", csp.indexOf("export const ADSENSE_FRAME_SRC")));
  for (const d of ["googleads.g.doubleclick.net", "tpc.googlesyndication.com", "*.safeframe.googlesyndication.com",
    "fundingchoicesmessages.google.com", "*.google.com", "*.gstatic.com"]) {
    assert.ok(frame.includes(`https://${d}"`), `frame-src sem ${d}`);
  }
  assert.match(csp, /\["frame-src", \.\.\.ADSENSE_FRAME_SRC\]/);
});

// ── Blocos manuais com consentimento prévio (24/11/2026) ────────────────
//
// O AdBanner de verdade, transpilado com o SWC do próprio Next e carregado
// com as dependências trocadas por cópias (src/lib/ads.js e consent.js) e um
// next-intl falso. Cada variante lê o process.env no import, como o bundle
// lê os NEXT_PUBLIC_* embutidos no build. Para o useEffect, uma segunda
// carga troca o "react" por um falso que guarda o efeito, e o teste roda o
// efeito contra uma janela falsa (EventTarget do Node) e conta os push.
const requireRepo = createRequire(repoPath("package.json"));
const { transform } = requireRepo("next/dist/build/swc");
const React = requireRepo("react");
const { renderToStaticMarkup } = requireRepo("react-dom/server");

const VARS_ADS = [
  "NEXT_PUBLIC_ADSENSE_ID",
  "NEXT_PUBLIC_ADSENSE_SLOT_HOME_TOP",
  "NEXT_PUBLIC_ADSENSE_SLOT_HOME_BOTTOM",
  "NEXT_PUBLIC_ADSENSE_SLOT_GAME_FOOTER",
  "NEXT_PUBLIC_ADSENSE_SLOT_CONTENT_BOTTOM",
  "NEXT_PUBLIC_ADSENSE_ADTEST",
  "NEXT_PUBLIC_ADSENSE_PLACEHOLDERS",
];
const PUB = "ca-pub-4148140889800778";
const codigoBanner = (
  await transform(source("src/components/AdBanner.jsx"), {
    jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "automatic" } }, target: "es2022" },
    module: { type: "es6" },
  })
).code;

const pastaBanner = fs.mkdtempSync(path.join(repoPath("tests"), ".tmp-adbanner-"));
fs.copyFileSync(repoPath("src/lib/ads.js"), path.join(pastaBanner, "ads.mjs"));
fs.copyFileSync(repoPath("src/lib/consent.js"), path.join(pastaBanner, "consent.mjs"));
fs.writeFileSync(
  path.join(pastaBanner, "next-intl.mjs"),
  'export function useTranslations() { return (k) => ({ adLabel: "Publicidade" })[k] ?? k; }\n',
);
// react falso: useRef de verdade o bastante (um objeto por chamada do
// componente) e useEffect que só guarda o efeito, para o teste rodar.
fs.writeFileSync(
  path.join(pastaBanner, "react-falso.mjs"),
  "export const efeitos = [];\nexport function useRef(v) { return { current: v }; }\nexport function useEffect(fn) { efeitos.push(fn); }\n",
);
let variantes = 0;
async function carregarBanner(env, { reactFalso = false } = {}) {
  const nome = `AdBanner-${++variantes}.mjs`;
  let codigo = codigoBanner
    .replace('from "@/lib/ads"', 'from "./ads.mjs"')
    .replace('from "@/lib/consent"', 'from "./consent.mjs"')
    .replace('from "next-intl"', 'from "./next-intl.mjs"');
  if (reactFalso) codigo = codigo.replace('from "react";', 'from "./react-falso.mjs";');
  fs.writeFileSync(path.join(pastaBanner, nome), codigo);
  const antes = Object.fromEntries(VARS_ADS.map((v) => [v, process.env[v]]));
  for (const v of VARS_ADS) delete process.env[v];
  Object.assign(process.env, env);
  try {
    return await import(path.join(pastaBanner, nome));
  } finally {
    for (const v of VARS_ADS) {
      if (antes[v] === undefined) delete process.env[v];
      else process.env[v] = antes[v];
    }
  }
}
const html = (mod, placement) => renderToStaticMarkup(React.createElement(mod.default, { placement }));

const COM_IDS = {
  NEXT_PUBLIC_ADSENSE_ID: PUB,
  NEXT_PUBLIC_ADSENSE_SLOT_HOME_TOP: "1111111111",
  NEXT_PUBLIC_ADSENSE_SLOT_HOME_BOTTOM: "2222222222",
  NEXT_PUBLIC_ADSENSE_SLOT_GAME_FOOTER: "3333333333",
  NEXT_PUBLIC_ADSENSE_SLOT_CONTENT_BOTTOM: "4444444444",
};
let bannerProducao, bannerMisto, bannerSemNada, efeitoProducao, efeitoPlaceholder, reactFalso, consentDoBanner;
const bannerAdtest = {};
const bannerPlaceholders = {};
try {
  bannerProducao = await carregarBanner(COM_IDS);
  for (const v of ["on", "", "ON", " on", "1", "true", "off"]) {
    bannerAdtest[v] = await carregarBanner({ ...COM_IDS, NEXT_PUBLIC_ADSENSE_ADTEST: v });
  }
  for (const v of ["1", "", "0", "true", " 1", "on"]) {
    bannerPlaceholders[v] = await carregarBanner({ NEXT_PUBLIC_ADSENSE_ID: PUB, NEXT_PUBLIC_ADSENSE_PLACEHOLDERS: v });
  }
  // prévia com um ID: o bloco com ID continua <ins> (placeholder só onde falta)
  bannerMisto = await carregarBanner({
    NEXT_PUBLIC_ADSENSE_ID: PUB,
    NEXT_PUBLIC_ADSENSE_SLOT_GAME_FOOTER: "3333333333",
    NEXT_PUBLIC_ADSENSE_PLACEHOLDERS: "1",
  });
  bannerSemNada = await carregarBanner({});
  efeitoProducao = await carregarBanner(COM_IDS, { reactFalso: true });
  efeitoPlaceholder = await carregarBanner({ NEXT_PUBLIC_ADSENSE_ID: PUB, NEXT_PUBLIC_ADSENSE_PLACEHOLDERS: "1" }, { reactFalso: true });
  reactFalso = await import(path.join(pastaBanner, "react-falso.mjs"));
  consentDoBanner = await import(path.join(pastaBanner, "consent.mjs"));
} finally {
  fs.rmSync(pastaBanner, { recursive: true, force: true });
}

// Janela falsa para o efeito: EventTarget do Node (addEventListener e
// dispatchEvent de verdade), localStorage em memória (ou que lança) e um
// <html> com atributos.
function janela(storage = {}) {
  const w = new EventTarget();
  const guardado = storage === "erro" ? null : { ...storage };
  w.Event = Event;
  w.localStorage = storage === "erro"
    ? { getItem() { throw new Error("bloqueado"); }, setItem() { throw new Error("bloqueado"); } }
    : { getItem: (k) => (k in guardado ? guardado[k] : null), setItem: (k, v) => { guardado[k] = String(v); } };
  const attrs = {};
  w.document = {
    cookie: "",
    documentElement: {
      setAttribute: (k, v) => { attrs[k] = String(v); },
      removeAttribute: (k) => { delete attrs[k]; },
      getAttribute: (k) => (k in attrs ? attrs[k] : null),
    },
  };
  w.location = { hostname: "acerteamosca.com.br" };
  w.attrs = attrs;
  return w;
}
// Monta o AdBanner (chama o componente) e roda o efeito que ele registrou.
// A janela falsa fica como `window` global até o fim dos testes do efeito
// (o push do AdBanner usa o window global, também quando vem do evento).
function montar(mod, placement, win) {
  reactFalso.efeitos.length = 0;
  globalThis.window = win;
  mod.default({ placement });
  assert.equal(reactFalso.efeitos.length, 1, "o AdBanner registra um efeito");
  const limpar = reactFalso.efeitos[0]();
  return typeof limpar === "function" ? limpar : () => {};
}
const pushes = (win) => (Array.isArray(win.adsbygoogle) ? win.adsbygoogle.length : 0);
const KC = consentDoBanner.CONSENT_STORAGE_KEY;

check("AdBanner: no push without a granted choice; exactly one push after the Accept event", () => {
  for (const storage of [{}, { [KC]: "denied" }, { [KC]: "sim" }, "erro"]) {
    const w = janela(storage);
    montar(efeitoProducao, "game_footer", w);
    assert.equal(pushes(w), 0, `push sem aceite (${JSON.stringify(storage)})`);
    // evento forjado, sem Aceitar: continua sem push
    w.dispatchEvent(new Event(consentDoBanner.ADS_ON_EVENT));
    assert.equal(pushes(w), 0, `push com evento sem aceite (${JSON.stringify(storage)})`);
    // o Aceitar dispara o evento: um push
    consentDoBanner.acceptSiteChoice(w);
    assert.equal(pushes(w), 1, `Aceitar sem push (${JSON.stringify(storage)})`);
    // outro Aceitar/evento não pede de novo
    consentDoBanner.acceptSiteChoice(w);
    w.dispatchEvent(new Event(consentDoBanner.ADS_ON_EVENT));
    assert.equal(pushes(w), 1, `mais de um push (${JSON.stringify(storage)})`);
  }
});

check("AdBanner: a stored 'granted' pushes once on mount; two blocks push twice; an unmounted block never pushes", () => {
  const w = janela({ [KC]: "granted" });
  montar(efeitoProducao, "home_top", w);
  assert.equal(pushes(w), 1);
  w.dispatchEvent(new Event(consentDoBanner.ADS_ON_EVENT));
  assert.equal(pushes(w), 1, "o evento repetiu o push");
  montar(efeitoProducao, "home_bottom", w);
  assert.equal(pushes(w), 2, "um push por bloco");

  const w2 = janela();
  const limpar = montar(efeitoProducao, "game_footer", w2);
  limpar();
  consentDoBanner.acceptSiteChoice(w2);
  assert.equal(pushes(w2), 0, "bloco desmontado pediu anúncio");
});

check("AdBanner: after Decline, a newly mounted block does not push", () => {
  const w = janela({ [KC]: "granted" });
  consentDoBanner.declineSiteChoice(w);
  montar(efeitoProducao, "game_footer", w);
  assert.equal(pushes(w), 0);
});

check("AdBanner: placeholders never push, not even after Accept", () => {
  const w = janela({ [KC]: "granted" });
  montar(efeitoPlaceholder, "game_footer", w);
  consentDoBanner.acceptSiteChoice(w);
  assert.equal(pushes(w), 0);
});
delete globalThis.window;

check('AdBanner: data-adtest="on" only with NEXT_PUBLIC_ADSENSE_ADTEST exactly "on"', () => {
  for (const [v, mod] of Object.entries(bannerAdtest)) {
    const h = html(mod, "game_footer");
    assert.match(h, /<ins /, `sem <ins> com ADTEST=${JSON.stringify(v)}`);
    if (v === "on") assert.match(h, /<ins [^>]*data-adtest="on"/);
    else assert.ok(!/data-adtest/.test(h), `data-adtest com ADTEST=${JSON.stringify(v)}`);
  }
  assert.ok(!/data-adtest/.test(html(bannerProducao, "home_top")), "data-adtest sem a variável");
});

check('AdBanner: placeholders only with NEXT_PUBLIC_ADSENSE_PLACEHOLDERS exactly "1": same box, label and reserve, no <ins>', () => {
  for (const [v, mod] of Object.entries(bannerPlaceholders)) {
    for (const placement of Object.keys(ads.AD_PLACEMENTS)) {
      const h = html(mod, placement);
      if (v !== "1") {
        assert.equal(h, "", `caixa com PLACEHOLDERS=${JSON.stringify(v)} (${placement})`);
        continue;
      }
      const { format, minHeight } = ads.AD_PLACEMENTS[placement];
      assert.ok(!/<ins|adsbygoogle|data-ad-client|data-ad-slot/.test(h), `${placement}: placeholder com <ins>`);
      assert.match(h, /^<aside class="ad-slot"/, `${placement}: placeholder fora da caixa .ad-slot`);
      assert.ok(h.includes(`Publicidade — ${placement} (${format})`), `${placement}: texto do placeholder`);
      assert.ok(h.includes("dashed"), `${placement}: retângulo tracejado`);
      assert.ok(h.includes(`--aam-ad-min-mobile:${minHeight.mobile}px`) && h.includes(`--aam-ad-min-desktop:${minHeight.desktop}px`), placement);
      assert.match(h, />Publicidade<\/div>/, `${placement}: rótulo`);
    }
  }
  const misto = html(bannerMisto, "game_footer");
  assert.match(misto, /<ins [^>]*data-ad-slot="3333333333"/);
  assert.ok(!/data-ad-placeholder/.test(misto), "placeholder no lugar de um bloco com ID");
  assert.match(html(bannerMisto, "home_top"), /data-ad-placeholder="home_top"/);
  // sem nada definido (a produção sem IDs): nada renderiza
  for (const placement of Object.keys(ads.AD_PLACEMENTS)) assert.equal(html(bannerSemNada, placement), "");
  assert.equal(html(bannerProducao, "inexistente"), "", "placement desconhecido renderizou");
});

check("AdBanner: each placement has its own format and min-height (mobile/desktop), the label and the 48px margin", () => {
  assert.equal(ads.AD_PLACEMENTS.home_top.format, "horizontal");
  assert.deepEqual(ads.AD_PLACEMENTS.home_top.minHeight, { mobile: 100, desktop: 90 });
  for (const p of ["home_bottom", "game_footer", "content_bottom"]) {
    assert.equal(ads.AD_PLACEMENTS[p].format, "auto", p);
    assert.deepEqual(ads.AD_PLACEMENTS[p].minHeight, { mobile: 280, desktop: 250 }, p);
  }
  for (const [placement, cfg] of Object.entries(ads.AD_PLACEMENTS)) {
    assert.match(cfg.nome, /^AAM - /, placement);
    const h = html(bannerProducao, placement);
    assert.match(h, new RegExp(`<ins [^>]*data-ad-format="${cfg.format}"`), placement);
    assert.match(h, /data-full-width-responsive="true"/, placement);
    assert.match(h, new RegExp(`data-ad-client="${PUB}"`), placement);
    assert.match(h, new RegExp(`data-ad-slot="${COM_IDS[`NEXT_PUBLIC_ADSENSE_SLOT_${placement.toUpperCase()}`]}"`), placement);
    assert.ok(h.includes(`--aam-ad-min-mobile:${cfg.minHeight.mobile}px`), placement);
    assert.ok(h.includes(`--aam-ad-min-desktop:${cfg.minHeight.desktop}px`), placement);
    assert.match(h, /margin:48px auto/, `${placement}: margem de 48px`);
    assert.match(h, /aria-label="Publicidade"/, placement);
    assert.match(h, />Publicidade<\/div>/, `${placement}: rótulo visível`);
    // o display da caixa é do CSS (oculta até o aceite), nunca inline
    const aside = h.match(/^<aside[^>]*>/)[0];
    assert.ok(!/display/.test(aside), `${placement}: display inline na caixa`);
  }
});

check('CSS: .ad-slot hidden until html[data-aam-ads="on"]; reserve by media query; unfilled still hides', () => {
  const css = source("src/app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.match(css, /(^|\})\s*\.ad-slot\s*\{\s*display:\s*none;?\s*\}/);
  assert.match(css, /html\[data-aam-ads="on"\] \.ad-slot\s*\{\s*display:\s*block;?\s*\}/);
  assert.match(css, /\.ad-slot \.ad-reserva\s*\{\s*min-height:\s*var\(--aam-ad-min-mobile/);
  assert.match(css, new RegExp(`@media \\(min-width: ${ads.AD_DESKTOP_MIN_WIDTH}px\\)\\s*\\{\\s*\\.ad-slot \\.ad-reserva\\s*\\{\\s*min-height:\\s*var\\(--aam-ad-min-desktop`));
  assert.match(css, /ins\.adsbygoogle\[data-ad-status="unfilled"\]\s*\{\s*display:\s*none !important;?\s*\}/);
  assert.match(css, /\.ad-slot:has\(ins\.adsbygoogle\[data-ad-status="unfilled"\]\)\s*\{\s*display:\s*none;?\s*\}/);
  // o nome do atributo é o de src/lib/consent.js
  assert.equal(consentDoBanner.ADS_ATTR, "data-aam-ads");
});

// ── Posições ────────────────────────────────────────────────────────────
const paginasDeJogo = fs
  .readdirSync(repoPath("src/app/[locale]/jogos"), { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.existsSync(repoPath(`src/app/[locale]/jogos/${e.name}/page.js`)))
  .map((e) => e.name);

check("game pages: game_footer is the last thing, right after GameInfo (Kung Fu Castle has none: fixed touch controls)", () => {
  assert.ok(paginasDeJogo.length >= 14, `só ${paginasDeJogo.length} páginas de jogo`);
  for (const slug of paginasDeJogo) {
    const src = semComentarios(source(`src/app/[locale]/jogos/${slug}/page.js`));
    const usos = [...src.matchAll(/<AdBanner[^>]*\/>/g)].map((m) => m[0]);
    if (slug === "kungfucastle") {
      // Os botões de toque do Kung Fu Castle são position: fixed no rodapé
      // da tela durante a partida: um bloco abaixo do GameInfo passaria por
      // baixo deles ao rolar (clique acidental). Sem bloco nessa página.
      assert.deepEqual(usos, [], "kungfucastle com bloco de anúncio");
      assert.match(source("src/components/games/KungFuCastle.jsx"), /position: "fixed"/);
      continue;
    }
    assert.deepEqual(usos, ['<AdBanner placement="game_footer" />'], slug);
    assert.match(src, /<GameInfo [^>]*\/>\s*<AdBanner placement="game_footer" \/>\s*<\/>/, `${slug}: bloco fora do lugar (depois do GameInfo, no fim)`);
    assert.ok(src.indexOf("<GameClient") < src.indexOf("<AdBanner"), `${slug}: bloco antes do jogo`);
  }
});

check("home: home_top between the 3INVADER highlight and the games grid; home_bottom after the FAQ", () => {
  const src = semComentarios(source("src/app/[locale]/HomeClient.jsx"));
  const top = src.indexOf('<AdBanner placement="home_top" />');
  const bottom = src.indexOf('<AdBanner placement="home_bottom" />');
  const destaqueFim = src.indexOf("</Link>");
  const grade = src.indexOf("slugs.map(");
  const faqFim = src.lastIndexOf("</section>");
  assert.ok(top > destaqueFim && top < grade, "home_top fora do lugar");
  assert.ok(bottom > faqFim, "home_bottom antes do fim do FAQ");
  assert.match(src.slice(faqFim), /^<\/section>\s*<AdBanner placement="home_bottom" \/>\s*<\/div>/);
});

check("content_bottom: only at the end of the About page; never on privacy, terms, contact or inside a game", () => {
  const sobre = semComentarios(source("src/app/[locale]/sobre/page.js"));
  assert.match(sobre, /<\/article>\s*<AdBanner placement="content_bottom"[^>]*\/>\s*<\/>/);
  for (const f of arquivos(repoPath("src"))) {
    if (!/placement="content_bottom"/.test(semComentarios(source(f)))) continue;
    assert.equal(f, path.join("src", "app", "[locale]", "sobre", "page.js"), `${f} usa content_bottom`);
  }
  for (const rota of ["politica-de-privacidade", "termos-de-uso", "contato"]) {
    for (const f of arquivos(repoPath(`src/app/[locale]/${rota}`))) {
      assert.ok(!/AdBanner|adsbygoogle|ad-slot/.test(semComentarios(source(f))), `${f} tem anúncio`);
    }
  }
});

check("no ad block, placeholder or ad markup anywhere under src/components/games", () => {
  for (const f of arquivos(repoPath("src/components/games"))) {
    const src = semComentarios(source(f));
    assert.ok(!/AdBanner|adsbygoogle|ad-slot|data-ad-|ADSENSE|placement=/.test(src), `${f} tem anúncio`);
  }
});

check("the layout HTML carries no Google tag (no adsbygoogle/googlesyndication/doubleclick/gtag URL) and no ad block", () => {
  const layout = semComentarios(source("src/app/[locale]/layout.js"));
  assert.ok(!/googlesyndication|doubleclick|adsbygoogle|googletagmanager|<ins/.test(layout), "tag do Google no layout");
  assert.ok(!/AdBanner/.test(layout), "bloco de anúncio no layout (apareceria em toda página)");
  // o <html> aceita o data-aam-ads posto pelo consent-default antes da hidratação
  assert.match(layout, /<html lang=\{[^}]+\} suppressHydrationWarning>/);
  const raiz = semComentarios(source("src/app/layout.js"));
  assert.ok(!/googlesyndication|doubleclick|adsbygoogle|googletagmanager/.test(raiz), "tag do Google no layout raiz");
});

check("ads.txt is exactly the Google line of the publisher", () => {
  const linhas = source("public/ads.txt").split(/\r?\n/).filter((l) => l !== "");
  assert.deepEqual(linhas, ["google.com, pub-4148140889800778, DIRECT, f08c47fec0942fa0"]);
});
