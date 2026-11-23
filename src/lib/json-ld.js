// Serializa JSON-LD para <script type="application/ld+json"> com
// dangerouslySetInnerHTML.
//
// JSON.stringify sozinho não escapa "<": um texto com "</script>" (vindo de
// tradução, de dado do banco ou de quem editar o conteúdo depois) fecharia a
// tag e o resto viraria HTML/JS da página. Trocar <, > e & pelos escapes
// unicode de JSON (barra invertida + u003c, u003e, u0026) mantém o JSON
// idêntico para quem o lê (o Google e JSON.parse decodificam) e impede a
// quebra. Os separadores de linha U+2028/U+2029 também saem escapados.
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);
const PERIGOSOS = new RegExp(`[<>&${LS}${PS}]`, "g");

/** "<" -> "<" (com a barra), e assim por diante. */
function escapeUnicode(c) {
  return "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0");
}

export function jsonLdHtml(data) {
  return JSON.stringify(data).replace(PERIGOSOS, escapeUnicode);
}
