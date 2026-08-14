import assert from "node:assert/strict";
import fs from "node:fs";
import { check, source, repoPath, loadModule } from "./helpers.mjs";

const { PHASE_SCENERY, sceneryAssetPaths } = await loadModule(
  "src/components/games/kungfu-scenery.js",
);
const GAME = source("src/components/games/KungFuCastle.jsx");

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

check("every prop layer is a known layer name", () => {
  for (const [phase, s] of Object.entries(PHASE_SCENERY)) {
    for (const p of s.props) {
      assert.ok(["bg", "game", "fg"].includes(p.layer),
        `phase ${phase}: prop ${p.asset} has unknown layer "${p.layer}"`);
    }
  }
});

check("every band declares a parallax factor between 0 and 1", () => {
  for (const [phase, s] of Object.entries(PHASE_SCENERY)) {
    for (const b of [...s.bg, ...s.mid]) {
      assert.ok(b.parallax >= 0 && b.parallax <= 1,
        `phase ${phase}: band ${b.asset} parallax ${b.parallax} out of range`);
    }
  }
});

check("phase 1 keeps its current layout: 2400px, starfield, 16 props", () => {
  const s = PHASE_SCENERY[1];
  assert.equal(s.levelWidth, 2400);
  assert.equal(s.sky.type, "starfield");
  assert.equal(s.tileset, "fase1-jardim");
  assert.equal(s.props.length, 16); // matches the current PROP_LAYOUT exactly
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
