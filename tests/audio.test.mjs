// Os efeitos sonoros.
//
// Tudo sintetizado com osciladores: os sons são DADOS numa tabela, e um
// sintetizador burro os executa. Esse corte é o que torna o áudio testável sem
// navegador — a tabela e as regras de disparo são conferíveis aqui; só o
// barulho em si precisa de ouvido.
import assert from "node:assert/strict";
import { check, source, loadModule } from "./helpers.mjs";

const { SONS, duracaoDe, createAudio, VOLUME_MESTRE, COM_AMOSTRA, PASTA_AMOSTRAS } =
  await loadModule("src/components/games/kungfu-audio.js");
const GAME = source("src/components/games/KungFuCastle.jsx");

const ONDAS = ["sine", "square", "triangle", "sawtooth"];

// ── a tabela ───────────────────────────────────────────────────────────────

check("every sound has at least one voice, and every voice is well formed", () => {
  assert.ok(Object.keys(SONS).length >= 15, `só ${Object.keys(SONS).length} sons`);
  for (const [nome, som] of Object.entries(SONS)) {
    assert.ok(som.vozes?.length > 0, `${nome} não tem voz`);
    assert.ok(Number.isFinite(som.minIntervalo) && som.minIntervalo >= 0,
      `${nome}.minIntervalo inválido`);
    for (const v of som.vozes) {
      assert.ok(v.dur > 0 && v.dur <= 3, `${nome}: duração ${v.dur} fora do razoável`);
      assert.ok(v.vol > 0 && v.vol <= 1, `${nome}: volume ${v.vol} fora de 0..1`);
      if (v.ruido) {
        assert.ok(!v.onda, `${nome}: ruído não usa forma de onda`);
        if (v.filtro !== undefined) assert.ok(v.filtro > 0 && v.filtro < 22050,
          `${nome}: filtro ${v.filtro} fora da faixa audível`);
      } else {
        assert.ok(ONDAS.includes(v.onda), `${nome}: onda "${v.onda}" desconhecida`);
        assert.ok(v.de > 0 && v.de < 20000, `${nome}: frequência ${v.de} fora do audível`);
        // O glissando é exponencial: passar por zero é NaN no ramp.
        if (v.para !== undefined) assert.ok(v.para > 0, `${nome}: destino ${v.para} não é positivo`);
      }
    }
  }
});

check("no sound is loud enough to clip once the master volume is applied", () => {
  // Vozes somam. Um som com três vozes no talo satura o alto-falante e vira
  // estalo, que é pior do que ser baixo demais.
  for (const [nome, som] of Object.entries(SONS)) {
    const soma = som.vozes.reduce((t, v) => t + v.vol, 0) * VOLUME_MESTRE;
    assert.ok(soma <= 1, `${nome}: soma das vozes dá ${soma.toFixed(2)}, satura`);
  }
});

check("a blow is never silently eaten, and a long sound never stacks", () => {
  // As duas regras se opõem, e a oposição é o que separa as duas famílias.
  //
  // GOLPE precisa de janela curta: cada soco que o jogador dá tem de soar, ou
  // o jogo parece engolir entrada. São sons curtos, empilham pouco.
  //
  // QUEDA e CARTÃO precisam de janela larga: duram de 0,26s a 2,2s, e cópias
  // da mesma onda começando perto somam em fase e saturam. Uma pancada só para
  // um grupo inteiro lê melhor que cinco emboladas — e ninguém sente falta de
  // ouvir a quinta morte.
  for (const n of ["socoAcerta", "chuteAcerta", "chefeApanha"]) {
    assert.ok(SONS[n].minIntervalo <= 60, `${n}: janela de ${SONS[n].minIntervalo}ms come golpes`);
  }
  for (const n of ["inimigoCai", "gongo", "vitoria", "derrota", "chefeCai"]) {
    assert.ok(SONS[n].minIntervalo >= 150, `${n}: janela curta demais para um som longo`);
  }
});

