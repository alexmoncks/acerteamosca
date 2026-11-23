import { emailHtml, tokenize } from "@/lib/richtext";

// Texto das páginas institucionais com URLs e e-mails clicáveis.
// Componente de servidor (sem hooks): o HTML já sai pronto do servidor.
export default function RichText({ text, linkColor = "#00f0ff" }) {
  return tokenize(text).map((tok, i) => {
    if (tok.type === "url") {
      return (
        <a
          key={i}
          href={tok.value}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: linkColor, textDecoration: "underline", wordBreak: "break-word" }}
        >
          {tok.value}
        </a>
      );
    }
    if (tok.type === "email") {
      return <span key={i} dangerouslySetInnerHTML={{ __html: emailHtml(tok.value, linkColor) }} />;
    }
    return tok.value;
  });
}
