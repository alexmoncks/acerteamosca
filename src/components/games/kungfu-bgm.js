// kungfu-bgm.js — a trilha do Kung Fu Castle.
//
// Módulo separado do kungfu-audio.js de propósito. Efeito sonoro e trilha
// parecem a mesma coisa e não são: o efeito dura 40ms, dispara dezenas de
// vezes por segundo e precisa de uma janela mínima para não virar metralhadora;
// a trilha dura dois minutos, toca UMA por vez, precisa de laço, de troca
// suave e de volume próprio. Passar a trilha pela tabela de SONS herdaria a
// janela mínima — que a calaria — e o VOLUME_MESTRE dos impactos.
//
// São 40MB de mp3. Nada é pré-carregado: `new Audio(src)` só busca a faixa
// quando ela vai tocar, então quem joga a fase 1 baixa duas faixas, não quinze.

/** Onde as faixas moram. */
export const PASTA_BGM = "/audio/kungfucastle/bgm";

/**
 * Trilha por situação. Editar aqui é trocar a música — nada em código lê nome
 * de arquivo diretamente.
 */
export const TRILHAS = {
  menu: "Kungfu Castle",
  abertura: "Kungfu Castle Opening Screen",
  vitoria: "Master of Castle Ending",
  derrota: "Game Over Part I",
  /** A derrota para o chefe final ganha a própria: é a que dói mais. */
  derrotaFinal: "Game Over Part II",
};

/**
 * Trilha por fase: a do andar e a da luta de chefe.
 *
 * Vieram três temas de andar para cinco andares, então dois reaproveitam — e é
 * escolha, não descuido:
 *
 *  - Fase 1 usa o tema principal. É o que arcade faz desde sempre: a música do
 *    título abre o primeiro estágio, e o jogador entra já reconhecendo o jogo.
 *  - Fase 5 usa "Shadow Master", o mais escuro dos três, no andar mais escuro.
 *    É também o mais distante de onde ele já tocou (fase 3), então repete menos
 *    à vista do que pegar o tema do andar anterior.
 *
 * Chegando tema próprio para 1 ou 5, é uma linha aqui.
 */
export const TRILHAS_FASE = {
  1: { fase: "Kungfu Castle", chefe: "Front Castle Boss Fight" },
  2: { fase: "Castle Gates", chefe: "Castle Gates Boss Fight" },
  3: { fase: "Shadow Master", chefe: "Shadow Master Boss Fight" },
  4: { fase: "The Corridor", chefe: "The Corridor Boss Fight" },
  5: { fase: "Shadow Master", chefe: "Master of Castle Boss Fight" },
};

/**
 * Volume da trilha, separado do dos efeitos.
 *
 * Música por baixo, impacto por cima: um soco tem de se ouvir acima da trilha,
 * senão o combate perde o peso que os samples acabaram de ganhar.
 */
export const VOLUME_BGM = 0.32;

/** Duração da troca entre faixas, em ms. */
export const CROSSFADE = 700;

/** Caminho do arquivo de uma faixa. Espaço em nome de arquivo precisa escapar. */
export function caminhoDe(nome) {
  return `${PASTA_BGM}/${encodeURIComponent(nome)}.mp3`;
}

/**
 * Qual faixa toca em cada momento do jogo.
 *
 * @param {string} situacao  "menu" | "abertura" | "fase" | "chefe" | "vitoria" | "derrota"
 * @param {number} [fase]
 * @returns {string|null} nome da faixa, ou null se não há trilha para isso
 */
export function faixaPara(situacao, fase) {
  if (situacao === "fase" || situacao === "chefe") {
    const par = TRILHAS_FASE[fase];
    return par ? par[situacao === "chefe" ? "chefe" : "fase"] : null;
  }
  // Perder para o chefe final não é a mesma derrota que perder na fase 1.
  if (situacao === "derrota" && fase === Math.max(...Object.keys(TRILHAS_FASE).map(Number))) {
    return TRILHAS.derrotaFinal;
  }
  return TRILHAS[situacao] ?? null;
}

/**
 * O tocador. Uma faixa por vez, em laço, trocando com fade.
 *
 * Não conhece o jogo: recebe nome de situação e fase, devolve o que fez. O que
 * o torna testável sem navegador é `opts.criarAudio` — os testes passam um
 * elemento falso e conferem laço, volume e troca sem baixar 3MB.
 */
export function createBgm(opts = {}) {
  const criarAudio = opts.criarAudio
    ?? ((src) => (typeof Audio === "undefined" ? null : new Audio(src)));
  const agendar = opts.agendar ?? ((fn, ms) => setInterval(fn, ms));
  const cancelar = opts.cancelar ?? ((id) => clearInterval(id));

  let atual = null;      // { el, nome }
  let fade = null;
  let mudo = false;
  let volume = VOLUME_BGM;

  const alvo = () => (mudo ? 0 : volume);

  function pararFade() {
    if (fade !== null) { cancelar(fade); fade = null; }
  }

  /** Descarta um elemento de vez: sem zerar o src ele segue baixando. */
  function descartar(el) {
    if (!el) return;
    try { el.pause(); el.src = ""; } catch { /* elemento já morto */ }
  }

  return {
    /**
     * Toca a faixa da situação. Pedir a MESMA que já está tocando não faz nada
     * — sem isso, cada quadro que reavaliasse a situação reiniciaria a música
     * do zero e ela nunca passaria do primeiro compasso.
     *
     * @returns {string|null} o nome da faixa que passou a tocar, ou null
     */
    tocar(situacao, fase) {
      const nome = faixaPara(situacao, fase);
      if (!nome) return null;
      if (atual?.nome === nome) return nome;

      const el = criarAudio(caminhoDe(nome));
      if (!el) return null;
      el.loop = true;
      el.volume = 0;
      const anterior = atual;
      atual = { el, nome };
      try { el.play()?.catch?.(() => {}); } catch { /* autoplay barrado */ }

      // Sobe a nova enquanto desce a anterior. Corte seco entre dois temas de
      // dois minutos denuncia a emenda; 700ms passa despercebido.
      pararFade();
      const passos = 14;
      let i = 0;
      fade = agendar(() => {
        i++;
        const k = Math.min(1, i / passos);
        if (atual?.el === el) el.volume = alvo() * k;
        if (anterior?.el) anterior.el.volume = Math.max(0, alvo() * (1 - k));
        if (k >= 1) {
          pararFade();
          descartar(anterior?.el);
        }
      }, CROSSFADE / passos);
      return nome;
    },

    /** Para tudo e solta o arquivo. */
    parar() {
      pararFade();
      descartar(atual?.el);
      atual = null;
    },

    /** Pausa sem soltar o arquivo — para quando o jogo pausa ou a aba some. */
    pausar() { try { atual?.el?.pause(); } catch { /* nada a pausar */ } },
    retomar() { try { atual?.el?.play()?.catch?.(() => {}); } catch { /* idem */ } },

    setMudo(m) {
      mudo = !!m;
      if (atual?.el) atual.el.volume = alvo();
      return mudo;
    },
    estaMudo: () => mudo,

    setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      if (atual?.el && fade === null) atual.el.volume = alvo();
      return volume;
    },

    /** Que faixa está tocando. Usado nos testes e no seletor de som. */
    faixaAtual: () => atual?.nome ?? null,
  };
}
