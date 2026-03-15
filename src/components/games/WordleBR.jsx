"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import AdBanner from "@/components/AdBanner";
import RegisterModal from "@/components/RegisterModal";
import useJogador from "@/hooks/useJogador";
import useGameScale from "@/hooks/useGameScale";

const GAME_W = 400;

const ANSWERS = [
  "GATOS","MUNDO","FESTA","PRAIA","LIVRO","CARRO","PLANO","VERDE","TIGRE","NUVEM",
  "PEDRA","FOLHA","PONTO","TERMO","MUSEU","CAMPO","PORTA","NOITE","FONTE","BRAVO",
  "RITMO","SINAL","BAIXO","NEGRO","CORPO","FRACO","GRADE","LENTO","METRO","NOSSO",
  "PALCO","RADIO","SANTO","TROCA","VENTO","NOBRE","MARCO","PROVA","SORTE","GERAL",
  "MORAL","TOTAL","APOIO","CHAVE","DENSO","ELITE","FIRME","HUMOR","JOVEM","LEGAL",
  "MEDIR","NARIZ","OPERA","PODER","RIGOR","SOLAR","TUMOR","USUAL","VIGOR","TRIGO",
  "BARCO","LEITE","CLARO","CAUSA","SETOR","GRUPO","CRISE","LIDER","FERRO","GRITO",
  "RISCO","PESCA","CHUVA","PULSO","MARCA","FIBRA","DRAMA","BOLSA","LUCRO","SURDO",
  "POUCO","VOLTA","BUSCA","TRILHA","CALMO","BISPO","LARGO","FUNIL","DUPLO","CURTO",
  "GOLPE","MILHO","TEMPO","NINHO","MORRO","VULTO","SURTO","JUSTO","COURO","FALSO",
  "PLUMA","GANHO","LOUCO","SURFA","TOURO","CABRA","FLUIR","BRISA","NERVO","MOLHO",
  "PAPEL","SUAVE","CHEFE","LOUSA","AMIGO","SIGNO","PLACA","VIDRO","CANTO","SENSO",
  "DIZER","CALDA","ETAPA","LIMPO","ABRIR","FUGIR","GIRAR","HAVER","TRAPO","EXATO",
  "FELIZ","DIGNO","JUIZO","ALTAR","FUMAR","CESTA","GREVE","RUBOR","LIXAR","BALDE",
  "RELVA","FENDA","PUNHO","GRUTA","APITO","SAFRA","CUNHA","PAVIO","MALHA","TERNO",
];

