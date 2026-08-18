// A saída da fase: o herói caminha até a escada e sobe por ela.
//
// O doc de fases descrevia essa sequência desde o começo (autoWalk -> climbing)
// e só o fade tinha sido implementado — o jogador terminava o chefe e a tela
// simplesmente apagava. Agora ele anda, sobe, e só então apaga.
import assert from "node:assert/strict";
import fs from "node:fs";
import { check, source, repoPath, loadModule } from "./helpers.mjs";
import sharp from "sharp";

const LIB = await loadModule("src/components/games/kungfu-scenery-lib.js");
const { escadaDeSaida, caminhoDeSubida, pontoNoCaminho, CAMINHOS_DE_ESCADA, hydrate } = LIB;
const GAME = source("src/components/games/KungFuCastle.jsx");
const ASSETS = source("src/components/games/kungfu-assets.js");
const GROUND_Y = Number(GAME.match(/const GROUND_Y = (\d+);/)[1]);

const fase = (n) =>
  hydrate(JSON.parse(fs.readFileSync(repoPath(`src/data/kungfu/fase-${n}.json`), "utf8")));

const dims = {};
for (const asset of Object.keys(CAMINHOS_DE_ESCADA)) {
  const m = await sharp(repoPath(`public/images/kungfucastle/props/${asset}.png`)).metadata();
  dims[asset] = { width: m.width, height: m.height };
}

check("every staircase in the table exists on disk", () => {
  for (const asset of Object.keys(CAMINHOS_DE_ESCADA)) {
    assert.ok(dims[asset], `${asset} não existe`);
  }
});

check("every path rises, shrinks, and stays inside the sprite", () => {
  for (const [asset, pontos] of Object.entries(CAMINHOS_DE_ESCADA)) {
    assert.ok(pontos.length >= 2, `${asset}: um caminho precisa de ao menos dois pontos`);
    for (const q of pontos) {
      for (const v of q.p) {
        assert.ok(v >= 0 && v <= 1, `${asset}: fração fora da caixa: ${v}`);
      }
      assert.ok(q.escala > 0 && q.escala <= 1, `${asset}: escala inválida ${q.escala}`);
      assert.ok(q.facing === 1 || q.facing === -1, `${asset}: facing inválido ${q.facing}`);
    }
    for (let i = 1; i < pontos.length; i++) {
      assert.ok(pontos[i].p[1] < pontos[i - 1].p[1],
        `${asset}: o ponto ${i} não está acima do anterior — escada desce`);
      assert.ok(pontos[i].escala <= pontos[i - 1].escala,
        `${asset}: o herói cresce ao subir, em vez de encolher`);
    }
    assert.equal(pontos[0].escala, 1, `${asset}: o primeiro degrau é em tamanho natural`);
    assert.ok(pontos[pontos.length - 1].escala < 0.9,
      `${asset}: sem encolher, o afastamento não se vê`);
  }
});

check("the L staircase turns partway up, the straight one never does", () => {
  // O tapete é frontal e dobra à esquerda no segundo lance; a espiral
  // zigue-zagueia. A de pedra é um lance só e virar ali seria erro.
  const dobra = (a) => new Set(CAMINHOS_DE_ESCADA[a].map((q) => q.facing)).size > 1;
  assert.ok(dobra("escada-ornada-tapete"), "a escada de tapete precisa dobrar");
  assert.ok(dobra("escada-espiral-tochas"), "a espiral precisa dobrar");
  assert.ok(!dobra("escada-pedra-externa"), "a de pedra é reta, não deve virar");
});

check("phases 1, 3 and 4 exit through a staircase; 2 and 5 do not", () => {
  // A 2 sai por um portão aberto (passagem horizontal, para o gesto não se
  // repetir) e a 5 não sai: é o fim do jogo.
  for (const n of [1, 3, 4]) {
    assert.ok(escadaDeSaida(fase(n)), `fase ${n} deveria ter escada de saída`);
  }
  for (const n of [2, 5]) {
    assert.equal(escadaDeSaida(fase(n)), null, `fase ${n} não deveria ter escada`);
  }
});

