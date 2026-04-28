import { setRequestLocale } from "next-intl/server";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isPt = locale === "pt";
  return {
    title: isPt ? "Termos de Uso | Acerte a Mosca" : "Terms of Use | Nailed The Fly",
    description: isPt
      ? "Termos e condições para uso da plataforma de jogos Acerte a Mosca."
      : "Terms and conditions for using the Nailed The Fly gaming platform.",
    robots: { index: true, follow: true },
  };
}

const contentPT = {
  title: "Termos de Uso",
  lastUpdated: "Última atualização: 27 de abril de 2026",
  intro:
    "Estes Termos de Uso regulam o acesso e a utilização do site Acerte a Mosca (acerteamosca.com.br). Ao usar o site, você concorda integralmente com estas condições. Se não concordar, por favor não utilize a plataforma.",
  sections: [
    {
      h: "1. Sobre o serviço",
      p: [
        "O Acerte a Mosca é uma plataforma gratuita de jogos HTML5 desenvolvida pela MMSoft Digital. Os jogos são disponibilizados sem custo e podem ser jogados diretamente no navegador, sem instalação.",
      ],
    },
    {
      h: "2. Cadastro e contas de usuário",
      p: [
        "O cadastro é opcional e necessário apenas para salvar pontuações em rankings ou participar de modos multiplayer. Ao se cadastrar, você se compromete a fornecer dados verdadeiros e a não criar contas falsas, automatizadas ou em nome de terceiros.",
        "Você é responsável pela confidencialidade dos seus dados de acesso e por todas as atividades realizadas na sua conta.",
      ],
    },
    {
      h: "3. Uso permitido",
      p: [
        "Você pode utilizar o site para fins pessoais e não comerciais, jogando os jogos disponibilizados, compartilhando links em redes sociais e participando das funcionalidades multiplayer de forma respeitosa.",
      ],
    },
    {
      h: "4. Uso proibido",
      p: [
        "É proibido: (a) tentar burlar mecânicas dos jogos para obter pontuações fraudulentas; (b) automatizar acessos com bots ou scripts; (c) realizar engenharia reversa do código; (d) interferir com a operação dos servidores ou multiplayer; (e) usar o site para qualquer atividade ilegal; (f) inserir, no chat ou nome de jogador, conteúdo ofensivo, discriminatório ou que viole direitos de terceiros.",
        "O descumprimento destas regras pode resultar em bloqueio imediato de acesso, sem aviso prévio.",
      ],
    },
    {
      h: "5. Propriedade intelectual",
      p: [
        "Todo o conteúdo do site (códigos, textos, gráficos, sons, marcas, design e jogos) é de propriedade da MMSoft Digital ou de seus licenciadores e está protegido pelas leis brasileiras de direito autoral.",
        "Você não pode reproduzir, distribuir, modificar ou criar obras derivadas do conteúdo sem autorização prévia por escrito.",
      ],
    },
    {
      h: "6. Publicidade",
      p: [
        "O site exibe anúncios de redes parceiras (Google AdSense, Adsterra) para sustentar a operação gratuita. Não nos responsabilizamos pelo conteúdo dos anúncios nem pelos sites de terceiros para os quais os anúncios redirecionam.",
      ],
    },
    {
      h: "7. Disponibilidade e isenção de garantias",
      p: [
        "O site é fornecido \"no estado em que se encontra\". Não garantimos disponibilidade ininterrupta nem ausência de bugs. Faremos esforços razoáveis para manter o serviço estável, mas podem ocorrer interrupções para manutenção, atualizações ou por motivos técnicos.",
      ],
    },
    {
      h: "8. Limitação de responsabilidade",
      p: [
        "Na máxima extensão permitida pela lei, a MMSoft Digital não será responsável por danos indiretos, lucros cessantes ou perda de dados decorrentes do uso ou impossibilidade de uso do site.",
      ],
    },
    {
      h: "9. Modificações",
      p: [
        "Podemos atualizar estes Termos a qualquer momento. Mudanças relevantes serão sinalizadas no site. O uso continuado após a atualização implica aceitação dos novos Termos.",
      ],
    },
    {
      h: "10. Lei aplicável e foro",
      p: [
        "Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de domicílio do operador do site para dirimir quaisquer controvérsias, salvo disposição legal em contrário.",
      ],
    },
    {
      h: "11. Contato",
      p: [
        "Para dúvidas sobre estes Termos, escreva para alex@marramoncks.com.br ou use a página de Contato.",
      ],
    },
  ],
};