const VALID_GUESSES = [
  ...ANSWERS,
  "ABADE","ABALO","ABATE","ABETO","ABISM","ABONO","ABRIL","ACASO","ACENO","ACIDO",
  "ACIMA","ACOLA","ACRES","ADAPT","ADEUS","ADOBE","ADORE","AEREA","AFAGO","AFIOU",
  "AGAPE","AGAVE","AGEIS","AGIRA","AGITO","AGORA","AGUDO","AINDA","AJUDA","ALADO",
  "ALAGA","ALAMA","ALCAN","ALDEA","ALEGR","ALGAS","ALGUM","ALIAR","ALIEN","ALINE",
  "ALMAS","ALMOX","ALOCA","ALTAR","ALTOS","ALUGA","AMADO","AMAIS","AMBAR","AMBOS",
  "AMENO","AMIDO","AMPLO","ANDAR","ANELO","ANJOS","ANTES","ANZOL","AONDE","APEGO",
  "ARENA","ARGOS","ARMAR","AROMA","ARTES","ASPAS","ASSAZ","ASSAR","ATEAR","ATLAS",
  "ATRIZ","ATUAL","AUDIO","AULAS","AVIAO","AVISO","AZEDA","AZUIS","BABOU","BAGRE",
  "BAILE","BAIRR","BALAS","BANCO","BANDA","BANHO","BARBA","BARRO","BASAL","BASTA",
  "BEATA","BELGA","BICHO","BINGO","BLOCO","BOBOS","BODAS","BOLHA","BOMBA","BOTAS",
  "BRACO","BREJO","BRIGA","BRUXA","BUFAR","BUNDA","BURRO","CABAL","CABOS","CACAU",
  "CADIM","CALOR","CAMAS","CANJA","CAPAS","CAPIM","CARAS","CARGO","CARNE","CASAL",
  "CASCA","CASCO","CASOS","CAVAR","CEGOS","CELMA","CENAS","CEPOS","CERCA","CERTO",
  "CICLO","CIFRA","CINCO","CISNE","CIVIL","CLIMA","COBRA","COFRE","COISA","COLAR",
  "COLMO","COLON","COMER","COMUM","CONCA","CONDU","CONTO","COPAS","CORAL","CORDA",
  "CORES","COROA","COSTA","COTAS","COXAS","CRAVE","CRENA","CRUEL","DADOS","DAMAS",
  "DAQUI","DEDOS","DEMOR","DESDE","DEVEM","DEVER","DIABO","DICAS","DITAR","DITOS",
  "DIZER","DOCES","DOLOR","DOMAR","DONOS","DOTES","DUELO","DUNAS","DURAS","DUROU",
  "DUVID","EBANO","EDUCA","ELEVA","ELFOS","EMARC","EMISS","ENDUR","ENFIM","ENTAO",
  "ENTRE","ERRAR","ERVAS","ESCOL","ETNIA","EXATA","EXIGE","EXPOR","EXTRA","FABIO",
  "FACIL","FACTO","FAIXA","FALHA","FALTA","FARDO","FATAL","FAUNA","FAVOR","FECHO",
  "FEDER","FEITO","FENDA","FETAL","FIBRA","FICAR","FILHA","FILME","FINAL","FITAR",
  "FIXAR","FLORA","FLUIR","FOBIA","FOCAR","FOGAO","FOLGA","FORCA","FORMA","FORNO",
  "FORTE","FORUM","FOSSA","FRACA","FRASE","FREAR","FREIO","FRUTA","FUGAZ","FUMAR",
  "FUNDO","FURIA","FUSAO","GAFES","GAIOA","GALHO","GARFO","GARRA","GASTA","GATOS",
  "GEADA","GELAR","GEMER","GENES","GENRO","GENTE","GERAL","GESSO","GIRAR","GLOBO",
  "GOELA","GOLES","GORDO","GOTAS","GOZAR","GRACA","GRAIS","GRAMA","GRANA","GRITO",
  "GROSD","GUIAR","HABIL","HEROI","HIDRA","HINOS","HORTA","HOTEL","HUMOR","IDEAL",
  "IDEIA","IDOLO","IGUAL","ILESO","ILHAS","IMPAR","IMPOR","INCRA","INDIO","INFRA",
  "INVAD","IRMAS","IRRAO","ISCAR","ISOLA","ITENS","JATOS","JEITO","JOGOS","JOIAS",
  "JORDO","JULHO","JUIZO","JUNTA","JURAR","LACRE","LAGOA","LAICA","LAJES","LANCA",
  "LAPSO","LARAO","LASER","LAVAR","LEAOS","LEGUA","LEIGO","LEMAS","LEQUE","LESAO",
  "LETAL","LEVAR","LIDAR","LIDER","LIGAR","LILAS","LIMAR","LIMBO","LINDO","LINHO",
  "LIRAS","LISTA","LISOS","LOBAR","LOCAL","LONGE","LOTAR","LOTUS","LUGAR","LUNAR",
  "LUTAR","LUXOS","MACAR","MACRO","MADRE","MAGIA","MAGOA","MAIOR","MAMAS","MANDO",
  "MANGA","MANHA","MANTO","MAQUI","MARES","MASSA","MATAR","MATOS","MEDIA","MEIGA",
  "MENTA","MESES","METAS","MICRO","MINAS","MINHA","MISTA","MIXAR","MODAL","MOEDA",
  "MOITA","MOLAR","MOLDE","MONTE","MORAL","MORAR","MORDO","MORTA","MOTEL","MOTOR",
  "MUDAR","MUITA","MULAS","MUNDO","MUROS","MUTUO","NADAR","NATAS","NAVAL","NEGAR",
  "NERVO","NETOS","NEXOS","NINAR","NIVEL","NOIVO","NOMES","NORMA","NOTAR","NOVOS",
  "NUTRE","OASIS","OBESO","OBITO","OBRAS","OBVIO","OCASO","OLHAR","ONDAS","OPACO",
  "OPTAR","ORIXO","ORNAI","OUSAR","OUTRA","OUTRO","OUVIR","OZONE","PADRE","PAGAR",
  "PAIOL","PAIXO","PARDO","PARES","PARTE","PASSO","PASTA","PATOS","PAUSA","PAVIO",
  "PECAS","PEDIR","PEGAR","PEITO","PELAS","PELVE","PENAL","PERDA","PESAR","PIADA",
  "PICAR","PILAR","PILHA","PINAR","PINTA","PIOTR","PISAR","PISTA","PLENA","PLUGS",
  "POLAR","POLIR","POLPA","POMBA","PONTO","PORCA","POROS","POSSE","POSTE","POUCO",
  "PRAZO","PRECE","PREGO","PRESA","PREZO","PRIMA","PRISE","PROLE","PROSA","PROTO",
  "PRUDE","PUGNA","PULAR","PULGA","PUNIR","PUROS","QUAIS","QUASE","QUOTA","RAIVA",
  "RAMOS","RARAS","RASTO","RATOS","RAZAO","READM","REAIS","RECUO","REDES","REFEM",
  "REGRA","REJEI","RELAX","REMOR","RENDA","REPOR","RERUM","RESOL","RETER","REVER",
  "RIGOR","RIMAS","RIVAL","ROCHA","RODAS","ROMBO","RONDA","ROUPO","ROTAS","RUBLO",
  "RUFAR","RUGIR","RUINA","RUIVO","RUMOS","RURAL","SABIA","SACIA","SACOS","SAFAR",
  "SAIAS","SAIDA","SALDO","SALMO","SALSA","SALTO","SALVA","SAMBA","SANAR","SANTA",
  "SAPOS","SAQUE","SARNA","SECAR","SEDES","SEIVA","SELVA","SENAI","SENIL","SERRA",
  "SERVO","SEXOS","SIGLA","SILVO","SINAL","SIRVA","SISMO","SITIO","SOBRE","SOBRA",
  "SOCIAL","SOFRE","SOLAR","SOLDO","SOLTO","SONHO","SOPRA","SORGO","SORVO","SUBIR",
  "SUCRE","SUCOS","SUJAR","SUMIR","SUPER","SURDA","TACOS","TALCO","TALAR","TANGO",
  "TAPAS","TAQUIR","TARSO","TAXAS","TECLA","TEDIO","TEIAS","TEIMA","TEMAS","TEMER",
  "TEMPO","TENDA","TENOR","TENSA","TENSO","TERNO","TERRA","TESTA","TINHA","TINTA",
  "TIPOS","TIRAR","TITAN","TOCAR","TODOS","TOMAR","TONAL","TOQUE","TORCI","TORTO",
  "TOTAL","TRAPO","TRAVE","TRENO","TREZE","TRIBO","TRONO","TROTE","TRUFA","TUBOS",
  "TUMBA","TURBO","TURMA","TURNO","UIVAR","ULTRA","UNHAS","UNICO","UNIDO","UNTAR",
  "URANO","URDIR","URGIR","URNAS","USADA","USINA","USUAL","VAGAR","VAGAS","VALER",
  "VALOR","VARSA","VASOS","VAZIO","VEIAS","VELAR","VELHA","VELHO","VENHA","VERBA",
  "VERBO","VERME","VERSO","VEZES","VIAXA","VIDEO","VIGOR","VILAS","VIMOS","VINDO",
  "VINIL","VIRAR","VIRUS","VISAR","VISTA","VITAL","VIUVA","VIVER","VOCAL","VOLTA",
  "VOTAR","VOTOS","VULGO","XAMPU","XEQUE","ZEROS","ZINCO","ZOMBA","ZONAS",
];

