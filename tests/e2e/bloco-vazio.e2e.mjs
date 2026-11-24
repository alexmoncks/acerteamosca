// Bloco de anúncio sem anúncio: o colapso move alguma coisa? (Playwright)
//
// Fora do padrão *.test.mjs de propósito: o `npm test` não roda este
// arquivo. Precisa de um servidor local com um build que tenha slots
// numéricos FALSOS (só local, nunca commitados), por exemplo:
//   NEXT_PUBLIC_ADSENSE_SLOT_GAME_FOOTER=1234567890
//   NEXT_PUBLIC_ADSENSE_SLOT_HOME_TOP=1234567891
//   NEXT_PUBLIC_ADSENSE_SLOT_HOME_BOTTOM=1234567892
// e -H localhost (com 127.0.0.1 o next-intl entra em laço 307).
//
// Uso: node tests/e2e/bloco-vazio.e2e.mjs <base> [--paginas=/jogos/wordle,/] [--viewports=desktop,mobile]
//
// Todo pedido fora do servidor local é abortado (nenhuma tag do Google roda:
// o <ins> fica sem data-ad-status até o teste mexer). Com a escolha
// "granted" gravada (os blocos aparecem), para cada bloco da página:
//   1. mede, em coordenadas do documento, o topo da área do jogo, do h1 do
//      GameInfo, de cada .ad-slot, dos vizinhos do bloco e a altura da página;
//   2. simula o Google: data-ad-status="unfilled" no <ins>;
//   3. mede de novo e confere se o MutationObserver marcou data-ad-vazio e se
//      a caixa sumiu (display: none);
//   4. repete com as regras :has() removidas das folhas de estilo (como num
//      navegador sem :has(), Firefox < 121): a caixa tem de sumir só pelo
//      data-ad-vazio;
//   5. repete rolado até o fim da página: mostra o que o navegador faz com a
//      rolagem quando a página encolhe.
import fs from "node:fs";
import path from "node:path";

const PW = process.env.PLAYWRIGHT_MODULE || "/home/alexmarra/projects/inss-obras/node_modules/playwright/index.mjs";
const { chromium } = await import(PW);

