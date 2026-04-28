import { setRequestLocale } from "next-intl/server";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isPt = locale === "pt";
  return {
    title: isPt ? "Política de Privacidade | Acerte a Mosca" : "Privacy Policy | Nailed The Fly",
    description: isPt
      ? "Saiba como o Acerte a Mosca coleta, usa e protege suas informações pessoais, conforme a LGPD."
      : "Learn how Nailed The Fly collects, uses and protects your personal information.",
    robots: { index: true, follow: true },
  };
}

const contentPT = {
  title: "Política de Privacidade",
  lastUpdated: "Última atualização: 27 de abril de 2026",
  intro:
    "Esta Política de Privacidade descreve como o site Acerte a Mosca (acerteamosca.com.br), operado por MMSoft Digital, coleta, utiliza e protege as informações dos usuários. Ao acessar o site, você concorda com as práticas descritas neste documento.",
  sections: [
    {
      h: "1. Informações que coletamos",
      p: [
        "Coletamos dois tipos de informação: dados fornecidos voluntariamente por você (como nome, e-mail e WhatsApp ao se cadastrar para salvar pontuações) e dados coletados automaticamente (endereço IP, tipo de navegador, sistema operacional, páginas visitadas e tempo de permanência).",
        "O cadastro é opcional. Você pode jogar todos os jogos do site sem fornecer qualquer informação pessoal.",
      ],
    },
    {
      h: "2. Como usamos suas informações",
      p: [
        "Usamos os dados coletados para: (a) salvar e exibir rankings de pontuação; (b) melhorar a experiência de jogo e identificar problemas técnicos; (c) exibir publicidade relevante por meio de redes parceiras; (d) responder a contatos enviados por você.",
        "Não vendemos, alugamos ou cedemos seus dados a terceiros para fins de marketing.",
      ],
    },
    {
      h: "3. Cookies e tecnologias semelhantes",
      p: [
        "Utilizamos cookies para lembrar suas preferências (idioma, consentimento LGPD), medir o desempenho do site e personalizar anúncios.",
        "Você pode desabilitar cookies nas configurações do seu navegador. A desabilitação pode prejudicar o funcionamento de algumas funcionalidades, como salvar pontuações.",
      ],
    },
    {
      h: "4. Google AdSense e cookies DART",
      p: [
        "Este site é parceiro do Google AdSense. O Google, na qualidade de fornecedor terceiro, utiliza cookies (incluindo o cookie DART) para exibir anúncios em nosso site com base nas visitas anteriores que você fez a este e a outros sites na Internet.",
        "Você pode desativar o uso do cookie DART acessando a Política de Privacidade da rede de conteúdo e dos anúncios do Google: https://policies.google.com/technologies/ads",
      ],
    },
    {
      h: "5. Google Analytics",
      p: [
        "Utilizamos o Google Analytics para entender de forma agregada como os visitantes interagem com o site. Os dados são anonimizados e usados apenas para fins estatísticos.",
        "Você pode optar por não ser rastreado instalando o Google Analytics Opt-out Browser Add-on: https://tools.google.com/dlpage/gaoptout",
      ],
    },
    {
      h: "6. Seus direitos sob a LGPD",
      p: [
        "Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem o direito de: (a) acessar os dados que mantemos sobre você; (b) corrigir dados incorretos; (c) solicitar a exclusão dos seus dados; (d) revogar o consentimento a qualquer momento; (e) solicitar a portabilidade dos dados.",
        "Para exercer qualquer um desses direitos, entre em contato pelo e-mail indicado na página de Contato.",
      ],
    },
    {
      h: "7. Compartilhamento com terceiros",
      p: [
        "Compartilhamos dados apenas com prestadores de serviço necessários para a operação do site (ex.: provedores de hospedagem, Google AdSense, Google Analytics, redes de publicidade Adsterra). Esses parceiros possuem suas próprias políticas de privacidade.",
      ],
    },
    {
      h: "8. Segurança",
      p: [
        "Adotamos medidas técnicas e administrativas para proteger seus dados contra acesso não autorizado, perda ou alteração, incluindo criptografia em trânsito (HTTPS) e armazenamento em servidores com controle de acesso.",
      ],
    },
    {
      h: "9. Crianças",
      p: [
        "O site é destinado ao público geral. Não coletamos intencionalmente dados de menores de 13 anos. Se você é responsável por uma criança e identificou coleta de dados, entre em contato para que possamos remover.",
      ],
    },
    {
      h: "10. Alterações desta Política",
      p: [
        "Podemos atualizar esta Política periodicamente. A data da última atualização será sempre exibida no topo. Recomendamos revisar este documento regularmente.",
      ],
    },
    {
      h: "11. Contato",
      p: [
        "Dúvidas sobre privacidade? Escreva para alex@marramoncks.com.br ou utilize a página de Contato.",
      ],
    },
  ],
};