const KEYBOARD_ROWS = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["ENTER","Z","X","C","V","B","N","M","⌫"],
];

const COLOR_CORRECT = "#6aaa64";
const COLOR_PRESENT = "#c9b458";
const COLOR_ABSENT = "#787c7e";
const COLOR_EMPTY = "#3a3a3c";
const COLOR_BORDER = "#565758";
const COLOR_BG = "#050510";

function pickWord() {
  return ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
}

function evaluateGuess(guess, answer) {
  const result = Array(5).fill("absent");
  const answerLetters = answer.split("");
  const guessLetters = guess.split("");
  const remaining = [...answerLetters];

  // First pass: mark greens
  for (let i = 0; i < 5; i++) {
    if (guessLetters[i] === answerLetters[i]) {
      result[i] = "correct";
      remaining[i] = null;
    }
  }
  // Second pass: mark yellows
  for (let i = 0; i < 5; i++) {
    if (result[i] === "correct") continue;
    const idx = remaining.indexOf(guessLetters[i]);
    if (idx !== -1) {
      result[i] = "present";
      remaining[idx] = null;
    }
  }
  return result;
}

function getColorForResult(r) {
  if (r === "correct") return COLOR_CORRECT;
  if (r === "present") return COLOR_PRESENT;
  return COLOR_ABSENT;
}