check("the exit is the rightmost staircase, since that is where the hero walks", () => {
  for (const n of [1, 3, 4]) {
    const f = fase(n);
    const saida = escadaDeSaida(f);
    for (const el of f.elements) {
      if (!(el.asset in CAMINHOS_DE_ESCADA) || el.repeat) continue;
      assert.ok((el.x ?? 0) <= (saida.x ?? 0), `fase ${n}: ${el.asset} está à direita da saída`);
    }
  }
});

check("a repeating staircase is decoration, never an exit", () => {
  const f = fase(1);
  const saida = escadaDeSaida(f);
  const falsa = { ...saida, x: 99999, repeat: { every: 200 } };
  const comFalsa = { ...f, elements: [...f.elements, falsa] };
  assert.equal(escadaDeSaida(comFalsa).x, saida.x,
    "uma escada repetida ao infinito não é por onde se sai");
});

check("the climb starts at the ground and ends well above it", () => {
  for (const n of [1, 3, 4]) {
    const el = escadaDeSaida(fase(n));
    const c = caminhoDeSubida(el, dims[el.asset], GROUND_Y);
    assert.ok(Math.abs(c[0].y - GROUND_Y) < 12,
      `fase ${n}: o pé começa em ${Math.round(c[0].y)}, longe do chão ${GROUND_Y}`);
    assert.ok(c[c.length - 1].y < c[0].y - 30,
      `fase ${n}: subiu só ${Math.round(c[0].y - c[c.length - 1].y)}px`);
  }
});

check("an asset with no declared path yields no path at all", () => {
  assert.equal(caminhoDeSubida({ asset: "paifang", x: 0, y: 0, anchor: "chao" }, dims["escada-madeira"], GROUND_Y), null);
});

// ── andar pelo caminho ────────────────────────────────────────────────────

const caminhoFake = [
  { x: 0, y: 100, facing: 1, escala: 1 },
  { x: 30, y: 60, facing: 1, escala: 0.7 },   // trecho de 50
  { x: 0, y: 20, facing: -1, escala: 0.5 },   // trecho de 50
];

check("progress runs by length, not by segment index", () => {
  // Por índice, um lance curto e um longo levariam o mesmo tempo e a subida
  // aceleraria e frearia sozinha na dobra.
  const meio = pontoNoCaminho(caminhoFake, 0.5);
  assert.equal(Math.round(meio.x), 30, "metade do comprimento é o fim do 1º trecho");
  assert.equal(Math.round(meio.y), 60);
});

check("the ends of the path are exactly the declared points", () => {
  const a = pontoNoCaminho(caminhoFake, 0);
  const b = pontoNoCaminho(caminhoFake, 1);
  assert.deepEqual([a.x, a.y], [0, 100]);
  assert.deepEqual([b.x, b.y], [0, 20]);
  assert.equal(b.escala, 0.5);
});

check("the hero shrinks smoothly along the way", () => {
  const escalas = [0, 0.25, 0.5, 0.75, 1].map((k) => pontoNoCaminho(caminhoFake, k).escala);
  for (let i = 1; i < escalas.length; i++) {
    assert.ok(escalas[i] < escalas[i - 1], `escala cresceu: ${escalas}`);
  }
});

check("facing flips on entering a leg, never halfway between", () => {
  // Meio virado não existe: o sprite espelha, é instantâneo.
  for (const k of [0, 0.2, 0.5, 0.6, 0.9, 1]) {
    const f = pontoNoCaminho(caminhoFake, k).facing;
    assert.ok(f === 1 || f === -1, `facing interpolado: ${f}`);
  }
  assert.equal(pontoNoCaminho(caminhoFake, 0.3).facing, 1, "primeiro lance olha para leste");
  assert.equal(pontoNoCaminho(caminhoFake, 0.8).facing, -1, "segundo lance olha para oeste");
});

check("progress outside 0..1 is clamped instead of exploding", () => {
  assert.deepEqual(pontoNoCaminho(caminhoFake, -5).x, 0);
  assert.deepEqual(pontoNoCaminho(caminhoFake, 9).y, 20);
  assert.equal(pontoNoCaminho([], 0.5), null);
  assert.equal(pontoNoCaminho(null, 0.5), null);
});

// ── fiação ────────────────────────────────────────────────────────────────

