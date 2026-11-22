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

check("no institutional page lists Adsterra (removed from the site in Aug/2026)", () => {
  for (const p of ["sobre", "contato", "politica-de-privacidade", "termos-de-uso"]) {
    assert.ok(!/adsterra/i.test(semComentarios(source(`src/app/[locale]/${p}/page.js`))), `${p} cita o Adsterra`);
  }
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

check("the cookie notice is translated and does not claim consent by browsing", () => {
  const comp = semComentarios(source("src/components/CookieConsent.jsx"));
  assert.match(comp, /useTranslations\("cookieConsent"\)/);
  assert.match(comp, /href="\/politica-de-privacidade"/);
  // a escolha fica em CONSENT_STORAGE_KEY (src/lib/consent.js)
  assert.match(source("src/lib/consent.js"), /CONSENT_STORAGE_KEY = "acerteamosca_consent_v1"/);
  // nada de texto fixo em português no componente
  assert.ok(!/cookies|navegando|concorda|ACEITAR|RECUSAR|LGPD/i.test(comp.replace(/cookieConsent/g, "")), "texto fixo no CookieConsent");
  for (const loc of ["pt", "en"]) {
    const m = JSON.parse(source(`src/messages/${loc}.json`)).cookieConsent;
    assert.ok(m && m.text && m.policy && m.accept && m.decline && m.label, `${loc}.json sem cookieConsent completo`);
    // consentimento só pelo botão: nada de "ao continuar navegando"
    const tudo = Object.values(m).join(" ");
    assert.ok(!/continuar navegando|concorda|by continuing|you agree/i.test(tudo), `${loc}: consentimento presumido`);
  }
});

// AJ3 (decisão do Alexander em 22/11/2026: "opção (b), manter e explicar na
// política §4"). No EEE/UK/CH, entre o Aceitar do aviso do site e a resposta
// à mensagem do Google, o AdSense já está carregado com o consentimento
// negado e pode gravar cookies do Google em doubleclick.net. A revisão do QA
// mediu na prévia (IP do Brasil, região EEE simulada) o test_cookie na 1ª
// página e o IDE (publicidade) na 2ª: a §4 não pode dizer que só entram
// cookies técnicos nem que não entra cookie de publicidade. Fica só o que o
// Google documenta: a lista de cookies (test_cookie = funcionalidade, 15 min;
// IDE = publicidade) e a página de anúncios não personalizados (sem cookies
// para segmentação; cookies para frequência e relatórios agregados).
const secao4 = (c) => {
  const i = c.indexOf('id: "cookies"');
  const j = c.indexOf('h: "5.', i);
  assert.ok(i > 0 && j > i, "§4 não encontrada");
  return c.slice(i, j);
};

check("§4 (PT/EN) explains the Google cookies set between the site's Accept and the Google message, in the EEA/UK/CH", () => {
  const pt = secao4(PT), en = secao4(EN);
  for (const t of [
    "Nessas regiões, entre o Aceitar do aviso do site e a sua resposta à mensagem do Google",
    "pode gravar cookies do Google nos domínios dele enquanto o consentimento para anúncios continua negado",
    "o test_cookie, que o Google classifica como cookie de funcionalidade, com validade de 15 minutos",
    "o IDE, que o Google classifica como cookie de publicidade",
    "https://business.safety.google/adscookies/",
    "esses cookies não são usados para personalizar anúncios",
    "anúncios não personalizados não usam cookies para segmentação, mas ainda podem usá-los para limitar a frequência de exibição e para relatórios agregados",
    "use o botão Recusar do aviso do site",
  ]) assert.ok(pt.includes(t), `§4 PT sem "${t}"`);
  for (const t of [
    "In those regions, between Accept in the site's notice and your answer to the Google message",
    "may set Google cookies on its own domains while consent for ads remains denied",
    "test_cookie, which Google classifies as a functionality cookie that lasts 15 minutes",
    "IDE, which Google classifies as an advertising cookie",
    "https://business.safety.google/adscookies/",
    "these cookies are not used to personalize ads",
    "non-personalized ads do not use cookies for ad targeting, but may still use them for frequency capping and aggregated ad reporting",
    "use the Decline button in the site's notice",
  ]) assert.ok(en.includes(t), `§4 EN sem "${t}"`);
  // o parágrafo vem logo depois do que apresenta a mensagem do Google
  for (const [c, a, b] of [[pt, "Se você aceitar, o site passa a carregar", "entre o Aceitar do aviso do site"], [en, "If you accept, the site loads", "between Accept in the site's notice"]]) {
    assert.ok(c.indexOf(a) >= 0 && c.indexOf(a) < c.indexOf(b), "ordem dos parágrafos da §4");
  }
  // nada que a medição desmente nem finalidade que o Google não documenta
  for (const c of [pt, en]) {
    for (const t of ["não são gravados nem lidos cookies de publicidade", "no advertising cookies are set or read", "cookies técnicos", "technical cookies"]) {
      assert.ok(!c.includes(t), `§4 ainda diz "${t}"`);
    }
    assert.ok(!/test_cookie[^"]*(fraude|fraud|estritamente necess|strictly necessary)/i.test(c), "finalidade não documentada");
  }
});

check("the Google cookie list URL in §4 renders as a link without the closing parenthesis", () => {
  const toks = rt.tokenize("Google (https://business.safety.google/adscookies/), o test_cookie");
  const url = toks.find((t) => t.type === "url");
  assert.ok(url, JSON.stringify(toks));
  assert.equal(url.value, "https://business.safety.google/adscookies/");
});
