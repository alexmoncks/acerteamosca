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

const SINAIS = ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"];

// Executa o script como no navegador: window === globalThis. `storage`
// simula o localStorage (objeto chave -> valor, ou "erro" para um storage
// que lança, como no Safari com cookies bloqueados).
function rodarNoNavegador(script, { preexistente, storage = {} } = {}) {
  const ctx = vm.createContext({});
  vm.runInContext("var window = globalThis;", ctx);
  ctx.localStorage = storage === "erro"
    ? { getItem() { throw new Error("bloqueado"); } }
    : { getItem: (k) => (k in storage ? storage[k] : null) };
  if (preexistente) vm.runInContext(`window.dataLayer = ${JSON.stringify(preexistente)};`, ctx);
  vm.runInContext(script, ctx);
  // arguments -> array comum, para comparar
  return JSON.parse(vm.runInContext("JSON.stringify(window.dataLayer.map(a => Array.from(a)))", ctx));
}

check("consent default (BR option): denied everywhere, no region, wait_for_update 500, then ads_data_redaction", () => {
  const dl = rodarNoNavegador(consent.consentDefaultScript());
  assert.equal(dl.length, 2);
  const [padrao, redacao] = dl;
  assert.deepEqual(padrao.slice(0, 2), ["consent", "default"]);
  for (const s of SINAIS) assert.equal(padrao[2][s], "denied", s);
  assert.equal(padrao[2].wait_for_update, 500);
  assert.ok(!("region" in padrao[2]), "o default denied vale para o mundo todo");
  assert.ok(!dl.some((c) => c[0] === "consent" && Object.values(c[2]).includes("granted")), "nenhum granted por padrão");
  assert.deepEqual(redacao, ["set", "ads_data_redaction", true]);
  assert.ok(!("CONSENT_DENIED_REGIONS" in consent), "lista de regiões sobrando");
});

check("consent default (BR option): a stored 'granted' is re-applied right after the default, before any tag", () => {
  const K = consent.CONSENT_STORAGE_KEY;
  const aceitou = rodarNoNavegador(consent.consentDefaultScript(), { storage: { [K]: "granted" } });
  assert.equal(aceitou.length, 3);
  assert.deepEqual(aceitou[0].slice(0, 2), ["consent", "default"]);
  assert.deepEqual(aceitou[2], ["consent", "update", Object.fromEntries(SINAIS.map((s) => [s, "granted"]))]);
  // recusou, nada gravado, valor estranho ou storage bloqueado: continua negado
  for (const storage of [{ [K]: "denied" }, {}, { [K]: "sim" }, "erro"]) {
    const dl = rodarNoNavegador(consent.consentDefaultScript(), { storage });
    assert.equal(dl.length, 2, JSON.stringify(storage));
    assert.ok(!dl.some((c) => c[1] === "update"), JSON.stringify(storage));
  }
});

check("consent default: keeps whatever was already in the dataLayer and defines a working gtag()", () => {
  const ctx = vm.createContext({ localStorage: { getItem: () => null } });
  vm.runInContext("var window = globalThis; window.dataLayer = [{event: 'antes'}];", ctx);
  vm.runInContext(consent.consentDefaultScript(), ctx);
  vm.runInContext("gtag('consent', 'update', {ad_storage: 'granted'});", ctx);
  const dl = JSON.parse(vm.runInContext("JSON.stringify(window.dataLayer.map(a => a.event ? a : Array.from(a)))", ctx));
  assert.deepEqual(dl[0], { event: "antes" });
  assert.deepEqual(dl.at(-1), ["consent", "update", { ad_storage: "granted" }]);
});

