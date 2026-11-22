import { setRequestLocale } from "next-intl/server";
import { localeUrl, pageAlternates, siteName } from "@/lib/seo";
import RichText from "@/components/RichText";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isPt = locale === "pt";
  const title = isPt ? "Política de Privacidade | Acerte a Mosca" : "Privacy Policy | Nailed The Fly";
  const description = isPt
    ? "Saiba como o Acerte a Mosca coleta, usa e protege suas informações pessoais, conforme a LGPD."
    : "Learn how Nailed The Fly collects, uses and protects your personal information.";
  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: pageAlternates(locale, "/politica-de-privacidade"),
    openGraph: {
      type: "website",
      locale: isPt ? "pt_BR" : "en_US",
      url: localeUrl(locale, "/politica-de-privacidade"),
      siteName: siteName(locale),
      title,
      description,
    },
  };
}

// Revisada em 21/11/2026 para a revisão do AdSense: sai o Adsterra (removido
// do site em 01/08/2026); entram bases legais (LGPD e GDPR), direitos do
// titular, cookies de terceiros do Google e o link "Como o Google usa dados
// de sites parceiros", que a política do AdSense pede.
const EMAIL = "alex@marramoncks.com.br";

const contentPT = {
  title: "Política de Privacidade",
  lastUpdated: "Última atualização: 21 de novembro de 2026",
  intro:
    "Esta Política de Privacidade explica como o Acerte a Mosca (acerteamosca.com.br) e sua versão em inglês, Nailed The Fly (nailedthefly.com), operados pela MMSoft Digital, coletam, usam, compartilham e protegem dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018) e, para visitantes do Espaço Econômico Europeu, do Reino Unido e da Suíça, com o Regulamento Geral sobre a Proteção de Dados (GDPR/RGPD).",
  sections: [
    {
      h: "1. Quem é o controlador",
      p: [
        `O controlador dos dados é a MMSoft Digital, operada por Alex Marra, em São Paulo, Brasil. Para qualquer assunto de privacidade e proteção de dados, inclusive o exercício dos seus direitos, o canal de contato é ${EMAIL}.`,
      ],
    },
    {
      h: "2. Dados que coletamos",
      p: [
        "Dados que você fornece: nome, e-mail e, se quiser, WhatsApp, quando faz o cadastro de jogador pedido por alguns jogos para salvar pontuações e rankings; e o conteúdo das mensagens que você nos envia.",
        "Dados coletados automaticamente: endereço IP, tipo de navegador e de dispositivo, sistema operacional, páginas visitadas, data e hora de acesso e identificadores de cookies e tecnologias semelhantes, inclusive os usados pelo Google para medir audiência e exibir anúncios (seções 5 e 6).",
        "Dados guardados só no seu aparelho: preferências e progresso de alguns jogos ficam no armazenamento local do navegador (localStorage) e não são enviados para nós.",
      ],
    },
    {
      h: "3. Para que usamos os dados e com qual base legal",
      p: [
        "• Cadastro de jogador, pontuações e rankings — base legal: consentimento, dado na caixa de seleção do cadastro (LGPD, art. 7º, I; GDPR, art. 6(1)(a)). O cookie técnico acerteamosca_jogador (válido por 1 ano) mantém você identificado depois do cadastro.",
        "• Funcionamento, segurança e prevenção de abuso do site, incluindo registros de acesso — base legal: legítimo interesse (LGPD, art. 7º, IX; GDPR, art. 6(1)(f)) e cumprimento de obrigação legal quando aplicável (Marco Civil da Internet, Lei nº 12.965/2014).",
        "• Medição de audiência (Google Analytics) e exibição de anúncios (Google AdSense) — base legal: consentimento, quando exigido pela legislação aplicável (como no EEE, Reino Unido e Suíça); nos demais casos, legítimo interesse (LGPD, art. 7º, IX), sempre com as opções de recusa da seção 6.",
        "• Responder às mensagens que você envia — base legal: legítimo interesse e, quando for o caso, exercício regular de direitos.",
        "Não vendemos nem alugamos dados pessoais.",
      ],
    },
    {
      h: "4. Cookies e tecnologias semelhantes",
      p: [
        "Usamos cookies e armazenamento local para manter o cadastro de jogador, lembrar preferências, medir a audiência e exibir anúncios. Cookies de terceiros são definidos pelo Google nos domínios dele, conforme as seções 5 e 6.",
        "Você pode bloquear ou apagar cookies nas configurações do navegador. Bloquear cookies pode impedir que pontuações e preferências sejam salvas.",
      ],
    },
    {
      h: "5. Google AdSense: cookies de publicidade de terceiros",
      p: [
        "Este site exibe anúncios do Google AdSense. Fornecedores terceiros, incluindo o Google, usam cookies para veicular anúncios com base em visitas anteriores do usuário a este e a outros sites.",
        "Com os cookies de publicidade, o Google e os parceiros dele podem veicular anúncios para você com base nas suas visitas a este e/ou a outros sites na Internet.",
        "Saiba como o Google usa dados de sites e apps parceiros: https://policies.google.com/technologies/partner-sites",
        "Política de publicidade do Google: https://policies.google.com/technologies/ads",
      ],
    },
    {
      h: "6. Como recusar anúncios personalizados e medição",
      p: [
        "Você pode desativar a publicidade personalizada nas Configurações de anúncios do Google: https://adssettings.google.com",
        "Para desativar cookies de publicidade personalizada de outros fornecedores: https://www.aboutads.info/choices (e, na Europa, https://www.youronlinechoices.eu).",
        "Para não ser medido pelo Google Analytics, use o complemento de desativação: https://tools.google.com/dlpage/gaoptout",
        "Se você recusar, ainda poderá ver anúncios, mas eles não serão personalizados com base no seu histórico.",
      ],
    },
    {
      h: "7. Compartilhamento e transferência internacional",
      p: [
        "Compartilhamos dados apenas com os fornecedores necessários para operar o site: hospedagem e banco de dados (Railway), rede de distribuição e segurança (Cloudflare) e Google (AdSense e Analytics). Cada um tem a própria política de privacidade.",
        "Esses fornecedores podem tratar dados fora do Brasil, inclusive nos Estados Unidos. A transferência internacional se apoia nas garantias contratuais oferecidas por eles, como as cláusulas-padrão, nos termos do art. 33 da LGPD e do capítulo V do GDPR.",
      ],
    },
    {
      h: "8. Por quanto tempo guardamos os dados",
      p: [
        "Os dados do cadastro de jogador e as pontuações ficam guardados enquanto o cadastro existir ou até você pedir a exclusão. Registros de acesso são guardados pelo prazo exigido em lei. Mensagens de contato são guardadas pelo tempo necessário para o atendimento.",
      ],
    },
    {
      h: "9. Seus direitos (LGPD e GDPR)",
      p: [
        "Você pode, a qualquer momento: confirmar se tratamos seus dados e acessá-los; corrigir dados incompletos ou incorretos; pedir anonimização, bloqueio ou eliminação de dados desnecessários; pedir a portabilidade; pedir a eliminação dos dados tratados com consentimento; saber com quem compartilhamos seus dados; revogar o consentimento; e se opor a tratamento baseado em legítimo interesse (LGPD, art. 18).",
        "Visitantes do EEE, Reino Unido e Suíça têm ainda os direitos de limitação do tratamento e de oposição previstos nos artigos 15 a 22 do GDPR.",
        `Para exercer seus direitos, escreva para ${EMAIL} com o assunto \"LGPD\" ou \"GDPR\". Responderemos em até 15 dias. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD, https://www.gov.br/anpd) ou, na Europa, à autoridade de proteção de dados do seu país.`,
      ],
    },
    {
      h: "10. Segurança",
      p: [
        "Adotamos medidas técnicas e administrativas para proteger os dados contra acesso não autorizado, perda ou alteração, incluindo criptografia em trânsito (HTTPS) e acesso restrito ao banco de dados.",
      ],
    },
    {
      h: "11. Crianças",
      p: [
        "O site é destinado ao público em geral. Não coletamos intencionalmente dados de menores de 13 anos. Se você é responsável por uma criança e identificou um cadastro dela, escreva para nós e removeremos os dados.",
      ],
    },
    {
      h: "12. Alterações desta Política",
      p: [
        "Podemos atualizar esta Política. A data da última atualização fica sempre no topo da página.",
      ],
    },
    {
      h: "13. Contato",
      p: [
        `Dúvidas sobre privacidade? Escreva para ${EMAIL} ou use a página de Contato.`,
      ],
    },
  ],
};

