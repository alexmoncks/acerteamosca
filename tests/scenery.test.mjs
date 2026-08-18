import assert from "node:assert/strict";
import fs from "node:fs";
import { check, source, repoPath, loadModule } from "./helpers.mjs";

// Os testes entram pela lib pura, não por kungfu-scenery.js: aquele importa os
// JSON com o alias `@/`, que o Node não resolve. É exatamente para isso que os
// dois módulos existem separados.
const LIB = await loadModule("src/components/games/kungfu-scenery-lib.js");
const { sceneryAssetPathsFor, hydrate, LAYERS, ANCHORS } = LIB;
const GAME = source("src/components/games/KungFuCastle.jsx");

const FASES = {};
for (const n of [1, 2, 3, 4, 5]) {
  FASES[n] = hydrate(JSON.parse(fs.readFileSync(repoPath(`src/data/kungfu/fase-${n}.json`), "utf8")));
}
const PHASE_SCENERY = FASES;
const sceneryAssetPaths = () => sceneryAssetPathsFor(Object.values(FASES));

check("every phase in PHASE_CONFIG has scenery", () => {
  const block = GAME.match(/const PHASE_CONFIG = \{[\s\S]*?\n\};/);
  assert.ok(block, "PHASE_CONFIG not found");
  const phases = [...block[0].matchAll(/^\s{2}(\d+):\s*\{/gm)].map((m) => Number(m[1]));
  assert.ok(phases.length > 0, "no phases parsed");
  for (const p of phases) {
    assert.ok(PHASE_SCENERY[p], `phase ${p} has no PHASE_SCENERY entry`);
  }
});

check("every asset referenced by any phase exists on disk", () => {
  for (const path of sceneryAssetPaths()) {
    assert.ok(fs.existsSync(repoPath("public" + path)), `missing asset: ${path}`);
  }
});

check("sceneryAssetPaths returns no duplicates", () => {
  const paths = sceneryAssetPaths();
  assert.equal(paths.length, new Set(paths).size);
});

check("each phase declares a positive levelWidth", () => {
  for (const [phase, s] of Object.entries(PHASE_SCENERY)) {
    assert.ok(s.levelWidth > 0, `phase ${phase} has no levelWidth`);
  }
});

check("every element declares a known layer and anchor", () => {
  for (const [phase, s] of Object.entries(PHASE_SCENERY)) {
    for (const el of s.elements) {
      assert.ok(el.layer in LAYERS,
        `fase ${phase}: ${el.asset} tem camada desconhecida "${el.layer}"`);
      assert.ok(ANCHORS.includes(el.anchor),
        `fase ${phase}: ${el.asset} tem âncora desconhecida "${el.anchor}"`);
    }
  }
});

check("parallax is gone from the data — it is the layer's job now", () => {
  // O campo existia em toda faixa e NUNCA era lido: a velocidade sempre veio de
  // qual contêiner o sprite entra. Mantê-lo convidava alguém a editar um número
  // sem efeito nenhum.
  for (const [phase, s] of Object.entries(PHASE_SCENERY)) {
    for (const el of s.elements) {
      assert.equal(el.parallax, undefined, `fase ${phase}: ${el.asset} ainda traz parallax`);
    }
  }
  assert.ok(!/\bel\.parallax|band\.parallax/.test(GAME),
    "o jogo não deve voltar a ler parallax dos dados");
});

check("an element either repeats or declares where it sits", () => {
  for (const [phase, s] of Object.entries(PHASE_SCENERY)) {
    for (const el of s.elements) {
      assert.ok(el.repeat !== undefined || Number.isFinite(el.x),
        `fase ${phase}: ${el.asset} não repete e não declara x`);
      if (el.repeat) {
        const every = el.repeat.every;
        assert.ok(every === "auto" || every > 0,
          `fase ${phase}: ${el.asset} tem repeat.every inválido: ${every}`);
      }
    }
  }
});

check("phase 1 keeps the fields the editor cannot touch", () => {
  // A contagem de elementos SAIU daqui. Ela era o guarda-costas da migração,
  // mas migração é coisa de uma vez só e já está provada em
  // scenery-migration.test.mjs contra dois retratos congelados. Contar
  // elementos do arquivo vivo transforma cada composição no editor — que é
  // para isso que o arquivo existe — em teste vermelho.
  //
  // Sobram os campos que o editor ainda não edita. No dia em que ele editar,
  // estes saem também.
  const s = PHASE_SCENERY[1];
  assert.equal(s.levelWidth, 2400);
  assert.equal(s.sky.type, "starfield");
  assert.equal(s.tileset, "fase1-jardim");
  assert.ok(s.elements.length > 0, "a fase não pode ficar sem elemento nenhum");
});

check("phase 2 uses the castle-gate tileset and a gradient sky", () => {
  const s = PHASE_SCENERY[2];
  assert.equal(s.tileset, "fase2-portao-chao");
  assert.equal(s.sky.type, "gradient");
});

check("the asset manifest loads every scenery path from PHASE_SCENERY", () => {
  const ASSETS = source("src/components/games/kungfu-assets.js");
  assert.match(ASSETS, /sceneryAssetPaths/,
    "kungfu-assets.js must build its scenery list from kungfu-scenery.js");
  assert.ok(!/const SCENERY_PATHS = \[/.test(ASSETS),
    "the hardcoded SCENERY_PATHS array must be gone");
});

check("guardiao-portao is in the boss manifest with all 12 used animations", () => {
  const ASSETS = source("src/components/games/kungfu-assets.js");
  const block = ASSETS.match(/"guardiao-portao":\s*bossAnims\([\s\S]*?\]\),/);
  assert.ok(block, "guardiao-portao missing from BOSS_MANIFEST");
  for (const a of ["idle", "walk", "horizontal-swing", "overhead-smash", "stuck",
                   "earthquake", "shield-block", "charge", "kick", "taunt", "hit", "death"]) {
    assert.match(block[0], new RegExp(`\\["${a}"`), `missing anim ${a}`);
  }
});

check("every boss sheet named in the manifest exists on disk", () => {
  const ASSETS = source("src/components/games/kungfu-assets.js");
  for (const m of ASSETS.matchAll(/bossAnims\("([a-z-]+)",\s*\d+,\s*\[([\s\S]*?)\]\)/g)) {
    const boss = m[1];
    for (const a of m[2].matchAll(/\["([a-z-]+)"/g)) {
      const file = repoPath(`public/images/kungfucastle/bosses/${boss}/${a[1]}.png`);
      assert.ok(fs.existsSync(file), `missing sheet: ${boss}/${a[1]}.png`);
    }
  }
});

check("clearScenery empties the scenery containers, never the layers", () => {
  const fn = GAME.match(/function clearScenery[\s\S]*?\n\}/);
  assert.ok(fn, "clearScenery not found");
  const body = fn[0];
  assert.match(body, /sceneryLayers/,
    "must operate on the dedicated containers");
  assert.ok(!/(bgLayer|midLayer|gameLayer|fgLayer)\.removeChildren/.test(body),
    "clearing a whole layer would destroy the player sprite and the particles");

  // The containers themselves must survive — emptied via removeChildren(),
  // never destroy()ed — or every later buildScenery() would add sprites to
  // a dead container and nothing would render again.
  assert.match(body, /\.removeChildren\(\)/,
    "must call removeChildren() on the containers so they survive to be reused");
  assert.ok(!/\.destroy\(\s*\{[^)]*children/.test(body),
    "must not destroy() a container with { children: true } — that kills the persistent container itself, not just its contents");

  // Every child pulled off removeChildren() must be destroy()ed, and with
  // NO arguments: a truthy/options argument tells PixiJS to also free the
  // shared texture, so the next phase reusing that art renders nothing.
  assert.match(body, /\.destroy\(\)/,
    "children must be destroy()ed with no arguments, or every phase change leaks them");
  assert.ok(!/\.destroy\(\s*true\s*\)/.test(body),
    "destroy(true) frees the shared texture — the next phase reusing this art would render nothing");
  assert.ok(!/\.destroy\(\s*\{/.test(body),
    "destroy({...}) may free shared resources — call destroy() with no arguments");
});

check("the ground scenery container sits below the player in gameLayer", () => {
  const groundIdx = GAME.indexOf("gameLayer.addChild(groundScenery)");
  const playerIdx = GAME.indexOf("gameLayer.addChild(playerSprite)");
  assert.ok(groundIdx > -1 && playerIdx > -1, "expected both addChild calls");
  assert.ok(groundIdx < playerIdx,
    "groundScenery must be added before the player or props would cover it");
});

check("loadPhase clears scenery before rebuilding it", () => {
  const fn = GAME.match(/function loadPhase[\s\S]*?\n\}/);
  assert.ok(fn, "loadPhase not found");
  const body = fn[0];
  assert.match(body, /clearScenery\(game\)/);
  assert.match(body, /buildScenery\(game,\s*n\)/);
  const clearIdx = body.search(/clearScenery\(game\)/);
  const buildIdx = body.search(/buildScenery\(game,\s*n\)/);
  assert.ok(clearIdx > -1 && buildIdx > -1, "expected both calls");
  assert.ok(clearIdx < buildIdx,
    "clearScenery must run before buildScenery — building first then clearing would leave a permanently empty scene");
});

check("levelWidth comes from the phase, not the old constant", () => {
  assert.ok(!/const LEVEL_WIDTH\s*=/.test(GAME),
    "LEVEL_WIDTH must be replaced by per-phase levelWidth");
});
