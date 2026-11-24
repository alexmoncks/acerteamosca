// Toda imagem que o 3INVADER pede existe em public/.
//
// Em 21/03/2026 (commit 78854b8) os 9 sprites de projétil (bullet-*.png,
// laser-beam.png, nova-ring.png) foram apagados porque tiros, laser e nova
// passaram a ser desenhados no canvas. A lista de pré-carga continuou
// pedindo os arquivos: 9 erros 404 no console de quem abre o jogo, inclusive
// do revisor do AdSense. Este teste impede que uma referência volte a apontar
// para arquivo que não existe.
import assert from "node:assert/strict";
import fs from "node:fs";
import { check, source, repoPath } from "./helpers.mjs";

const SRC = "src/components/games/ThreeInvader.jsx";

const refs = () => {
  const codigo = source(SRC).replace(/^\s*\/\/.*$/gm, "");
  return [...new Set([...codigo.matchAll(/["'`](\/images\/3invader\/[^"'`]+)["'`]/g)].map((m) => m[1]))];
};

check("ThreeInvader referencia imagens de /images/3invader", () => {
  assert.ok(refs().length >= 20, `só ${refs().length} referências; o regex quebrou?`);
});

check("toda imagem referenciada pelo ThreeInvader existe em public/", () => {
  // Caminhos montados em template (`intro-${n}.jpg`) viram a lista concreta.
  const concretos = refs().flatMap((r) =>
    r === "/images/3invader/intro-${introScreen + 1}.jpg"
      ? [1, 2, 3, 4].map((n) => `/images/3invader/intro-${n}.jpg`)
      : [r],
  );
  const faltando = concretos.filter((r) => r.includes("${") || !fs.existsSync(repoPath("public" + r)));
  assert.deepEqual(faltando, []);
});

check("os 9 sprites de projétil apagados em 78854b8 não são mais pedidos", () => {
  const codigo = source(SRC);
  for (const nome of [
    "bullet-player.png",
    "bullet-player-heavy.png",
    "bullet-homing.png",
    "bullet-cannon.png",
    "laser-beam.png",
    "bullet-enemy.png",
    "bullet-enemy-aimed.png",
    "bullet-enemy-spread.png",
    "nova-ring.png",
  ]) {
    assert.ok(!codigo.includes(`/images/3invader/${nome}`), `${nome} ainda é pedido`);
  }
});

check("míssil teleguiado e bomba nova continuam com o desenho procedural", () => {
  const codigo = source(SRC);
  assert.ok(/function drawHomingMissile[\s\S]*?Fallback/.test(codigo), "fallback do míssil sumiu");
  assert.ok(/function drawBombEffect[\s\S]*?Fallback: White-blue ring/.test(codigo), "fallback da nova sumiu");
});
