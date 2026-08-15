// Manual check: does the 1→2 transition swap the scenery?
// Requires: dev server on :3100, and a temporary `window.__kfGame = scene`
// hook right after `gameRef.current = scene`.
import fs from "node:fs";

// Playwright is not a project dependency for this one-off manual driver, so
// resolve it defensively: try the normal specifier first (works if it's ever
// hoisted into node_modules or added as a devDependency), then fall back to
// a cached npx install if one happens to exist on this machine, and fail
// loudly with the fix if neither is found.
async function loadChromium() {
  try {
    return (await import("playwright")).chromium;
  } catch {
    try {
      // Machine-specific fallback — this exact path may not exist on other
      // machines, or here after an `npx` cache clear.
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
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto("http://localhost:3100/jogos/kungfucastle", { waitUntil: "domcontentloaded" });

// The cookie banner mounts asynchronously (CookieConsent.jsx flips it on
// inside a useEffect), so it usually does not exist yet right after
// domcontentloaded. Give it a moment to appear; tolerate it never showing
// up (e.g. consent already stored from a prior run in this browser).
const accept = page.getByRole("button", { name: /aceitar|accept/i });
try {
  await accept.first().waitFor({ state: "visible", timeout: 5000 });
  await accept.first().click();
} catch {
  // No banner to dismiss — proceed without it.
}

const start = page.getByRole("button", { name: /iniciar|start|jogar/i });
await start.waitFor({ state: "visible", timeout: 30000 });
await start.click();
await page.waitForSelector("canvas", { timeout: 30000 });
await page.waitForFunction(() => window.__kfGame, null, { timeout: 60000 });
const canvas = page.locator("canvas");

await page.waitForTimeout(1500);
await canvas.screenshot({ path: `${OUT}/01-fase1.png` });
const before = await page.evaluate(() => {
  const g = window.__kfGame;
  // Stash the actual phase-1 scenery children by reference (not by name), so
  // the post-transition check below can prove they were destroyed — not
  // merely outnumbered by newly-added phase-2 children.
  window.__kfBeforeScenery = Object.fromEntries(
    Object.entries(g.sceneryLayers).map(([name, container]) => [name, [...container.children]])
  );
  return {
    phase: g.phase,
    levelWidth: g.levelWidth,
    ground: g.sceneryLayers.ground.children.length,
    player: !!g.playerSprite,
  };
});

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
  const before = window.__kfBeforeScenery;
  // A clean rebuild destroys every phase-1 scenery object and detaches it
  // from its container. Counting children alone can't tell "rebuilt" apart
  // from "phase-2 appended on top of leftover phase-1" — so check each old
  // child by reference: it must be marked destroyed AND absent from the
  // container's current children.
  let stashedTotal = 0;
  const leftover = [];
  for (const [layerName, oldChildren] of Object.entries(before)) {
    stashedTotal += oldChildren.length;
    const stillAttached = g.sceneryLayers[layerName].children;
    for (const child of oldChildren) {
      if (!child.destroyed || stillAttached.includes(child)) leftover.push(layerName);
    }
  }
  return {
    phase: g.phase,
    levelWidth: g.levelWidth,
    ground: g.sceneryLayers.ground.children.length,
    player: !!g.playerSprite,
    particles: g.particles.length,
    enemyTypes: [...new Set(g.enemies.map((e) => e.type))],
    phase1SceneryStashedTotal: stashedTotal,
    phase1SceneryLeftoverCount: leftover.length,
  };
});

// The `every: 520` castle band and the GRADIENT sky are now both visible in
// 02-fase2.png, but the camera is still parked near world x 0..480 at that
// point, so the single-`x`-positioned `ponte-madeira` (mid band, x: 900,
// scale: 2, y: "ground-overlap") has never actually been seen on screen.
// Pan the camera right and capture it explicitly.
await page.evaluate(() => {
  const g = window.__kfGame;
  g.player.x = 1400; // comfortably past the bridge's screen-visible range
  g.cameraX = 1200;  // seed the eased camera near its target so it doesn't lag
});
await page.waitForTimeout(700);
const cameraX = await page.evaluate(() => window.__kfGame.cameraX);
await canvas.screenshot({ path: `${OUT}/03-fase2-ponte.png` });

await browser.close();

console.log("before:", JSON.stringify(before));
console.log("after: ", JSON.stringify(after));
console.log("cameraX after pan:", cameraX);

const fails = [];
if (before.phase !== 1) fails.push(`before.phase is ${before.phase}, expected 1`);
if (before.levelWidth !== 2400) fails.push(`before.levelWidth is ${before.levelWidth}, expected 2400`);
if (after.phase !== 2) fails.push(`phase is ${after.phase}, expected 2`);
if (after.levelWidth !== 2600) fails.push(`levelWidth is ${after.levelWidth}, expected 2600`);
if (!after.player) fails.push("the player sprite was destroyed by the phase change");
if (after.ground === 0) fails.push("no ground tiles were rebuilt");
if (after.phase1SceneryLeftoverCount > 0)
  fails.push(
    `${after.phase1SceneryLeftoverCount} of ${after.phase1SceneryStashedTotal} stashed phase-1 ` +
      `scenery object(s) survived the rebuild (not destroyed, or still attached to a container)`
  );
const phase1Enemies = ["capanga-branco", "capanga-cinza", "capanga-rapido"];
const phase2Enemies = ["guarda-bastao", "ninja", "kunoichi"];
if (after.enemyTypes.some((t) => phase1Enemies.includes(t)))
  fails.push(`phase 1 enemies still spawning: ${after.enemyTypes}`);
if (after.enemyTypes.length === 0)
  fails.push("no enemies were present after the transition — the roster check would pass vacuously");
else if (after.enemyTypes.some((t) => !phase2Enemies.includes(t)))
  fails.push(`unexpected enemy type(s) outside the phase-2 roster: ${after.enemyTypes}`);
// The bridge sits at world x 900 in the mid parallax band (0.5x scroll), so
// it's only ever on screen once cameraX has moved well past 0.
if (cameraX < 700) fails.push(`camera did not pan (cameraX is ${cameraX}) — 03-fase2-ponte.png may not show the bridge`);
if (errors.length) fails.push(`${errors.length} console/page error(s) occurred: ${errors.join(" | ")}`);

console.log(fails.length ? `\nFAILURES:\n- ${fails.join("\n- ")}` : "\nAll checks passed.");
console.log(errors.length ? `console errors:\n${errors.join("\n")}` : "no console errors");
process.exit(fails.length ? 1 : 0);
