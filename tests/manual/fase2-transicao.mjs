// Manual check: does the 1→2 transition swap the scenery?
// Requires: dev server on :3100, and a temporary `window.__kfGame = scene`
// hook right after `gameRef.current = scene`.
//
// NOTE: Playwright is not a project dependency; it lives in the npx cache.
// This absolute path is machine-specific.
import { chromium } from "/home/alexmoncks/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs";
import fs from "node:fs";

const OUT = new URL("./out/", import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto("http://localhost:3100/jogos/kungfucastle", { waitUntil: "domcontentloaded" });
const accept = page.getByRole("button", { name: /aceitar|accept/i });
if (await accept.count()) await accept.first().click();
const start = page.getByRole("button", { name: /iniciar|start|jogar/i });
await start.waitFor({ state: "visible", timeout: 30000 });
await start.click();
await page.waitForSelector("canvas", { timeout: 30000 });
await page.waitForFunction(() => window.__kfGame, null, { timeout: 60000 });
const canvas = page.locator("canvas");

await page.waitForTimeout(1500);
await canvas.screenshot({ path: `${OUT}/01-fase1.png` });
const before = await page.evaluate(() => ({
  phase: window.__kfGame.phase,
  levelWidth: window.__kfGame.levelWidth,
  ground: window.__kfGame.sceneryLayers.ground.children.length,
  player: !!window.__kfGame.playerSprite,
}));

// Jump straight to phase 2 instead of grinding 100 kills.
await page.evaluate(() => {
  const g = window.__kfGame;
  g.enemies.forEach((e) => { e.alive = false; e.hp = 0; });
  g.killCount = 999;
  g.bossDefeated = true;
  g.bossDefeatedFrame = -999;
});
await page.waitForTimeout(1200);
for (let i = 0; i < 12; i++) {   // skip the phase-clear screen
  await page.keyboard.press("Space");
  await page.waitForTimeout(300);
}
await page.waitForTimeout(1500);
await canvas.screenshot({ path: `${OUT}/02-fase2.png` });

const after = await page.evaluate(() => {
  const g = window.__kfGame;
  return {
    phase: g.phase,
    levelWidth: g.levelWidth,
    ground: g.sceneryLayers.ground.children.length,
    player: !!g.playerSprite,
    particles: g.particles.length,
    enemyTypes: [...new Set(g.enemies.map((e) => e.type))],
  };
});
await browser.close();

console.log("before:", JSON.stringify(before));
console.log("after: ", JSON.stringify(after));

const fails = [];
if (after.phase !== 2) fails.push(`phase is ${after.phase}, expected 2`);
if (after.levelWidth !== 2600) fails.push(`levelWidth is ${after.levelWidth}, expected 2600`);
if (!after.player) fails.push("the player sprite was destroyed by the phase change");
if (after.ground === 0) fails.push("no ground tiles were rebuilt");
const phase1Enemies = ["capanga-branco", "capanga-cinza", "capanga-rapido"];
if (after.enemyTypes.some((t) => phase1Enemies.includes(t)))
  fails.push(`phase 1 enemies still spawning: ${after.enemyTypes}`);

console.log(fails.length ? `\nFAILURES:\n- ${fails.join("\n- ")}` : "\nAll checks passed.");
console.log(errors.length ? `console errors:\n${errors.join("\n")}` : "no console errors");
process.exit(fails.length ? 1 : 0);
