import { setRequestLocale } from "next-intl/server";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isPt = locale === "pt";
  return {
    title: isPt ? "Contato | Acerte a Mosca" : "Contact | Nailed The Fly",
    description: isPt
      ? "Fale com o Acerte a Mosca: suporte, parcerias, sugestões de jogos e direitos LGPD."
      : "Get in touch with Nailed The Fly: support, partnerships, game suggestions and data rights.",
    robots: { index: true, follow: true },
  };
}

const contentPT = {
  title: "Contato",
  intro:
    "Quer reportar um bug, sugerir um jogo, falar de parcerias ou exercer seus direitos sob a LGPD? Use os canais abaixo.",
  sections: [
    {
      h: "E-mail principal",
      p: [
        "alex@marramoncks.com.br",
        "Respondemos em até 3 dias úteis. Para questões de privacidade (LGPD), inclua \"LGPD\" no assunto para priorização.",
      ],
    },
    {
      h: "Para o que escrever",
      p: [
        "• Bugs e problemas técnicos: descreva o jogo, o navegador (Chrome/Firefox/Safari), o sistema operacional e o que aconteceu.",
        "• Sugestões de jogos: conte qual gênero ou jogo clássico você gostaria de ver na plataforma.",
        "• Parcerias e patrocínios: marcas que queiram patrocinar fases ou jogos podem entrar em contato direto.",
        "• Direitos LGPD: solicitações de acesso, correção, exclusão ou portabilidade de dados pessoais.",
      ],
    },
    {
      h: "Operador do serviço",
      p: [
        "MMSoft Digital — Alex Marra",
        "São Paulo, Brasil",
      ],
    },
  ],
};

const contentEN = {
  title: "Contact",
  intro:
    "Want to report a bug, suggest a game, discuss partnerships or exercise your data rights? Use the channels below.",
  sections: [
    {
      h: "Main email",
      p: [
        "alex@marramoncks.com.br",
        "We reply within 3 business days. For privacy-related requests, include \"LGPD\" or \"GDPR\" in the subject for prioritization.",
      ],
    },
    {
      h: "What to write about",
      p: [
        "• Bugs and technical issues: describe the game, browser (Chrome/Firefox/Safari), OS and what happened.",
        "• Game suggestions: tell us what genre or classic game you would like to see on the platform.",
        "• Partnerships and sponsorships: brands wishing to sponsor levels or games are welcome to reach out directly.",
        "• Data rights: requests for access, correction, deletion or portability of personal data.",
      ],
    },
    {
      h: "Service operator",
      p: [
        "MMSoft Digital — Alex Marra",
        "São Paulo, Brazil",
      ],
    },
  ],
};

export default async function ContactPage({ params }) {
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