check("the climb animation is in the player manifest and on disk", () => {
  assert.match(ASSETS, /climb:\s*\{ src: "\/images\/kungfucastle\/player\/climb\.png"/);
  assert.ok(fs.existsSync(repoPath("public/images/kungfucastle/player/climb.png")));
});

check("the hero is moved to the stairs while the screen is black", () => {
  // Sem isto a sequência seria impossível: o chefe morre onde a luta calhou de
  // acontecer, e a escada pode estar a 2250px dali — 23 segundos de caminhada
  // contra os 8 que a spec de cutscenes fixou como teto. Feito à vista, seria
  // um teleporte, que lê como defeito.
  const fn = GAME.match(/function updateTransition[\s\S]*?\n\}/)[0];
  const bloco = fn.match(/t\.state === "fadeOut"[\s\S]*?t\.state = "andar";/);
  assert.ok(bloco, "o reposicionamento precisa acontecer dentro do fadeOut");
  assert.match(bloco[0], /player\.x = t\.caminho\[0\]\.x/);
  assert.match(bloco[0], /t\.timer <= 0 && t\.caminho && !t\.subiu/,
    "só quando a tela já está preta, só com escada, e só uma vez");
});

check("the states run in order: fade, walk, climb, fade, card", () => {
  const fn = GAME.match(/function updateTransition[\s\S]*?\n\}/)[0];
  const ordem = ["fadeOut", "andar", "subir", "phaseClear", "fadeIn"]
    .map((e) => fn.indexOf(`t.state === "${e}"`));
  for (let i = 1; i < ordem.length; i++) {
    assert.ok(ordem[i] > ordem[i - 1] && ordem[i - 1] > -1,
      `os estados estão fora de ordem no arquivo: ${ordem}`);
  }
});

check("the second fade goes straight to the card instead of climbing again", () => {
  // Sem a marca, a subida entraria em laço: fade, escada, fade, escada.
  assert.match(GAME, /t\.subiu = true;/);
  assert.match(GAME, /!t\.subiu/);
});

check("a phase without a staircase never enters the walk or the climb", () => {
  // A fase 2 sai por um portão e a 5 termina: as duas caem no fade de sempre.
  const fn = GAME.match(/function updateTransition[\s\S]*?\n\}/)[0];
  assert.match(fn, /t\.caminho && !t\.subiu/,
    "sem caminho de escada, o fadeOut precisa seguir direto para o cartão");
  assert.match(GAME, /const caminho = tex \? caminhoDeSubida\(escada, tex, GROUND_Y\) : null;/);
});

check("the camera follows during the exit", () => {
  // Sem isso o herói andava para fora do quadro e a subida acontecia off-screen.
  const fn = GAME.match(/function updateTransition[\s\S]*?\n\}/)[0];
  assert.equal((fn.match(/updateCamera\(game\)/g) || []).length, 2,
    "andar e subir precisam mover a câmera");
  assert.match(GAME, /function updateCamera\(game\)/,
    "a câmera precisa ser função, para o jogo e a transição usarem a mesma");
});

// ── o estado não pode vazar para a fase seguinte ──────────────────────────

check("loadPhase resets the sprite, not only the model", () => {
  // update() reposiciona o sprite a cada quadro, mas fica DESLIGADO enquanto há
  // transição. Sem resetar aqui, a fase nova abria com o herói ainda na altura
  // do último degrau, encolhido e em `climb`, durante o segundo do fade.
  const fn = GAME.match(/function loadPhase[\s\S]*?\n\}/)[0];
  assert.match(fn, /game\.playerSprite\.scale\.set\(1\)/, "a escala da subida precisa voltar");
  assert.match(fn, /game\.playerAnim\.forcePlay\("idle"\)/, "a animação de subida precisa parar");
  assert.match(fn, /game\.playerSprite\.y = game\.player\.y \+ PLAYER_H/,
    "o sprite precisa ser reposicionado, não só o modelo");
  assert.match(fn, /game\.player\.facing = 1/);
});

check("the climb is the only thing that touches the player scale", () => {
  // Se o jogo mexesse em scale em outro lugar, o reset de loadPhase apagaria
  // esse outro efeito sem querer.
  const usos = [...GAME.matchAll(/playerSprite\.scale/g)].length;
  assert.ok(usos <= 4, `${usos} usos de playerSprite.scale — algo mais mexe na escala`);
});