check("a sound's window is never shorter than a rapid retrigger of itself", () => {
  // Se a janela for menor que a duração, a mesma voz se sobrepõe a si mesma e
  // dobra de volume — o caminho mais curto para saturar.
  for (const [nome, som] of Object.entries(SONS)) {
    if (som.minIntervalo === 0) continue;
    const dur = duracaoDe(som) * 1000;
    assert.ok(som.minIntervalo >= Math.min(dur, 45) * 0.9,
      `${nome}: janela ${som.minIntervalo}ms contra ${Math.round(dur)}ms de som`);
  }
});

check("the player hurting is louder than an enemy hurting", () => {
  // É a única pista sonora de que a vida está indo embora.
  const soma = (n) => SONS[n].vozes.reduce((t, v) => t + v.vol, 0);
  assert.ok(soma("jogadorApanha") > soma("socoAcerta"),
    "o jogador apanhando precisa se impor sobre o som de acertar");
});

check("the boss charge lasts long enough to be a telegraph", () => {
  // Tem de caber na carga do poder, que é de 34 a 60 ticks (0,57s a 1s).
  assert.ok(duracaoDe(SONS.poderCarrega) >= 0.5,
    `carga de ${duracaoDe(SONS.poderCarrega)}s é curta demais para telegrafar`);
  const sobe = SONS.poderCarrega.vozes.every((v) => v.para > v.de);
  assert.ok(sobe, "o tom precisa SUBIR: é o que anuncia que vem coisa");
});

// ── o tocador ──────────────────────────────────────────────────────────────

check("nothing is created and nothing plays before init", () => {
  // Contexto criado antes de um gesto nasce suspenso, e o jogo fica mudo a
  // partida inteira sem dar erro nenhum.
  const a = createAudio();
  assert.equal(a.pronto(), false);
  assert.equal(a.tocar("socoAcerta"), false, "tocar antes do init tem de ser silêncio");
});

check("an unknown sound is silence, never an exception", () => {
  // Áudio não pode derrubar o laço do jogo.
  const a = createAudio();
  assert.doesNotThrow(() => a.tocar("nao-existe"));
  assert.equal(a.tocar("nao-existe"), false);
});

check("mute is remembered between sessions", () => {
  const guardado = {};
  const storage = {
    getItem: (k) => guardado[k] ?? null,
    setItem: (k, v) => { guardado[k] = v; },
  };
  const a = createAudio({ storage });
  assert.equal(a.estaMudo(), false);
  a.setMudo(true);
  assert.equal(guardado["kungfu:mudo"], "1");
  assert.equal(createAudio({ storage }).estaMudo(), true, "a próxima partida abre mudo");
});

check("createAudio works without any storage at all", () => {
  // Modo anônimo, storage bloqueado, SSR: nada disso pode quebrar o jogo.
  assert.doesNotThrow(() => {
    const a = createAudio();
    a.setMudo(true);
    a.estaMudo();
  });
});

// ── fiação ─────────────────────────────────────────────────────────────────

check("the context is only woken by a real user gesture", () => {
  assert.match(GAME, /const acordarAudio = \(\) => audio\(\)\?\.init\(\)/);
  // O tocador é do COMPONENTE, não da cena: precisa existir no menu, onde
  // cena não há, e sobreviver à troca de fase, que reconstrói a cena inteira.
  assert.match(GAME, /const audioRef = useRef\(null\)/);
  assert.match(GAME, /scene\.audio = audio\(\)/);
  assert.match(GAME, /addEventListener\("pointerdown", acordarAudio\)/,
    "no celular não existe keydown");
  assert.match(GAME, /removeEventListener\("pointerdown", acordarAudio\)/,
    "o listener precisa ser removido, senão vaza a cada remonte");
  assert.ok(!/createAudio\(\)[\s\S]{0,80}\.init\(\)/.test(GAME),
    "init não pode acontecer junto da criação");
});

check("a shout has no synth fallback, on purpose", () => {
  // Oscilador não faz voz. Um kiai sintetizado soa como alarme de micro-ondas,
  // e silêncio é melhor do que um bipe fingindo ser grito. Enquanto a gravação
  // não chega, esses nomes simplesmente não soam.
  for (const n of COM_AMOSTRA.filter((x) => x.startsWith("grito"))) {
    assert.equal(SONS[n], undefined, `${n} não deve ter síntese de reserva`);
  }
});

