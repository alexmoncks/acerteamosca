// Modo de consentimento do Google (Consent Mode v2): o estado padrão, antes
// de qualquer tag do Google (lote 2). Sem import nenhum: o layout e os
// testes carregam este arquivo.
//
// Coerente com a política de privacidade (seção 3):
//   - EEE, Reino Unido e Suíça: tudo "denied" até a mensagem de
//     consentimento do Google (Privacidade e mensagens do AdSense) receber a
//     escolha. Com a integração da mensagem com o Consent Mode ligada no
//     painel, a própria CMP do Google faz o gtag('consent', 'update', …).
//     wait_for_update: as tags esperam até 500 ms por essa atualização.
//   - Resto do mundo (Brasil incluído): "granted", porque anúncios e medição
//     se apoiam no legítimo interesse, com as opções de recusa da seção 6.
//
// Precedência (developers.google.com/tag-platform/security/guides/consent):
// o default com região vale para a região; o default sem região vale para
// todo o resto. A ordem dos dois comandos não muda isso.

/** UE (27) + Islândia, Liechtenstein e Noruega (EEE) + Reino Unido + Suíça. ISO 3166-1 alfa-2. */
export const CONSENT_DENIED_REGIONS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "IS", "LI", "NO",
  "GB",
  "CH",
];

export const CONSENT_WAIT_FOR_UPDATE_MS = 500;

const SINAIS = ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"];

function todos(valor) {
  return Object.fromEntries(SINAIS.map((s) => [s, valor]));
}

/** Os comandos, na ordem em que vão para o dataLayer. */
export function consentDefaultCommands() {
  return [
    ["consent", "default", {
      ...todos("denied"),
      region: CONSENT_DENIED_REGIONS,
      wait_for_update: CONSENT_WAIT_FOR_UPDATE_MS,
    }],
    ["consent", "default", todos("granted")],
    // Com ad_storage negado, identificadores de clique saem redigidos e os
    // pedidos vão por domínio sem cookie de terceiro. Sem efeito quando
    // ad_storage é "granted". url_passthrough fica desligado.
    ["set", "ads_data_redaction", true],
  ];
}

/**
 * O <script> inline do <head>, que roda antes do adsbygoogle.js e do gtag.js.
 * Define o mesmo `gtag` que o snippet do Google Analytics define depois.
 */
export function consentDefaultScript() {
  const chamadas = consentDefaultCommands()
    .map((args) => `gtag(${args.map((a) => JSON.stringify(a)).join(",")});`)
    .join("");
  return `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}${chamadas}`;
}
