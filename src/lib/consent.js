// Modo de consentimento do Google (Consent Mode v2): o estado padrão, antes
// de qualquer tag do Google. Sem import nenhum: o layout, os componentes e os
// testes carregam este arquivo.
//
// OPÇÃO "denied global" (branch feat/consent-lote2-br-opcao, pendente de
// decisão do Alexander). Coerente com a política de privacidade desta opção:
//   - em todo lugar, Brasil incluído: tudo "denied" até a pessoa escolher.
//     wait_for_update: as tags esperam até 500 ms por uma atualização;
//   - EEE, Reino Unido e Suíça: quem pede a escolha é a mensagem de
//     consentimento do Google (Privacidade e mensagens do AdSense), que faz o
//     gtag('consent', 'update', …) com a integração ligada no painel;
//   - no resto do mundo: o aviso do site (CookieConsent) com Aceitar e
//     Recusar. Aceitar faz o gtag('consent', 'update', granted) e grava a
//     escolha; na visita seguinte, o script do <head> repete o update antes
//     do adsbygoogle.js, para a pessoa não voltar ao "denied".

/** Onde a escolha do aviso do site fica gravada (localStorage). */
export const CONSENT_STORAGE_KEY = "acerteamosca_consent_v1";
/** Evento que o link "Privacidade e cookies" dispara para reabrir o aviso. */
export const CONSENT_REOPEN_EVENT = "acerteamosca:consent-reopen";
export const CONSENT_WAIT_FOR_UPDATE_MS = 500;

const SINAIS = ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"];

function todos(valor) {
  return Object.fromEntries(SINAIS.map((s) => [s, valor]));
}

/** Os comandos do padrão, na ordem em que vão para o dataLayer. */
export function consentDefaultCommands() {
  return [
    // sem região: vale para o mundo todo
    ["consent", "default", { ...todos("denied"), wait_for_update: CONSENT_WAIT_FOR_UPDATE_MS }],
    // Com ad_storage negado, identificadores de clique saem redigidos e os
    // pedidos vão por domínio sem cookie de terceiro. Sem efeito quando
    // ad_storage é "granted". url_passthrough fica desligado.
    ["set", "ads_data_redaction", true],
  ];
}

/** O update de uma escolha do aviso do site: "granted" ou "denied". */
export function consentUpdateCommand(escolha) {
  if (escolha !== "granted" && escolha !== "denied") throw new Error(`escolha inválida: ${escolha}`);
  return ["consent", "update", todos(escolha)];
}

// O gtag do script do <head> (o mesmo `gtag` global do snippet do GA); se
// não houver, cria um igual.
function gtagDe(win) {
  if (typeof win.gtag !== "function") {
    win.dataLayer = win.dataLayer || [];
    win.gtag = function gtag() {
      win.dataLayer.push(arguments); // eslint-disable-line prefer-rest-params
    };
  }
  return win.gtag;
}

/** A escolha gravada, ou null (nenhuma, valor estranho ou storage bloqueado). */
export function readConsentChoice(win) {
  try {
    const v = win.localStorage.getItem(CONSENT_STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Grava a escolha e manda o update ao Google. Quem chama decide se pode
 * conceder (acceptDecision, em src/lib/cmp.js): no EEE, não.
 */
export function applyConsentChoice(win, escolha) {
  const comando = consentUpdateCommand(escolha);
  try {
    win.localStorage.setItem(CONSENT_STORAGE_KEY, escolha);
  } catch {
    // storage bloqueado: vale só para esta página
  }
  gtagDe(win)(...comando);
  return comando;
}

/**
 * A CMP do Google disse que o GDPR se aplica: a escolha do aviso do site não
 * vale ali. Apaga a escolha gravada e, se ela era "granted" (aceite feito
 * antes de a CMP responder, ou numa visita de fora do EEE), manda o update
 * "denied" na hora. Se a CMP já tiver concedido por conta própria, esse
 * denied vale só para esta página (falha para o lado da privacidade); na
 * seguinte, sem escolha gravada, só a CMP decide. Devolve a escolha apagada.
 */
export function dropSiteChoiceForGdpr(win) {
  const tinha = readConsentChoice(win);
  try {
    win.localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    // storage bloqueado: nada gravado para apagar
  }
  if (tinha === "granted") gtagDe(win)(...consentUpdateCommand("denied"));
  return tinha;
}

/**
 * O <script> inline do <head>, que roda antes do adsbygoogle.js e do gtag.js.
 * Define o mesmo `gtag` que o snippet do Google Analytics define depois e,
 * se a pessoa já aceitou numa visita anterior, repete o update "granted".
 */
export function consentDefaultScript() {
  const chamadas = consentDefaultCommands()
    .map((args) => `gtag(${args.map((a) => JSON.stringify(a)).join(",")});`)
    .join("");
  const update = consentUpdateCommand("granted").map((a) => JSON.stringify(a)).join(",");
  const lembrada = `try{if(localStorage.getItem(${JSON.stringify(CONSENT_STORAGE_KEY)})==="granted")gtag(${update});}catch(e){}`;
  return `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}${chamadas}${lembrada}`;
}
