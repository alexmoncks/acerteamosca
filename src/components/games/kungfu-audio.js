// kungfu-audio.js — efeitos sonoros do Kung Fu Castle.
//
// Tudo sintetizado com osciladores da WebAudio, nenhum arquivo. É o mesmo
// caminho que o 3invader já usa no projeto, e para um beat-em-up ele resolve o
// conjunto inteiro: soco, chute, queda, gongo. Sem download, sem asset para
// versionar, e o timbre combina com pixel art melhor do que gravação limpa.
//
// Os sons são DADOS, não código. A tabela abaixo descreve cada um como uma
// lista de vozes, e um sintetizador burro a executa. É o mesmo corte de
// kungfu-combat.js: a decisão fica testável sem navegador, e acrescentar um som
// é acrescentar uma linha, não uma função.

/**
 * Uma voz é um oscilador ou um estouro de ruído.
 *
 *   onda    "sine" | "square" | "triangle" | "sawtooth"
 *   de/para frequência inicial e final em Hz (glissando exponencial)
 *   ruido   true para ruído branco em vez de oscilador
 *   filtro  corte do passa-baixa do ruído, em Hz
 *   dur     duração em segundos
 *   vol     0 a 1, antes do volume global
 *   atraso  segundos antes de começar, para montar batidas
 */

/** Volume global dos efeitos. O combate é o que mais toca; não pode cansar. */
export const VOLUME_MESTRE = 0.5;

export const SONS = {
  // ── combate ──────────────────────────────────────────────────────────────
  // Impacto seco: um corpo grave que despenca, mais um estalo de ruído. O
  // estalo é o que faz o soco "conectar"; sem ele fica um bipe.
  socoAcerta: {
    minIntervalo: 45,
    vozes: [
      { onda: "square", de: 190, para: 55, dur: 0.09, vol: 0.30 },
      { ruido: true, filtro: 1800, dur: 0.05, vol: 0.22 },
    ],
  },
  chuteAcerta: {
    minIntervalo: 45,
    vozes: [
      { onda: "square", de: 150, para: 42, dur: 0.12, vol: 0.32 },
      { ruido: true, filtro: 1400, dur: 0.07, vol: 0.24 },
    ],
  },
  // Golpe no vazio: só ar. Agudo, curtíssimo, baixo — tem de ser sentido, não
  // ouvido, senão martelar o botão vira metralhadora.
  golpeNoVazio: {
    minIntervalo: 60,
    vozes: [{ ruido: true, filtro: 5200, dur: 0.06, vol: 0.10 }],
  },
  // O jogador apanhando precisa doer mais que o inimigo apanhando: é a única
  // pista sonora de que a vida está indo embora.
  jogadorApanha: {
    minIntervalo: 90,
    vozes: [
      { onda: "sawtooth", de: 140, para: 40, dur: 0.18, vol: 0.34 },
      { ruido: true, filtro: 900, dur: 0.12, vol: 0.26 },
    ],
  },
  inimigoCai: {
    // Janela larga de propósito, e não a de um som de combate: a queda dura
    // 260ms, e cinco inimigos caindo juntos empilhariam cinco cópias da mesma
    // onda — que somam em fase e saturam. Uma pancada só, para um grupo
    // inteiro, lê melhor do que cinco emboladas.
    minIntervalo: 180,
    vozes: [
      { onda: "triangle", de: 300, para: 70, dur: 0.26, vol: 0.24 },
      { ruido: true, filtro: 700, dur: 0.16, vol: 0.16, atraso: 0.08 },
    ],
  },
  chefeApanha: {
    minIntervalo: 60,
    vozes: [
      { onda: "square", de: 120, para: 38, dur: 0.14, vol: 0.32 },
      { ruido: true, filtro: 1100, dur: 0.08, vol: 0.24 },
    ],
  },
  chefeCai: {
    minIntervalo: 400,
    vozes: [
      { onda: "sawtooth", de: 180, para: 28, dur: 0.9, vol: 0.38 },
      { ruido: true, filtro: 500, dur: 0.7, vol: 0.28, atraso: 0.05 },
      { onda: "sine", de: 60, para: 24, dur: 1.2, vol: 0.22, atraso: 0.1 },
    ],
  },

  // ── poder do chefe ───────────────────────────────────────────────────────
  // O tom que SOBE é a telegrafia inteira: quem ouve sabe que vem coisa antes
  // de ver a animação terminar. Longo de propósito, para caber na carga.
  poderCarrega: {
    minIntervalo: 500,
    vozes: [
      { onda: "sine", de: 90, para: 420, dur: 0.75, vol: 0.20 },
      { onda: "triangle", de: 45, para: 210, dur: 0.75, vol: 0.14 },
    ],
  },
  poderGolpe: {
    minIntervalo: 300,
    vozes: [
      { onda: "sawtooth", de: 260, para: 45, dur: 0.35, vol: 0.40 },
      { ruido: true, filtro: 2600, dur: 0.28, vol: 0.34 },
      { onda: "sine", de: 70, para: 30, dur: 0.5, vol: 0.26, atraso: 0.04 },
    ],
  },

  // ── movimento ────────────────────────────────────────────────────────────
  pulo:        { minIntervalo: 120, vozes: [{ onda: "sine", de: 260, para: 620, dur: 0.11, vol: 0.16 }] },
  aterrissa:   { minIntervalo: 120, vozes: [{ ruido: true, filtro: 800, dur: 0.07, vol: 0.14 }] },
  pirueta:     { minIntervalo: 200, vozes: [{ ruido: true, filtro: 3400, dur: 0.16, vol: 0.14 }] },
  passoEscada: { minIntervalo: 150, vozes: [{ ruido: true, filtro: 1100, dur: 0.05, vol: 0.12 }] },

  // ── fase ─────────────────────────────────────────────────────────────────
  // Gongo: fundamental grave com harmônicos inarmônicos por cima. Metal soa
  // metálico justamente porque os parciais não são múltiplos inteiros.
  gongo: {
    minIntervalo: 800,
    vozes: [
      { onda: "sine", de: 146, para: 138, dur: 2.2, vol: 0.30 },
      { onda: "sine", de: 389, para: 372, dur: 1.8, vol: 0.16 },
      { onda: "sine", de: 631, para: 604, dur: 1.4, vol: 0.10 },
      { ruido: true, filtro: 4200, dur: 0.12, vol: 0.14 },
    ],
  },
  vitoria: {
    minIntervalo: 1500,
    vozes: [
      { onda: "square", de: 523, para: 523, dur: 0.14, vol: 0.20 },
      { onda: "square", de: 659, para: 659, dur: 0.14, vol: 0.20, atraso: 0.14 },
      { onda: "square", de: 784, para: 784, dur: 0.14, vol: 0.20, atraso: 0.28 },
      { onda: "square", de: 1047, para: 1047, dur: 0.5, vol: 0.24, atraso: 0.42 },
    ],
  },
  derrota: {
    minIntervalo: 1500,
    vozes: [
      { onda: "triangle", de: 392, para: 392, dur: 0.22, vol: 0.22 },
      { onda: "triangle", de: 330, para: 330, dur: 0.22, vol: 0.22, atraso: 0.22 },
      { onda: "triangle", de: 262, para: 200, dur: 0.9, vol: 0.24, atraso: 0.44 },
    ],
  },

  // ── interface ────────────────────────────────────────────────────────────
  menu: { minIntervalo: 60, vozes: [{ onda: "square", de: 880, para: 1320, dur: 0.05, vol: 0.12 }] },
};

