// Modo de consentimento do Google (Consent Mode v2) e carregamento das tags
// do Google só depois do aceite. Sem import nenhum: o layout, os componentes
// e os testes carregam este arquivo.
//
// Decisão do Alexander (22/11/2026): consentimento prévio também no Brasil.
//   - Em todo lugar, Brasil incluído, o padrão é tudo "denied", sem região.
//   - O adsbygoogle.js e o gtag.js NÃO entram na página antes do Aceitar do
//     aviso do site (modo básico). Medido na prévia: com as tags no HTML e
//     tudo "denied", o AdSense ainda gravava test_cookie e IDE em
//     .doubleclick.net antes de qualquer clique. Recusar mantém as tags fora.
//   - Aceitar grava a escolha e carrega as tags. O "granted" vai para o
//     Google só onde a mensagem GDPR do Google não se aplica (a CMP diz que
//     não se aplica, ou nenhuma CMP aparece no prazo). No EEE, Reino Unido e
//     Suíça, quem pede e manda o consentimento continua sendo a mensagem do
//     Google (Privacidade e mensagens do AdSense), que o adsbygoogle.js
//     carrega depois do aceite do site.
//   - O que o site descobriu sobre a CMP fica em GDPR_STORAGE_KEY: com "0"
//     (sem GDPR aqui), o script do <head> já repete o "granted" nas páginas
//     seguintes, antes das tags.

/** A escolha do aviso do site (localStorage): "granted" ou "denied". */
export const CONSENT_STORAGE_KEY = "acerteamosca_consent_v1";
/** O que o site viu da CMP do Google: "0" = GDPR não se aplica; "1" = aplica. */
export const GDPR_STORAGE_KEY = "acerteamosca_gdpr_v1";
/** Evento que o link "Privacidade e cookies" dispara para reabrir o aviso. */
export const CONSENT_REOPEN_EVENT = "acerteamosca:consent-reopen";
export const CONSENT_WAIT_FOR_UPDATE_MS = 500;
/** Função global, definida pelo script do <head>, que injeta as tags. */
export const GOOGLE_TAGS_LOADER = "__aamLoadGoogleTags";
/** Marca de que as tags já foram injetadas nesta página. */
export const GOOGLE_TAGS_FLAG = "__aamGoogleTags";
/** Marca de que esta página já mandou o update "granted". */
export const GRANTED_FLAG = "__aamGranted";
/** Marca do Aceitar feito nesta página (vale mesmo com o storage bloqueado). */
const ACCEPTED_FLAG = "__aamAccepted";

const SINAIS = ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"];

// Cookies que o GA e o AdSense gravam no domínio do site. Apagados quando a
// pessoa revoga (os de domínios do Google, o site não alcança).
const COOKIE_GOOGLE_PRIMEIRA_PARTE = /^(_ga|_ga_[A-Za-z0-9_]+|_gid|_gat[A-Za-z0-9_]*|_gcl_[a-z]+|_gac_[A-Za-z0-9_]+|__gads|__gpi|__eoi)$/;

function todos(valor) {
  return Object.fromEntries(SINAIS.map((s) => [s, valor]));
}

/** ID do GA4 no formato G-XXXXXXX; qualquer outra coisa não liga o GA. */
export function isValidGaId(id) {
  return typeof id === "string" && /^G-[A-Z0-9]{4,20}$/.test(id.trim());
}

/** Os comandos do padrão, na ordem em que vão para o dataLayer. */
export function consentDefaultCommands() {
  return [
    // sem região: vale para o mundo todo
    ["consent", "default", { ...todos("denied"), wait_for_update: CONSENT_WAIT_FOR_UPDATE_MS }],
    // Com ad_storage negado, identificadores de clique saem redigidos. Sem
    // efeito quando ad_storage é "granted". url_passthrough fica desligado.
    ["set", "ads_data_redaction", true],
  ];
}

/** O update de uma escolha: "granted" ou "denied". */
export function consentUpdateCommand(escolha) {
  if (escolha !== "granted" && escolha !== "denied") throw new Error(`escolha inválida: ${escolha}`);
  return ["consent", "update", todos(escolha)];
}

// O gtag do script do <head>; se não houver, cria um igual.
function gtagDe(win) {
  if (typeof win.gtag !== "function") {
    win.dataLayer = win.dataLayer || [];
    win.gtag = function gtag() {
      win.dataLayer.push(arguments); // eslint-disable-line prefer-rest-params
    };
  }
  return win.gtag;
}

