import assert from "node:assert/strict";
import { check, near, source, loadModule } from "./helpers.mjs";

const { AnimController } = await loadModule("src/components/games/kungfu-anim.js");
const GAME = source("src/components/games/KungFuCastle.jsx");
const ASSETS = source("src/components/games/kungfu-assets.js");
const FPS = 60;

const animFrameAt = (speed, elapsed) => Math.floor(speed * elapsed);

for (const [speed, frames] of [[0.33, 6], [0.32, 7], [0.21, 9]]) {
  check(`animFrameAt matches AnimController at speed ${speed}`, () => {
    const sheet = Array.from({ length: frames }, (_, i) => `f${i}`);
    const sprite = { scale: { x: 1, y: 1 }, texture: null };
    const ctrl = new AnimController({ sprite, anims: { a: { frames: sheet, speed, loop: false } } });
    ctrl.forcePlay("a");
    for (let n = 1; n <= frames / speed; n++) {
      ctrl.update(1);
      assert.equal(sheet.indexOf(sprite.texture), Math.min(animFrameAt(speed, n), frames - 1));
    }
  });
}

function attack(name) {
  const m = GAME.match(new RegExp(`${name}:\\s*\\{([^}]*)\\}`));
  assert.ok(m, `ATTACKS.${name} not found`);
  const num = (k) => parseFloat(m[1].match(new RegExp(`${k}:\\s*(-?[\\d.]+)`))[1]);
  return { duration: num("duration"), hitStart: num("hitStart"), hitEnd: num("hitEnd") };
}

function animSpeed(name) {
  const m = ASSETS.match(new RegExp(`${name}:\\s*\\{[^}]*player/[^"]*"\\s*,\\s*speed:\\s*([\\d.]+)`));
  assert.ok(m, `player anim '${name}' speed not found`);
  return parseFloat(m[1]);
}

function framesDuringHitWindow(atkName, animName) {
  const a = attack(atkName);
  const speed = animSpeed(animName);
  const shown = new Set();
  for (let n = 1; n <= a.duration; n++) {
    const timer = a.duration - n;
    if (timer <= 0) break;
    if (timer <= a.hitStart && timer > a.hitEnd) shown.add(animFrameAt(speed, n));
  }
  return shown;
}

// punch.png has 6 frames and only extends the arm on index 5;
// kick.png has 7 frames and extends on indices 3-4.
check("punch damage lands while the arm is extended (frame 5)", () => {
  assert.ok(framesDuringHitWindow("punch", "punch").has(5));
});

check("punch deals no damage during the wind-up (frames 0-3)", () => {
  const shown = framesDuringHitWindow("punch", "punch");
  for (const f of [0, 1, 2, 3]) assert.ok(!shown.has(f), `hit window covers wind-up frame ${f}`);
});

check("kick damage lands on its extension frames (3-4)", () => {
  const shown = framesDuringHitWindow("kick", "kick");
  assert.ok(shown.has(3) || shown.has(4));
});

const konst = (n) => parseFloat(GAME.match(new RegExp(`const ${n}\\s*=\\s*(-?[\\d.]+)`))[1]);

// The game integrates with Euler: vy += GRAVITY; y += vy. Simulate that, not
// the closed form, so the assertion matches what actually runs.
function simulateJump(force, gravity) {
  let y = 0, vy = force, peak = 0, frames = 0;
  for (let i = 0; i < 600; i++) {
    vy += gravity;
    y += vy;
    frames++;
    if (y >= 0) break;
    peak = Math.min(peak, y);
  }
  return { height: -peak, airtimeFrames: frames };
}

check("jump peaks at ~60px", () => {
  near(simulateJump(konst("JUMP_FORCE"), konst("GRAVITY")).height, 60, 4);
});

check("jump airtime is ~0.70s", () => {
  near(simulateJump(konst("JUMP_FORCE"), konst("GRAVITY")).airtimeFrames / FPS, 0.70, 0.05);
});

check("jump animation spans the airtime", () => {
  const { airtimeFrames } = simulateJump(konst("JUMP_FORCE"), konst("GRAVITY"));
  near(9 / animSpeed("jump"), airtimeFrames, 6);
});

check("flying kick keeps its ~30px arc", () => {
  const mult = parseFloat(GAME.match(/player\.vy\s*=\s*JUMP_FORCE\s*\*\s*([\d.]+)/)[1]);
  const v = Math.abs(konst("JUMP_FORCE")) * mult;
  near((v * v) / (2 * konst("GRAVITY")), 30, 4);
});

check("crouch is not force-restarted on every held frame", () => {
  const block = GAME.match(/\/\/ CROUCH[\s\S]{0,400}?\n  \}/);
  assert.ok(block, "crouch block not found");
  assert.match(block[0], /if \(!player\.crouching\)[\s\S]*?forcePlay\("crouch"\)/);
});

check("the idle/walk block does not override a held crouch", () => {
  assert.match(GAME, /if \(!player\.attacking && !player\.crouching\) \{/);
});
