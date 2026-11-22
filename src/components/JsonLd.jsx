import { getNonce } from "@/lib/nonce";
import { jsonLdHtml } from "@/lib/json-ld";

// JSON-LD (schema.org) renderizado no servidor, com o nonce da CSP do pedido.
// O navegador não executa application/ld+json, mas o nonce deixa todo
// <script> da página sob a mesma regra. O conteúdo passa por jsonLdHtml, que
// escapa < > & (src/lib/json-ld.js).
export default function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      nonce={getNonce()}
      dangerouslySetInnerHTML={{ __html: jsonLdHtml(data) }}
    />
  );
}
