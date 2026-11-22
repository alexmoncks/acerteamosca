// Modo de consentimento v2, tags do Google só depois do Aceitar e mensagem
// de consentimento do Google (lote 2 + AJ2, decisão de 22/11/2026).
//
// Comportamento: o script do <head> é executado num contexto isolado (vm),
// como o navegador faria (document, localStorage e as tags injetadas são
// falsos), e o dataLayer resultante é conferido; a detecção da CMP (TCF v2)
// e o link de revogação rodam contra janelas falsas.
import assert from "node:assert/strict";
import vm from "node:vm";
import { check, source, loadModule } from "./helpers.mjs";

const consent = await loadModule("src/lib/consent.js");
const cmp = await loadModule("src/lib/cmp.js");

const SINAIS = ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"];
const K = consent.CONSENT_STORAGE_KEY;
const G = consent.GDPR_STORAGE_KEY;
const ADS = "ca-pub-4148140889800778";
const GA = "G-TESTE1234";
const todos = (v) => Object.fromEntries(SINAIS.map((s) => [s, v]));

// Uma janela de navegador falsa em vm: window === globalThis, localStorage
// (objeto chave -> valor, ou "erro" para um storage que lança), document com
// currentScript (o nonce do script inline), createElement e head.appendChild
// (as tags injetadas ficam em `tags`) e cookie (as atribuições ficam em
// `cookiesGravados`).
function navegador({ storage = {}, nonce = "n0nce", cookie = "", hostname = "acerteamosca.com.br" } = {}) {
  const tags = [];
  const cookiesGravados = [];
  const guardado = storage === "erro" ? null : { ...storage };
  const ctx = vm.createContext({});
  vm.runInContext("var window = globalThis;", ctx);
  ctx.localStorage = storage === "erro"
    ? { getItem() { throw new Error("bloqueado"); }, setItem() { throw new Error("bloqueado"); }, removeItem() { throw new Error("bloqueado"); } }
    : { getItem: (k) => (k in guardado ? guardado[k] : null), setItem: (k, v) => { guardado[k] = String(v); }, removeItem: (k) => { delete guardado[k]; } };
  ctx.location = { hostname, reload() {} };
  ctx.document = {
    currentScript: { nonce },
    createElement: (tipo) => ({ tipo }),
    head: { appendChild: (el) => tags.push(el) },
    get cookie() { return cookie; },
    set cookie(v) { cookiesGravados.push(v); },
  };
  const dl = () => JSON.parse(vm.runInContext("JSON.stringify((window.dataLayer||[]).map(a => Array.from(a)))", ctx));
  return { ctx, tags, guardado, cookiesGravados, dl };
}
function rodarHead(opts = {}, scriptOpts = { adsClient: ADS, gaId: GA }) {
  const n = navegador(opts);
  vm.runInContext(consent.consentDefaultScript(scriptOpts), n.ctx);
  return n;
}
const consentDe = (dl) => dl.filter((c) => c[0] === "consent");

check("AJ2: consent default denied everywhere (no region), wait_for_update 500, ads_data_redaction; no Google tag without a stored Accept", () => {
  for (const storage of [{}, { [K]: "denied" }, { [K]: "denied", [G]: "0" }, { [K]: "sim" }, { [G]: "0" }, "erro"]) {
    const n = rodarHead({ storage });
    const dl = n.dl();
    assert.equal(dl.length, 2, JSON.stringify(storage));
    const [padrao, redacao] = dl;
    assert.deepEqual(padrao.slice(0, 2), ["consent", "default"]);
    for (const s of SINAIS) assert.equal(padrao[2][s], "denied", s);
    assert.equal(padrao[2].wait_for_update, 500);
    assert.ok(!("region" in padrao[2]), "o default denied vale para o mundo todo");
    assert.deepEqual(redacao, ["set", "ads_data_redaction", true]);
    assert.equal(n.tags.length, 0, `tag do Google injetada sem aceite (${JSON.stringify(storage)})`);
    assert.equal(n.ctx.__aamGoogleTags, undefined);
  }
  assert.ok(!("CONSENT_DENIED_REGIONS" in consent), "lista de regiões sobrando");
});