check("every impact that prefers a sample still has a synth to fall back to", () => {
  // O contrário do teste acima: impacto o oscilador FAZ bem, então enquanto não
  // houver arquivo o jogo não pode ficar mudo no soco.
  for (const n of COM_AMOSTRA.filter((x) => !x.startsWith("grito"))) {
    assert.ok(SONS[n], `${n} pede amostra mas não tem reserva sintetizada`);
  }
});

check("samples are looked for in one declared folder", () => {
  assert.match(PASTA_AMOSTRAS, /^\/audio\/kungfucastle\//);
  const AUDIO = source("src/components/games/kungfu-audio.js");
  assert.match(AUDIO, /\$\{PASTA_AMOSTRAS\}\/\$\{nome\}\.mp3/,
    "o caminho precisa sair da constante, para acrescentar arquivo não exigir código");
});

check("a missing sample file is the normal case, never an error", () => {
  // Enquanto as gravações não chegam, TODO nome falha ao carregar. Se isso
  // fosse tratado como erro, o console encheria e alguém iria atrás de um bug
  // que não existe.
  const AUDIO = source("src/components/games/kungfu-audio.js");
  const bloco = AUDIO.match(/function carregarAmostras[\s\S]*?\n  \}/)[0];
  assert.match(bloco, /addEventListener\("error"/, "a falha precisa ser capturada");
  assert.ok(!/console\.(error|warn)/.test(bloco), "arquivo ausente não é para reclamar");
});

check("an impact hit uses a different sound from a light touch", () => {
  // O mesmo som em todo golpe apaga a diferença entre encostar e acertar.
  assert.match(GAME, /\(atk\.dmg \|\| 1\) <= 1 \? "tapa" : "socoAcerta"/);
});

check("every sound in the table is actually reachable from the game", () => {
  // Som declarado e nunca tocado é peso morto que ninguém percebe estar
  // quebrado. O contrário — tocar nome que não existe — já é silêncio seguro.
  // Varre o argumento de cada `tocar(` com parênteses BALANCEADOS. Um regex
  // não-guloso parava no primeiro `)`, que hoje é o de `(atk.dmg || 1)` — e o
  // teste passava a jurar que "tapa" e "socoAcerta" nunca eram tocados.
  const tocados = new Set();
  for (const m of GAME.matchAll(/tocar\(/g)) {
    let i = m.index + m[0].length;
    let nivel = 1;
    const inicio = i;
    while (i < GAME.length && nivel > 0) {
      if (GAME[i] === "(") nivel++;
      else if (GAME[i] === ")") nivel--;
      i++;
    }
    const arg = GAME.slice(inicio, i - 1);
    for (const n of arg.matchAll(/"([a-zA-Z]+)"/g)) tocados.add(n[1]);
  }
  const orfaos = Object.keys(SONS).filter((n) => !tocados.has(n));
  assert.deepEqual(orfaos, [], `sons declarados e nunca tocados: ${orfaos}`);
  const amostrasOrfas = COM_AMOSTRA.filter((n) => !tocados.has(n));
  assert.deepEqual(amostrasOrfas, [], `amostras esperadas e nunca tocadas: ${amostrasOrfas}`);
});

check("the landing sound fires on touchdown, not every frame on the ground", () => {
  assert.match(GAME, /if \(!player\.grounded\) game\.audio\.tocar\("aterrissa"\)/);
});

check("the whiff only fires when the attack truly touched nobody", () => {
  assert.match(GAME, /player\.acertou = true;/, "acertar precisa marcar");
  assert.match(GAME, /!player\.acertou[\s\S]{0,80}golpeNoVazio/);
  const zerados = [...GAME.matchAll(/player\.acertou = false;/g)].length;
  assert.ok(zerados >= 4, `só ${zerados} ataques zeram a marca — os outros nunca soariam no vazio`);
});
