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
  assert.deepEqual(conhecidos.sort(), ["game_footer", "home_bottom", "home_top"]);
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
  assert.match(layout, /adsbygoogle\.js\?client=\$\{ADSENSE_ID\}/);
  assert.match(layout, /isValidAdClient\(process\.env\.NEXT_PUBLIC_ADSENSE_ID\)/);
});

check("the CSP lets the AdSense domains in", () => {
  const src = source("next.config.js");
  const script = src.slice(src.indexOf("const ADSENSE_SCRIPT_SRC"), src.indexOf("const ADSENSE_FRAME_SRC"));
  const frame = src.slice(src.indexOf("const ADSENSE_FRAME_SRC"), src.indexOf("const CONTENT_SECURITY_POLICY"));
  for (const d of ["pagead2.googlesyndication.com", "tpc.googlesyndication.com", "googleads.g.doubleclick.net",
    "adservice.google.com", "fundingchoicesmessages.google.com", "*.adtrafficquality.google"]) {
    assert.ok(script.includes(`https://${d}"`), `script-src sem ${d}`);
  }
  for (const d of ["googleads.g.doubleclick.net", "tpc.googlesyndication.com", "*.safeframe.googlesyndication.com",
    "fundingchoicesmessages.google.com"]) {
    assert.ok(frame.includes(`https://${d}"`), `frame-src sem ${d}`);
  }
  assert.match(src, /\.\.\.ADSENSE_SCRIPT_SRC/);
  assert.match(src, /"frame-src", \.\.\.ADSENSE_FRAME_SRC/);
});
