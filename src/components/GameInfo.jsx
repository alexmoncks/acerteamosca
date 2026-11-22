// Texto editorial de cada página de jogo: intro + seções (como jogar,
// controles, dicas, origem).
//
// Fica ABERTO, sem <details>/<summary>. A auditoria AdSense de 21/11/2026
// achou o texto recolhido: quem revisa a página vê só o canvas e a página
// parece "conteúdo de baixo valor" (motivo exato do aviso no nailedthefly.com).
// Este é um componente de servidor (sem "use client"), então o texto inteiro
// sai no HTML que o servidor entrega, visível sem clique e sem JavaScript.
// A chave `summary` dos dados continua com esse nome só para não mexer nas
// 14 páginas; aqui ela vira o título <h3> da seção.
//
// O <h1> da página de jogo também sai daqui, no HTML do servidor, com texto
// de src/messages/{pt,en}.json (gameHeadings[slug]). O jogo carrega no
// cliente (ssr: false), então um <h1> dentro dele não chegava ao servidor; os
// títulos internos dos jogos agora são <h2>, para este ser o único <h1>.
// Fica no topo do bloco editorial, logo abaixo do jogo, e não acima: o
// 3INVADER e o Kung Fu Castle ocupam a altura exata da tela, e uma linha a
// mais em cima empurraria os controles para fora no celular.
import { getTranslations } from "next-intl/server";

export default async function GameInfo({ slug, content, locale }) {
  const c = locale === "en" ? content.en : content.pt;
  const t = await getTranslations({ locale, namespace: "gameHeadings" });

  return (
    <section style={wrapperStyle} aria-labelledby="game-info-title">
      <h1 style={h1Style}>{t(slug)}</h1>
      <h2 id="game-info-title" style={h2Style}>
        {c.title}
      </h2>
      <p style={introStyle}>{c.intro}</p>
      {c.details.map((d, i) => (
        <section key={i} style={sectionStyle}>
          <h3 style={h3Style}>{d.summary}</h3>
          <div style={bodyStyle}>
            {d.body.map((para, j) => (
              <p key={j} style={paraStyle}>
                {para}
              </p>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}

const wrapperStyle = {
  maxWidth: 800,
  margin: "40px auto 0",
  padding: "0 20px",
  color: "#ccd6f6",
  fontFamily: "'Fira Code', monospace",
  lineHeight: 1.7,
};

const h1Style = {
  fontFamily: "'Press Start 2P', monospace",
  fontSize: 16,
  fontWeight: "normal",
  color: "#ffffff",
  textShadow: "0 0 10px rgba(0,240,255,0.45)",
  lineHeight: 1.6,
  letterSpacing: 0.5,
  paddingBottom: 14,
  marginBottom: 20,
  borderBottom: "1px solid rgba(0,240,255,0.25)",
};

const h2Style = {
  fontFamily: "'Press Start 2P', monospace",
  fontSize: 14,
  color: "#00f0ff",
  textShadow: "0 0 8px rgba(0,240,255,0.3)",
  marginBottom: 12,
  letterSpacing: 0.5,
};

const introStyle = {
  fontSize: 13,
  color: "#ccd6f6",
  marginBottom: 24,
};

const sectionStyle = {
  marginBottom: 12,
  background: "rgba(0,240,255,0.04)",
  borderLeft: "2px solid rgba(0,240,255,0.4)",
  borderRadius: 4,
  overflow: "hidden",
};

const h3Style = {
  fontFamily: "'Press Start 2P', monospace",
  fontSize: 11,
  fontWeight: "normal",
  color: "#00f0ff",
  padding: "12px 16px 0",
  margin: 0,
  letterSpacing: 0.5,
  lineHeight: 1.6,
};

const bodyStyle = {
  padding: "8px 16px 14px",
};

const paraStyle = {
  fontSize: 12,
  color: "#8892b0",
  marginBottom: 10,
};
