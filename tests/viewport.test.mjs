// Uma meta viewport só, com os valores do site.
//
// Até o fae3a89 a página saía com DUAS metas viewport: a do Next
// (width=device-width, initial-scale=1) e a escrita à mão no <head> do
// layout. Agora quem emite é o Next, pelo `export const viewport` do layout
// (src/app/[locale]/layout.js). A medição real (tests/e2e/altura.e2e.mjs)
// grava as metas da página em viewportMetas.
import assert from "node:assert/strict";
import { check, source } from "./helpers.mjs";

const LAYOUT = "src/app/[locale]/layout.js";
const semComentarios = (src) => src.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

check("layout exporta viewport com device-width, 1, maximum-scale 5 e viewport-fit cover", () => {
  const src = semComentarios(source(LAYOUT));
  const m = src.match(/export const viewport = \{([\s\S]*?)\};/);
  assert.ok(m, "export const viewport não encontrado no layout");
  const v = m[1];
  assert.match(v, /width:\s*"device-width"/);
  assert.match(v, /initialScale:\s*1\b/);
  assert.match(v, /maximumScale:\s*5\b/);
  assert.match(v, /viewportFit:\s*"cover"/);
  assert.ok(!/userScalable:\s*false/.test(v), "o zoom com pinça precisa continuar liberado");
});

check("nenhuma <meta name=\"viewport\"> escrita à mão (senão saem duas)", () => {
  for (const arq of [LAYOUT, "src/app/layout.js"]) {
    const src = semComentarios(source(arq));
    assert.ok(!/<meta\s+name=["']viewport["']/.test(src), `${arq} ainda escreve a meta viewport à mão`);
  }
});

check("theme-color continua no <head> do layout", () => {
  const src = semComentarios(source(LAYOUT));
  assert.match(src, /<meta name="theme-color" content="#050510" \/>/);
});

check("metadata não declara viewport/themeColor (Next 14 avisa e ignora)", () => {
  const src = semComentarios(source(LAYOUT));
  const meta = src.slice(src.indexOf("export async function generateMetadata"), src.indexOf("export default"));
  assert.ok(!/\bviewport\s*:/.test(meta), "viewport dentro de generateMetadata");
  assert.ok(!/\bthemeColor\s*:/.test(meta), "themeColor dentro de generateMetadata");
});
