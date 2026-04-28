# Páginas Institucionais para Aprovação Google AdSense — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar 4 páginas institucionais (Política de Privacidade, Termos de Uso, Sobre, Contato) bilíngues (pt/en) e um Footer global reutilizável com links para essas páginas, atendendo o requisito crítico do Google AdSense para aprovação do site acerteamosca.com.br.

**Architecture:**
- Componente `Footer.jsx` (server component) montado no `layout.js` para aparecer em todas as páginas (home, jogos, institucionais).
- 4 rotas novas em `src/app/[locale]/{slug}/page.js` usando slugs em PT (`politica-de-privacidade`, `termos-de-uso`, `sobre`, `contato`). Same paths em ambos os idiomas — conteúdo é trocado por locale via objetos JS inline (sem precisar adicionar muita coisa nos arquivos `messages/*.json`).
- Footer puxa apenas labels das chaves `footer.*` em `messages/{pt,en}.json`. Conteúdo extenso das páginas legais fica inline no componente da página, simplificando revisão e edição.
- Remove footer inline duplicado do `page.js` da home (será substituído pelo global).

**Tech Stack:** Next.js 14 App Router, JavaScript (sem TS), next-intl 4.8, inline styles seguindo o tema dark/cyan existente (cores: `#00f0ff`, `#8892b0`, `#050510`, `#2a2a4a`, fontes `Press Start 2P` e `Fira Code`).

---

## File Structure

**Create:**
- `src/components/Footer.jsx` — componente footer global, server component, links para as 4 páginas institucionais
- `src/app/[locale]/politica-de-privacidade/page.js` — página política (PT/EN)
- `src/app/[locale]/termos-de-uso/page.js` — página termos (PT/EN)
- `src/app/[locale]/sobre/page.js` — página sobre (PT/EN)
- `src/app/[locale]/contato/page.js` — página contato (PT/EN)

**Modify:**
- `src/app/[locale]/layout.js` — importar e renderizar `<Footer />` após `<main>`, antes de `<AdsTerraSocialBar />`
- `src/app/[locale]/page.js` — remover bloco `<p>{tc("footer")}</p>` (linhas ~279-288) já coberto pelo Footer global
- `src/messages/pt.json` — adicionar namespace `footer` com 5 chaves; remover `common.footer` (não mais usado)
- `src/messages/en.json` — adicionar namespace `footer` (PT já tem `common.footer` que será migrada; em EN está em `common.footer` também)

---

## Task 1: Criar componente Footer.jsx

**Files:**
- Create: `src/components/Footer.jsx`

- [ ] **Step 1: Criar `src/components/Footer.jsx`**

```jsx
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function Footer() {
  const t = await getTranslations("footer");

  const linkStyle = {
    color: "#8892b0",
    fontSize: 11,
    fontFamily: "'Fira Code', monospace",
    textDecoration: "none",
    padding: "4px 8px",
    transition: "color 0.2s",
  };

  return (
    <footer
      style={{
        background: "rgba(5,5,16,0.95)",
        borderTop: "1px solid rgba(0,240,255,0.1)",
        padding: "30px 20px 80px",
        marginTop: 40,
        textAlign: "center",
      }}
    >
      <nav
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <Link href="/sobre" style={linkStyle}>
          {t("about")}
        </Link>
        <Link href="/contato" style={linkStyle}>
          {t("contact")}
        </Link>
        <Link href="/politica-de-privacidade" style={linkStyle}>
          {t("privacy")}
        </Link>
        <Link href="/termos-de-uso" style={linkStyle}>
          {t("terms")}
        </Link>
      </nav>
      <p
        style={{
          color: "#2a2a4a",
          fontSize: 10,
          fontFamily: "'Fira Code', monospace",
          margin: 0,
        }}
      >
        {t("tagline")}
      </p>
    </footer>
  );
}
```

- [ ] **Step 2: Verificar lint do arquivo**

Run: `cd /home/alexmoncks/projects/acerteamosca && npx next lint --file src/components/Footer.jsx 2>&1 | tail -20`
Expected: sem warnings nem erros para esse arquivo.

---

## Task 2: Adicionar traduções `footer.*` nos JSONs

**Files:**
- Modify: `src/messages/pt.json`
- Modify: `src/messages/en.json`

- [ ] **Step 1: Editar `src/messages/pt.json` — adicionar bloco `footer` antes do bloco `common`**

Localize o bloco `"common": {` (perto da linha 644). Antes dele, insira:

```json
  "footer": {
    "about": "Sobre",
    "contact": "Contato",
    "privacy": "Política de Privacidade",
    "terms": "Termos de Uso",
    "tagline": "© 2026 Acerte a Mosca · v1.0 powered by chineladas"
  },
```

E **remova** a linha `"footer": "v1.0 - powered by chineladas"` dentro do bloco `common` (deixar `common` apenas com `playFree` e `mainGame`). Garanta que o JSON continua válido (sem vírgula sobrando).

- [ ] **Step 2: Editar `src/messages/en.json` — adicionar bloco `footer` antes do bloco `common`**

