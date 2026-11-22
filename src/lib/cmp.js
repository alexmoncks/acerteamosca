// Mensagem de consentimento do Google (Privacidade e mensagens do AdSense,
// antigo Funding Choices), vista pelo lado do site (lote 2). Sem import
// nenhum: os componentes e os testes carregam este arquivo. Tudo recebe o
// `win` (window) por parâmetro, para dar para testar com um objeto falso.
//
// A tag do AdSense já carrega a CMP do Google. Nas regiões em que a mensagem
// GDPR se aplica (EEE, Reino Unido, Suíça), ela expõe a API do IAB TCF v2
// (window.__tcfapi) e responde gdprApplies = true. Fora delas, ou com
// bloqueador de anúncios, pode nem carregar.

export const CMP_POLL_MS = 250;
/** Quanto o aviso do site espera a CMP antes de aparecer. */
export const CMP_NOTICE_DELAY_MS = 2500;
/** Até quando o site continua perguntando à CMP. */
export const CMP_WATCH_TIMEOUT_MS = 10000;

/**
 * Uma pergunta ao __tcfapi ("ping", TCF v2). Devolve true/false quando a CMP
 * já sabe se o GDPR se aplica; undefined se não há CMP ou ela ainda carrega.
 */
export function pingGdprApplies(win) {
  if (!win || typeof win.__tcfapi !== "function") return Promise.resolve(undefined);
  return new Promise((resolve) => {
    let feito = false;
    const fim = (v) => {
      if (!feito) {
        feito = true;
        resolve(v);
      }
    };
    try {
      win.__tcfapi("ping", 2, (ping) => {
        fim(ping && typeof ping.gdprApplies === "boolean" ? ping.gdprApplies : undefined);
      });
    } catch {
      fim(undefined);
    }
    // stub que nunca chama o callback não pode travar quem pergunta
    setTimeout(() => fim(undefined), CMP_POLL_MS);
  });
}

/**
 * Pergunta à CMP a cada CMP_POLL_MS até ela responder ou o tempo acabar.
 * Resolve true (mensagem GDPR do Google ativa), false (CMP diz que não se
 * aplica) ou null (nenhuma CMP respondeu no prazo).
 */
export function watchGdprCmp(win, { timeoutMs = CMP_WATCH_TIMEOUT_MS, pollMs = CMP_POLL_MS } = {}) {
  const inicio = Date.now();
  return new Promise((resolve) => {
    const tentar = async () => {
      const applies = await pingGdprApplies(win);
      if (typeof applies === "boolean") return resolve(applies);
      if (Date.now() - inicio >= timeoutMs) return resolve(null);
      setTimeout(tentar, pollMs);
    };
    tentar();
  });
}

/**
 * Ping ao __tcfapi esperando resposta na hora (CMP carregada responde de
 * forma síncrona). Para o clique no link, que precisa decidir na hora: se a
 * CMP só ficou pronta depois que o watchGdprCmp desistiu, o clique ainda
 * acha a mensagem do Google. true/false, ou undefined se não deu para saber.
 */
export function pingGdprAppliesNow(win) {
  if (!win || typeof win.__tcfapi !== "function") return undefined;
  let applies;
  try {
    win.__tcfapi("ping", 2, (ping) => {
      if (ping && typeof ping.gdprApplies === "boolean") applies = ping.gdprApplies;
    });
  } catch {
    return undefined;
  }
  return applies;
}

/**
 * O aviso de cookies do site aparece? Função pura, para o CookieConsent e
 * para os testes:
 *   - fechado antes (localStorage)  -> não;
 *   - a CMP do Google diz que o GDPR se aplica -> não (a mensagem dela já
 *     cobre isso; dois banners, não);
 *   - a CMP diz que não se aplica -> sim, logo;
 *   - nenhuma resposta ainda (undefined) ou nenhuma CMP (null) -> só depois
 *     de CMP_NOTICE_DELAY_MS.
 */
export function shouldShowNotice({ dismissed, gdprApplies, delayElapsed }) {
  if (dismissed) return false;
  if (gdprApplies === true) return false;
  if (gdprApplies === false) return true;
  return !!delayElapsed;
}

/**
 * O que um "Aceitar" do aviso do site pode fazer (opção "denied global").
 * No EEE/Reino Unido/Suíça só a CMP certificada do Google pode colher o
 * consentimento, então o aviso só concede quando sabe que não está lá:
 *   - "cmp":   a CMP diz que o GDPR se aplica: a escolha é dela, o site não
 *              concede nada;
 *   - "grant": a CMP diz que não se aplica, ou não há CMP na página;
 *   - "wait":  há CMP (window.__tcfapi) e ela ainda não respondeu: espera a
 *              resposta (watchGdprCmp) antes de conceder.
 * `gdprApplies` é o que o watchGdprCmp já sabe; `pingNow`, a pergunta feita
 * na hora do clique (pingGdprAppliesNow); `cmpPresent`, se há __tcfapi.
 */
export function acceptDecision({ gdprApplies, pingNow, cmpPresent }) {
  if (gdprApplies === true || pingNow === true) return "cmp";
  if (gdprApplies === false || pingNow === false) return "grant";
  return cmpPresent ? "wait" : "grant";
}

/** A API de revogação do Google está carregada? */
export function canShowGoogleRevocation(win) {
  return !!(win && win.googlefc && typeof win.googlefc.showRevocationMessage === "function");
}

/**
 * O que o link "Privacidade e cookies" faz: reabrir a mensagem do Google
 * (só onde o GDPR se aplica e a API está carregada) ou levar à política.
 * Fora do EEE a mensagem GDPR não existe, e chamar a revogação não mostraria
 * nada: o clique pareceria quebrado.
 */
export function privacyChoicesAction(win, gdprApplies) {
  return gdprApplies === true && canShowGoogleRevocation(win) ? "google" : "policy";
}

/**
 * Reabre a mensagem de consentimento do Google pela fila de callbacks, que é
 * o jeito suportado de chamar a API (developers.google.com/funding-choices/
 * fc-api-docs). Devolve false se a API não está lá.
 */
export function showGoogleRevocation(win) {
  if (!canShowGoogleRevocation(win)) return false;
  const fc = win.googlefc;
  fc.callbackQueue = fc.callbackQueue || [];
  fc.callbackQueue.push({ CONSENT_DATA_READY: () => fc.showRevocationMessage() });
  return true;
}