const [base, ...resto] = process.argv.slice(2);
if (!base) {
  console.error("uso: node tests/e2e/bloco-vazio.e2e.mjs <base> [--paginas=/jogos/wordle,/] [--viewports=desktop,mobile]");
  process.exit(2);
}
const opt = Object.fromEntries(resto.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const PAGINAS = String(opt.paginas || "/jogos/wordle,/").split(",");
const VIEWPORTS = String(opt.viewports || "desktop,mobile").split(",");
const VP = {
  desktop: { viewport: { width: 1366, height: 768 } },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

function chromiumMaisNovo() {
  const cache = path.join(process.env.HOME || "/home/alexmarra", ".cache/ms-playwright");
  const dirs = fs.readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  for (const d of dirs) {
    const bin = path.join(cache, d, "chrome-linux64/chrome");
    if (fs.existsSync(bin)) return bin;
  }
  throw new Error("nenhum Chromium em " + cache);
}

// Roda na página: posições no documento (top + scrollY), arredondadas a 0,1px.
function medirNaPagina(placement) {
  const r1 = (n) => Math.round(n * 10) / 10;
  const topo = (el) => (el ? r1(el.getBoundingClientRect().top + window.scrollY) : null);
  const topoTela = (el) => (el ? r1(el.getBoundingClientRect().top) : null);
  const slot = document.querySelector(`.ad-slot[data-placement="${placement}"]`);
  const antes = slot?.previousElementSibling;
  const depois = slot?.nextElementSibling;
  const h1 = document.querySelector("h1");
  return {
    // [data-game-area] só existe com o jogo rodando; no menu, o encaixe
    // (.game-fit-root) é a área do jogo
    area_jogo: topo(document.querySelector("[data-game-area]") || document.querySelector(".game-fit-root")),
    h1_gameinfo: topo(h1),
    h1_tela: topoTela(h1),
    vizinho_antes: topo(antes),
    vizinho_depois: topo(depois),
    slot_topo: topo(slot),
    slot_altura: slot ? r1(slot.getBoundingClientRect().height) : null,
    slot_display: slot ? getComputedStyle(slot).display : null,
    slot_vazio: slot ? slot.hasAttribute("data-ad-vazio") : null,
    altura_pagina: document.documentElement.scrollHeight,
    scrollY: window.scrollY,
  };
}

const JOGADOR_FALSO = { id: "e2e-bloco-vazio", nome: "E2E", email: "e2e@example.invalid" };
const exe = chromiumMaisNovo();
const browser = await chromium.launch({ executablePath: exe, headless: true });
const host = new URL(base).host;

async function cenario(pagina, vpNome, placement, { semHas = false, rolarAteOFim = false } = {}) {
  const ctx = await browser.newContext({ ...VP[vpNome], serviceWorkers: "block" });
  await ctx.addInitScript(() => {
    try { localStorage.setItem("acerteamosca_consent_v1", "granted"); } catch {}
  });
  // jogador simulado, como no altura.e2e.mjs (sem ele o jogo abre no
  // cadastro e a área do jogo não existe); nada gravado no banco
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
  await page.goto(base + pagina, { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(1500);
  if (semHas) {
    const removidas = await page.evaluate(() => {
      let n = 0;
      for (const folha of document.styleSheets) {
        let regras;
        try { regras = folha.cssRules; } catch { continue; }
        // como o navegador sem :has(): pula o @supports selector(:has(*)) e
        // descarta a regra inteira cujo seletor tenha :has() (lista inclusa)
        for (let i = regras.length - 1; i >= 0; i--) {
          const r = regras[i];
          if ((r.conditionText && r.conditionText.includes(":has(")) || (r.selectorText && r.selectorText.includes(":has("))) {
            folha.deleteRule(i);
            n++;
          }
        }
      }
      return n;
    });
    if (!removidas) throw new Error("nenhuma regra :has() encontrada");
  }
  if (rolarAteOFim) {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(300);
  }
  const antes = await page.evaluate(medirNaPagina, placement);
  const temIns = await page.evaluate((p) => {
    const ins = document.querySelector(`.ad-slot[data-placement="${p}"] ins.adsbygoogle`);
    if (!ins) return false;
    ins.setAttribute("data-ad-status", "unfilled");
    return true;
  }, placement);
  await page.waitForTimeout(300);
  const depois = await page.evaluate(medirNaPagina, placement);
  await ctx.close();
  return { pagina, viewport: vpNome, placement, semHas, rolarAteOFim, temIns, antes, depois };
}

const PLACEMENTS = { "/": ["home_top", "home_bottom"] };
const resultados = [];
for (const vpNome of VIEWPORTS) {
  for (const pagina of PAGINAS) {
    for (const placement of PLACEMENTS[pagina] || ["game_footer"]) {
      for (const flags of [{}, { semHas: true }, { rolarAteOFim: true }]) {
        const r = await cenario(pagina, vpNome, placement, flags);
        resultados.push(r);
        const d = (k) => (r.antes[k] === null ? "-" : `${r.antes[k]}→${r.depois[k]}`);
        const rotulo = flags.semHas ? "sem :has()" : flags.rolarAteOFim ? "rolado ao fim" : "normal";
        console.log(
          `${vpNome.padEnd(7)} ${pagina.padEnd(13)} ${placement.padEnd(11)} ${rotulo.padEnd(13)} ins=${r.temIns} ` +
            `display ${d("slot_display")} vazio ${d("slot_vazio")} | área do jogo ${d("area_jogo")} | h1 ${d("h1_gameinfo")} ` +
            `(tela ${d("h1_tela")}) | vizinho antes ${d("vizinho_antes")} | vizinho depois ${d("vizinho_depois")} | ` +
            `bloco ${d("slot_topo")} alt ${d("slot_altura")} | página ${d("altura_pagina")} | scrollY ${d("scrollY")}`,
        );
      }
    }
  }
}
if (opt.json) fs.writeFileSync(String(opt.json), JSON.stringify({ base, data: new Date().toISOString(), resultados }, null, 2));
await browser.close();
