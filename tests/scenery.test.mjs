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