check("AJ2: with a stored Accept the head injects adsbygoogle.js (async, crossorigin, nonce) and gtag.js + config", () => {
  const n = rodarHead({ storage: { [K]: "granted" }, nonce: "abc123" });
  assert.equal(n.tags.length, 2);
  const [ads, ga] = n.tags;
  assert.equal(ads.src, `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS}`);
  assert.equal(ads.async, true);
  assert.equal(ads.crossOrigin, "anonymous");
  assert.equal(ads.nonce, "abc123");
  assert.equal(ga.src, `https://www.googletagmanager.com/gtag/js?id=${GA}`);
  assert.equal(ga.nonce, "abc123");
  assert.equal(ga.crossOrigin, undefined);
  const dl = n.dl();
  assert.equal(dl[2][0], "js");
  assert.deepEqual(dl[3], ["config", GA]);
  // sem saber da CMP (G ausente): nada de granted, as tags rodam negadas
  assert.ok(!consentDe(dl).some((c) => c[1] === "update"));
  // o carregador só injeta uma vez
  assert.equal(vm.runInContext("window.__aamLoadGoogleTags()", n.ctx), false);
  assert.equal(n.tags.length, 2);
});

check("AJ2: Accept + 'no GDPR here' (G=0) re-applies granted right after the default, before the tags; G=1 (EEA) never grants", () => {
  const n = rodarHead({ storage: { [K]: "granted", [G]: "0" } });
  const dl = n.dl();
  assert.deepEqual(dl[0].slice(0, 2), ["consent", "default"]);
  assert.deepEqual(dl[2], ["consent", "update", todos("granted")]);
  assert.equal(dl[3][0], "js", "o granted vem antes do config");
  assert.equal(n.ctx.__aamGranted, true);
  assert.equal(n.tags.length, 2);
  const eee = rodarHead({ storage: { [K]: "granted", [G]: "1" } });
  assert.ok(!consentDe(eee.dl()).some((c) => c[1] === "update"), "EEE: o site não concede");
  assert.equal(eee.tags.length, 2, "EEE: as tags carregam (trazem a mensagem do Google)");
});

check("AJ2: invalid IDs never reach the injected tags; missing IDs inject nothing", () => {
  const n = rodarHead({ storage: { [K]: "granted" } }, { adsClient: 'ca-pub-1"</script>', gaId: "G-<x>" });
  assert.equal(n.tags.length, 0);
  assert.ok(!consent.consentDefaultScript({ adsClient: "x</script>", gaId: "</script>" }).includes("</script>"));
  const soAds = rodarHead({ storage: { [K]: "granted" } }, { adsClient: ADS });
  assert.equal(soAds.tags.length, 1);
  assert.equal(consent.isValidGaId("G-ABC123"), true);
  assert.equal(consent.isValidGaId(""), false);
  assert.equal(consent.isValidGaId('""'), false);
  assert.equal(consent.isValidGaId("UA-1234-1"), false);
});

check("consent default: keeps whatever was already in the dataLayer and defines a working gtag()", () => {
  const n = navegador();
  vm.runInContext("window.dataLayer = [{event: 'antes'}];", n.ctx);
  vm.runInContext(consent.consentDefaultScript({ adsClient: ADS }), n.ctx);
  vm.runInContext("gtag('consent', 'update', {ad_storage: 'granted'});", n.ctx);
  const dl = JSON.parse(vm.runInContext("JSON.stringify(window.dataLayer.map(a => a.event ? a : Array.from(a)))", n.ctx));
  assert.deepEqual(dl[0], { event: "antes" });
  assert.deepEqual(dl.at(-1), ["consent", "update", { ad_storage: "granted" }]);
});

