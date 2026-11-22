// Fontes auto-hospedadas (AJ3, decisão do Alexander em 22/11/2026: "Pode
// hospedar as Google Fonts no próprio site").
//
// Antes, o layout injetava depois da hidratação um <link> para
// fonts.googleapis.com, e o navegador baixava os .woff2 de fonts.gstatic.com:
// todo visitante falava com o Google antes de qualquer consentimento. Agora
// as duas famílias (Press Start 2P e Fira Code, licença OFL) saem de
// /fonts/ do próprio domínio, declaradas em src/app/fonts.css com os MESMOS
// nomes de família: ~470 estilos inline e os ctx.font dos jogos em canvas
// usam "'Press Start 2P'" e "'Fira Code'" literalmente, e o next/font
// trocaria o nome por um com hash (e não deixa sobrescrever font-family).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { check, source, loadModule } from "./helpers.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
const GOOGLE_FONTES = /fonts\.(googleapis|gstatic)\.com/;
const CSS = fs.existsSync(path.join(ROOT, "src/app/fonts.css")) ? source("src/app/fonts.css") : "";
const FACES = [...CSS.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => {
  const b = m[1];
  const pega = (re) => (b.match(re) || [])[1];
  return {
    family: pega(/font-family:\s*["']([^"']+)["']/),
    weight: pega(/font-weight:\s*([^;]+);/),
    display: pega(/font-display:\s*([^;]+);/),
    url: pega(/src:\s*url\(["']?([^"')]+)["']?\)\s*format\(["']woff2["']\)/),
    range: pega(/unicode-range:\s*([^;]+);/),
  };
});

function arquivos(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? arquivos(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}

check("no source file or public asset points the browser at fonts.googleapis.com / fonts.gstatic.com", () => {
  const achados = [...arquivos(path.join(ROOT, "src")), ...arquivos(path.join(ROOT, "public"))]
    .filter((f) => /\.(js|jsx|mjs|css|json|html|webmanifest)$/.test(f))
    .filter((f) => GOOGLE_FONTES.test(semComentarios(fs.readFileSync(f, "utf8"))))
    .map((f) => path.relative(ROOT, f));
  assert.deepEqual(achados, []);
});

check("the layout no longer injects the Google Fonts stylesheet nor dns-prefetches its hosts", () => {
  const layout = source("src/app/[locale]/layout.js");
  assert.ok(!GOOGLE_FONTES.test(layout), "layout ainda cita fonts.googleapis/gstatic");
  assert.ok(!/id="load-fonts"/.test(layout), "o <Script id=load-fonts> continua no layout");
});

const csp = await loadModule("src/lib/csp.js");

check("CSP: font-src is only 'self' and style-src has no Google Fonts host", () => {
  const d = csp.parseCsp(csp.buildCsp({ nonce: "AAAAAAAAAAAAAAAAAAAAAA==" }));
  assert.deepEqual(d["font-src"], ["'self'"]);
  assert.deepEqual(d["style-src"], ["'self'", "'unsafe-inline'"]);
  assert.ok(!GOOGLE_FONTES.test(csp.buildCsp({ nonce: "AAAAAAAAAAAAAAAAAAAAAA==" })));
});

check("fonts.css declares Press Start 2P 400 and Fira Code 400/700 under their literal family names", () => {
  const fam = (f, w) => FACES.filter((x) => x.family === f && x.weight === w);
  assert.ok(fam("Press Start 2P", "400").length >= 2, "Press Start 2P 400");
  assert.ok(fam("Fira Code", "400").length >= 2, "Fira Code 400");
  assert.ok(fam("Fira Code", "700").length >= 2, "Fira Code 700");
  assert.ok(FACES.every((f) => ["Press Start 2P", "Fira Code"].includes(f.family)), "família inesperada");
  // o subset latin cobre o português (U+00C0-00FF: acentos e ç)
  for (const f of ["Press Start 2P", "Fira Code"]) {
    assert.ok(FACES.some((x) => x.family === f && /^U\+0000-00FF\b/.test(x.range || "")), `${f}: subset latin`);
    assert.ok(FACES.some((x) => x.family === f && /U\+0100-02BA/.test(x.range || "")), `${f}: subset latin-ext`);
  }
});

check("every @font-face uses font-display: swap, a unicode-range and a local /fonts/*.woff2 that exists", () => {
  assert.ok(FACES.length >= 12, `só ${FACES.length} @font-face`);
  for (const f of FACES) {
    assert.equal(f.display, "swap", `${f.family} ${f.weight}: font-display`);
    assert.ok(f.range, `${f.family} ${f.url}: sem unicode-range`);
    assert.match(f.url || "", /^\/fonts\/[a-z0-9-]+-v\d+-[a-z0-9-]+\.woff2$/, `${f.family}: url ${f.url}`);
    const buf = fs.readFileSync(path.join(ROOT, "public", f.url));
    assert.equal(buf.subarray(0, 4).toString("latin1"), "wOF2", `${f.url} não é woff2`);
  }
});

check("the two latin files are preloaded (as=font, type woff2, crossOrigin) and are the ones fonts.css uses", () => {
  const layout = semComentarios(source("src/app/[locale]/layout.js"));
  const preloads = [...layout.matchAll(/<link\s+rel="preload"\s+href="([^"]+)"\s+as="font"\s+type="font\/woff2"\s+crossOrigin="anonymous"\s*\/>/g)].map((m) => m[1]);
  assert.equal(preloads.length, 2, `preloads: ${preloads}`);
  for (const p of preloads) {
    assert.match(p, /-latin\.woff2$/);
    assert.ok(FACES.some((f) => f.url === p && /^U\+0000-00FF\b/.test(f.range)), `${p} não é o latin de fonts.css`);
  }
  assert.ok(preloads.some((p) => p.includes("press-start-2p")) && preloads.some((p) => p.includes("fira-code")));
});

check("fonts.css is imported by the root layout", () => {
  assert.match(source("src/app/layout.js"), /^import "\.\/fonts\.css";$/m);
});

check("the OFL license of both families ships next to the files", () => {
  for (const f of ["OFL-PressStart2P.txt", "OFL-FiraCode.txt"]) {
    const t = fs.readFileSync(path.join(ROOT, "public/fonts", f), "utf8");
    assert.match(t, /SIL OPEN FONT LICENSE Version 1\.1/);
  }
});

check("/fonts/* is cached for a year as immutable (file names carry the font version)", () => {
  const cfg = source("next.config.js");
  assert.match(cfg, /source: "\/fonts\/:file\*"[\s\S]{0,200}public, max-age=31536000, immutable/);
});
