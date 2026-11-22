// Modo de consentimento v2 (lote 2).
//
// Comportamento: o script do <head> é executado num contexto isolado (vm),
// como o navegador faria, e o dataLayer resultante é conferido.
import assert from "node:assert/strict";
import vm from "node:vm";
import { check, source, loadModule } from "./helpers.mjs";

const consent = await loadModule("src/lib/consent.js");

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