const contentEN = {
  title: "Privacy Policy",
  lastUpdated: "Last updated: November 21, 2026",
  intro:
    "This Privacy Policy explains how Nailed The Fly (nailedthefly.com) and its Portuguese version, Acerte a Mosca (acerteamosca.com.br), operated by MMSoft Digital, collect, use, share and protect personal data, in accordance with Brazil's General Data Protection Law (LGPD, Law No. 13,709/2018) and, for visitors from the European Economic Area, the United Kingdom and Switzerland, the General Data Protection Regulation (GDPR).",
  sections: [
    {
      h: "1. Who the controller is",
      p: [
        `The data controller is MMSoft Digital, operated by Alex Marra, in São Paulo, Brazil. For any privacy or data protection matter, including exercising your rights, contact ${EMAIL}.`,
      ],
    },
    {
      h: "2. Data we collect",
      p: [
        "Data you provide: name, email and, optionally, WhatsApp, when you create the player registration some games ask for to save scores and rankings; and the content of messages you send us.",
        "Data collected automatically: IP address, browser and device type, operating system, pages visited, date and time of access, and identifiers from cookies and similar technologies, including those used by Google to measure audience and serve ads (sections 5 and 6).",
        "Data kept only on your device: preferences and progress in some games are stored in your browser's local storage (localStorage) and are not sent to us.",
      ],
    },
    {
      h: "3. Why we use data and on what legal basis",
      p: [
        "• Player registration, scores and rankings — legal basis: consent, given in the registration checkbox (LGPD, art. 7, I; GDPR, art. 6(1)(a)). The technical cookie acerteamosca_jogador (valid for 1 year) keeps you identified after registering.",
        "• Operation, security and abuse prevention, including access logs — legal basis: legitimate interests (LGPD, art. 7, IX; GDPR, art. 6(1)(f)) and compliance with legal obligations where applicable (Brazilian Internet Civil Framework, Law No. 12,965/2014).",
        "• Audience measurement (Google Analytics) and advertising (Google AdSense) — legal basis: consent, where required by applicable law (such as in the EEA, UK and Switzerland); otherwise, legitimate interests (LGPD, art. 7, IX), always with the opt-out options in section 6.",
        "• Replying to messages you send — legal basis: legitimate interests and, where applicable, the exercise of legal rights.",
        "We do not sell or rent personal data.",
      ],
    },
    {
      h: "4. Cookies and similar technologies",
      p: [
        "We use cookies and local storage to keep your player registration, remember preferences, measure audience and serve ads. Third-party cookies are set by Google on its own domains, as described in sections 5 and 6.",
        "You can block or delete cookies in your browser settings. Blocking cookies may prevent scores and preferences from being saved.",
      ],
    },
    {
      h: "5. Google AdSense: third-party advertising cookies",
      p: [
        "This site shows ads from Google AdSense. Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites.",
        "Google's use of advertising cookies enables it and its partners to serve ads to you based on your visits to this site and/or other sites on the Internet.",
        "Learn how Google uses data from sites or apps that use its services: https://policies.google.com/technologies/partner-sites",
        "Google's advertising policy: https://policies.google.com/technologies/ads",
      ],
    },
    {
      h: "6. How to opt out of personalized ads and measurement",
      p: [
        "You can opt out of personalized advertising in Google's Ads Settings: https://adssettings.google.com",
        "To opt out of other vendors' cookies for personalized advertising: https://www.aboutads.info/choices (and, in Europe, https://www.youronlinechoices.eu).",
        "To opt out of Google Analytics measurement, use the opt-out add-on: https://tools.google.com/dlpage/gaoptout",
        "If you opt out, you may still see ads, but they will not be personalized based on your browsing history.",
      ],
    },
    {
      h: "7. Sharing and international transfers",
      p: [
        "We share data only with the providers needed to run the site: hosting and database (Railway), content delivery and security (Cloudflare) and Google (AdSense and Analytics). Each has its own privacy policy.",
        "These providers may process data outside Brazil, including in the United States. International transfers rely on the contractual safeguards they offer, such as standard contractual clauses, under article 33 of the LGPD and chapter V of the GDPR.",
      ],
    },
    {
      h: "8. How long we keep data",
      p: [
        "Player registration data and scores are kept while the registration exists or until you ask for deletion. Access logs are kept for the period required by law. Contact messages are kept for as long as needed to handle your request.",
      ],
    },
    {
      h: "9. Your rights (LGPD and GDPR)",
      p: [
        "At any time you may: confirm whether we process your data and access it; correct incomplete or inaccurate data; request anonymization, blocking or deletion of unnecessary data; request portability; request deletion of data processed on the basis of consent; learn with whom we share your data; withdraw consent; and object to processing based on legitimate interests (LGPD, art. 18).",
        "Visitors from the EEA, UK and Switzerland also have the rights to restriction of processing and to object under articles 15 to 22 of the GDPR.",
        `To exercise your rights, write to ${EMAIL} with the subject \"LGPD\" or \"GDPR\". We will reply within 15 days. You may also lodge a complaint with Brazil's National Data Protection Authority (ANPD, https://www.gov.br/anpd) or, in Europe, with the data protection authority of your country.`,
      ],
    },
    {
      h: "10. Security",
      p: [
        "We adopt technical and administrative measures to protect data against unauthorized access, loss or alteration, including in-transit encryption (HTTPS) and restricted access to the database.",
      ],
    },
    {
      h: "11. Children",
      p: [
        "The site is intended for a general audience. We do not knowingly collect data from children under 13. If you are a guardian and find that your child registered, write to us and we will delete the data.",
      ],
    },
    {
      h: "12. Changes to this Policy",
      p: [
        "We may update this Policy. The date of the latest update is always shown at the top of the page.",
      ],
    },
    {
      h: "13. Contact",
      p: [
        `Questions about privacy? Write to ${EMAIL} or use the Contact page.`,
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
      <p style={pStyle}><RichText text={c.intro} /></p>
      {c.sections.map((s, i) => (
        <section key={i} style={sectionStyle}>
          <h2 style={h2Style}>{s.h}</h2>
          {s.p.map((para, j) => (
            <p key={j} style={pStyle}>
              <RichText text={para} />
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
