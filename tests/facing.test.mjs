import assert from "node:assert/strict";
import { check, source, loadModule } from "./helpers.mjs";

const { AnimController } = await loadModule("src/components/games/kungfu-anim.js");
const GAME = source("src/components/games/KungFuCastle.jsx");

const EAST = 1;
const WEST = -1;

function makeController(baseFacing) {
  const sprite = { scale: { x: 1, y: 1 }, texture: null };
  const anims = { idle: { frames: ["f0", "f1"], speed: 0.1, loop: true } };
  return { ctrl: new AnimController({ sprite, anims, baseFacing }), sprite };
}

/** Direction the character actually appears to look at on screen. */
const visualFacing = (sprite, art) => Math.sign(sprite.scale.x) * art;

check("east-drawn art looks west when told to face west", () => {
  const { ctrl, sprite } = makeController(EAST);
  ctrl.setFacing(WEST);
  assert.equal(visualFacing(sprite, EAST), WEST);
});

check("west-drawn art (bosses) looks west when told to face west", () => {
  const { ctrl, sprite } = makeController(WEST);
  ctrl.setFacing(WEST);
  assert.equal(visualFacing(sprite, WEST), WEST);
});

check("west-drawn art (bosses) looks east when told to face east", () => {
  const { ctrl, sprite } = makeController(WEST);
  ctrl.setFacing(EAST);
  assert.equal(visualFacing(sprite, WEST), EAST);
});

check("omitting baseFacing keeps the east-drawn default", () => {
  const sprite = { scale: { x: 1, y: 1 }, texture: null };
  const ctrl = new AnimController({
    sprite,
    anims: { idle: { frames: ["f0"], speed: 0.1, loop: true } },
  });
  ctrl.setFacing(WEST);
  assert.equal(visualFacing(sprite, EAST), WEST);
});

check("repeated setFacing calls do not accumulate scale", () => {
  const { ctrl, sprite } = makeController(WEST);
  ctrl.setFacing(WEST);
  ctrl.setFacing(WEST);
  ctrl.setFacing(EAST);
  ctrl.setFacing(WEST);
  assert.equal(Math.abs(sprite.scale.x), 1);
});

check("every boss in BOSS_STATS declares spriteFacing: -1", () => {
  const block = GAME.match(/const BOSS_STATS = \{[\s\S]*?\n\};/);
  assert.ok(block, "BOSS_STATS not found");
  const bosses = [...block[0].matchAll(/"([a-z-]+)":\s*\{/g)].map((m) => m[1]);
  assert.ok(bosses.length > 0, "no bosses parsed");
  for (const b of bosses) {
    const entry = block[0].match(new RegExp(`"${b}":\\s*\\{[\\s\\S]*?\\n  \\},`));
    assert.ok(entry, `entry for ${b} not found`);
    assert.match(entry[0], /spriteFacing:\s*-1/, `${b} must declare spriteFacing: -1`);
  }
});