const contentEN = {
  title: "Terms of Use",
  lastUpdated: "Last updated: April 27, 2026",
  intro:
    "These Terms of Use govern access to and use of Nailed The Fly (nailedthefly.com / acerteamosca.com.br). By using the site, you fully agree to these conditions. If you do not agree, please do not use the platform.",
  sections: [
    {
      h: "1. About the service",
      p: [
        "Nailed The Fly is a free HTML5 gaming platform developed by MMSoft Digital. Games are provided at no cost and can be played directly in the browser, with no installation required.",
      ],
    },
    {
      h: "2. Registration and user accounts",
      p: [
        "Registration is optional and only required to save scores on rankings or participate in multiplayer modes. By registering, you agree to provide truthful data and not to create fake, automated or third-party accounts.",
        "You are responsible for the confidentiality of your access data and for all activities carried out on your account.",
      ],
    },
    {
      h: "3. Permitted use",
      p: [
        "You may use the site for personal, non-commercial purposes: playing the games provided, sharing links on social media and participating in multiplayer features respectfully.",
      ],
    },
    {
      h: "4. Prohibited use",
      p: [
        "It is forbidden to: (a) attempt to bypass game mechanics to obtain fraudulent scores; (b) automate access with bots or scripts; (c) reverse engineer the code; (d) interfere with server or multiplayer operation; (e) use the site for any illegal activity; (f) insert, in chat or player name, offensive, discriminatory content or content that violates third-party rights.",
        "Violation may result in immediate access blocking, without prior notice.",
      ],
    },
    {
      h: "5. Intellectual property",
      p: [
        "All site content (code, text, graphics, sounds, brands, design and games) is owned by MMSoft Digital or its licensors and is protected by applicable copyright laws.",
        "You may not reproduce, distribute, modify or create derivative works of the content without prior written authorization.",
      ],
    },
    {
      h: "6. Advertising",
      p: [
        "The site displays ads from partner networks (Google AdSense, Adsterra) to sustain free operation. We are not responsible for the content of the ads nor for the third-party sites to which the ads redirect.",
      ],
    },
    {
      h: "7. Availability and disclaimer",
      p: [
        "The site is provided \"as is\". We do not guarantee uninterrupted availability or absence of bugs. We will make reasonable efforts to keep the service stable, but interruptions may occur for maintenance, updates or technical reasons.",
      ],
    },
    {
      h: "8. Limitation of liability",
      p: [
        "To the maximum extent permitted by law, MMSoft Digital shall not be liable for indirect damages, lost profits or loss of data arising from the use or inability to use the site.",
      ],
    },
    {
      h: "9. Modifications",
      p: [
        "We may update these Terms at any time. Material changes will be flagged on the site. Continued use after the update implies acceptance of the new Terms.",
      ],
    },
    {
      h: "10. Governing law",
      p: [
        "These Terms are governed by the laws of the Federative Republic of Brazil. The forum of the site operator's domicile is elected to settle any disputes, except as otherwise required by law.",
      ],
    },
    {
      h: "11. Contact",
      p: [
        "For questions about these Terms, write to alex@marramoncks.com.br or use the Contact page.",
      ],
    },
  ],
};

export default async function TermsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = locale === "en" ? contentEN : contentPT;

  return (
    <article style={pageStyle}>
      <h1 style={titleStyle}>{c.title}</h1>
      <p style={metaStyle}>{c.lastUpdated}</p>
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
  marginBottom: 8,
  letterSpacing: 1,
};

const metaStyle = {
  color: "#8892b0",
  fontSize: 12,
  marginBottom: 30,
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
