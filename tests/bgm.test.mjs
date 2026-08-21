// A trilha.
//
// Ao contrário dos efeitos, aqui o risco não é o som errado — é o arquivo que
// não existe. São 40MB em quinze arquivos com espaço no nome, referenciados por
// string; renomear um no disco não quebra build nenhum, só deixa a fase muda.
// Então metade destes testes é a tabela contra o diretório, os dois lados.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { check, source, loadModule, repoPath } from "./helpers.mjs";

const {
  TRILHAS, TRILHAS_FASE, PASTA_BGM, VOLUME_BGM, CROSSFADE,
  caminhoDe, faixaPara, createBgm,
} = await loadModule("src/components/games/kungfu-bgm.js");
const GAME = source("src/components/games/KungFuCastle.jsx");
const SFX = source("src/components/games/kungfu-audio.js");

const DIR = repoPath(path.join("public", PASTA_BGM));
const noDisco = () =>
  fs.readdirSync(DIR).filter((f) => f.endsWith(".mp3")).map((f) => f.replace(/\.mp3$/, ""));

const todasDaTabela = () => [
  ...Object.values(TRILHAS),
  ...Object.values(TRILHAS_FASE).flatMap((p) => [p.fase, p.chefe]),
];

// ── a tabela contra o disco ────────────────────────────────────────────────

check("every track the table names exists on disk", () => {
  const presentes = new Set(noDisco());
  const faltando = [...new Set(todasDaTabela())].filter((n) => !presentes.has(n));
  assert.deepEqual(faltando, [], `faixas citadas e ausentes: ${faltando}`);
});

check("every file on disk is reachable from the table", () => {
  // O outro lado: 3MB parados que ninguém toca são peso morto no carregamento
  // de um site com anúncios, e ninguém percebe estar sobrando.
  const usadas = new Set(todasDaTabela());
  const orfas = noDisco().filter((n) => !usadas.has(n));
  assert.deepEqual(orfas, [], `faixas no disco que nunca tocam: ${orfas}`);
});

check("no two files are byte-identical", () => {
  // Veio um "Castle Gates (1).mp3" idêntico ao "Castle Gates.mp3" — download
  // repetido. 2,5MB que o jogador baixaria à toa se a tabela apontasse para ele.
  const porTamanho = new Map();
  for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith(".mp3"))) {
    const t = fs.statSync(path.join(DIR, f)).size;
    porTamanho.set(t, [...(porTamanho.get(t) ?? []), f]);
  }
  for (const [, arquivos] of porTamanho) {
    if (arquivos.length < 2) continue;
    const conteudos = arquivos.map((f) => fs.readFileSync(path.join(DIR, f)));
    for (let i = 1; i < conteudos.length; i++) {
      assert.ok(!conteudos[0].equals(conteudos[i]),
        `${arquivos[0]} e ${arquivos[i]} são idênticos`);
    }
  }
});

check("the path escapes the spaces in the filenames", () => {
  // Todo nome tem espaço. Sem escapar, o pedido sai truncado no primeiro deles.
  assert.equal(caminhoDe("Castle Gates"), `${PASTA_BGM}/Castle%20Gates.mp3`);
  for (const nome of todasDaTabela()) {
    assert.ok(!caminhoDe(nome).includes(" "), `"${nome}" saiu com espaço cru`);
  }
});

// ── o mapeamento ───────────────────────────────────────────────────────────

check("every phase has both a stage track and a boss track", () => {
  const fases = Object.keys(TRILHAS_FASE).map(Number).sort((a, b) => a - b);
  assert.deepEqual(fases, [1, 2, 3, 4, 5], "faltou fase na tabela");
  for (const f of fases) {
    assert.ok(faixaPara("fase", f), `fase ${f} sem tema de andar`);
    assert.ok(faixaPara("chefe", f), `fase ${f} sem tema de chefe`);
  }
});

check("no phase plays the same track for the stage and its boss", () => {
  // A troca para o chefe é o aviso de que a luta mudou. Mesma faixa nos dois,
  // e o jogador só descobre que o chefe chegou quando apanha.
  for (const [f, par] of Object.entries(TRILHAS_FASE)) {
    assert.notEqual(par.fase, par.chefe, `fase ${f} usa a mesma faixa nos dois`);
  }
});

check("each boss gets a track of its own", () => {
  const chefes = Object.values(TRILHAS_FASE).map((p) => p.chefe);
  assert.equal(new Set(chefes).size, chefes.length,
    `dois chefes dividem trilha: ${chefes}`);
});