check("AJ2: Accept stores the choice and loads the tags, without granting by itself; grantConsent grants once and remembers G=0", () => {
  const n = rodarHead();
  assert.equal(n.tags.length, 0);
  assert.equal(consent.acceptSiteChoice(n.ctx), true);
  assert.equal(n.guardado[K], "granted");
  assert.equal(n.tags.length, 2, "Aceitar carrega as tags");
  assert.equal(n.tags[0].nonce, "n0nce", "com o nonce lido do script do <head>");
  assert.ok(!consentDe(n.dl()).some((c) => c[1] === "update"), "aceitar sozinho não concede");
  assert.equal(consent.grantConsent(n.ctx), true);
  assert.deepEqual(n.dl().at(-1), ["consent", "update", todos("granted")]);
  assert.equal(n.guardado[G], "0");
  assert.equal(consent.grantConsent(n.ctx), false, "um granted por página");
  assert.equal(consentDe(n.dl()).filter((c) => c[1] === "update").length, 1);
  // na visita seguinte o <head> concede antes das tags
  const depois = rodarHead({ storage: { ...n.guardado } });
  assert.deepEqual(depois.dl()[2], ["consent", "update", todos("granted")]);
  // sem aceite, grantConsent não faz nada
  const sem = rodarHead();
  assert.equal(consent.grantConsent(sem.ctx), false);
  assert.equal(sem.dl().length, 2);
  // storage bloqueado: o aceite vale para esta página
  const bloq = rodarHead({ storage: "erro" });
  assert.equal(consent.acceptSiteChoice(bloq.ctx), true);
  assert.equal(consent.grantConsent(bloq.ctx), true);
  assert.equal(consent.readConsentChoice(bloq.ctx), null);
  assert.throws(() => consent.consentUpdateCommand("talvez"), /escolha/);
});

check("AJ2: Decline stores 'denied', sends update denied, deletes the site's GA/AdSense cookies and asks for a reload only if the tags were on the page", () => {
  const n = rodarHead({ cookie: "_ga=GA1.1.1; _ga_ABC123=GS1; _gid=x; __gads=ID=1; __gpi=UID=1; __eoi=ID=1; acerteamosca_jogador=7; NEXT_LOCALE=pt" });
  assert.equal(consent.declineSiteChoice(n.ctx), false, "sem tags na página: não recarrega");
  assert.equal(n.guardado[K], "denied");
  assert.deepEqual(n.dl().at(-1), ["consent", "update", todos("denied")]);
  const apagados = new Set(n.cookiesGravados.map((c) => c.split("=")[0]));
  assert.deepEqual([...apagados].sort(), ["__eoi", "__gads", "__gpi", "_ga", "_ga_ABC123", "_gid"]);
  // cada um em todas as variações de domínio (o GA grava no domínio mais alto)
  for (const d of ["", "; domain=.acerteamosca.com.br", "; domain=.com.br"]) {
    assert.ok(n.cookiesGravados.includes(`_ga=; Max-Age=0; path=/${d}`), d);
  }
  assert.ok(!n.cookiesGravados.some((c) => /acerteamosca_jogador|NEXT_LOCALE/.test(c)), "cookie do site apagado");
  // revogação depois de aceitar e conceder: denied e recarrega
  const r = rodarHead({ storage: { [K]: "granted", [G]: "0" } });
  assert.equal(r.ctx.__aamGoogleTags, true);
  assert.equal(consent.declineSiteChoice(r.ctx), true, "tags na página: recarrega");
  assert.deepEqual(r.dl().at(-1), ["consent", "update", todos("denied")]);
  assert.equal(consent.grantConsent(r.ctx), false, "depois de recusar, nada concede");
  const seguinte = rodarHead({ storage: { ...r.guardado } });
  assert.equal(seguinte.tags.length, 0, "página seguinte sem tags");
  assert.equal(seguinte.dl().length, 2);
});

check("AJ2: markGdprApplies (Google CMP says GDPR applies) remembers G=1 and turns a granted from this page into denied", () => {
  const r = rodarHead({ storage: { [K]: "granted", [G]: "0" } });
  assert.equal(consent.markGdprApplies(r.ctx), true);
  assert.deepEqual(r.dl().at(-1), ["consent", "update", todos("denied")]);
  assert.equal(r.guardado[G], "1");
  assert.equal(r.guardado[K], "granted", "o aceite do site continua: as tags trazem a mensagem do Google");
  const seguinte = rodarHead({ storage: { ...r.guardado } });
  assert.ok(!consentDe(seguinte.dl()).some((c) => c[1] === "update"));
  assert.equal(seguinte.tags.length, 2);
  // sem granted na página: só lembra
  const s = rodarHead({ storage: { [K]: "granted" } });
  const antes = s.dl().length;
  assert.equal(consent.markGdprApplies(s.ctx), false);
  assert.equal(s.dl().length, antes);
  assert.equal(s.guardado[G], "1");
  assert.equal(consent.readGdprFlag(s.ctx), "1");
  assert.equal(consent.readGdprFlag({ localStorage: { getItem() { throw new Error("x"); } } }), null);
});

