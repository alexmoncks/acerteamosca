import { setRequestLocale } from "next-intl/server";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isPt = locale === "pt";
  return {
    title: isPt ? "Sobre o Acerte a Mosca | História e Missão" : "About Nailed The Fly | Story and Mission",
    description: isPt
      ? "Conheça a história, a missão e o time por trás do Acerte a Mosca, plataforma brasileira de jogos HTML5 gratuitos."
      : "Learn the story, mission and team behind Nailed The Fly, a free HTML5 gaming platform.",
    robots: { index: true, follow: true },
  };
}

const contentPT = {
  title: "Sobre o Acerte a Mosca",
  intro:
    "O Acerte a Mosca é uma plataforma brasileira de jogos HTML5 nascida do desejo simples de matar uma mosca chata com um chinelo — e que cresceu para virar uma coleção de 14+ jogos clássicos remasterizados para o navegador.",
  sections: [
    {
      h: "Nossa história",
      p: [
        "Tudo começou em 2024, quando o desenvolvedor Alex Marra criou uma versão digital do clássico \"acerte a mosca com o chinelo\" para se divertir entre projetos. O retorno positivo de amigos e familiares mostrou que existia espaço para uma plataforma de jogos rápidos, gratuitos e nostálgicos — sem downloads, sem anúncios invasivos no meio do gameplay e sem barreiras.",
        "A partir daí, o catálogo foi crescendo: Pong, Wordle BR, Memory, 2048, Brick Breaker, Bubble Shooter, Jacaré, Tiro ao Alvo, Batalha Naval, 3Invader, Kung Fu Castle e muito mais. Cada jogo é desenvolvido do zero, com foco em performance no celular e em loops de gameplay curtos e satisfatórios.",
      ],
    },
    {
      h: "Nossa missão",
      p: [
        "Trazer de volta a sensação dos arcades dos anos 80 e 90 para qualquer pessoa com um navegador. Acreditamos que jogo bom não precisa ser caro, complexo ou pesado — ele precisa ser divertido nos primeiros 5 segundos e viciante nos 5 minutos seguintes.",
      ],
    },
    {
      h: "Tecnologia",
      p: [
        "Os jogos são desenvolvidos com HTML5, JavaScript moderno, React, Next.js e Pixi.js. Todo o código roda no navegador, sem necessidade de download. Para multiplayer, usamos servidores WebSocket leves hospedados no Brasil.",
        "O site é progressivo (PWA): você pode instalar o Acerte a Mosca como um app no celular ou desktop e jogar até offline em alguns títulos.",
      ],
    },
    {
      h: "Quem está por trás",
      p: [
        "Acerte a Mosca é um projeto da MMSoft Digital, fundada e operada por Alex Marra (alex@marramoncks.com.br). É um projeto pessoal, sustentado pela receita de publicidade da própria plataforma e por parceiros patrocinadores.",
      ],
    },
    {
      h: "Quer falar com a gente?",
      p: [
        "Use a página de Contato ou escreva direto para alex@marramoncks.com.br. Sugestões de novos jogos, parcerias e feedback são muito bem-vindos.",
      ],
    },
  ],
};

const contentEN = {
  title: "About Nailed The Fly",
  intro:
    "Nailed The Fly is a Brazilian HTML5 gaming platform born from the simple desire to swat an annoying fly with a flip-flop — and which grew into a collection of 14+ classic games remastered for the browser.",
  sections: [
    {
      h: "Our story",
      p: [
        "It all started in 2024, when developer Alex Marra built a digital version of the classic \"nail the fly with a flip-flop\" game just for fun between projects. Positive feedback from friends and family showed there was space for a platform of quick, free and nostalgic games — no downloads, no invasive ads mid-gameplay, no barriers.",
        "From there, the catalog kept growing: Pong, Wordle, Memory, 2048, Brick Breaker, Bubble Shooter, Frogger-style Jacaré, target shooting, Battleship, 3Invader, Kung Fu Castle and more. Each game is built from scratch, focused on mobile performance and short, satisfying gameplay loops.",
      ],
    },
    {
      h: "Our mission",
      p: [
        "Bring back the feeling of 80s and 90s arcades to anyone with a browser. We believe a good game does not need to be expensive, complex or heavy — it needs to be fun in the first 5 seconds and addictive in the next 5 minutes.",
      ],
    },
    {
      h: "Technology",
      p: [
        "Games are built with HTML5, modern JavaScript, React, Next.js and Pixi.js. Everything runs in the browser, no download required. For multiplayer, we use lightweight WebSocket servers hosted in Brazil.",
        "The site is a PWA: you can install Nailed The Fly as an app on mobile or desktop and even play some titles offline.",
      ],
    },
    {
      h: "Who is behind it",
      p: [
        "Nailed The Fly is a project by MMSoft Digital, founded and operated by Alex Marra (alex@marramoncks.com.br). It is a personal project, sustained by ad revenue from the platform itself and by sponsor partners.",
      ],
    },
    {
      h: "Want to talk to us?",
      p: [
        "Use the Contact page or write directly to alex@marramoncks.com.br. Suggestions for new games, partnerships and feedback are very welcome.",
      ],
    },
  ],
};

export default async function AboutPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = locale === "en" ? contentEN : contentPT;

  return (
    <article style={pageStyle}>
      <h1 style={titleStyle}>{c.title}</h1>
      <p style={pStyle}>{c.intro}</p>
      {c.sections.map((s, i) => (
        <section key={i} style={sectionStyle}>
          <h2 style={h2Style}>{s.h}</h2>
          {s.p.map((para, j) => (
            <p key={j} style={pStyle}>
              {para}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}

const pageStyle = {
  maxWidth: 800,
  margin: "0 auto",
  padding: "40px 20px 20px",
  color: "#ccd6f6",
  fontFamily: "'Fira Code', monospace",
  lineHeight: 1.7,
};

const titleStyle = {
  fontFamily: "'Press Start 2P', monospace",
  fontSize: 18,
  color: "#00f0ff",
  textShadow: "0 0 10px rgba(0,240,255,0.4)",
  marginBottom: 16,
  letterSpacing: 1,
};

const sectionStyle = { marginBottom: 24 };

const h2Style = {
  fontFamily: "'Press Start 2P', monospace",
  fontSize: 12,
  color: "#00f0ff",
  marginTop: 24,
  marginBottom: 10,
  letterSpacing: 0.5,
};

const pStyle = {
  fontSize: 13,
  color: "#ccd6f6",
  marginBottom: 12,
};