check("the menu and the opening are the tracks the author named", () => {
  assert.equal(faixaPara("menu"), "Kungfu Castle");
  assert.equal(faixaPara("abertura"), "Kungfu Castle Opening Screen");
});

check("losing to the final boss gets its own game over", () => {
  assert.equal(faixaPara("derrota", 1), TRILHAS.derrota);
  assert.equal(faixaPara("derrota", 5), TRILHAS.derrotaFinal);
});

check("an unknown situation is silence, not a crash", () => {
  for (const s of ["creditos", "", null, undefined]) {
    assert.equal(faixaPara(s, 1), null, `"${s}" deveria devolver null`);
  }
  assert.equal(faixaPara("fase", 99), null, "fase inexistente deveria ser null");
});

// ── o tocador ──────────────────────────────────────────────────────────────

/** Elemento <audio> falso: registra o que foi pedido, sem baixar nada. */
function fabrica() {
  const criados = [];
  const criarAudio = (src) => {
    const el = {
      src, loop: false, volume: 1, tocou: 0, pausou: 0,
      play() { this.tocou++; return Promise.resolve(); },
      pause() { this.pausou++; },
    };
    criados.push(el);
    return el;
  };
  return { criados, criarAudio };
}

/** Agendador falso: guarda o callback e deixa o teste avançar o fade à mão. */
function relogio() {
  let fn = null;
  return {
    agendar: (f) => { fn = f; return 1; },
    cancelar: () => { fn = null; },
    passos: (n) => { for (let i = 0; i < n; i++) fn?.(); },
  };
}

check("nothing is fetched until a track is actually asked for", () => {
  // O ponto principal: 40MB de trilha não podem entrar no carregamento da
  // página. `new Audio(src)` só busca quando é criado, então basta não criar.
  const { criados, criarAudio } = fabrica();
  createBgm({ criarAudio });
  assert.equal(criados.length, 0, "criou elemento sem ninguém pedir música");
});

check("playing a phase loads exactly one track and loops it", () => {
  const { criados, criarAudio } = fabrica();
  const bgm = createBgm({ criarAudio, ...relogio() });
  assert.equal(bgm.tocar("fase", 2), "Castle Gates");
  assert.equal(criados.length, 1, "mais de um arquivo para uma faixa");
  assert.equal(criados[0].src, `${PASTA_BGM}/Castle%20Gates.mp3`);
  assert.equal(criados[0].loop, true, "trilha sem laço acaba no meio da fase");
  assert.equal(criados[0].tocou, 1);
});

check("asking for the track already playing does not restart it", () => {
  // Se o laço do jogo reavalia a situação a cada quadro, sem esta guarda a
  // música reinicia 60 vezes por segundo e nunca sai do primeiro compasso.
  const { criados, criarAudio } = fabrica();
  const bgm = createBgm({ criarAudio, ...relogio() });
  bgm.tocar("fase", 3);
  for (let i = 0; i < 60; i++) bgm.tocar("fase", 3);
  assert.equal(criados.length, 1, `criou ${criados.length} elementos para a mesma faixa`);
});

check("the boss track crossfades in while the stage track fades out", () => {
  const { criados, criarAudio } = fabrica();
  const r = relogio();
  const bgm = createBgm({ criarAudio, ...r });
  bgm.tocar("fase", 3);
  r.passos(20);                       // termina o fade de entrada
  const andar = criados[0];
  bgm.tocar("chefe", 3);
  const chefe = criados[1];
  assert.equal(criados.length, 2);
  assert.equal(chefe.volume, 0, "a nova entra do silêncio");
  r.passos(7);                        // metade do fade
  assert.ok(chefe.volume > 0 && chefe.volume < VOLUME_BGM, "a nova tem de subir");
  assert.ok(andar.volume > 0 && andar.volume < VOLUME_BGM, "a antiga tem de descer");
  r.passos(20);                       // conclui
  assert.equal(chefe.volume, VOLUME_BGM);
  assert.equal(andar.pausou, 1, "a antiga tem de parar");
  assert.equal(andar.src, "", "sem zerar o src ela continua baixando");
});

check("muting silences the track without dropping it", () => {
  // Tirar o som não pode custar outro download quando voltar.
  const { criados, criarAudio } = fabrica();
  const r = relogio();
  const bgm = createBgm({ criarAudio, ...r });
  bgm.tocar("fase", 1);
  r.passos(20);
  bgm.setMudo(true);
  assert.equal(criados[0].volume, 0);
  bgm.setMudo(false);
  assert.equal(criados[0].volume, VOLUME_BGM);
  assert.equal(criados.length, 1, "recriou o elemento ao desmutar");
});

