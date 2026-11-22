// Modo de consentimento v2 e mensagem de consentimento do Google (lote 2).
//
// Comportamento: o script do <head> é executado num contexto isolado (vm),
// como o navegador faria, e o dataLayer resultante é conferido; a detecção
// da CMP (TCF v2) e o link de revogação rodam contra janelas falsas.
import assert from "node:assert/strict";
import vm from "node:vm";
import { check, source, loadModule } from "./helpers.mjs";

const consent = await loadModule("src/lib/consent.js");
const cmp = await loadModule("src/lib/cmp.js");

const EU27 = ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV",
  "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"];
const SINAIS = ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"];

// Executa o script como no navegador: window === globalThis.
function rodarNoNavegador(script, preexistente) {
  const ctx = vm.createContext({});
  vm.runInContext("var window = globalThis;", ctx);
  if (preexistente) vm.runInContext(`window.dataLayer = ${JSON.stringify(preexistente)};`, ctx);
  vm.runInContext(script, ctx);
  // arguments -> array comum, para comparar
  return JSON.parse(vm.runInContext("JSON.stringify(window.dataLayer.map(a => Array.from(a)))", ctx));
}

check("consent default: denied for EEA/UK/CH with wait_for_update 500, granted elsewhere, in that order", () => {
  const dl = rodarNoNavegador(consent.consentDefaultScript());
  assert.equal(dl.length, 3);
  const [regional, global, redacao] = dl;
  assert.deepEqual(regional.slice(0, 2), ["consent", "default"]);
  for (const s of SINAIS) assert.equal(regional[2][s], "denied", s);
  assert.equal(regional[2].wait_for_update, 500);
  assert.deepEqual(global.slice(0, 2), ["consent", "default"]);
  for (const s of SINAIS) assert.equal(global[2][s], "granted", s);
  assert.ok(!("region" in global[2]), "o default global não pode ter região");
  assert.deepEqual(redacao, ["set", "ads_data_redaction", true]);
});

check("consent default: the region list is exactly EU27 + IS/LI/NO + GB + CH (Brazil is not in it)", () => {
  const [regional] = rodarNoNavegador(consent.consentDefaultScript());
  const regioes = regional[2].region;
  assert.deepEqual([...regioes].sort(), [...EU27, "IS", "LI", "NO", "GB", "CH"].sort());
  assert.equal(new Set(regioes).size, regioes.length);
  for (const fora of ["BR", "US", "UK", "EU"]) assert.ok(!regioes.includes(fora), fora);
});

check("consent default: keeps whatever was already in the dataLayer and defines a working gtag()", () => {
  const ctx = vm.createContext({});
  vm.runInContext("var window = globalThis; window.dataLayer = [{event: 'antes'}];", ctx);
  vm.runInContext(consent.consentDefaultScript(), ctx);
  vm.runInContext("gtag('consent', 'update', {ad_storage: 'granted'});", ctx);
  const dl = JSON.parse(vm.runInContext("JSON.stringify(window.dataLayer.map(a => a.event ? a : Array.from(a)))", ctx));
  assert.deepEqual(dl[0], { event: "antes" });
  assert.deepEqual(dl.at(-1), ["consent", "update", { ad_storage: "granted" }]);
});

check("the consent default runs before the AdSense tag and before gtag.js in the layout", () => {
  const layout = source("src/app/[locale]/layout.js");
  const iConsent = layout.indexOf('id="consent-default"');
  assert.ok(iConsent > 0, "sem o script consent-default");
  assert.ok(iConsent < layout.indexOf("<AdSenseScript "), "consent depois do adsbygoogle");
  // o React move <script async src> para o topo do <head>; o onError é o que
  // mantém a tag do AdSense depois do consent default (conferido no HTML da
  // prévia pelo e2e do lote 2)
  assert.match(source("src/components/AdSenseScript.jsx"), /onError=\{ignorar\}/);
  assert.ok(iConsent < layout.indexOf("googletagmanager.com/gtag/js"), "consent depois do gtag");
  assert.ok(layout.indexOf("<head>") < iConsent && iConsent < layout.indexOf("</head>"), "consent fora do <head>");
  assert.match(layout, /__html: consentDefaultScript\(\)/);
});

// ── CMP (TCF v2) e revogação ───────────────────────────────────────────────
function janelaComCmp({ gdprApplies, prontaDepois = 0, nunca = false } = {}) {
  let chamadas = 0;
  return {
    __tcfapi(cmd, ver, cb) {
      assert.equal(cmd, "ping");
      assert.equal(ver, 2);
      chamadas++;
      if (nunca) return;
      cb(chamadas > prontaDepois ? { gdprApplies, cmpLoaded: true } : { cmpLoaded: false });
    },
  };
}

