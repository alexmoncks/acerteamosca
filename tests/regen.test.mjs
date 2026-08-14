import assert from "node:assert/strict";
import { check, near, source, loadModule } from "./helpers.mjs";

const { regenHp } = await loadModule("src/components/games/kungfu-combat.js");
const GAME = source("src/components/games/KungFuCastle.jsx");
const FPS = 60;

check("player: 0.5%/s of 100 max gains 0.5 HP in one second", () => {
  near(regenHp(50, 100, 0.5, FPS), 50.5);
});

check("boss: 2.5%/s of 25 max gains 0.625 HP in one second", () => {
  near(regenHp(10, 25, 2.5, FPS), 10.625);
});

check("60 ticks at dt=1 equals one tick at dt=60", () => {
  let hp = 20;
  for (let i = 0; i < FPS; i++) hp = regenHp(hp, 100, 0.5, 1);
  near(hp, regenHp(20, 100, 0.5, FPS), 1e-9);
});

check("never exceeds max", () => {
  assert.equal(regenHp(99.99, 100, 0.5, FPS), 100);
});

check("zero elapsed time changes nothing", () => {
  assert.equal(regenHp(37.5, 100, 0.5, 0), 37.5);
});

check("boss regen runs before the player-attack damage block", () => {
  const regen = GAME.search(/e\.hp\s*=\s*regenHp\(/);
  const damage = GAME.indexOf("if (player.attacking && inHitWindow)");
  assert.ok(regen > -1 && damage > -1, "expected both blocks present");
  assert.ok(regen < damage, "boss regen must run before damage, or a killing blow gets undone");
});

check("player regen runs after the death-sequence early return", () => {
  const dying = GAME.indexOf("if (player.dying) {");
  const regen = GAME.search(/player\.hp\s*=\s*regenHp\(/);
  assert.ok(regen > dying && dying > -1, "player regen must sit after the death-sequence return");
});
