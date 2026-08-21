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
 *   filtro  frequência de corte do filtro do ruído, em Hz
 *   passa   "lowpass" (padrão) | "highpass" | "bandpass"
 *   q       ressonância do filtro; alto = estreito, é o que dá o "crack"
 *   dur     duração em segundos
 *   vol     0 a 1, antes do volume global
 *   atraso  segundos antes de começar, para montar batidas
 */

/** Volume global dos efeitos. O combate é o que mais toca; não pode cansar. */
export const VOLUME_MESTRE = 0.5;

export const SONS = {
  // ── combate ──────────────────────────────────────────────────────────────
  //
  // Impacto de verdade tem DUAS partes, e a primeira versão só tinha a segunda.
  //
  //   TRANSIENTE  10 a 20ms de ruído banda-estreita. É o estalo, e é o que o
  //               ouvido usa para dizer se bateu em carne, em madeira ou em
  //               metal. Sem ele, qualquer impacto vira bipe.
  //   CORPO       um seno ou triângulo despencando rápido de frequência. É a
  //               massa: quanto mais grave e mais longo, mais pesado o golpe.
  //
  // Tapa e soco diferem quase só no transiente. O tapa é CLARO — banda alta e
  // estreita, corpo quase nenhum, porque pele em pele não desloca massa. O soco
  // é ESCURO — banda mais baixa e larga, e corpo de verdade.

  // Tapa: estalo alto, sem peso.
  tapa: {
    minIntervalo: 45,
    vozes: [
      { ruido: true, passa: "bandpass", filtro: 3200, q: 2.4, dur: 0.035, vol: 0.34 },
      { onda: "sine", de: 320, para: 150, dur: 0.045, vol: 0.12 },
    ],
  },
  // Soco: estalo escuro e curto, corpo grave despencando.
  socoAcerta: {
    minIntervalo: 45,
    vozes: [
      { ruido: true, passa: "bandpass", filtro: 900, q: 1.2, dur: 0.045, vol: 0.30 },
      { onda: "sine", de: 210, para: 48, dur: 0.11, vol: 0.30 },
      { onda: "triangle", de: 95, para: 40, dur: 0.16, vol: 0.16, atraso: 0.01 },
    ],
  },
  // Chute: mais massa que o soco, transiente mais grave e corpo mais longo.
  chuteAcerta: {
    minIntervalo: 45,
    vozes: [
      { ruido: true, passa: "bandpass", filtro: 620, q: 1.0, dur: 0.055, vol: 0.30 },
      { onda: "sine", de: 170, para: 38, dur: 0.16, vol: 0.32 },
      { onda: "triangle", de: 80, para: 32, dur: 0.22, vol: 0.16, atraso: 0.015 },
    ],
  },
  // Golpe no vazio: só ar deslocado. Passa-alta, sem corpo nenhum.
  golpeNoVazio: {
    minIntervalo: 60,
    vozes: [{ ruido: true, passa: "highpass", filtro: 3800, dur: 0.07, vol: 0.11 }],
  },
  // O jogador apanhando precisa doer mais que o inimigo apanhando: é a única
  // pista sonora de que a vida está indo embora.
  jogadorApanha: {
    minIntervalo: 90,
    vozes: [
      { ruido: true, passa: "bandpass", filtro: 700, q: 0.9, dur: 0.06, vol: 0.28 },
      // Mais alto que o som de acertar, de propósito: é a única pista sonora de
      // que a vida está indo embora, e tem de furar o barulho do próprio combate.
      { onda: "sawtooth", de: 150, para: 36, dur: 0.20, vol: 0.36 },
      { onda: "sine", de: 62, para: 30, dur: 0.30, vol: 0.22, atraso: 0.02 },
    ],
  },
  inimigoCai: {
    minIntervalo: 180,
    vozes: [
      { onda: "triangle", de: 300, para: 70, dur: 0.26, vol: 0.22 },
      { ruido: true, filtro: 700, dur: 0.16, vol: 0.16, atraso: 0.08 },
    ],
  },
  chefeApanha: {
    minIntervalo: 60,
    vozes: [
      { ruido: true, passa: "bandpass", filtro: 480, q: 0.8, dur: 0.07, vol: 0.28 },
      { onda: "square", de: 130, para: 34, dur: 0.18, vol: 0.28 },
      { onda: "sine", de: 55, para: 26, dur: 0.28, vol: 0.14, atraso: 0.02 },
    ],
  },
  chefeCai: {
    minIntervalo: 400,
    vozes: [
      { onda: "sawtooth", de: 180, para: 28, dur: 0.9, vol: 0.34 },
      { ruido: true, filtro: 500, dur: 0.7, vol: 0.24, atraso: 0.05 },
      { onda: "sine", de: 60, para: 24, dur: 1.2, vol: 0.20, atraso: 0.1 },
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

/**
 * Sons que preferem uma AMOSTRA de verdade ao sintetizado.
 *
 * Oscilador não faz grito. Impacto ele faz bem — transiente mais corpo é
 * exatamente como um soco soa —, mas voz humana não sai de onda quadrada, e um
 * kiai sintetizado soa como alarme de micro-ondas. Grito precisa de gravação.
 *
 * Como usar: ponha o arquivo em `public/audio/kungfucastle/sfx/<nome>.mp3` e
 * acrescente o nome aqui. O tocador usa a amostra quando ela carrega e cai no
 * sintetizado quando não carrega — então acrescentar um nome antes do arquivo
 * existir não quebra nada, só não muda nada.
 *
 * Os `grito*` não existem na tabela de síntese de propósito: sem arquivo eles
 * são silêncio, e silêncio é melhor que um bipe fingindo ser voz.
 */
export const COM_AMOSTRA = [
  "tapa",
  "socoAcerta",
  "chuteAcerta",
  "jogadorApanha",
  "passoEscada",
  "gritoAtaque",   // kiai do jogador ao socar
  "gritoEsforco",  // ao levar dano
  "gritoChefe",    // o chefe carregando o poder
];

/** Onde as amostras moram. */
export const PASTA_AMOSTRAS = "/audio/kungfucastle/sfx";

/**
 * Janela mínima para os nomes que só existem como amostra — os gritos.
 *
 * Sem entrada em SONS eles não têm janela própria, e voz humana é o pior caso
 * para repetição: um kiai por soco, com o jogador martelando o botão, cansa em
 * dez segundos. 400ms deixa passar mais ou menos um grito a cada dois golpes.
 */
export const INTERVALO_PADRAO = 400;

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
  const amostras = new Map(); // nome -> pool de <audio>, quando o arquivo existe
  const sondados = new Set(); // nomes já pedidos ao servidor, deram certo ou não

  // Injetável como o storage: sem isso, testar a janela mínima exigiria esperar
  // de verdade os 45ms, e um teste que dorme é um teste que às vezes mente.
  const agora = opts.agora
    ?? (() => (typeof performance !== "undefined" ? performance.now() : Date.now()));

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
        f.type = v.passa || "lowpass";
        f.frequency.value = v.filtro;
        if (v.q) f.Q.value = v.q;
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

  /**
   * Tenta carregar as amostras. Um pool por som, porque dois inimigos apanhando
   * juntos precisam de dois elementos — um só reinicia e o primeiro soco some.
   *
   * Falha em silêncio de propósito: arquivo ausente é o caso NORMAL enquanto as
   * gravações não chegam, e o sintetizado cobre. Não é erro, é o padrão.
   *
   * Sondar UMA vez por nome, não uma por chamada. init() roda a cada tecla —
   * é o único momento em que o navegador deixa destravar o áudio — e marcar só
   * os que carregaram fazia os ausentes voltarem ao servidor a cada tecla
   * pressionada: três 404 por tecla, centenas numa partida.
   */
  function carregarAmostras() {
    if (typeof Audio === "undefined") return;
    for (const nome of COM_AMOSTRA) {
      if (sondados.has(nome)) continue;
      sondados.add(nome);
      const src = `${PASTA_AMOSTRAS}/${nome}.mp3`;
      const sonda = new Audio();
      sonda.addEventListener("canplaythrough", () => {
        const pool = [sonda];
        for (let i = 1; i < 3; i++) pool.push(new Audio(src));
        amostras.set(nome, { pool, idx: 0 });
      }, { once: true });
      sonda.addEventListener("error", () => { /* sem arquivo: fica o sintetizado */ }, { once: true });
      sonda.preload = "auto";
      sonda.src = src;
    }
  }

  function tocarAmostra(nome) {
    const a = amostras.get(nome);
    if (!a) return false;
    const el = a.pool[a.idx];
    a.idx = (a.idx + 1) % a.pool.length;
    try {
      el.currentTime = 0;
      el.volume = VOLUME_MESTRE;
      el.play().catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  return {
    /** Cria o contexto. Chamar no primeiro gesto do usuário, nunca antes. */
    init() {
      carregarAmostras();
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
      if (mudo) return false;
      const som = SONS[nome];
      // Amostra ganha do sintetizado quando existe. Alguns nomes (os gritos) só
      // têm amostra: sem arquivo eles são silêncio, e silêncio é melhor que um
      // bipe fingindo ser voz.
      const temAmostra = COM_AMOSTRA.includes(nome);
      if (!som && !temAmostra) return false;

      // A janela mínima vale para os DOIS caminhos, e vem antes de escolher
      // entre eles. Cinco inimigos morrendo no mesmo quadro viram um estouro em
      // vez de cinco quedas — e a amostra reinicia com `currentTime = 0`, que é
      // exatamente o efeito de metralhadora que a janela existe para cortar.
      // Deixar a amostra passar por fora tornava a janela decorativa justo nos
      // sons que mais se repetem: os impactos.
      const janela = som?.minIntervalo ?? INTERVALO_PADRAO;
      const t = agora();
      if (t - (ultimaVez.get(nome) ?? -Infinity) < janela) return false;

      if (temAmostra && tocarAmostra(nome)) {
        ultimaVez.set(nome, t);
        return true;
      }
      if (!som || !ctx) return false;
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
