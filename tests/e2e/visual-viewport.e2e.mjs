// Teclado virtual: o visualViewport encolhe e a escala do jogo deve acompanhar.
// Fora do padrão *.test.mjs: o npm test não roda este arquivo. Usa um
// servidor no ar (a prévia 3122 serve) e o Chromium do Playwright.
//
// Uso: node tests/e2e/visual-viewport.e2e.mjs <base PT>
//
// No Wordle, em 390×844 (Playwright mobile + toque), mede a escala, encolhe
// o visualViewport (como o teclado) e confere que a escala diminui. Pedidos
// a outros hosts abortados; jogador simulado; nada gravado no banco.
import fs from "node:fs";
import path from "node:path";

const PW = process.env.PLAYWRIGHT_MODULE || "/home/alexmarra/projects/inss-obras/node_modules/playwright/index.mjs";
const { chromium } = await import(PW);

const [base] = process.argv.slice(2);
if (!base) {
  console.error("uso: node tests/e2e/visual-viewport.e2e.mjs <base PT>");
  process.exit(2);
}

function chromiumMaisNovo() {
  const cache = path.join(process.env.HOME || "/home/alexmarra", ".cache/ms-playwright");
  const dirs = fs
    .readdirSync(cache)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  for (const d of dirs) {
    const bin = path.join(cache, d, "chrome-linux64/chrome");
    if (fs.existsSync(bin)) return bin;
  }
  throw new Error("nenhum Chromium em " + cache);
}

const JOGADOR_FALSO = { id: "e2e-vv", nome: "E2E", email: "e2e@example.invalid" };
const exe = chromiumMaisNovo();
const browser = await chromium.launch({ executablePath: exe, headless: true });
const host = new URL(base).host;
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  serviceWorkers: "block",
});
await ctx.addInitScript(() => {
  try { localStorage.setItem("acerteamosca_consent_v1", "denied"); } catch {}
});
await ctx.route("**/*", (route) => {
  const req = route.request();
  let u;
  try { u = new URL(req.url()); } catch { return route.abort(); }
  if (u.protocol === "data:" || u.protocol === "blob:") return route.continue();
  if (u.host !== host) return route.abort();
  if (u.pathname === "/api/jogadores" && req.method() === "GET") {
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jogador: JOGADOR_FALSO }) });
  }
  if (u.pathname.startsWith("/api/") && req.method() !== "GET") {
    return route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
  }
  return route.continue();
});
const page = await ctx.newPage();
await page.goto(base.replace(/\/$/, "") + "/jogos/wordle", { waitUntil: "load", timeout: 45000 });
const jogar = page.getByRole("button", { name: /^(JOGAR|PLAY)$/i });
await jogar.click({ timeout: 10000 });
await page.waitForSelector("[data-game-area]", { timeout: 10000 });
await page.waitForTimeout(400);

const antes = await page.evaluate(() => {
  const el = document.querySelector("[data-game-area]");
  const slot = el && el.closest(".game-fit-slot");
  return {
    escala: Number(el?.getAttribute("data-game-scale")),
    areaH: el ? el.getBoundingClientRect().height : null,
    slotH: slot ? slot.clientHeight : null,
    vvH: window.visualViewport ? window.visualViewport.height : null,
    innerH: window.innerHeight,
  };
});
console.log("antes", JSON.stringify(antes));
if (!(antes.escala > 0)) {
  await browser.close();
  throw new Error("escala inicial inválida: " + JSON.stringify(antes));
}

const encolheu = await page.evaluate((alvo) => {
  const vv = window.visualViewport;
  if (!vv) return { ok: false, motivo: "sem visualViewport" };
  const fake = {
    get height() { return alvo; },
    get width() { return vv.width; },
    get offsetTop() { return 0; },
    get offsetLeft() { return vv.offsetLeft; },
    get scale() { return vv.scale; },
    get pageTop() { return vv.pageTop; },
    get pageLeft() { return vv.pageLeft; },
    addEventListener: vv.addEventListener.bind(vv),
    removeEventListener: vv.removeEventListener.bind(vv),
    dispatchEvent: vv.dispatchEvent.bind(vv),
  };
  try {
    Object.defineProperty(window, "visualViewport", { configurable: true, value: fake });
  } catch (e) {
    return { ok: false, motivo: String(e) };
  }
  vv.dispatchEvent(new Event("resize"));
  window.dispatchEvent(new Event("resize"));
  return { ok: true, alvo };
}, 320);
if (!encolheu.ok) {
  await browser.close();
  throw new Error("não deu para emular o visualViewport: " + encolheu.motivo);
}
await page.waitForTimeout(400);
const depois = await page.evaluate(() => {
  const el = document.querySelector("[data-game-area]");
  return {
    escala: Number(el?.getAttribute("data-game-scale")),
    areaH: el ? el.getBoundingClientRect().height : null,
    vvH: window.visualViewport ? window.visualViewport.height : null,
  };
});
console.log("depois", JSON.stringify(depois), "emulacao", JSON.stringify(encolheu));

