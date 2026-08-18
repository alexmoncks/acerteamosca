// A hitbox de cada chefe tem de bater com a arte que ele realmente usa.
//
// BOSS_STATS.hitbox é {w,h,ox,oy} em pixels dentro do quadro, e é o que decide
// o que o soco do jogador acerta. Quando um chefe é regerado a silhueta muda de
// forma — o brutamontes chinês é 57% mais largo que o sprite que substituiu, o
// assassino é 14px mais baixo — e uma caixa herdada deixa metade do chefe
// intangível ou o pé flutuando.
//
// Este teste não guarda números escritos à mão: mede os PNGs entregues e
// compara com o que está declarado. Antes havia um teste por chefe fixando
// `{ w: 36, h: 52, ox: 17, oy: 7 }`, que virava tarefa a cada conversão — e uma
// tarefa que se resolve reescrevendo o número não protege nada.
import assert from "node:assert/strict";
import fs from "node:fs";
import { check, source, repoPath } from "./helpers.mjs";
import sharp from "sharp";

const GAME = source("src/components/games/KungFuCastle.jsx");
const BOSS_DIR = "public/images/kungfucastle/bosses";

/**
 * Caixa que envolve o conteúdo opaco de TODAS as folhas passadas.
 *
 * A união importa: uma caixa tirada só do idle encolhe nas poses fechadas, e o
 * chefe ficaria intangível na metade do ciclo de caminhada.
 */
async function measure(dir, sheets) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1, side = 0;
  for (const sheet of sheets) {
    const p = repoPath(`${dir}/${sheet}`);
    if (!fs.existsSync(p)) continue;
    const meta = await sharp(p).metadata();
    side = meta.height;
    for (let f = 0; f < Math.round(meta.width / side); f++) {
      const { data, info } = await sharp(p)
        .extract({ left: f * side, top: 0, width: side, height: side })
        .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
          if (data[(y * info.width + x) * info.channels + 3] < 16) continue;
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
  }
  if (x1 < 0) return null;
  return { w: x1 - x0 + 1, h: y1 - y0 + 1, ox: x0, oy: y0, side, floor: side - 1 - y1 };
}

const block = GAME.match(/const BOSS_STATS = \{[\s\S]*?\n\};/)[0];
const bosses = [];
for (const m of block.matchAll(/"([a-z-]+)":\s*\{([\s\S]*?)\n  \},/g)) {
  const [, name, body] = m;
  const hb = body.match(/hitbox:\s*\{([^}]*)\}/);
  const num = (field, src) => {
    const g = src.match(new RegExp(`\\b${field}:\\s*(\\d+)`));
    return g ? Number(g[1]) : null;
  };
  bosses.push({
    name,
    frameSize: num("frameSize", body),
    groundOffset: num("groundOffset", body) ?? 0,
    hitbox: hb
      ? { w: num("w", hb[1]), h: num("h", hb[1]), ox: num("ox", hb[1]), oy: num("oy", hb[1]) }
      : null,
  });
}

const medido = {};
for (const b of bosses) medido[b.name] = await measure(`${BOSS_DIR}/${b.name}`, ["idle.png", "walk.png"]);

check("every boss in BOSS_STATS was parsed with a hitbox", () => {
  assert.ok(bosses.length >= 5, `só ${bosses.length} chefes lidos`);
  for (const b of bosses) assert.ok(b.hitbox, `${b.name} não declara hitbox`);
});

for (const b of bosses) {
  check(`${b.name}: declared frameSize matches the sheet on disk`, () => {
    const m = medido[b.name];
    assert.ok(m, `${b.name}: nenhuma folha idle/walk encontrada`);
    assert.equal(m.side, b.frameSize, `folha tem ${m.side}px, BOSS_STATS diz ${b.frameSize}`);
  });

  check(`${b.name}: hitbox matches the art it actually uses`, () => {
    const m = medido[b.name];
    for (const f of ["w", "h", "ox", "oy"]) {
      assert.equal(
        b.hitbox[f],
        m[f],
        `${b.name}.hitbox.${f} declara ${b.hitbox[f]}, a arte mede ${m[f]} ` +
          `(caixa medida: { w: ${m.w}, h: ${m.h}, ox: ${m.ox}, oy: ${m.oy} })`,
      );
    }
  });

  check(`${b.name}: groundOffset matches the empty rows under its feet`, () => {
    // O sprite é ancorado no fundo do quadro. Se a arte tem N linhas vazias
    // abaixo do pé, o offset precisa devolver esses N — senão o chefe flutua
    // (offset pequeno demais) ou afunda no chão (grande demais).
    const m = medido[b.name];
    assert.equal(
      b.groundOffset,
      m.floor,
      `${b.name}: ${m.floor}px vazios sob os pés, groundOffset declara ${b.groundOffset}`,
    );
  });
}