function ler(win, chave) {
  try {
    return win.localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravar(win, chave, valor) {
  try {
    win.localStorage.setItem(chave, valor);
  } catch {
    // storage bloqueado: vale só para esta página
  }
}

/** A escolha gravada, ou null (nenhuma, valor estranho ou storage bloqueado). */
export function readConsentChoice(win) {
  const v = ler(win, CONSENT_STORAGE_KEY);
  return v === "granted" || v === "denied" ? v : null;
}

/** "0", "1" ou null: o que o site já sabe da mensagem GDPR do Google. */
export function readGdprFlag(win) {
  const v = ler(win, GDPR_STORAGE_KEY);
  return v === "0" || v === "1" ? v : null;
}

/** Injeta o adsbygoogle.js e o gtag.js (uma vez por página). */
export function loadGoogleTags(win) {
  return typeof win[GOOGLE_TAGS_LOADER] === "function" ? win[GOOGLE_TAGS_LOADER]() : false;
}

/** Aceitar no aviso do site: grava a escolha e carrega as tags. */
export function acceptSiteChoice(win) {
  win[ACCEPTED_FLAG] = true;
  gravar(win, CONSENT_STORAGE_KEY, "granted");
  return loadGoogleTags(win);
}

/**
 * Manda o update "granted" (uma vez por página) e lembra que aqui a mensagem
 * GDPR do Google não se aplica. Só para quem já aceitou no aviso do site e
 * fora do EEE (quem chama decide, com grantAfterWait de src/lib/cmp.js).
 */
export function grantConsent(win) {
  if (!win[ACCEPTED_FLAG] && readConsentChoice(win) !== "granted") return false;
  gravar(win, GDPR_STORAGE_KEY, "0");
  if (win[GRANTED_FLAG]) return false;
  win[GRANTED_FLAG] = true;
  gtagDe(win)(...consentUpdateCommand("granted"));
  return true;
}

/**
 * A CMP do Google disse que o GDPR se aplica: a escolha de consentimento é
 * dela. O aceite do site continua valendo só para carregar as tags (é o
 * adsbygoogle.js que traz a mensagem do Google). Se esta página já tinha
 * mandado "granted" (o <head> de quem aceitou fora do EEE), manda "denied"
 * na hora. Devolve true se mandou o denied.
 */
export function markGdprApplies(win) {
  gravar(win, GDPR_STORAGE_KEY, "1");
  if (!win[GRANTED_FLAG]) return false;
  win[GRANTED_FLAG] = false;
  gtagDe(win)(...consentUpdateCommand("denied"));
  return true;
}

/** Apaga os cookies do GA/AdSense do domínio do site (todas as variações de domínio). */
export function clearGoogleCookies(win) {
  const doc = win.document;
  if (!doc) return [];
  const nomes = String(doc.cookie || "")
    .split(/;\s*/)
    .map((p) => p.split("=")[0])
    .filter((n) => COOKIE_GOOGLE_PRIMEIRA_PARTE.test(n));
  const partes = String((win.location && win.location.hostname) || "").split(".");
  const dominios = [null];
  for (let i = 0; i < partes.length - 1; i++) dominios.push("." + partes.slice(i).join("."));
  for (const nome of nomes) {
    for (const d of dominios) doc.cookie = `${nome}=; Max-Age=0; path=/${d ? `; domain=${d}` : ""}`;
  }
  return nomes;
}

/**
 * Recusar no aviso do site (também serve para revogar pelo link do rodapé):
 * grava a recusa, manda o update "denied" e apaga os cookies do Google do
 * domínio do site. Devolve true se as tags já estavam nesta página: aí quem
 * chama recarrega, para nenhuma tag do Google continuar rodando.
 */
export function declineSiteChoice(win) {
  gravar(win, CONSENT_STORAGE_KEY, "denied");
  win[ACCEPTED_FLAG] = false;
  win[GRANTED_FLAG] = false;
  gtagDe(win)(...consentUpdateCommand("denied"));
  clearGoogleCookies(win);
  return !!win[GOOGLE_TAGS_FLAG];
}

/**
 * O <script> inline do <head>. Roda antes de qualquer tag do Google:
 *   1. define o `gtag` global e o default "denied" (o mundo todo);
 *   2. define window.__aamLoadGoogleTags, que injeta o adsbygoogle.js (como
 *      o painel entrega: async + crossorigin) e o gtag.js, com o nonce deste
 *      script (a CSP tem 'strict-dynamic');
 *   3. se a pessoa já aceitou: repete o "granted" quando o site já sabe que
 *      a mensagem GDPR do Google não se aplica ali, e carrega as tags.
 * Sem aceite gravado, nenhuma tag do Google entra na página.
 */
export function consentDefaultScript({ adsClient = null, gaId = null } = {}) {
  const chamadas = consentDefaultCommands()
    .map((args) => `gtag(${args.map((a) => JSON.stringify(a)).join(",")});`)
    .join("");
  const update = consentUpdateCommand("granted").map((a) => JSON.stringify(a)).join(",");
  const ads = adsClient && /^ca-pub-\d{16}$/.test(adsClient) ? adsClient : null;
  const ga = isValidGaId(gaId) ? gaId.trim() : null;
  const injeta = [
    ads ? `a("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads}",1);` : "",
    ga ? `a("https://www.googletagmanager.com/gtag/js?id=${ga}");gtag("js",new Date());gtag("config",${JSON.stringify(ga)});` : "",
  ].join("");
  const carregador =
    `var n=document.currentScript&&document.currentScript.nonce;` +
    `window.${GOOGLE_TAGS_LOADER}=function(){if(window.${GOOGLE_TAGS_FLAG})return false;window.${GOOGLE_TAGS_FLAG}=true;` +
    `function a(u,c){var s=document.createElement("script");s.async=true;s.src=u;if(n)s.nonce=n;if(c)s.crossOrigin="anonymous";document.head.appendChild(s);}` +
    `${injeta}return true;};`;
  const lembrada =
    `try{if(localStorage.getItem(${JSON.stringify(CONSENT_STORAGE_KEY)})==="granted"){` +
    `if(localStorage.getItem(${JSON.stringify(GDPR_STORAGE_KEY)})==="0"){window.${GRANTED_FLAG}=true;gtag(${update});}` +
    `window.${GOOGLE_TAGS_LOADER}();}}catch(e){}`;
  return `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}${chamadas}(function(){${carregador}${lembrada}})();`;
}