check("pause and resume do not reload", () => {
  const { criados, criarAudio } = fabrica();
  const bgm = createBgm({ criarAudio, ...relogio() });
  bgm.tocar("fase", 4);
  bgm.pausar();
  bgm.retomar();
  assert.equal(criados.length, 1);
  assert.equal(criados[0].pausou, 1);
  assert.equal(criados[0].tocou, 2);
});

check("stopping releases the file", () => {
  const { criados, criarAudio } = fabrica();
  const bgm = createBgm({ criarAudio, ...relogio() });
  bgm.tocar("menu");
  bgm.parar();
  assert.equal(criados[0].src, "");
  assert.equal(bgm.faixaAtual(), null);
});

check("a browser with no Audio at all does not crash the game", () => {
  const bgm = createBgm({ criarAudio: () => null });
  assert.equal(bgm.tocar("menu"), null);
  assert.doesNotThrow(() => { bgm.parar(); bgm.pausar(); bgm.setMudo(true); });
});

// ── separação dos efeitos ──────────────────────────────────────────────────

check("the music never goes through the sound-effect table", () => {
  // A janela mínima do kungfu-audio calaria uma faixa de dois minutos, e o
  // VOLUME_MESTRE dos impactos a poria por cima do combate.
  assert.ok(!/bgm|Kungfu Castle|Boss Fight/.test(SFX),
    "kungfu-audio.js está citando trilha; ela tem de viver no kungfu-bgm.js");
  assert.ok(VOLUME_BGM < 0.5, `${VOLUME_BGM} põe a música por cima dos socos`);
  assert.ok(CROSSFADE >= 300, "troca abaixo de 300ms denuncia a emenda");
});

// ── fiação no jogo ─────────────────────────────────────────────────────────

check("the scene gets its player before loadPhase asks for a track", () => {
  // Defeito real: `scene.bgm = bgm()` vinha DEPOIS de `loadPhase`, e como
  // loadPhase é quem pede o tema do andar, o pedido caía num `?.` e sumia sem
  // erro. A fase abria com a música do menu ainda tocando, e nenhum teste de
  // tabela via isso — só o navegador.
  const atribui = GAME.indexOf("scene.bgm = bgm()");
  const carrega = GAME.indexOf("loadPhase(scene, startPhase)");
  assert.ok(atribui > -1 && carrega > -1, "esperava as duas linhas");
  assert.ok(atribui < carrega, "a trilha tem de existir antes de loadPhase");
});

check("phase 1 asks for its track even though it skips loadPhase", () => {
  // A cena já nasce na fase 1, então loadPhase não roda — e o tema do primeiro
  // andar nunca seria pedido.
  assert.match(GAME, /else scene\.bgm\?\.tocar\("fase", 1\)/);
});

check("the phase and the boss each switch the track", () => {
  assert.match(GAME, /game\.bgm\?\.tocar\("fase", n\)/, "loadPhase tem de trocar o tema");
  assert.match(GAME, /game\.bgm\?\.tocar\("chefe", game\.phase\)/,
    "a entrada do chefe tem de trocar o tema");
});

check("winning and losing switch the track too", () => {
  assert.match(GAME, /g\.bgm\?\.tocar\("derrota", g\.phase\)/);
  assert.match(GAME, /g\.bgm\?\.tocar\("vitoria"\)/);
});

check("the single SOM button silences music and effects together", () => {
  // Dois controles para uma expectativa só é o caminho para o jogador desligar
  // o som e continuar ouvindo música.
  const botao = GAME.match(/audio\(\)\?\.setMudo\(!mudo\)[\s\S]{0,200}/);
  assert.ok(botao, "botão de som não encontrado");
  assert.match(botao[0], /bgm\(\)\?\.setMudo\(m\)/, "o botão não cala a trilha");
});

check("leaving the game stops the music", () => {
  // Sem isto ela segue tocando por cima da próxima página do site.
  assert.match(GAME, /bgmRef\.current\?\.parar\(\)/);
});

check("nothing preloads the whole soundtrack", () => {
  // 40MB. Um <link rel=preload>, um manifesto de assets ou um laço sobre
  // TRILHAS no carregamento derrubaria a página num celular.
  assert.ok(!/preload[\s\S]{0,40}bgm/i.test(GAME), "trilha em preload");
  const bgmSrc = source("src/components/games/kungfu-bgm.js");
  assert.ok(!/Object\.values\(TRILHAS\)[\s\S]{0,120}new Audio/.test(bgmSrc),
    "algo cria um <audio> por faixa da tabela");
});