check("the layout: consent-default is the only Google script and gets the validated IDs", () => {
  const layout = source("src/app/[locale]/layout.js");
  const iConsent = layout.indexOf('id="consent-default"');
  assert.ok(iConsent > 0, "sem o script consent-default");
  assert.ok(layout.indexOf("<head>") < iConsent && iConsent < layout.indexOf("</head>"), "consent fora do <head>");
  assert.match(layout, /__html: consentDefaultScript\(\{ adsClient: ADSENSE_ID, gaId: GA_ID \}\)/);
  assert.match(layout, /const GA_ID = isValidGaId\(process\.env\.NEXT_PUBLIC_GA_ID\)/);
  const codigo = layout.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/googletagmanager|adsbygoogle|AdSenseScript/.test(codigo), "tag do Google direto no HTML");
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
    "reopens the site's cookie notice", "Privacy & cookies",
    // AJ2: nada carregado antes do aceite, sem legítimo interesse para anúncios/medição, revogação apaga cookies
    "Até você aceitar, o site não carrega o Google Analytics nem o Google AdSense, nenhum cookie deles é gravado",
    "Não usamos o legítimo interesse como base para cookies de publicidade ou de medição",
    "o site apaga os cookies do Google Analytics e do AdSense gravados no domínio dele",
    "pelo botão Recusar do aviso de cookies do site",
    "Until you accept, the site does not load Google Analytics or Google AdSense, none of their cookies are set",
    "We do not rely on legitimate interests for advertising or measurement cookies",
    "the site deletes the Google Analytics and AdSense cookies set on its own domain",
    "with the Decline button of the site's cookie notice"]) {
    assert.ok(pol.includes(t), `política sem "${t}"`);
  }
  // nada da versão "legítimo interesse" para anúncios/medição, nem aviso "apenas informativo"
  for (const t of ["anúncios e medição se apoiam no legítimo interesse", "apenas informativo", "ads and measurement rely on legitimate interests", "informational only",
    "Fora dessas regiões, o aviso de cookies", "Outside those regions, the site's cookie notice",
    "Se você recusar, ainda poderá ver anúncios", "If you opt out, you may still see ads"]) {
    assert.ok(!pol.includes(t), `política ainda diz "${t}"`);
  }
  assert.match(pol, /22 de novembro de 2026/);
  assert.match(pol, /November 22, 2026/);
});

check("cookie notice decision (shouldShowNotice): shows right away with no choice (no CMP can exist before Accept); hidden after a choice or with the GDPR message", () => {
  const ver = (dismissed, gdprApplies) => cmp.shouldShowNotice({ dismissed, gdprApplies });
  for (const g of [undefined, null, false]) assert.equal(ver(false, g), true, String(g));
  assert.equal(ver(false, true), false, "mensagem do Google ativa: um banner só");
  for (const g of [true, false, null, undefined]) assert.equal(ver(true, g), false);
  assert.ok(!("CMP_NOTICE_DELAY_MS" in cmp), "espera pela CMP antes do aviso sobrando");
});

check("grantAfterWait: after Accept, granted only with an explicit 'not applicable' or no CMP at all when the wait ends", () => {
  assert.equal(cmp.grantAfterWait(false, true), true);
  assert.equal(cmp.grantAfterWait(false, false), true);
  assert.equal(cmp.grantAfterWait(null, false), true, "prazo acabou sem CMP nenhuma (Brasil sem Funding Choices)");
  assert.equal(cmp.grantAfterWait(null, true), false, "CMP presente e muda não concede");
  assert.equal(cmp.grantAfterWait(true, true), false);
  assert.equal(cmp.grantAfterWait(true, false), false);
  assert.equal(cmp.grantAfterWait(undefined, false), false);
  assert.ok(!("acceptDecision" in cmp), "acceptDecision sobrando");
  assert.equal(cmp.CMP_WATCH_TIMEOUT_MS, 10000);
});