const contentEN = {
  title: "Privacy Policy",
  lastUpdated: "Last updated: April 27, 2026",
  intro:
    "This Privacy Policy describes how Nailed The Fly (nailedthefly.com / acerteamosca.com.br), operated by MMSoft Digital, collects, uses and protects user information. By accessing the site, you agree to the practices described in this document.",
  sections: [
    {
      h: "1. Information we collect",
      p: [
        "We collect two types of information: data you voluntarily provide (such as name, email and WhatsApp when registering to save scores) and data collected automatically (IP address, browser type, operating system, pages visited and time spent).",
        "Registration is optional. You may play all games on the site without providing any personal information.",
      ],
    },
    {
      h: "2. How we use your information",
      p: [
        "We use the data collected to: (a) save and display score rankings; (b) improve the gaming experience and identify technical issues; (c) display relevant advertising through partner networks; (d) respond to messages you send us.",
        "We do not sell, rent or transfer your data to third parties for marketing purposes.",
      ],
    },
    {
      h: "3. Cookies and similar technologies",
      p: [
        "We use cookies to remember your preferences (language, consent), measure site performance and personalize ads.",
        "You may disable cookies in your browser settings. Disabling them may impair some features, such as saving scores.",
      ],
    },
    {
      h: "4. Google AdSense and DART cookies",
      p: [
        "This site is a Google AdSense partner. Google, as a third-party vendor, uses cookies (including the DART cookie) to serve ads on our site based on your prior visits to this and other websites.",
        "You may opt out of the use of the DART cookie by visiting the Google ad and content network privacy policy: https://policies.google.com/technologies/ads",
      ],
    },
    {
      h: "5. Google Analytics",
      p: [
        "We use Google Analytics to understand in aggregate form how visitors interact with the site. The data is anonymized and used only for statistical purposes.",
        "You may opt out of being tracked by installing the Google Analytics Opt-out Browser Add-on: https://tools.google.com/dlpage/gaoptout",
      ],
    },
    {
      h: "6. Your rights",
      p: [
        "Subject to applicable law (including Brazil's LGPD for users in Brazil and GDPR-style protections elsewhere), you have the right to: (a) access the data we hold about you; (b) correct inaccurate data; (c) request deletion of your data; (d) withdraw consent at any time; (e) request data portability.",
        "To exercise any of these rights, contact us at the email shown on the Contact page.",
      ],
    },
    {
      h: "7. Sharing with third parties",
      p: [
        "We share data only with service providers necessary to operate the site (e.g., hosting providers, Google AdSense, Google Analytics, Adsterra advertising networks). These partners have their own privacy policies.",
      ],
    },
    {
      h: "8. Security",
      p: [
        "We adopt technical and administrative measures to protect your data against unauthorized access, loss or alteration, including in-transit encryption (HTTPS) and storage on servers with access control.",
      ],
    },
    {
      h: "9. Children",
      p: [
        "The site is intended for general audiences. We do not knowingly collect data from children under 13. If you are a guardian and identify data collection, contact us so we can remove it.",
      ],
    },
    {
      h: "10. Changes to this Policy",
      p: [
        "We may update this Policy periodically. The date of the latest update will always be displayed at the top. We recommend reviewing this document regularly.",
      ],
    },
    {
      h: "11. Contact",
      p: [
        "Questions about privacy? Write to alex@marramoncks.com.br or use the Contact page.",
      ],
    },
  ],
};

export default async function PrivacyPage({ params }) {
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
