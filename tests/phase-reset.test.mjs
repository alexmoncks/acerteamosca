// loadPhase completeness test: every mutable player field that a gameplay
// action can set must be reset in loadPhase(), or it survives into the next
// phase stale. Source-text only, same idiom as dodge.test.mjs's function
// extraction — KungFuCastle.jsx imports pixi.js/next-intl and cannot go
// through loadModule().
//
// This is the regression test for "player.dodging survives a phase change":
// startDodge() sets dodging/dodgeVx, and the only place that ever cleared
// them was nested inside `if (player.attacking) { if (attackTimer <= 0) }`
// — a branch loadPhase's own `attacking = false` makes unreachable. A
// killing blow on the boss followed by a backflip during the post-boss
// delay lands the player in phase 2 permanently dodging: dragged sideways
// at DODGE_SPEED forever, and locked out of ever dodging again.
import assert from "node:assert/strict";
import { check, source } from "./helpers.mjs";

const GAME = source("src/components/games/KungFuCastle.jsx");

const fn = GAME.match(/function loadPhase\(game, n\)[\s\S]*?\n\}/);

check("loadPhase is found as a single function body", () => {
  assert.ok(fn, "function loadPhase(game, n) { ... } not found");
});

const body = fn[0];

// Fields deliberately EXCLUDED from this list because loadPhase must NOT
// reset them — they are meant to persist across a phase change:
//   player.lives  — carries the run's remaining lives forward
//   player.score  — carries the run's score forward
const FIELDS_LOADPHASE_MUST_RESET = [
  "x",
  "y",
  "vx",
  "vy",
  "hp",
  "attacking",
  "attackType",
  "attackTimer",
  "dying",
  // The dodge blocker: none of these three were reset, so a phase change
  // mid-dodge stranded the player permanently dragging + unable to dodge.
  "dodging",
  "dodgeVx",
  "dodgeCooldown",
  // Same class of staleness the review also flagged: changing phase while
  // running/crouching materialises movement with no input.
  "currentSpeed",
  "running",
  "crouching",
];

check("loadPhase resets every mutable player field a gameplay action can set", () => {
  const missing = FIELDS_LOADPHASE_MUST_RESET.filter(
    (field) => !new RegExp(`player\\.${field}\\s*=`).test(body)
  );
  assert.equal(
    missing.length,
    0,
    `loadPhase does not reset: ${missing.join(", ")} — a phase change can leave these stale`
  );
});

check("loadPhase resets player.dodging specifically (the reported blocker)", () => {
  assert.match(body, /player\.dodging\s*=\s*false/, "loadPhase must set player.dodging = false");
});
