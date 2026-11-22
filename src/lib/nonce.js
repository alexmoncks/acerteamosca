import { headers } from "next/headers";

// O nonce da CSP deste pedido, que o middleware gerou (src/middleware.js) e
// passou no cabeçalho x-nonce. Só em componente de servidor. Chamar isto
// torna a página dinâmica, e é o que se quer: HTML pré-gerado teria um
// nonce fixo.
export function getNonce() {
  return headers().get("x-nonce") ?? undefined;
}
