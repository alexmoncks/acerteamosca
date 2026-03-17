import Link from "next/link";
import AdBanner from "@/components/AdBanner";

const jogos = [
  {
    slug: "acerteamosca",
    nome: "Acerte a Mosca",
    emoji: "🦟",
    desc: "Mate o mosquito com o chinelo antes que o tempo acabe!",
    cor: "#00f0ff",
    destaque: true,
  },
  {
    slug: "pong",
    nome: "Pong",
    emoji: "🏓",
    desc: "Classico dos classicos! Jogue contra o CPU, um amigo local ou online.",
    cor: "#b026ff",
    destaque: false,
  },
  {
    slug: "ships",
    nome: "Ships",
    emoji: "🚀",
    desc: "Navegue por labirintos, ricocheteie tiros e destrua a nave inimiga!",
    cor: "#39ff14",
    destaque: false,
  },
  {
    slug: "wordle",
    nome: "Wordle BR",
    emoji: "🔤",
    desc: "Adivinhe a palavra de 5 letras em 6 tentativas!",
    cor: "#a3e635",
    destaque: false,
  },
  {
    slug: "memory",
    nome: "Memory Game",
    emoji: "🧠",
    desc: "Encontre os pares e desafie amigos online!",
    cor: "#34d399",
    destaque: false,
  },
  {
    slug: "2048",
    nome: "2048",
    emoji: "🔢",
    desc: "Deslize os blocos e some ate chegar no 2048! Jogue online.",
    cor: "#f59e0b",
    destaque: false,
  },
  {
    slug: "bubbleshooter",
    nome: "Bubble Shooter",
    emoji: "🫧",
    desc: "Mire, atire e estoure bolhas da mesma cor!",
    cor: "#e879f9",
    destaque: false,
  },
  {
    slug: "deepattack",
    nome: "Deep Attack",
    emoji: "🚀",
    desc: "Pilote sua nave, destrua aliens e sobreviva no espaco!",
    cor: "#22d3ee",
    destaque: false,
  },
  {
    slug: "jacare",
    nome: "Jogo do Jacare",
    emoji: "🐊",
    desc: "Atravesse a rua e o rio com o jacare! Estilo Frogger classico.",
    cor: "#39ff14",
    destaque: false,
  },
  {
    slug: "tiroaoalvo",
    nome: "Tiro ao Alvo",
    emoji: "🎯",
    desc: "Acerte os pratos de argila no timing certo! Reflexo puro.",
    cor: "#4ade80",
    destaque: false,
  },
  {
    slug: "batalha-naval",
    nome: "Batalha Naval",
    emoji: "⚓",
    desc: "Posicione seus navios e afunde a frota inimiga! VS CPU ou online.",
    cor: "#3b82f6",
    destaque: false,
  },
];