Mesma localização (antes de `"common": {`):

```json
  "footer": {
    "about": "About",
    "contact": "Contact",
    "privacy": "Privacy Policy",
    "terms": "Terms of Use",
    "tagline": "© 2026 Nailed The Fly · v1.0"
  },
```

E **remova** a linha `"footer": ...` do bloco `common` em en.json. Garanta JSON válido.

- [ ] **Step 3: Validar JSON**

Run: `cd /home/alexmoncks/projects/acerteamosca && node -e "JSON.parse(require('fs').readFileSync('src/messages/pt.json','utf8')); JSON.parse(require('fs').readFileSync('src/messages/en.json','utf8')); console.log('OK')"`
Expected: `OK`

---

## Task 3: Montar Footer no layout global e remover footer inline da home

**Files:**
- Modify: `src/app/[locale]/layout.js`
- Modify: `src/app/[locale]/page.js`

- [ ] **Step 1: Importar Footer no layout**

No topo de `src/app/[locale]/layout.js`, adicionar import depois de `import CookieConsent from "@/components/CookieConsent";`:

```javascript
import Footer from "@/components/Footer";
```

- [ ] **Step 2: Renderizar Footer entre `<main>` e `<AdsTerraSocialBar />`**

Localize em `src/app/[locale]/layout.js` o trecho:

```jsx
          <main style={{ paddingTop: 48 }}>{children}</main>
          <AdsTerraSocialBar />
```

Substituir por:

```jsx
          <main style={{ paddingTop: 48 }}>{children}</main>
          <Footer />
          <AdsTerraSocialBar />
```

- [ ] **Step 3: Remover footer inline da home**

Em `src/app/[locale]/page.js`, localize o bloco aproximadamente nas linhas 279-288:

```jsx
      <p
        style={{
          marginTop: 30,
          color: "#2a2a4a",
          fontSize: 10,
          fontFamily: "'Fira Code', monospace",
        }}
      >
        {tc("footer")}
      </p>
```

**Apague esse bloco inteiro** (10 linhas). O Footer global do layout cobre o lugar dele.

- [ ] **Step 4: Verificar se `tc` ainda é usado em outro lugar do `page.js`**

Run: `grep -n "tc(" /home/alexmoncks/projects/acerteamosca/src/app/\[locale\]/page.js`
Se retornar apenas o uso que sobrou (não relacionado a footer), ok. Se a única referência era o footer removido, remover também a declaração `const tc = useTranslations("common");` no topo do arquivo.

- [ ] **Step 5: Smoke test do build**

Run: `cd /home/alexmoncks/projects/acerteamosca && npx next build 2>&1 | tail -30`
Expected: build completa sem erros. Pode ter warnings (ok). Procurar especificamente por erros tipo "Module not found" ou "Cannot read property".

---

## Task 4: Página Política de Privacidade

**Files:**
- Create: `src/app/[locale]/politica-de-privacidade/page.js`

- [ ] **Step 1: Criar diretório e arquivo**

Run: `mkdir -p /home/alexmoncks/projects/acerteamosca/src/app/\[locale\]/politica-de-privacidade`

- [ ] **Step 2: Escrever `src/app/[locale]/politica-de-privacidade/page.js`**

```jsx
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
```

- [ ] **Step 3: Validar build**

Run: `cd /home/alexmoncks/projects/acerteamosca && npx next build 2>&1 | tail -15`
Expected: rota `/[locale]/politica-de-privacidade` aparece como "○ (Static)" na lista de rotas.

---

## Task 5: Página Termos de Uso

**Files:**
- Create: `src/app/[locale]/termos-de-uso/page.js`

- [ ] **Step 1: Criar diretório**

Run: `mkdir -p /home/alexmoncks/projects/acerteamosca/src/app/\[locale\]/termos-de-uso`

- [ ] **Step 2: Escrever `src/app/[locale]/termos-de-uso/page.js`**

```jsx
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
```

- [ ] **Step 3: Validar build**

Run: `cd /home/alexmoncks/projects/acerteamosca && npx next build 2>&1 | tail -15`
Expected: rota `/[locale]/termos-de-uso` aparece na lista.

---

## Task 6: Página Sobre

**Files:**
- Create: `src/app/[locale]/sobre/page.js`

- [ ] **Step 1: Criar diretório**

Run: `mkdir -p /home/alexmoncks/projects/acerteamosca/src/app/\[locale\]/sobre`

- [ ] **Step 2: Escrever `src/app/[locale]/sobre/page.js`**

```jsx
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
```

- [ ] **Step 3: Validar build**

Run: `cd /home/alexmoncks/projects/acerteamosca && npx next build 2>&1 | tail -15`
Expected: rota `/[locale]/sobre` aparece na lista.

---

## Task 7: Página Contato

**Files:**
- Create: `src/app/[locale]/contato/page.js`

- [ ] **Step 1: Criar diretório**

Run: `mkdir -p /home/alexmoncks/projects/acerteamosca/src/app/\[locale\]/contato`