check("applyConsentChoice: Accept sends consent update granted with the page's gtag and stores it; Decline sends denied", () => {
  const K = consent.CONSENT_STORAGE_KEY;
  const janela = () => {
    const guardado = {};
    const ctx = vm.createContext({ localStorage: { getItem: (k) => guardado[k] ?? null, setItem: (k, v) => { guardado[k] = String(v); } } });
    vm.runInContext("var window = globalThis;", ctx);
    vm.runInContext(consent.consentDefaultScript(), ctx);
    return { ctx, guardado, dl: () => JSON.parse(vm.runInContext("JSON.stringify(window.dataLayer.map(a => Array.from(a)))", ctx)) };
  };
  const a = janela();
  consent.applyConsentChoice(a.ctx, "granted");
  assert.equal(a.guardado[K], "granted");
  assert.deepEqual(a.dl().at(-1), ["consent", "update", Object.fromEntries(SINAIS.map((s) => [s, "granted"]))]);
  assert.equal(consent.readConsentChoice(a.ctx), "granted");
  // revogar pelo link do rodapé: Recusar depois de Aceitar
  consent.applyConsentChoice(a.ctx, "denied");
  assert.equal(a.guardado[K], "denied");
  assert.deepEqual(a.dl().at(-1), ["consent", "update", Object.fromEntries(SINAIS.map((s) => [s, "denied"]))]);
  // na visita seguinte o script do <head> não concede nada
  assert.equal(rodarNoNavegador(consent.consentDefaultScript(), { storage: { ...a.guardado } }).length, 2);
  // sem gtag na página e com storage bloqueado: cria o gtag e não quebra
  const semNada = { localStorage: { setItem() { throw new Error("bloqueado"); }, getItem() { throw new Error("bloqueado"); } } };
  consent.applyConsentChoice(semNada, "granted");
  assert.equal(semNada.dataLayer.length, 1);
  assert.deepEqual(Array.from(semNada.dataLayer[0]), ["consent", "update", Object.fromEntries(SINAIS.map((s) => [s, "granted"]))]);
  assert.equal(consent.readConsentChoice(semNada), null);
  assert.throws(() => consent.applyConsentChoice(semNada, "talvez"), /escolha/);
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

check("privacy policy (PT/EN): consent as the legal basis, Accept/Decline notice, Google message in the EEA, how to withdraw", () => {
  const pol = source("src/app/[locale]/politica-de-privacidade/page.js");
  for (const t of ["mensagem de consentimento do Google", "base legal: consentimento (LGPD, art. 7º, I", "Aceitar e Recusar",
    "revogar a sua escolha", "reabre o aviso de cookies do site", "Privacidade e cookies",
    "Google consent message", "legal basis: consent (LGPD, art. 7, I", "Accept and Decline", "withdraw your choice",
    "reopens the site's cookie notice", "Privacy & cookies"]) {
    assert.ok(pol.includes(t), `política sem "${t}"`);
  }
  // nada da versão "legítimo interesse" para anúncios/medição, nem aviso "apenas informativo"
  for (const t of ["anúncios e medição se apoiam no legítimo interesse", "apenas informativo", "ads and measurement rely on legitimate interests", "informational only"]) {
    assert.ok(!pol.includes(t), `política ainda diz "${t}"`);
  }
  assert.match(pol, /22 de novembro de 2026/);
  assert.match(pol, /November 22, 2026/);
});

check("cookie notice decision (shouldShowNotice): hidden with the GDPR message, after dismissal, and until the CMP delay", () => {
  const ver = (dismissed, gdprApplies, delayElapsed) => cmp.shouldShowNotice({ dismissed, gdprApplies, delayElapsed });
  // CMP do Google com GDPR: nunca, nem depois do tempo de espera
  assert.equal(ver(false, true, false), false);
  assert.equal(ver(false, true, true), false);
  // CMP diz que não se aplica (Brasil com Funding Choices): logo
  assert.equal(ver(false, false, false), true);
  // sem resposta ainda / sem CMP: só depois da espera
  assert.equal(ver(false, undefined, false), false);
  assert.equal(ver(false, undefined, true), true);
  assert.equal(ver(false, null, false), false);
  assert.equal(ver(false, null, true), true);
  // fechado: nunca
  for (const g of [true, false, null, undefined]) assert.equal(ver(true, g, true), false);
  assert.ok(cmp.CMP_NOTICE_DELAY_MS >= 1000 && cmp.CMP_NOTICE_DELAY_MS <= 3000);
});

check("the CookieConsent component (BR option): Accept/Decline of the same size, starts hidden, reopens from the footer link", () => {
  const comp = source("src/components/CookieConsent.jsx");
  assert.match(comp, /const visible = shouldShowNotice\(estado\);/);
  assert.match(comp, /useState\(\{ dismissed: true, gdprApplies: undefined, delayElapsed: false \}\)/);
  assert.match(comp, /if \(!readConsentChoice\(window\)\)/);
  assert.match(comp, /onClick=\{\(\) => escolher\("granted"\)\}/);
  assert.match(comp, /onClick=\{\(\) => escolher\("denied"\)\}/);
  assert.match(comp, /applyConsentChoice\(window, escolha\)/);
  assert.match(comp, /addEventListener\(CONSENT_REOPEN_EVENT, reabrir\)/);
  // os dois botões saem do mesmo estilo: só a cor muda
  assert.match(comp, /style=\{botao\(false\)\}/);
  assert.match(comp, /style=\{botao\(true\)\}/);
  assert.match(comp, /minHeight: 44/);
  for (const loc of ["pt", "en"]) {
    const m = JSON.parse(source(`src/messages/${loc}.json`)).cookieConsent;
    assert.ok(m.accept && m.decline && m.text && m.policy && m.label, loc);
    assert.ok(!("ok" in m), `${loc}: botão ENTENDI sobrando`);
  }
});

check("footer link (BR option): Google message in the EEA, the site's notice elsewhere", () => {
  const link = source("src/components/PrivacyChoicesLink.jsx");
  assert.match(link, /window\.dispatchEvent\(new Event\(CONSENT_REOPEN_EVENT\)\)/);
  assert.match(link, /privacyChoicesAction\(window, applies\) === "google" && showGoogleRevocation\(window\)/);
  assert.equal(consent.CONSENT_REOPEN_EVENT, "acerteamosca:consent-reopen");
});

check("revocation link re-asks the CMP on click (CMP ready after the watcher gave up)", () => {
  const pronta = (gdprApplies) => ({ __tcfapi: (c, v, cb) => cb({ gdprApplies, cmpLoaded: true }) });
  assert.equal(cmp.pingGdprAppliesNow(pronta(true)), true);
  assert.equal(cmp.pingGdprAppliesNow(pronta(false)), false);
  assert.equal(cmp.pingGdprAppliesNow({ __tcfapi: () => {} }), undefined, "callback assíncrono/mudo");
  assert.equal(cmp.pingGdprAppliesNow({ __tcfapi: () => { throw new Error("x"); } }), undefined);
  assert.equal(cmp.pingGdprAppliesNow({}), undefined);
  assert.match(source("src/components/PrivacyChoicesLink.jsx"), /gdprApplies === true \? true : pingGdprAppliesNow\(window\)/);
});