const faqs = [
  { q: "O que e o Acerte a Mosca?", a: "Acerte a Mosca e uma plataforma de jogos online gratis que funciona direto no navegador. Oferecemos 11 jogos incluindo Wordle em portugues, 2048, Jogo da Memoria, Batalha Naval, Bubble Shooter, Deep Attack, Pong, Ships, Jogo do Jacare e Tiro ao Alvo. Nao precisa baixar nada!" },
  { q: "Quais jogos estao disponiveis?", a: "Temos 11 jogos: Acerte a Mosca (reflexo), Wordle BR (palavras), Memory Game (memoria com multiplayer), 2048 (puzzle com multiplayer), Bubble Shooter (arcade), Deep Attack (nave espacial), Pong (classico com multiplayer), Ships (batalha de naves com multiplayer), Jogo do Jacare (estilo Frogger), Tiro ao Alvo (reflexo) e Batalha Naval (estrategia com multiplayer online)." },
  { q: "Preciso baixar alguma coisa para jogar?", a: "Nao! Todos os jogos funcionam direto no navegador, tanto no celular quanto no computador. Basta acessar acerteamosca.com.br e comecar a jogar." },
  { q: "Os jogos funcionam no celular?", a: "Sim! Todos os jogos sao responsivos e possuem controles touch otimizados para celular. Jogos de canvas como Bubble Shooter e Deep Attack tem botoes de controle dedicados para telas touch." },
  { q: "Posso jogar com amigos online?", a: "Sim! Memory Game, 2048, Pong, Ships e Batalha Naval possuem modo multiplayer online. Basta criar uma sala e compartilhar o link com seu amigo para jogar juntos em tempo real." },
  { q: "Os jogos sao realmente gratis?", a: "Sim, todos os jogos sao 100% gratis. Basta se cadastrar com nome e email para comecar a jogar." },
];

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050510",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "8px 12px",
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              { "@type": "Question", "name": "O que e o Acerte a Mosca?", "acceptedAnswer": { "@type": "Answer", "text": "Acerte a Mosca e uma plataforma de jogos online gratis que funciona direto no navegador..." } },
              { "@type": "Question", "name": "Quais jogos estao disponiveis?", "acceptedAnswer": { "@type": "Answer", "text": "Temos 11 jogos: Acerte a Mosca, Wordle BR, Memory Game, 2048, Bubble Shooter, Deep Attack, Pong, Ships, Jogo do Jacare, Tiro ao Alvo e Batalha Naval." } },
              { "@type": "Question", "name": "Preciso baixar alguma coisa?", "acceptedAnswer": { "@type": "Answer", "text": "Nao! Todos os jogos funcionam direto no navegador, tanto no celular quanto no computador." } },
              { "@type": "Question", "name": "Os jogos funcionam no celular?", "acceptedAnswer": { "@type": "Answer", "text": "Sim! Todos os jogos sao responsivos e possuem controles touch otimizados para celular." } },
              { "@type": "Question", "name": "Posso jogar com amigos online?", "acceptedAnswer": { "@type": "Answer", "text": "Sim! Memory Game, 2048, Pong, Ships e Batalha Naval possuem modo multiplayer online." } },
              { "@type": "Question", "name": "Os jogos sao gratis?", "acceptedAnswer": { "@type": "Answer", "text": "Sim, todos os jogos sao 100% gratis." } },
            ]
          })
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "Jogos Online Gratis",
            "description": "Lista de jogos online gratis no Acerte a Mosca",
            "numberOfItems": 11,
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "url": "https://acerteamosca.com.br/jogos/acerteamosca", "name": "Acerte a Mosca" },
              { "@type": "ListItem", "position": 2, "url": "https://acerteamosca.com.br/jogos/pong", "name": "Pong" },
              { "@type": "ListItem", "position": 3, "url": "https://acerteamosca.com.br/jogos/ships", "name": "Ships" },
              { "@type": "ListItem", "position": 4, "url": "https://acerteamosca.com.br/jogos/wordle", "name": "Wordle BR" },
              { "@type": "ListItem", "position": 5, "url": "https://acerteamosca.com.br/jogos/memory", "name": "Memory Game" },
              { "@type": "ListItem", "position": 6, "url": "https://acerteamosca.com.br/jogos/2048", "name": "2048" },
              { "@type": "ListItem", "position": 7, "url": "https://acerteamosca.com.br/jogos/bubbleshooter", "name": "Bubble Shooter" },
              { "@type": "ListItem", "position": 8, "url": "https://acerteamosca.com.br/jogos/deepattack", "name": "Deep Attack" },
              { "@type": "ListItem", "position": 9, "url": "https://acerteamosca.com.br/jogos/jacare", "name": "Jogo do Jacare" },
              { "@type": "ListItem", "position": 10, "url": "https://acerteamosca.com.br/jogos/tiroaoalvo", "name": "Tiro ao Alvo" },
              { "@type": "ListItem", "position": 11, "url": "https://acerteamosca.com.br/jogos/batalha-naval", "name": "Batalha Naval" },
            ]
          })
        }}
      />

      <div style={{ fontSize: 32, marginBottom: 4 }}>🩴</div>
      <h1
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 18,
          color: "#00f0ff",
          textShadow: "0 0 30px #00f0ff, 0 0 60px rgba(0,240,255,0.3)",
          letterSpacing: 4,
          textAlign: "center",
          marginBottom: 4,
        }}
      >
        ACERTE A MOSCA
      </h1>
      <p
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 7,
          color: "#ff2d95",
          letterSpacing: 3,
          textShadow: "0 0 10px #ff2d95",
          marginBottom: 12,
        }}
      >
        JOGOS ONLINE GRATIS
      </p>

      <AdBanner slot="home_top" style={{ marginBottom: 20, maxWidth: 900, width: "100%" }} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 12,
          maxWidth: 900,
          width: "100%",
        }}
      >
        {jogos.map((jogo) => (
          <Link key={jogo.slug} href={`/jogos/${jogo.slug}`}>
            <div
              style={{
                background: "#0a0a1a",
                border: `2px solid ${jogo.destaque ? jogo.cor : "#1a1a2e"}`,
                borderRadius: 12,
                padding: 24,
                cursor: "pointer",
                transition: "all 0.3s",
                boxShadow: jogo.destaque
                  ? `0 0 20px ${jogo.cor}33`
                  : "none",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>
                {jogo.emoji}
              </div>
              <h2
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 14,
                  color: jogo.cor,
                  marginBottom: 8,
                }}
              >
                {jogo.nome}
              </h2>
              <p
                style={{
                  color: "#8892b0",
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                {jogo.desc}
              </p>
              {jogo.destaque && (
                <span
                  style={{
                    display: "inline-block",
                    marginTop: 12,
                    padding: "4px 10px",
                    background: `${jogo.cor}22`,
                    border: `1px solid ${jogo.cor}55`,
                    borderRadius: 4,
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 7,
                    color: jogo.cor,
                    letterSpacing: 1,
                  }}
                >
                  JOGO PRINCIPAL
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      <AdBanner slot="home_bottom" style={{ marginTop: 30, maxWidth: 900, width: "100%" }} />

      {/* FAQ Section for GEO */}
      <section style={{ maxWidth: 900, width: "100%", marginTop: 40, padding: "0 16px" }}>
        <h2 style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: "#00f0ff",
          textShadow: "0 0 10px rgba(0,240,255,0.3)", marginBottom: 24, textAlign: "center",
        }}>PERGUNTAS FREQUENTES</h2>

        {faqs.map((faq, i) => (
          <div key={i} style={{
            marginBottom: 16, padding: "16px 20px", background: "#0a0a1a",
            border: "1px solid #1a1a2e", borderRadius: 8,
          }}>
            <h3 style={{ color: "#ccd6f6", fontSize: 13, marginBottom: 8, fontFamily: "'Fira Code', monospace" }}>
              {faq.q}
            </h3>
            <p style={{ color: "#8892b0", fontSize: 12, lineHeight: 1.6, fontFamily: "'Fira Code', monospace", margin: 0 }}>
              {faq.a}
            </p>
          </div>
        ))}
      </section>

      <p
        style={{
          marginTop: 30,
          color: "#2a2a4a",
          fontSize: 10,
          fontFamily: "'Fira Code', monospace",
        }}
      >
        v1.0 - powered by chineladas
      </p>
    </div>
  );
}
