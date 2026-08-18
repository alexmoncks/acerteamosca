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
const { escadaDeSaida, linhaDeSubida, LINHAS_DE_ESCADA, hydrate } = LIB;
const GAME = source("src/components/games/KungFuCastle.jsx");
const ASSETS = source("src/components/games/kungfu-assets.js");
const GROUND_Y = Number(GAME.match(/const GROUND_Y = (\d+);/)[1]);

const fase = (n) =>
  hydrate(JSON.parse(fs.readFileSync(repoPath(`src/data/kungfu/fase-${n}.json`), "utf8")));

const dims = {};
for (const asset of Object.keys(LINHAS_DE_ESCADA)) {
  const m = await sharp(repoPath(`public/images/kungfucastle/props/${asset}.png`)).metadata();
  dims[asset] = { width: m.width, height: m.height };
}

check("every staircase in the table exists on disk", () => {
  for (const asset of Object.keys(LINHAS_DE_ESCADA)) {
    assert.ok(dims[asset], `${asset} não existe`);
  }
});

check("every declared line rises, and stays inside the sprite", () => {
  for (const [asset, l] of Object.entries(LINHAS_DE_ESCADA)) {
    assert.ok(l.topo[1] < l.base[1], `${asset}: o topo precisa estar ACIMA da base`);
    for (const [nome, p] of [["base", l.base], ["topo", l.topo]]) {
      for (const v of p) {
        assert.ok(v >= 0 && v <= 1, `${asset}.${nome} tem fração fora da caixa: ${v}`);
      }
    }
  }
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
      if (!(el.asset in LINHAS_DE_ESCADA) || el.repeat) continue;
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

check("the climb line starts at the ground and ends above it", () => {
  for (const n of [1, 3, 4]) {
    const el = escadaDeSaida(fase(n));
    const l = linhaDeSubida(el, dims[el.asset], GROUND_Y);
    assert.ok(Math.abs(l.y0 - GROUND_Y) < 12,
      `fase ${n}: o pé começa em ${Math.round(l.y0)}, longe do chão ${GROUND_Y}`);
    assert.ok(l.y1 < l.y0 - 30, `fase ${n}: subiu só ${Math.round(l.y0 - l.y1)}px`);
    assert.ok(l.x1 > l.x0, `fase ${n}: a escada precisa subir para a direita`);
  }
});

check("an asset with no declared line yields no line at all", () => {
  assert.equal(linhaDeSubida({ asset: "paifang", x: 0, y: 0, anchor: "chao" }, dims["escada-madeira"], GROUND_Y), null);
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
  assert.match(bloco[0], /player\.x = t\.linha\.x0/);
  assert.match(bloco[0], /t\.timer <= 0 && t\.linha && !t\.subiu/,
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
  assert.match(fn, /t\.linha && !t\.subiu/,
    "sem linha de escada, o fadeOut precisa seguir direto para o cartão");
  assert.match(GAME, /const linha = tex \? linhaDeSubida\(escada, tex, GROUND_Y\) : null;/);
});

check("the camera follows during the exit", () => {
  // Sem isso o herói andava para fora do quadro e a subida acontecia off-screen.
  const fn = GAME.match(/function updateTransition[\s\S]*?\n\}/)[0];
  assert.equal((fn.match(/updateCamera\(game\)/g) || []).length, 2,
    "andar e subir precisam mover a câmera");
  assert.match(GAME, /function updateCamera\(game\)/,
    "a câmera precisa ser função, para o jogo e a transição usarem a mesma");
});
