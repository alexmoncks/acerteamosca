// Privacidade e Contato.
//
// A auditoria AdSense de 21/11/2026 achou: a Política de Privacidade ainda
// citava o Adsterra (removido do site em agosto), não falava de GDPR nem de
// bases legais e não tinha o link "Como o Google usa dados de sites
// parceiros"; e o e-mail de Contato/Sobre saía como "[email protected]" no
// HTML, por causa da Email Address Obfuscation da Cloudflare.
import assert from "node:assert/strict";
import { check, source, loadModule } from "./helpers.mjs";

const rt = await loadModule("src/lib/richtext.js");
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const PRIV = semComentarios(source("src/app/[locale]/politica-de-privacidade/page.js"));
const [PT, EN] = (() => {
  const i = PRIV.indexOf("const contentEN");
  return [PRIV.slice(0, i), PRIV.slice(i)];
})();

check("the privacy policy no longer lists Adsterra", () => {
  assert.ok(!/adsterra/i.test(PRIV));
});

check("the privacy policy links Google's partner-sites page in both languages", () => {
  for (const c of [PT, EN]) {
    assert.ok(c.includes("https://policies.google.com/technologies/partner-sites"));
    assert.ok(c.includes("https://adssettings.google.com"));
  }
});

check("the privacy policy covers LGPD and GDPR, legal bases, rights and a contact", () => {
  for (const c of [PT, EN]) {
    assert.match(c, /GDPR/);
    assert.match(c, /LGPD/);
    assert.match(c, /art\. 6\(1\)\(a\)/);
    assert.match(c, /art\. 18/);
    assert.match(c, /ANPD/);
    assert.match(c, /\$\{EMAIL\}/);
  }
  assert.match(PT, /Fornecedores terceiros, incluindo o Google, usam cookies/);
  assert.match(EN, /Third-party vendors, including Google, use cookies/);
});

check("institutional pages render text through RichText (links + protected email)", () => {
  for (const p of ["sobre", "contato", "politica-de-privacidade", "termos-de-uso"]) {
    const src = source(`src/app/[locale]/${p}/page.js`);
    assert.match(src, /<RichText text=\{para\} \/>/, `${p} imprime o parágrafo cru`);
  }
});

check("the email is wrapped so Cloudflare's obfuscation leaves it alone", () => {
  const html = rt.emailHtml("alex@marramoncks.com.br");
  assert.ok(html.startsWith("<!--email_off-->") && html.endsWith("<!--/email_off-->"));
  assert.ok(html.includes('href="mailto:alex@marramoncks.com.br"'));
  assert.ok(html.includes(">alex@marramoncks.com.br</a>"));
  assert.ok(!rt.emailHtml('a"<b>@x.com').includes("<b>"), "e-mail sem escape vira HTML");
});

check("paragraphs are split into text, URLs and emails, without trailing punctuation", () => {
  assert.deepEqual(rt.tokenize("Escreva para alex@marramoncks.com.br."), [
    { type: "text", value: "Escreva para " },
    { type: "email", value: "alex@marramoncks.com.br" },
    { type: "text", value: "." },
  ]);
  assert.deepEqual(rt.tokenize("Veja https://policies.google.com/technologies/ads, ok"), [
    { type: "text", value: "Veja " },
    { type: "url", value: "https://policies.google.com/technologies/ads" },
    { type: "text", value: ", ok" },
  ]);
  assert.deepEqual(rt.tokenize("(ANPD, https://www.gov.br/anpd)"), [
    { type: "text", value: "(ANPD, " },
    { type: "url", value: "https://www.gov.br/anpd" },
    { type: "text", value: ")" },
  ]);
  assert.deepEqual(rt.tokenize("sem nada"), [{ type: "text", value: "sem nada" }]);
});
