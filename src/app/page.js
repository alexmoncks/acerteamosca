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
