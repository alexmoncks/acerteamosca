// Quebra um parágrafo em pedaços de texto, URL e e-mail, para as páginas
// institucionais virarem links clicáveis sem HTML nos textos.
// Sem import nenhum: os testes carregam este arquivo direto.

const TOKEN = /(https?:\/\/[^\s<>"]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g;
const TRAILING = /[.,;:!?)]+$/;

/** [{ type: "text" | "url" | "email", value }] */
export function tokenize(text) {
  const out = [];
  let last = 0;
  for (const m of String(text).matchAll(TOKEN)) {
    let value = m[0];
    const trail = value.match(TRAILING)?.[0] ?? "";
    if (trail) value = value.slice(0, -trail.length);
    if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
    out.push({ type: value.includes("@") && !value.startsWith("http") ? "email" : "url", value });
    last = m.index + value.length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

/**
 * O e-mail como HTML protegido da "Email Address Obfuscation" da Cloudflare.
 *
 * Com a ofuscação ligada, a Cloudflare troca todo e-mail do HTML por
 * "[email protected]" e só o JavaScript dela devolve o endereço — crawler e
 * revisor sem JS veem uma página de contato sem contato. O trecho entre
 * <!--email_off--> e <!--/email_off--> é o que a Cloudflare documenta como
 * exceção: ela não mexe nele. Assim o e-mail aparece em texto mesmo com a
 * ofuscação ligada (desligá-la no painel continua recomendado).
 */
export function emailHtml(email, color = "#00f0ff") {
  const e = escapeHtml(email);
  return `<!--email_off--><a href="mailto:${e}" style="color:${escapeHtml(color)};text-decoration:underline">${e}</a><!--/email_off-->`;
}
