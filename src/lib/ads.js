// Regras do AdSense que o código garante (auditoria de 21/11/2026).
// Sem import nenhum: os testes carregam este arquivo direto.

/** O publisher do site. Público: é o mesmo que está no ads.txt. */
export const ADSENSE_PUBLISHER = "ca-pub-4148140889800778";

/** `ca-pub-` + 16 dígitos. Qualquer outra coisa não liga anúncio nenhum. */
export function isValidAdClient(value) {
  return typeof value === "string" && /^ca-pub-\d{16}$/.test(value.trim());
}

/**
 * ID de bloco de anúncio (data-ad-slot): só dígitos, como o painel do AdSense
 * gera (hoje 10). Nome ("home_top", "mosca_between") nunca veicula, e é o que
 * o site usava; sem ID numérico, a unidade manual simplesmente não renderiza.
 */
export function isValidAdSlot(value) {
  return typeof value === "string" && /^\d{6,20}$/.test(value.trim());
}

/**
 * A largura a partir da qual vale a reserva de desktop. globals.css usa o
 * mesmo número na media query de .ad-reserva (tests/adsense.test.mjs confere).
 */
export const AD_DESKTOP_MIN_WIDTH = 768;

/**
 * Os blocos manuais do site. Cada um tem a sua variável
 * NEXT_PUBLIC_ADSENSE_SLOT_* (em AdBanner.jsx, por extenso), o formato do
 * <ins> (data-ad-format), a altura reservada antes do anúncio chegar (contra
 * CLS: para quem já aceitou, a caixa ocupa o espaço desde o HTML) e o nome
 * sugerido para a unidade no painel do AdSense (docs/adsense.md).
 *
 * Reservas:
 *   - home_top fica no meio da home, entre o destaque e a grade de jogos,
 *     ainda perto da primeira dobra: "horizontal" responsivo, que no celular
 *     veicula 320x50/320x100 e no desktop 728x90. Reserva 100 (mobile) / 90
 *     (desktop), a altura do maior desses tamanhos em cada faixa, para a
 *     grade abaixo não pular.
 *   - home_bottom, game_footer e content_bottom ficam no fim da página,
 *     depois do texto: "auto" responsivo (o Google escolhe o tamanho pela
 *     largura). No celular ele quase sempre entrega um retângulo (300x250,
 *     336x280) ou um bloco de largura total de altura parecida: reserva 280,
 *     o maior retângulo comum. No desktop (caixa de até 900px) o "auto" pode
 *     entregar 728x90 ou um retângulo de 250: reserva 250, o mais alto dos
 *     dois. Um anúncio de 90 deixa sobra em branco, mas não empurra nada (o
 *     bloco é o último item da página, abaixo da dobra); reservar só 90 faria
 *     a página pular 160px quando viesse um retângulo.
 */
export const AD_PLACEMENTS = {
  home_top: { format: "horizontal", minHeight: { mobile: 100, desktop: 90 }, nome: "AAM - Home topo" },
  home_bottom: { format: "auto", minHeight: { mobile: 280, desktop: 250 }, nome: "AAM - Home rodapé" },
  game_footer: { format: "auto", minHeight: { mobile: 280, desktop: 250 }, nome: "AAM - Jogo rodapé" },
  content_bottom: { format: "auto", minHeight: { mobile: 280, desktop: 250 }, nome: "AAM - Conteúdo rodapé" },
};

/**
 * NEXT_PUBLIC_ADSENSE_ADTEST: só o valor exato "on" marca o <ins> com
 * data-adtest="on" (prévia sem impressão real). Qualquer outro valor ("ON",
 * " on", "1", vazio) deixa o atributo de fora.
 */
export function adTestValue(value) {
  return value === "on" ? "on" : null;
}

/** NEXT_PUBLIC_ADSENSE_PLACEHOLDERS: só o valor exato "1" liga as caixas de prévia. */
export function placeholdersEnabled(value) {
  return value === "1";
}

/**
 * O que um bloco renderiza:
 *   - "ad": publisher válido e ID numérico de bloco: o <ins> do AdSense;
 *   - "placeholder": sem ID numérico e com NEXT_PUBLIC_ADSENSE_PLACEHOLDERS=1:
 *     a mesma caixa (reserva, rótulo, oculta até o aceite) com um retângulo
 *     tracejado e SEM <ins>, que nunca pede anúncio. Desligado por padrão; a
 *     produção nunca define a variável;
 *   - null: nada (placement desconhecido, ou sem ID e sem prévia).
 */
export function adBlockMode({ placement, client, slot, placeholders }) {
  if (!Object.prototype.hasOwnProperty.call(AD_PLACEMENTS, placement)) return null;
  if (isValidAdClient(client) && isValidAdSlot(slot)) return "ad";
  if (!isValidAdSlot(slot) && placeholdersEnabled(placeholders)) return "placeholder";
  return null;
}

/**
 * As variáveis CSS da reserva de um placement (globals.css lê em
 * .ad-reserva, com a media query de AD_DESKTOP_MIN_WIDTH).
 */
export function adReserveStyle(placement) {
  const p = AD_PLACEMENTS[placement];
  if (!p) return {};
  return {
    "--aam-ad-min-mobile": `${p.minHeight.mobile}px`,
    "--aam-ad-min-desktop": `${p.minHeight.desktop}px`,
  };
}