const rapido = { timeoutMs: 400, pollMs: 20 };
const [semCmp, cmpGdpr, cmpSemGdpr, cmpLenta, cmpMuda, stubMudo] = await Promise.all([
  cmp.watchGdprCmp({}, rapido),
  cmp.watchGdprCmp(janelaComCmp({ gdprApplies: true }), rapido),
  cmp.watchGdprCmp(janelaComCmp({ gdprApplies: false }), rapido),
  cmp.watchGdprCmp(janelaComCmp({ gdprApplies: true, prontaDepois: 3 }), rapido),
  cmp.watchGdprCmp({ __tcfapi() { throw new Error("quebrada"); } }, rapido),
  cmp.pingGdprApplies(janelaComCmp({ nunca: true })),
]);

check("CMP detection: GDPR message active, not applicable, slow to load, absent or broken", () => {
  assert.equal(cmpGdpr, true);
  assert.equal(cmpSemGdpr, false);
  assert.equal(cmpLenta, true, "CMP que responde depois de 3 tentativas");
  assert.equal(semCmp, null, "sem __tcfapi");
  assert.equal(cmpMuda, null, "__tcfapi que lança erro");
  assert.equal(stubMudo, undefined, "stub que nunca chama o callback não trava");
});

check("revocation link: reopens the Google message only where GDPR applies and the API is loaded", () => {
  const comApi = { googlefc: { showRevocationMessage() {} } };
  assert.equal(cmp.privacyChoicesAction(comApi, true), "google");
  assert.equal(cmp.privacyChoicesAction(comApi, false), "policy");
  assert.equal(cmp.privacyChoicesAction(comApi, null), "policy");
  assert.equal(cmp.privacyChoicesAction({}, true), "policy", "API do Google ainda não carregou");
  assert.equal(cmp.privacyChoicesAction({ googlefc: {} }, true), "policy");
});

check("revocation link: goes through googlefc.callbackQueue and calls showRevocationMessage once", () => {
  let vezes = 0;
  const win = { googlefc: { showRevocationMessage() { vezes++; } } };
  assert.equal(cmp.showGoogleRevocation(win), true);
  assert.equal(win.googlefc.callbackQueue.length, 1);
  assert.equal(vezes, 0, "só roda quando a fila do Google executa");
  win.googlefc.callbackQueue[0].CONSENT_DATA_READY();
  assert.equal(vezes, 1);
  assert.equal(cmp.showGoogleRevocation({}), false);
});

check("footer has the fixed 'Privacidade e cookies' link, with the policy section as fallback", () => {
  assert.match(source("src/components/Footer.jsx"), /<PrivacyChoicesLink label=\{t\("privacyChoices"\)\}/);
  const link = source("src/components/PrivacyChoicesLink.jsx");
  assert.match(link, /PRIVACY_CHOICES_HREF = "\/politica-de-privacidade#cookies"/);
  assert.match(link, /href=\{PRIVACY_CHOICES_HREF\}/);
  assert.equal(JSON.parse(source("src/messages/pt.json")).footer.privacyChoices, "Privacidade e cookies");
  assert.equal(JSON.parse(source("src/messages/en.json")).footer.privacyChoices, "Privacy & cookies");
  assert.match(source("src/app/[locale]/politica-de-privacidade/page.js"), /id: "cookies",\n\s+h: "4\. Cookies e/);
  assert.match(source("src/app/[locale]/politica-de-privacidade/page.js"), /id: "cookies",\n\s+h: "4\. Cookies and/);
});

check("privacy policy (PT/EN) explains the Google consent message, consent mode and how to withdraw", () => {
  const pol = source("src/app/[locale]/politica-de-privacidade/page.js");
  for (const t of ["mensagem de consentimento do Google", "Modo de consentimento do Google", "revogar a sua escolha",
    "Privacidade e cookies", "Google consent message", "Google consent mode", "withdraw your choice", "Privacy & cookies"]) {
    assert.ok(pol.includes(t), `política sem "${t}"`);
  }
  assert.match(pol, /22 de novembro de 2026/);
  assert.match(pol, /November 22, 2026/);
});

check("cookie notice stays hidden while the Google CMP shows the GDPR message", () => {
  const comp = source("src/components/CookieConsent.jsx");
  assert.match(comp, /watchGdprCmp\(window\)/);
  assert.match(comp, /gdprApplies === true\) \{\s*cmpRespondeu = true;\s*setVisible\(false\)/);
  assert.match(comp, /minHeight: 44/);
});