check("the CookieConsent component: Accept/Decline of the same size, starts hidden, reopens from the footer link with focus", () => {
  const comp = source("src/components/CookieConsent.jsx");
  assert.match(comp, /const visible = shouldShowNotice\(estado\);/);
  assert.match(comp, /useState\(\{ dismissed: true, gdprApplies: undefined \}\)/);
  assert.match(comp, /if \(!escolha\) setEstado\(\(s\) => \(\{ \.\.\.s, dismissed: false \}\)\);/);
  assert.match(comp, /onClick=\{\(\) => escolher\("granted"\)\}/);
  assert.match(comp, /onClick=\{\(\) => escolher\("denied"\)\}/);
  assert.match(comp, /addEventListener\(CONSENT_REOPEN_EVENT, reabrir\)/);
  assert.match(comp, /style=\{botao\(false\)\}/);
  assert.match(comp, /style=\{botao\(true\)\}/);
  assert.match(comp, /minHeight: 44/);
  assert.match(comp, /<button ref=\{primeiroBotao\} type="button"/);
  assert.match(comp, /primeiroBotao\.current\.focus\(\)/);
  for (const loc of ["pt", "en"]) {
    const m = JSON.parse(source(`src/messages/${loc}.json`)).cookieConsent;
    assert.ok(m.accept && m.decline && m.text && m.policy && m.label, loc);
    assert.ok(!("ok" in m), `${loc}: botão ENTENDI sobrando`);
  }
  assert.equal(JSON.parse(source("src/messages/pt.json")).cookieConsent.accept, "ACEITAR");
  assert.equal(JSON.parse(source("src/messages/pt.json")).cookieConsent.decline, "RECUSAR");
  assert.equal(JSON.parse(source("src/messages/en.json")).cookieConsent.accept, "ACCEPT");
  assert.equal(JSON.parse(source("src/messages/en.json")).cookieConsent.decline, "DECLINE");
});

check("CookieConsent: Accept loads the tags and grants only through grantAfterWait / G=0; GDPR goes to markGdprApplies; Decline reloads only with tags on the page", () => {
  const comp = source("src/components/CookieConsent.jsx");
  assert.match(comp, /acceptSiteChoice\(window\);/);
  assert.match(comp, /if \(readGdprFlag\(window\) === "0"\) grantConsent\(window\);/);
  assert.match(comp, /if \(gdprApplies === true\) markGdprApplies\(window\);\s*else if \(grantAfterWait\(gdprApplies, typeof window\.__tcfapi === "function"\)\) grantConsent\(window\);/);
  assert.match(comp, /if \(escolha === "granted"\) acompanharCmp\(\);/);
  assert.match(comp, /if \(escolha === "denied"\) \{\s*if \(declineSiteChoice\(window\)\) window\.location\.reload\(\);/);
  // nenhum outro caminho concede, nem chama gtag direto
  assert.equal((comp.match(/grantConsent\(window\)/g) || []).length, 3);
  assert.ok(!/gtag\(/.test(comp), "o componente não fala com o gtag direto");
  assert.ok(!/applyConsentChoice|dropSiteChoiceForGdpr|acceptDecision/.test(comp), "API antiga sobrando");
});

check("footer link: Google message in the EEA, the site's notice elsewhere", () => {
  const link = source("src/components/PrivacyChoicesLink.jsx");
  assert.match(link, /window\.dispatchEvent\(new Event\(CONSENT_REOPEN_EVENT\)\)/);
  // no EEE sem a API do Google o link segue para a política (o aviso não abre lá)
  const i = link.indexOf("if (applies === true) return;");
  assert.ok(i > 0 && i < link.indexOf("window.dispatchEvent("), "EEE sem googlefc: o link tem de navegar");
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
