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