/** Duração total de um som, incluindo atrasos. Usada nos testes e no mixer. */
export function duracaoDe(som) {
  return Math.max(...som.vozes.map((v) => (v.atraso || 0) + v.dur));
}

/**
 * Cria o tocador.
 *
 * O AudioContext NÃO nasce aqui. Navegador nenhum deixa criar e tocar áudio
 * antes de um gesto do usuário, e um contexto criado cedo demais nasce
 * suspenso — o jogo fica mudo a partida inteira sem dar erro nenhum. Por isso
 * `init()` é chamado no primeiro clique ou tecla, e `tocar()` antes disso é
 * silêncio, não exceção.
 *
 * @param {object} [opts]
 * @param {Storage} [opts.storage] onde o mudo é lembrado entre partidas
 */
export function createAudio(opts = {}) {
  const storage = opts.storage;
  const CHAVE = "kungfu:mudo";
  let ctx = null;
  let mudo = storage?.getItem(CHAVE) === "1";
  const ultimaVez = new Map();
  let ruidoBuf = null;

  const agora = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

  function bufferDeRuido() {
    if (ruidoBuf) return ruidoBuf;
    const n = Math.floor(ctx.sampleRate * 0.5);
    ruidoBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = ruidoBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return ruidoBuf;
  }

  function voz(v, t0) {
    const t = t0 + (v.atraso || 0);
    const ganho = ctx.createGain();
    const pico = Math.min(1, (v.vol ?? 0.2) * VOLUME_MESTRE);
    // Ataque de 4ms em vez de instantâneo: um degrau em amplitude estala no
    // alto-falante, e o estalo aparece em TODO som, não só neste.
    ganho.gain.setValueAtTime(0.0001, t);
    ganho.gain.exponentialRampToValueAtTime(pico, t + 0.004);
    ganho.gain.exponentialRampToValueAtTime(0.0001, t + v.dur);
    ganho.connect(ctx.destination);

    let fonte;
    if (v.ruido) {
      fonte = ctx.createBufferSource();
      fonte.buffer = bufferDeRuido();
      if (v.filtro) {
        const f = ctx.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = v.filtro;
        fonte.connect(f);
        f.connect(ganho);
      } else {
        fonte.connect(ganho);
      }
    } else {
      fonte = ctx.createOscillator();
      fonte.type = v.onda || "sine";
      fonte.frequency.setValueAtTime(v.de, t);
      if (v.para && v.para !== v.de) {
        fonte.frequency.exponentialRampToValueAtTime(Math.max(1, v.para), t + v.dur);
      }
      fonte.connect(ganho);
    }
    fonte.start(t);
    fonte.stop(t + v.dur + 0.02);
  }

  return {
    /** Cria o contexto. Chamar no primeiro gesto do usuário, nunca antes. */
    init() {
      if (ctx) {
        if (ctx.state === "suspended") ctx.resume();
        return;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        ctx.resume();
      } catch {
        ctx = null; // sem áudio disponível: o jogo segue mudo, não quebra
      }
    },

    /**
     * Toca um som pelo nome. Antes do init, ou mudo, ou com nome desconhecido,
     * não faz nada — áudio nunca deve derrubar o laço do jogo.
     */
    tocar(nome) {
      const som = SONS[nome];
      if (!som || !ctx || mudo) return false;
      // Cinco inimigos morrendo no mesmo quadro viram um estouro em vez de
      // cinco quedas. A janela mínima corta a repetição sem cortar o ritmo.
      const t = agora();
      if (t - (ultimaVez.get(nome) ?? -Infinity) < som.minIntervalo) return false;
      ultimaVez.set(nome, t);
      const t0 = ctx.currentTime;
      for (const v of som.vozes) voz(v, t0);
      return true;
    },

    setMudo(m) {
      mudo = !!m;
      storage?.setItem(CHAVE, mudo ? "1" : "0");
      return mudo;
    },
    estaMudo: () => mudo,
    pronto: () => !!ctx,
  };
}