// ---- MAIN COMPONENT ----
export default function WordleBR() {
  const { user, checkedCookie, registering, register } = useJogador("wordle");
  const gameScale = useGameScale(GAME_W);

  const [answer, setAnswer] = useState(() => pickWord());
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameStatus, setGameStatus] = useState("playing"); // playing | won | lost
  const [shakeRow, setShakeRow] = useState(-1);
  const [revealingRow, setRevealingRow] = useState(-1);
  const [bounceRow, setBounceRow] = useState(-1);
  const [toast, setToast] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [keyColors, setKeyColors] = useState({});
  const [hasStarted, setHasStarted] = useState(false);

  const toastTimerRef = useRef(null);
  const firstGuessRef = useRef(false);

  const showToast = useCallback((msg, duration = 1500) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  const updateKeyColors = useCallback((guess, result) => {
    setKeyColors(prev => {
      const next = { ...prev };
      for (let i = 0; i < 5; i++) {
        const letter = guess[i];
        const current = next[letter];
        if (result[i] === "correct") {
          next[letter] = "correct";
        } else if (result[i] === "present" && current !== "correct") {
          next[letter] = "present";
        } else if (!current) {
          next[letter] = "absent";
        }
      }
      return next;
    });
  }, []);

  const submitScore = useCallback((score, tentativas, palavra) => {
    fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pontos: score,
        jogo: "wordle",
        metadata: { tentativas, palavra },
      }),
    }).catch(() => {});
  }, []);

  const handleSubmit = useCallback(() => {
    if (gameStatus !== "playing") return;
    if (currentGuess.length !== 5) return;

    const guess = currentGuess.toUpperCase();
    if (!VALID_GUESSES.includes(guess)) {
      setShakeRow(guesses.length);
      setTimeout(() => setShakeRow(-1), 600);
      showToast("Palavra nao encontrada");
      return;
    }

    if (!firstGuessRef.current) {
      firstGuessRef.current = true;
      window.gtag?.("event", "game_start", { game_name: "wordle" });
    }

    const result = evaluateGuess(guess, answer);
    const rowIdx = guesses.length;
    const newGuesses = [...guesses, { word: guess, result }];

    setGuesses(newGuesses);
    setCurrentGuess("");
    setRevealingRow(rowIdx);

    // After reveal animation completes, update keyboard and check win/loss
    setTimeout(() => {
      setRevealingRow(-1);
      updateKeyColors(guess, result);

      if (guess === answer) {
        setBounceRow(rowIdx);
        setGameStatus("won");
        const score = (7 - newGuesses.length) * 100;
        showToast("Parabens!", 3000);
        submitScore(score, newGuesses.length, answer);
        window.gtag?.("event", "game_end", { game_name: "wordle", score });
      } else if (newGuesses.length >= 6) {
        setGameStatus("lost");
        showToast(`A palavra era: ${answer}`, 4000);
        submitScore(0, 6, answer);
        window.gtag?.("event", "game_end", { game_name: "wordle", score: 0 });
      }
    }, 5 * 100 + 500); // wait for all tiles to flip
  }, [gameStatus, currentGuess, guesses, answer, showToast, updateKeyColors, submitScore]);

  const handleKey = useCallback((key) => {
    if (gameStatus !== "playing") return;
    if (key === "ENTER") {
      handleSubmit();
      return;
    }
    if (key === "BACKSPACE" || key === "⌫") {
      setCurrentGuess(prev => prev.slice(0, -1));
      return;
    }
    if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
      setCurrentGuess(prev => prev + key);
    }
  }, [gameStatus, currentGuess, handleSubmit]);

  // Physical keyboard
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (showInstructions || showRegister) return;
      if (e.key === "Enter") {
        e.preventDefault();
        handleKey("ENTER");
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleKey("BACKSPACE");
      } else {
        const k = e.key.toUpperCase();
        if (/^[A-Z]$/.test(k)) {
          e.preventDefault();
          handleKey(k);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey, showInstructions, showRegister]);

  const resetGame = useCallback(() => {
    setAnswer(pickWord());
    setGuesses([]);
    setCurrentGuess("");
    setGameStatus("playing");
    setShakeRow(-1);
    setRevealingRow(-1);
    setBounceRow(-1);
    setKeyColors({});
    setToast(null);
    firstGuessRef.current = false;
  }, []);

  const handleShare = useCallback(() => {
    const emojiMap = { correct: "🟩", present: "🟨", absent: "⬛" };
    const grid = guesses.map(g => g.result.map(r => emojiMap[r]).join("")).join("\n");
    const text = `Wordle BR ${gameStatus === "won" ? guesses.length : "X"}/6\n\n${grid}`;
    navigator.clipboard.writeText(text).then(() => {
      showToast("Copiado!");
    }).catch(() => {
      showToast("Erro ao copiar");
    });
  }, [guesses, gameStatus, showToast]);

  const handleStart = () => {
    if (!user) {
      setShowRegister(true);
    } else {
      setHasStarted(true);
    }
  };

  const handleRegister = async (userData) => {
    const jogador = await register(userData);
    if (jogador) {
      setShowRegister(false);
      setHasStarted(true);
    }
  };

  if (!checkedCookie) return null;

  // ---- RENDER ----
  return (
    <div style={{
      minHeight: "100vh", background: COLOR_BG, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "flex-start", fontFamily: "'Fira Code', monospace",
      overflow: "hidden", padding: 12,
    }}>
      <style>{`
        @keyframes flipIn {
          0% { transform: rotateX(0deg); }
          50% { transform: rotateX(-90deg); }
          100% { transform: rotateX(0deg); }
        }
        @keyframes shakeRow {
          0%, 100% { transform: translateX(0); }
          10%, 50%, 90% { transform: translateX(-4px); }
          30%, 70% { transform: translateX(4px); }
        }
        @keyframes bounceCell {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes toastIn {
          0% { opacity: 0; transform: translate(-50%, -10px); }
          100% { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes popIn {
          0% { transform: scale(0.8); opacity: 0; }
          40% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes tilePop {
          0% { transform: scale(1); }
          50% { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* Show register modal */}
      {showRegister && (
        <RegisterModal
          onRegister={handleRegister}
          loading={registering}
          jogoNome="WORDLE BR"
          accentColor={COLOR_CORRECT}
        />
      )}

      {/* Splash screen */}
      {!hasStarted && !showRegister && (
        <div style={{
          position: "fixed", inset: 0, background: COLOR_BG, zIndex: 100,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontFamily: "'Press Start 2P', cursive", fontSize: 28, color: COLOR_CORRECT,
            textShadow: `0 0 20px ${COLOR_CORRECT}80`, marginBottom: 16, textAlign: "center",
            lineHeight: 1.4,
          }}>
            WORDLE BR
          </div>
          <div style={{ color: "#aaa", fontSize: 14, marginBottom: 32, textAlign: "center", maxWidth: 300 }}>
            Descubra a palavra de 5 letras em 6 tentativas
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
            {["W","O","R","D","L"].map((l, i) => (
              <div key={i} style={{
                width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, fontWeight: "bold", color: "#fff", borderRadius: 4,
                background: i === 0 ? COLOR_CORRECT : i === 2 ? COLOR_PRESENT : i === 4 ? COLOR_ABSENT : COLOR_EMPTY,
                border: `2px solid ${i === 0 ? COLOR_CORRECT : i === 2 ? COLOR_PRESENT : i === 4 ? COLOR_ABSENT : COLOR_BORDER}`,
                animation: `popIn 0.4s ${i * 0.1}s both`,
              }}>{l}</div>
            ))}
          </div>
          <button
            onClick={handleStart}
            style={{
              fontFamily: "'Press Start 2P', cursive", fontSize: 14, padding: "14px 36px",
              background: "transparent", color: COLOR_CORRECT,
              border: `2px solid ${COLOR_CORRECT}`, borderRadius: 8, cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.target.style.background = COLOR_CORRECT; e.target.style.color = "#fff"; }}
            onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = COLOR_CORRECT; }}
          >
            JOGAR
          </button>
        </div>
      )}

      {/* Instructions modal */}
      {showInstructions && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }} onClick={() => setShowInstructions(false)}>
          <div style={{
            background: "#1a1a2e", borderRadius: 12, padding: 24, maxWidth: 360, width: "100%",
            color: "#eee", fontSize: 13, lineHeight: 1.6, animation: "popIn 0.3s both",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: "'Press Start 2P', cursive", fontSize: 14, marginBottom: 16, color: COLOR_CORRECT }}>
              COMO JOGAR
            </div>
            <p style={{ marginBottom: 12 }}>Descubra a palavra em 6 tentativas. Cada tentativa deve ser uma palavra valida de 5 letras.</p>
            <p style={{ marginBottom: 12 }}>Apos cada tentativa, as cores das letras mudam para mostrar o quao perto voce esta:</p>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
              <div style={{ width: 36, height: 36, background: COLOR_CORRECT, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 16, color: "#fff" }}>A</div>
              <span>Letra correta na posicao correta</span>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
              <div style={{ width: 36, height: 36, background: COLOR_PRESENT, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 16, color: "#fff" }}>B</div>
              <span>Letra correta na posicao errada</span>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, alignItems: "center" }}>
              <div style={{ width: 36, height: 36, background: COLOR_ABSENT, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 16, color: "#fff" }}>C</div>
              <span>Letra nao esta na palavra</span>
            </div>
            <button onClick={() => setShowInstructions(false)} style={{
              width: "100%", padding: "10px 0", background: COLOR_CORRECT, color: "#fff",
              border: "none", borderRadius: 6, fontSize: 14, fontWeight: "bold", cursor: "pointer",
            }}>ENTENDI</button>
          </div>
        </div>
      )}

      {/* Game area */}
      {hasStarted && (
        <div style={{
          width: GAME_W, maxWidth: "100%",
          transform: `scale(${gameScale})`, transformOrigin: "top center",
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>
          {/* Header */}
          <div style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 8, padding: "8px 0", borderBottom: "1px solid #3a3a3c",
          }}>
            <button onClick={() => setShowInstructions(true)} style={{
              background: "none", border: "none", color: "#aaa", fontSize: 22, cursor: "pointer",
              width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
            }} aria-label="Instrucoes">?</button>
            <div style={{
              fontFamily: "'Press Start 2P', cursive", fontSize: 16, color: "#fff",
              letterSpacing: 2,
            }}>WORDLE BR</div>
            <div style={{ width: 36 }} />
          </div>

          {/* Toast */}
          {toast && (
            <div style={{
              position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
              background: "#fff", color: "#000", padding: "10px 20px", borderRadius: 6,
              fontWeight: "bold", fontSize: 14, zIndex: 300, animation: "toastIn 0.2s both",
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            }}>{toast}</div>
          )}

          {/* Grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16, marginTop: 8 }}>
            {Array.from({ length: 6 }).map((_, rowIdx) => {
              const isRevealing = revealingRow === rowIdx;
              const isShaking = shakeRow === rowIdx;
              const isBouncing = bounceRow === rowIdx;
              const guessData = guesses[rowIdx];
              const isCurrentRow = rowIdx === guesses.length && gameStatus === "playing";

              return (
                <div key={rowIdx} style={{
                  display: "flex", gap: 5,
                  animation: isShaking ? "shakeRow 0.6s" : undefined,
                }}>
                  {Array.from({ length: 5 }).map((_, colIdx) => {
                    let letter = "";
                    let bgColor = "transparent";
                    let borderColor = COLOR_EMPTY;
                    let flipDelay = 0;
                    let shouldFlip = false;
                    let shouldBounce = false;
                    let shouldPop = false;

                    if (guessData) {
                      letter = guessData.word[colIdx];
                      if (isRevealing) {
                        shouldFlip = true;
                        flipDelay = colIdx * 100;
                        bgColor = "transparent";
                        borderColor = COLOR_BORDER;
                      } else {
                        bgColor = getColorForResult(guessData.result[colIdx]);
                        borderColor = bgColor;
                      }
                      if (isBouncing) {
                        shouldBounce = true;
                        flipDelay = colIdx * 80;
                      }
                    } else if (isCurrentRow) {
                      letter = currentGuess[colIdx] || "";
                      if (letter) {
                        borderColor = "#999";
                        shouldPop = true;
                      }
                    }

                    return (
                      <div key={colIdx} style={{
                        width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 26, fontWeight: "bold", color: "#fff",
                        border: `2px solid ${borderColor}`, borderRadius: 2,
                        background: bgColor, transition: "background 0.1s",
                        animation: shouldFlip
                          ? `flipIn 0.5s ${flipDelay}ms both`
                          : shouldBounce
                            ? `bounceCell 0.4s ${flipDelay}ms both`
                            : shouldPop && isCurrentRow && colIdx === currentGuess.length - 1
                              ? "tilePop 0.1s both"
                              : undefined,
                        userSelect: "none",
                      }}>
                        {letter}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Action buttons (shown when game is over) */}
          {gameStatus !== "playing" && (
            <div style={{ display: "flex", gap: 10, marginBottom: 12, animation: "fadeIn 0.5s 0.3s both" }}>
              <button onClick={handleShare} style={{
                padding: "8px 18px", background: COLOR_CORRECT, color: "#fff", border: "none",
                borderRadius: 6, fontSize: 13, fontWeight: "bold", cursor: "pointer",
                fontFamily: "'Fira Code', monospace",
              }}>COMPARTILHAR</button>
              <button onClick={resetGame} style={{
                padding: "8px 18px", background: "transparent", color: COLOR_CORRECT,
                border: `2px solid ${COLOR_CORRECT}`, borderRadius: 6, fontSize: 13,
                fontWeight: "bold", cursor: "pointer", fontFamily: "'Fira Code', monospace",
              }}>NOVA PALAVRA</button>
            </div>
          )}

          {/* Virtual Keyboard */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
            {KEYBOARD_ROWS.map((row, rIdx) => (
              <div key={rIdx} style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                {row.map(key => {
                  const isWide = key === "ENTER" || key === "⌫";
                  const kc = keyColors[key];
                  let keyBg = "#818384";
                  if (kc === "correct") keyBg = COLOR_CORRECT;
                  else if (kc === "present") keyBg = COLOR_PRESENT;
                  else if (kc === "absent") keyBg = "#3a3a3c";

                  return (
                    <button
                      key={key}
                      onClick={() => handleKey(key)}
                      style={{
                        width: isWide ? 58 : 34, height: 52, display: "flex", alignItems: "center",
                        justifyContent: "center", background: keyBg, color: "#fff",
                        border: "none", borderRadius: 4, fontSize: isWide ? 11 : 15,
                        fontWeight: "bold", cursor: "pointer", fontFamily: "'Fira Code', monospace",
                        transition: "background 0.3s", userSelect: "none", padding: 0,
                      }}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* User info */}
          {user && (
            <div style={{
              marginTop: 12, color: "#4a5568", fontSize: 10,
              fontFamily: "'Fira Code', monospace",
            }}>
              {user.nome}
            </div>
          )}
        </div>
      )}

      <AdBanner slot="wordle_bottom" style={{ marginTop: 16, maxWidth: GAME_W }} />
    </div>
  );
}
