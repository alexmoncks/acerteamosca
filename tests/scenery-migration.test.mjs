// A migração do cenário para JSON não pode ter mudado um pixel.
//
// Comparar screenshots não serve: inimigos se movem entre capturas e o
// starfield é aleatório, então a diferença fica em 0,2% a 6,5% por ruído e não
// dá para separar ruído de erro. Este teste compara o que realmente importa —
// a lista exata de sprites que cada modelo manda desenhar, com posição, camada,
// escala e alfa — reconstruída pelas mesmas regras que o jogo usa.
//
// O modelo antigo está congelado aqui embaixo, copiado do commit anterior à
// migração. Ele existe só para esta comparação; quando ela já não tiver o que
// provar, o arquivo inteiro sai.
import assert from "node:assert/strict";
import fs from "node:fs";
import { check, repoPath, loadModule } from "./helpers.mjs";
import sharp from "sharp";

const { anchorPoint, resolveY, positionsFor, hydrate } =
  await loadModule("src/components/games/kungfu-scenery-lib.js");

const GROUND_Y = 250; // valor real não importa: os dois lados usam o mesmo

/** Dimensões de cada asset, que as duas regras precisam para ancorar e repetir. */
const dims = {};
async function dimOf(asset) {
  if (!dims[asset]) {
    const m = await sharp(repoPath(`public/images/kungfucastle/props/${asset}.png`)).metadata();
    dims[asset] = { w: m.width, h: m.height };
  }
  return dims[asset];
}

// ── modelo antigo, congelado ───────────────────────────────────────────────

/** resolveBandY do commit anterior, verbatim. */
const resolveBandYAntigo = (y, texHeight) => {
  if (typeof y === "number") return y;
  if (y === "ground-overlap") return GROUND_Y - texHeight + 18;
  return GROUND_Y - 10 - texHeight + 28; // "horizon"
};

/** addBand + laço de props do commit anterior, reduzidos à lista que desenham. */
async function desenhaAntigo(spec) {
  const out = [];
  const banda = async (band, container) => {
    const { w: tw, h: th } = await dimOf(band.asset);
    const scale = band.scale || 1;
    const w = tw * scale;
    const h = th * scale;
    const y = resolveBandYAntigo(band.y, h);
    const step = band.tile ? w : band.every;
    const alpha = band.alpha;
    if (step) {
      for (let x = 0; x < spec.levelWidth + step * 2; x += step) {
        out.push({ asset: band.asset, container, x, y, scale, alpha, ax: 0, ay: 0 });
      }
    } else {
      out.push({ asset: band.asset, container, x: band.x || 0, y, scale, alpha, ax: 0, ay: 0 });
    }
  };
  for (const b of spec.bg) await banda(b, "bg");
  for (const b of spec.mid) await banda(b, "mid");

  // `const target = { bg: mid, game: ground, fg }` — o prop "bg" ia para o mid.
  const alvo = { bg: "mid", game: "game", fg: "fg" };
  for (const p of spec.props) {
    out.push({
      asset: p.asset, container: alvo[p.layer] ?? "game",
      x: p.x, y: GROUND_Y + p.y, scale: 1, alpha: undefined, ax: 0.5, ay: 1,
    });
  }
  return out;
}

// ── modelo novo ────────────────────────────────────────────────────────────

async function desenhaNovo(fase) {
  const out = [];
  for (const el of fase.elements) {
    const { w: tw, h: th } = await dimOf(el.asset);
    const scale = el.scale || 1;
    const ponto = anchorPoint(el.anchor);
    const y = resolveY(el.anchor, el.y, th * scale, GROUND_Y);
    for (const x of positionsFor(el, tw * scale, fase.levelWidth)) {
      out.push({
        asset: el.asset, container: el.layer, x, y, scale,
        alpha: el.alpha, ax: ponto.x, ay: ponto.y,
      });
    }
  }
  return out;
}

// ── comparação ─────────────────────────────────────────────────────────────

const ANTIGO = JSON.parse(fs.readFileSync(repoPath("tests/fixtures/cenario-antes.json"), "utf8"));

const resultados = {};
for (const n of Object.keys(ANTIGO)) {
  const nova = hydrate(
    JSON.parse(fs.readFileSync(repoPath(`src/data/kungfu/fase-${n}.json`), "utf8")),
  );
  resultados[n] = {
    antigo: await desenhaAntigo(ANTIGO[n]),
    novo: await desenhaNovo(nova),
    skyAntigo: ANTIGO[n].sky,
    skyNovo: nova.sky,
    tilesetAntigo: ANTIGO[n].tileset,
    tilesetNovo: nova.tileset,
    larguraAntiga: ANTIGO[n].levelWidth,
    larguraNova: nova.levelWidth,
  };
}

check("the frozen pre-migration snapshot covers every phase", () => {
  assert.deepEqual(Object.keys(ANTIGO).sort(), ["1", "2", "3", "4", "5"]);
});

for (const [n, r] of Object.entries(resultados)) {
  check(`phase ${n}: the JSON draws exactly the sprites the old model drew`, () => {
    assert.equal(r.novo.length, r.antigo.length,
      `fase ${n}: ${r.novo.length} sprites contra ${r.antigo.length} antes`);
    for (let i = 0; i < r.antigo.length; i++) {
      assert.deepEqual(r.novo[i], r.antigo[i],
        `fase ${n}, sprite ${i} (${r.antigo[i].asset}) mudou de lugar`);
    }
  });

  check(`phase ${n}: level width, tileset and sky survived the migration`, () => {
    assert.equal(r.larguraNova, r.larguraAntiga);
    assert.equal(r.tilesetNovo, r.tilesetAntigo);
    assert.equal(r.skyNovo.type, r.skyAntigo.type);
    for (const k of ["color", "from", "to", "stars"]) {
      assert.equal(r.skyNovo[k], r.skyAntigo[k], `fase ${n}: sky.${k} mudou`);
    }
  });
}