- [ ] **Step 2: Escrever `src/app/[locale]/contato/page.js`**

```jsx
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
```

- [ ] **Step 3: Validar build**

Run: `cd /home/alexmoncks/projects/acerteamosca && npx next build 2>&1 | tail -15`
Expected: rota `/[locale]/contato` aparece na lista.

---

## Task 8: Validação visual no dev server

**Files:** (nenhum, validação manual)

- [ ] **Step 1: Subir dev server**

Run: `cd /home/alexmoncks/projects/acerteamosca && npm run dev`
Aguardar: "ready started server on ..." (mantenha rodando em background ou em outro terminal).

- [ ] **Step 2: Checar rotas em PT**

Abrir no navegador (ou `curl` para confirmar 200):
- http://localhost:3000/ — home (footer global aparece com 4 links)
- http://localhost:3000/sobre
- http://localhost:3000/contato
- http://localhost:3000/politica-de-privacidade
- http://localhost:3000/termos-de-uso

Verificar:
- Footer aparece em TODAS as páginas (incluindo dentro dos jogos `/jogos/...`).
- Links do Footer navegam corretamente sem reload completo (next/link client-side).
- Tipografia e cores seguem o tema (cyan #00f0ff em headings, Press Start 2P em títulos, Fira Code em corpo).

- [ ] **Step 3: Checar rotas em EN**

- http://localhost:3000/en/sobre
- http://localhost:3000/en/contato
- http://localhost:3000/en/politica-de-privacidade
- http://localhost:3000/en/termos-de-uso

Verificar:
- Conteúdo em inglês.
- Footer com labels em EN ("About", "Contact", "Privacy Policy", "Terms of Use").
- Botão de troca de idioma (PT/EN) na navbar continua funcionando — clicar nele em uma página institucional deve trocar para a mesma página no outro idioma.

- [ ] **Step 4: Encerrar dev server**

Ctrl+C no terminal onde o `npm run dev` está rodando.

---

## Task 9: Commit final

**Files:** todos os anteriores.

- [ ] **Step 1: Revisar diff**

Run: `cd /home/alexmoncks/projects/acerteamosca && git status && echo "---" && git diff --stat`
Expected: 5 arquivos novos (`Footer.jsx` + 4 `page.js`) e 4 arquivos modificados (`layout.js`, `page.js` da home, `pt.json`, `en.json`).

- [ ] **Step 2: Stage e commit**

Run:
```bash
cd /home/alexmoncks/projects/acerteamosca && git add \
  src/components/Footer.jsx \
  src/app/\[locale\]/politica-de-privacidade/page.js \
  src/app/\[locale\]/termos-de-uso/page.js \
  src/app/\[locale\]/sobre/page.js \
  src/app/\[locale\]/contato/page.js \
  src/app/\[locale\]/layout.js \
  src/app/\[locale\]/page.js \
  src/messages/pt.json \
  src/messages/en.json
```

Depois:
```bash
cd /home/alexmoncks/projects/acerteamosca && git commit -m "$(cat <<'EOF'
feat(legal): add institutional pages (privacy, terms, about, contact) and global footer

Required for Google AdSense approval. Adds 4 bilingual pages (pt/en),
plus a reusable Footer component with links to all legal pages,
mounted in the locale layout so it renders site-wide.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Confirmar commit**

Run: `cd /home/alexmoncks/projects/acerteamosca && git log -1 --stat`
Expected: novo commit listando os 9 arquivos.

---

## Self-Review (já executado pelo planner)

- ✅ **Spec coverage:**
  - Página Política de Privacidade ✅ (Task 4) — cita cookies DART do Google AdSense, opt-out, LGPD
  - Termos de Uso ✅ (Task 5)
  - Sobre Nós ✅ (Task 6) — história, missão, criador
  - Contato ✅ (Task 7) — e-mail visível
  - Footer com links ✅ (Tasks 1, 3)
  - Conteúdo de baixo valor / 300 palavras por jogo ❌ — **fora do escopo deste plano** (vide nota abaixo)
  - Bloqueio de login ✅ — não há login obrigatório (já confirmado na exploração)
  - Estrutura/navegação ✅ Navbar já existe; Footer agora também
- ✅ **Placeholder scan:** todos os textos estão escritos (não há "TBD"/"add appropriate"/etc.)
- ✅ **Type consistency:** mesmos nomes de chaves (`title`, `intro`, `sections`, `h`, `p`) em todas as páginas; mesmos slugs (`/sobre`, `/contato`, `/politica-de-privacidade`, `/termos-de-uso`) entre Footer e arquivos `page.js`.

**Nota:** Este plano cobre os itens 1, 3 e 4 do relatório AdSense (páginas obrigatórias, login, navegação). O item 2 (texto de 300+ palavras por jogo nas 14 páginas de jogo) é trabalho separado, mais extenso, e merece um segundo plano dedicado. Após mergeado este plano, recomenda-se rodar nova brainstorming para o conteúdo dos jogos.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-27-paginas-institucionais-adsense.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
