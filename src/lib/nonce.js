import { headers } from "next/headers";
import { isValidNonce } from "@/lib/csp";

// O nonce da CSP deste pedido, que o middleware gerou (src/middleware.js) e
// passou no cabeçalho x-nonce. Só em componente de servidor. Chamar isto
// torna a página dinâmica, e é o que se quer: HTML pré-gerado teria um
// nonce fixo.
//
// Em caminho com ponto (que não passa pelo middleware, ex.: a 404 de
// "/x.y") o x-nonce, se existir, veio do cliente. Por isso: só um nonce em
// formato válido, e só se a CSP do pedido (que o middleware escreve junto)
// trouxer o mesmo nonce. Fora disso, nenhum nonce; e esses caminhos levam a
// CSP fixa sem script inline (src/lib/csp.js, STATIC_CSP).
export function getNonce() {
  const h = headers();
  const nonce = h.get("x-nonce");
  if (!isValidNonce(nonce)) return undefined;
  return (h.get("content-security-policy") || "").includes(`'nonce-${nonce}'`) ? nonce : undefined;
}
