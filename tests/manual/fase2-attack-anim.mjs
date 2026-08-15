// Manual check: do phase-2 attackers actually PLAY an attack animation,
// instead of silently holding "walk" (the bug: AnimController.play() no-ops
// on an unknown name, and the old code's fallback guessed "punch" — which
// guardiao-portao and kunoichi don't have)?
//
// Requires: dev server on :3100, and a temporary `window.__kfGame = scene`
// hook right after `gameRef.current = scene` in KungFuCastle.jsx (removed
// again once this proof is captured — see the final fix report).
import fs from "node:fs";

async function loadChromium() {
  try {
    return (await import("playwright")).chromium;
  } catch {
    try {
      const npxPlaywright =
        "/home/alexmoncks/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs";
      return (await import(npxPlaywright)).chromium;
    } catch {
      throw new Error(
        'Playwright not found (checked the "playwright" specifier and the npx cache). ' +
          "Install it for this manual driver with: npm i -D playwright"
      );
    }
  }
}
const chromium = await loadChromium();

const OUT = new URL("./out/", import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto("http://localhost:3100/jogos/kungfucastle", { waitUntil: "domcontentloaded" });

const accept = page.getByRole("button", { name: /aceitar|accept/i });
try {
  await accept.first().waitFor({ state: "visible", timeout: 5000 });
  await accept.first().click();
} catch {
  // No banner to dismiss.
}

const start = page.getByRole("button", { name: /iniciar|start|jogar/i });
await start.waitFor({ state: "visible", timeout: 30000 });
await start.click();
await page.waitForSelector("canvas", { timeout: 30000 });
await page.waitForFunction(() => window.__kfGame, null, { timeout: 60000 });

// ---- Jump straight to phase 2 (same technique as fase2-transicao.mjs) ----
await page.evaluate(() => {
  const g = window.__kfGame;
  g.enemies.forEach((e) => {
    e.alive = false;
    e.hp = 0;
  });
  g.killCount = 999;
  g.bossDefeated = true;
  g.bossDefeatedFrame = -999;
});
await page.waitForTimeout(1200);
for (let i = 0; i < 12; i++) {
  await page.keyboard.press("Space");
  await page.waitForTimeout(300);
}
await page.waitForTimeout(1000);

const phase = await page.evaluate(() => window.__kfGame.phase);
console.log("phase after skip:", phase);

// ---- Part A: a genuine phase-2 regular enemy (kunoichi) attacking ----
// Wait for a real kunoichi to spawn via the normal RNG pool (guarda-bastao /
// ninja / kunoichi) rather than fabricating one — a fabricated entity would
// carry a mismatched AnimController (wrong texture set) and prove nothing.
console.log("\nWaiting for a kunoichi to spawn naturally...");
let kunoichiFound = false;
for (let i = 0; i < 40 && !kunoichiFound; i++) {
  kunoichiFound = await page.evaluate(() => window.__kfGame.enemies.some((e) => e.type === "kunoichi" && e.alive));
  if (!kunoichiFound) await page.waitForTimeout(1000);
}

const kunoichiStates = kunoichiFound
  ? await page.evaluate(async () => {
      const g = window.__kfGame;
      const idx = g.enemies.findIndex((e) => e.type === "kunoichi" && e.alive);
      const observed = new Set();
      for (let frame = 0; frame < 150; frame++) {
        const e = g.enemies[idx];
        if (!e || !e.alive) break;
        // Force adjacency + ready-to-attack + keep both combatants alive.
        e.x = g.player.x + 15;
        e.attackCooldown = 0;
        e.hitTimer = 0;
        g.player.hp = 100;
        g.player.grounded = true;
        const anim = g.enemyAnims[idx];
        if (anim) observed.add(anim.state);
        await new Promise((r) => setTimeout(r, 16));
      }
      return [...observed];
    })
  : [];

console.log("kunoichi found:", kunoichiFound);
console.log("kunoichi observed anim states:", kunoichiStates);

// ---- Part B: the guardiao-portao boss attacking ----
// Force the boss to spawn: kill everything, wait for the death-fade splice
// (spawnBoss only fires once game.enemies.length === 0).
console.log("\nForcing guardiao-portao to spawn...");
await page.evaluate(() => {
  const g = window.__kfGame;
  g.enemies.forEach((e) => {
    e.alive = false;
    e.hp = 0;
  });
  g.killCount = 999;
});
await page.waitForTimeout(1500);

let bossFound = false;
for (let i = 0; i < 15 && !bossFound; i++) {
  bossFound = await page.evaluate(() => window.__kfGame.enemies.some((e) => e.isBoss && e.alive));
  if (!bossFound) await page.waitForTimeout(500);
}

const bossStates = bossFound
  ? await page.evaluate(async () => {
      const g = window.__kfGame;
      const idx = g.enemies.findIndex((e) => e.isBoss && e.alive);
      const observed = new Set();
      for (let frame = 0; frame < 150; frame++) {
        const e = g.enemies[idx];
        if (!e || !e.alive) break;
        e.x = g.player.x + 15;
        e.attackCooldown = 0;
        e.hitTimer = 0;
        g.player.hp = 100;
        g.player.grounded = true;
        const anim = g.enemyAnims[idx];
        if (anim) observed.add(anim.state);
        await new Promise((r) => setTimeout(r, 16));
      }
      return [...observed];
    })
  : [];

console.log("guardiao-portao found:", bossFound);
console.log("guardiao-portao observed anim states:", bossStates);

await page.screenshot({ path: `${OUT}/04-fase2-attack-anim.png` });
await browser.close();

const fails = [];
if (phase !== 2) fails.push(`phase is ${phase}, expected 2`);
if (!kunoichiFound) fails.push("no kunoichi ever spawned — could not sample its attack anim");
else if (!kunoichiStates.includes("attack"))
  fails.push(`kunoichi never entered "attack" state — observed: ${kunoichiStates.join(", ")}`);
if (!bossFound) fails.push("guardiao-portao never spawned — could not sample its attack anim");
else if (!bossStates.includes("horizontal-swing"))
  fails.push(`guardiao-portao never entered "horizontal-swing" state — observed: ${bossStates.join(", ")}`);
if (errors.length) fails.push(`${errors.length} console/page error(s) occurred: ${errors.join(" | ")}`);

console.log(fails.length ? `\nFAILURES:\n- ${fails.join("\n- ")}` : "\nAll checks passed.");
console.log(errors.length ? `console errors:\n${errors.join("\n")}` : "no console errors");
process.exit(fails.length ? 1 : 0);
