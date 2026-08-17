// Manifest-consistency test: every entity in ENEMY_STATS / BOSS_STATS must
// declare an attackAnim (KungFuCastle.jsx) that actually exists in its own
// manifest entry (kungfu-assets.js). Source-text only — KungFuCastle.jsx
// imports pixi.js and next-intl, so it cannot go through loadModule().
//
// This is the regression test for the "enemy/boss attacks with no
// animation" bug: the old code guessed `attackAnim = "punch"` for every
// type except capanga-cinza, and silently no-op'd when the guess was wrong
// (AnimController.play() ignores unknown names). atirador, ninja-espada,
// kunoichi and lancador-bomba have no "punch" anim at all, and
// guardiao-portao — phase 2's boss — has neither "punch" nor "attack".
import assert from "node:assert/strict";
import { check, source } from "./helpers.mjs";

const GAME = source("src/components/games/KungFuCastle.jsx");
const ASSETS = source("src/components/games/kungfu-assets.js");

const enemyStatsBlock = GAME.match(/const ENEMY_STATS = \{[\s\S]*?\n\};/);
const bossStatsBlock = GAME.match(/const BOSS_STATS = \{[\s\S]*?\n\};/);

check("ENEMY_STATS and BOSS_STATS blocks are present in KungFuCastle.jsx", () => {
  assert.ok(enemyStatsBlock, "const ENEMY_STATS = { ... }; not found");
  assert.ok(bossStatsBlock, "const BOSS_STATS = { ... }; not found");
});

/** Enemy entries are single-line: `"type": { ...fields... },` */
function extractSingleLineEntries(block) {
  const entries = [];
  const re = /^\s*"([\w-]+)":\s*\{(.*)\},?\s*$/gm;
  let m;
  while ((m = re.exec(block)) !== null) entries.push([m[1], m[2]]);
  return entries;
}

/** Boss entries are multi-line, each closing on its own "  }," line. */
function extractMultiLineEntries(block) {
  const entries = [];
  const re = /"([\w-]+)":\s*\{([\s\S]*?)\n  \},/g;
  let m;
  while ((m = re.exec(block)) !== null) entries.push([m[1], m[2]]);
  return entries;
}

const enemyEntries = enemyStatsBlock ? extractSingleLineEntries(enemyStatsBlock[0]) : [];
const bossEntries = bossStatsBlock ? extractMultiLineEntries(bossStatsBlock[0]) : [];

/** Chaves entre aspas no topo de um bloco de stats, a contagem que a extração deve bater. */
const countKeys = (block) => [...block.matchAll(/^\s{2}"([a-z-]+)":/gm)].length;

check("the parser finds every entry in both stats blocks", () => {
  // Guards against the manifest test passing vacuously because a formatting
  // change broke extraction and left both lists empty (0 iterations = 0
  // failures, which looks like success but tested nothing).
  //
  // Contava 10 e 2 na mão, o que virava tarefa a cada personagem novo — e uma
  // tarefa que se resolve subindo o número não protege nada. Agora a contagem
  // esperada sai do próprio bloco: se a extração quebrar, ela some e o número
  // do bloco continua lá.
  assert.equal(
    enemyEntries.length,
    countKeys(enemyStatsBlock[0]),
    `parsed ${enemyEntries.length} ENEMY_STATS entries: [${enemyEntries.map(([n]) => n).join(", ")}]`
  );
  assert.equal(
    bossEntries.length,
    countKeys(bossStatsBlock[0]),
    `parsed ${bossEntries.length} BOSS_STATS entries: [${bossEntries.map(([n]) => n).join(", ")}]`
  );
  assert.ok(enemyEntries.length >= 10, "ENEMY_STATS encolheu inesperadamente");
  assert.ok(bossEntries.length >= 2, "BOSS_STATS encolheu inesperadamente");
});

/** Pull attackAnim (and, for capanga-cinza, attackAnimAlt) out of a stats-entry body. */
function extractAttackAnims(body) {
  const anims = [];
  const main = body.match(/attackAnim:\s*"([\w-]+)"/);
  if (main) anims.push(main[1]);
  const alt = body.match(/attackAnimAlt:\s*"([\w-]+)"/);
  if (alt) anims.push(alt[1]);
  return anims;
}

/** Anim names declared for an enemy type via enemyAnims("<type>", [["name", {...}], ...]) in kungfu-assets.js. */
function enemyAnimNames(type) {
  const m = ASSETS.match(new RegExp(`enemyAnims\\("${type}",\\s*\\[([\\s\\S]*?)\\]\\)`));
  if (!m) throw new Error(`enemyAnims("${type}", ...) not found in kungfu-assets.js`);
  return [...m[1].matchAll(/\[\s*"([\w-]+)"/g)].map((mm) => mm[1]);
}

/** Anim names declared for a boss via bossAnims("<name>", <frameH>, [["name", {...}], ...]) in kungfu-assets.js. */
function bossAnimNames(name) {
  const m = ASSETS.match(new RegExp(`bossAnims\\("${name}",\\s*\\d+,\\s*\\[([\\s\\S]*?)\\]\\)`));
  if (!m) throw new Error(`bossAnims("${name}", ...) not found in kungfu-assets.js`);
  return [...m[1].matchAll(/\[\s*"([\w-]+)"/g)].map((mm) => mm[1]);
}

check(
  "every ENEMY_STATS/BOSS_STATS entity declares an attackAnim it actually has in its kungfu-assets.js manifest",
  () => {
    const allEntries = [
      ...enemyEntries.map(([name, body]) => ({ name, body, isBoss: false })),
      ...bossEntries.map(([name, body]) => ({ name, body, isBoss: true })),
    ];
    assert.ok(allEntries.length > 0, "no entities found to check (extraction produced an empty roster)");

    const problems = [];
    for (const { name, body, isBoss } of allEntries) {
      const declared = extractAttackAnims(body);
      if (declared.length === 0) {
        problems.push(`${name}: declares no attackAnim`);
        continue;
      }
      let available;
      try {
        available = isBoss ? bossAnimNames(name) : enemyAnimNames(name);
      } catch (err) {
        problems.push(`${name}: ${err.message}`);
        continue;
      }
      for (const anim of declared) {
        if (!available.includes(anim)) {
          problems.push(
            `${name}: declares attackAnim "${anim}" but its manifest only has [${available.join(", ")}]`
          );
        }
      }
    }
    assert.equal(problems.length, 0, `\n  ${problems.join("\n  ")}`);
  }
);

check("guardiao-portao attacks with horizontal-swing, per the phase-2 design doc", () => {
  const entry = bossEntries.find(([name]) => name === "guardiao-portao");
  assert.ok(entry, "guardiao-portao not found in BOSS_STATS");
  assert.deepEqual(extractAttackAnims(entry[1]), ["horizontal-swing"]);
});

check("kunoichi attacks with its flying-kick sheet (the 'attack' anim)", () => {
  const entry = enemyEntries.find(([name]) => name === "kunoichi");
  assert.ok(entry, "kunoichi not found in ENEMY_STATS");
  assert.deepEqual(extractAttackAnims(entry[1]), ["attack"]);
});

check("capanga-cinza keeps its 50/50 punch-or-kick roll (attackAnim + attackAnimAlt)", () => {
  const entry = enemyEntries.find(([name]) => name === "capanga-cinza");
  assert.ok(entry, "capanga-cinza not found in ENEMY_STATS");
  assert.deepEqual(extractAttackAnims(entry[1]), ["punch", "kick"]);
});