if (!(depois.escala > 0) || !(depois.escala < antes.escala - 0.01)) {
  throw new Error(
    `a escala não reagiu ao teclado virtual: ${antes.escala} → ${depois.escala} (vv=${depois.vvH})`,
  );
}
if (depois.areaH > 330) {
  throw new Error(`a área do jogo (${depois.areaH}px) ainda passa do visualViewport emulado (320)`);
}

console.log("OK teclado: escala", antes.escala, "→", depois.escala, "areaH", depois.areaH);

// Zoom de pinça: visualViewport.scale = 2 e height proporcionalmente menor.
// A escala do jogo NÃO pode desabar (regressão do 520fc56).
await ctx.close();
const ctxPinch = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  serviceWorkers: "block",
});
await ctxPinch.addInitScript(() => {
  try { localStorage.setItem("acerteamosca_consent_v1", "denied"); } catch {}
});
await ctxPinch.route("**/*", (route) => {
  const req = route.request();
  let u;
  try { u = new URL(req.url()); } catch { return route.abort(); }
  if (u.protocol === "data:" || u.protocol === "blob:") return route.continue();
  if (u.host !== host) return route.abort();
  if (u.pathname === "/api/jogadores" && req.method() === "GET") {
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ jogador: JOGADOR_FALSO }) });
  }
  if (u.pathname.startsWith("/api/") && req.method() !== "GET") {
    return route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
  }
  return route.continue();
});
const pageP = await ctxPinch.newPage();
await pageP.goto(base.replace(/\/$/, "") + "/jogos/wordle", { waitUntil: "load", timeout: 45000 });
await pageP.getByRole("button", { name: /^(JOGAR|PLAY)$/i }).click({ timeout: 10000 });
await pageP.waitForSelector("[data-game-area]", { timeout: 10000 });
await pageP.waitForTimeout(400);
const antesP = await pageP.evaluate(() => ({
  escala: Number(document.querySelector("[data-game-area]")?.getAttribute("data-game-scale")),
  areaH: document.querySelector("[data-game-area]")?.getBoundingClientRect().height ?? null,
  vvH: window.visualViewport ? window.visualViewport.height : null,
  vvScale: window.visualViewport ? window.visualViewport.scale : null,
}));
console.log("pinça antes", JSON.stringify(antesP));
const emulouP = await pageP.evaluate(() => {
  const vv = window.visualViewport;
  if (!vv) return { ok: false, motivo: "sem visualViewport" };
  const alvoH = 422;
  const fake = {
    get height() { return alvoH; },
    get width() { return vv.width; },
    get offsetTop() { return 0; },
    get offsetLeft() { return vv.offsetLeft; },
    get scale() { return 2; },
    get pageTop() { return vv.pageTop; },
    get pageLeft() { return vv.pageLeft; },
    addEventListener: vv.addEventListener.bind(vv),
    removeEventListener: vv.removeEventListener.bind(vv),
    dispatchEvent: vv.dispatchEvent.bind(vv),
  };
  try {
    Object.defineProperty(window, "visualViewport", { configurable: true, value: fake });
  } catch (e) {
    return { ok: false, motivo: String(e) };
  }
  vv.dispatchEvent(new Event("resize"));
  window.dispatchEvent(new Event("resize"));
  return { ok: true, alvoH, scale: 2 };
});
if (!emulouP.ok) {
  await browser.close();
  throw new Error("não deu para emular o zoom de pinça: " + emulouP.motivo);
}
await pageP.waitForTimeout(400);
const depoisP = await pageP.evaluate(() => ({
  escala: Number(document.querySelector("[data-game-area]")?.getAttribute("data-game-scale")),
  areaH: document.querySelector("[data-game-area]")?.getBoundingClientRect().height ?? null,
  vvH: window.visualViewport ? window.visualViewport.height : null,
  vvScale: window.visualViewport ? window.visualViewport.scale : null,
}));
console.log("pinça depois", JSON.stringify(depoisP), "emulacao", JSON.stringify(emulouP));
await ctxPinch.close();
if (!(depoisP.escala > 0) || Math.abs(depoisP.escala - antesP.escala) > 0.02) {
  throw new Error(
    `zoom de pinça alterou a escala do jogo: ${antesP.escala} → ${depoisP.escala} (vv.scale=${depoisP.vvScale}, vvH=${depoisP.vvH})`,
  );
}
console.log("OK pinça: escala", antesP.escala, "→", depoisP.escala, "(deve permanecer)");
await browser.close();


