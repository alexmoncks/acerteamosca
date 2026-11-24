// Medição de altura dos 14 jogos (Playwright headless), antes/depois do
// encaixe na altura visível (src/lib/game-fit.js, src/components/GameFit.jsx).
//
// Fora do padrão *.test.mjs de propósito: o `npm test` (tests/run.mjs) não
// roda este arquivo. Ele precisa de um servidor no ar e de um Chromium.
//
// Uso:
//   node tests/e2e/altura.e2e.mjs <base PT> <base EN> <pasta de saída> <rótulo>
//   node tests/e2e/altura.e2e.mjs http://100.64.0.2:3122 http://100.64.0.2:3123 .altura-shots antes
//
// Opções (depois dos 4 argumentos): --jogos=wordle,pong  --viewports=1366x768,390x844
//
// O que faz, sem rolar a página:
// - grava acerteamosca_consent_v1 = "denied" antes do carregamento (o aviso de
//   cookies não cobre o jogo e nada é pedido ao Google) e aborta todo pedido
//   que não vá ao próprio servidor;
// - simula um jogador cadastrado (GET /api/jogadores) e responde {ok:true} a
//   todo POST/PUT/DELETE em /api/*: a medição não grava nada no banco;
// - mede a área do jogo, o título, os controles e se tudo cabe em
//   [0, innerWidth] × [0, innerHeight] (tolerância de 1px), na tela inicial e,
//   quando há um roteiro de início (INICIO), com o jogo rodando;
// - confere a conversão de coordenadas do canvas (centro do retângulo CSS →
//   centro lógico) e se o centro de cada controle não está coberto
//   (document.elementFromPoint);
// - faz um teste real de clique no Acerte a Mosca (acertar a mosca e ver a
//   pontuação subir).
//
// Os seletores valem para o fae3a89 e para o código novo: [data-game-area]
// quando existe; senão o elemento com transform: scale(...) e origem no topo
// (a caixa escalada que todos os jogos usam), senão o maior <canvas>.
import fs from "node:fs";
import path from "node:path";

const PW = process.env.PLAYWRIGHT_MODULE || "/home/alexmarra/projects/inss-obras/node_modules/playwright/index.mjs";
const { chromium } = await import(PW);

const [basePt, baseEn, outRoot, rotulo, ...resto] = process.argv.slice(2);
if (!basePt || !baseEn || !outRoot || !rotulo) {
  console.error("uso: node tests/e2e/altura.e2e.mjs <base PT> <base EN> <pasta de saída> <rótulo> [--jogos=a,b] [--viewports=WxH,...]");
  process.exit(2);
}
const opt = Object.fromEntries(resto.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));

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

const JOGOS = [
  "2048", "3invader", "acerteamosca", "batalha-naval", "brickbreaker", "bubbleshooter", "deepattack",
  "jacare", "kungfucastle", "memory", "pong", "ships", "tiroaoalvo", "wordle",
];
const AMOSTRA = ["acerteamosca", "tiroaoalvo", "wordle", "kungfucastle", "3invader"];

const VIEWPORTS = [
  { nome: "1366x768", width: 1366, height: 768, mobile: false },
  { nome: "1280x720", width: 1280, height: 720, mobile: false },
  { nome: "1920x1080", width: 1920, height: 1080, mobile: false },
  // Monitor de 768px de altura de verdade: o Chrome (abas + barra de endereço,
  // ~100px) e a barra de tarefas do sistema (~40px) deixam ~625px de
  // innerHeight. É o caso relatado pelo Alexander; 1366x768 acima é o
  // innerHeight inteiro, que só existe em tela cheia.
  { nome: "1366x625", width: 1366, height: 625, mobile: false },
  { nome: "390x844", width: 390, height: 844, mobile: true },
  { nome: "844x390", width: 844, height: 390, mobile: true },
];
const EN_VIEWPORTS = ["1366x768", "390x844"];

// Roteiro de início: textos (regex) dos botões a clicar, em ordem, para sair
// do menu e chegar ao jogo rodando. Melhor esforço: o que não achar, pula.
const INICIO = {
  "2048": [/^(SOLO|1 JOGADOR|1 PLAYER|JOGAR|PLAY)/i],
  "3invader": [/JOGAR|PLAY|START|INICIAR/i],
  acerteamosca: [/ENTRAR|ENTER|JOGAR|PLAY|START|COMEÇAR|INICIAR/i],
  "batalha-naval": [/CPU|COMPUTADOR|COMPUTER|SOLO/i, /F[AÁ]CIL|EASY/i, /ALEAT|RANDOM/i, /COME[CÇ]AR|START|PRONTO|READY|BATALHA|BATTLE/i],
  brickbreaker: [/JOGAR|PLAY|START|INICIAR/i],
  bubbleshooter: [/JOGAR|PLAY|START|INICIAR/i],
  deepattack: [/JOGAR|PLAY|START|INICIAR/i],
  jacare: [/JOGAR|PLAY|START|INICIAR/i],
  // Depois do JOGAR vem a abertura (história); qualquer tecla ou toque pula.
  kungfucastle: [/JOGAR|PLAY|START|INICIAR/i, { pular: true }],
  memory: [/SOLO|1 JOGADOR|1 PLAYER|JOGAR|PLAY/i, /F[AÁ]CIL|EASY/i],
  pong: [/CPU/i, /F[AÁ]CIL|EASY/i],
  ships: [/CPU/i, /F[AÁ]CIL|EASY/i],
  tiroaoalvo: [/JOGAR|PLAY/i],
  wordle: [/^(JOGAR|PLAY)$/i],
};

const JOGADOR_FALSO = { id: "e2e-altura", nome: "E2E", email: "e2e@example.invalid" };
const TOL = 1;

const jogosSel = opt.jogos ? opt.jogos.split(",") : JOGOS;
const vpsSel = opt.viewports ? VIEWPORTS.filter((v) => opt.viewports.split(",").includes(v.nome)) : VIEWPORTS;

const outDir = path.resolve(outRoot, rotulo);
fs.mkdirSync(outDir, { recursive: true });

// ---------- funções que rodam na página ----------

// Medição completa da página atual. Roda no navegador (page.evaluate).
function medirNaPagina(TOL) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const r2o = (r) => ({ x: Math.round(r.left * 10) / 10, y: Math.round(r.top * 10) / 10, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, bottom: Math.round(r.bottom * 10) / 10, right: Math.round(r.right * 10) / 10 });
  const dentro = (r) => r.left >= -TOL && r.top >= -TOL && r.right <= W + TOL && r.bottom <= H + TOL;
  const visivel = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05;
  };

  const main = document.querySelector("main");
  const raiz = main ? [...main.children].find((c) => c.tagName === "DIV" || c.tagName === "SECTION") : null;

  // Área do jogo
  let area = document.querySelector("[data-game-area]");
  let origem = area ? "data-game-area" : null;
  if (!area && raiz) {
    const cands = [...raiz.querySelectorAll("*")].filter(
      (e) => /^scale\(/.test(e.style.transform) && /top/.test(e.style.transformOrigin),
    );
    let melhor = null;
    for (const c of cands) {
      const r = c.getBoundingClientRect();
      if (!melhor || r.width * r.height > melhor.a) melhor = { el: c, a: r.width * r.height };
    }
    if (melhor) { area = melhor.el; origem = "transform-scale"; }
  }
  if (!area && raiz) {
    let melhor = null;
    for (const c of raiz.querySelectorAll("canvas")) {
      const r = c.getBoundingClientRect();
      if (!melhor || r.width * r.height > melhor.a) melhor = { el: c, a: r.width * r.height };
    }
    if (melhor) { area = melhor.el; origem = "canvas"; }
  }
  if (!area) return { erro: "área do jogo não encontrada", W, H };

  const ra = area.getBoundingClientRect();
  // Escala aplicada: data-game-scale (código novo) ou o transform inline.
  let escala = Number(area.getAttribute("data-game-scale")) || null;
  if (!escala) {
    const esc = area.matches("[style*='scale(']") ? area : area.querySelector("[style*='scale(']");
    const m = esc && /scale\(([\d.]+)\)/.exec(esc.style.transform);
    escala = m ? Number(m[1]) : null;
  }

  // Controles: botões, inputs e elementos com papel de botão na raiz do jogo
  // (inclui os fixos, como os do Kung Fu Castle). Só os visíveis.
  const controles = [];
  if (raiz) {
    const els = raiz.querySelectorAll("button, input, select, textarea, [role='button'], [data-allow-touch]");
    for (const el of els) {
      if (!visivel(el)) continue;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let topo = null;
      let livre = false;
      if (cx >= 0 && cy >= 0 && cx <= W && cy <= H) {
        topo = document.elementFromPoint(cx, cy);
        livre = !!topo && (topo === el || el.contains(topo));
      }
      controles.push({
        texto: (el.innerText || el.value || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 30),
        tag: el.tagName.toLowerCase(),
        fixo: getComputedStyle(el).position === "fixed",
        rect: r2o(r),
        dentro: dentro(r),
        livre,
        cobertoPor: livre || !topo ? null : (topo.tagName.toLowerCase() + (topo.id ? "#" + topo.id : "")),
      });
    }
  }

  // Título (h1/h2 da raiz) e a borda de baixo de tudo o que é visível na raiz.
  const tit = raiz && raiz.querySelector("h1, h2");
  let fundo = 0;
  if (raiz) {
    for (const el of raiz.querySelectorAll("*")) {
      if (!visivel(el)) continue;
      const cs = getComputedStyle(el);
      if (cs.position === "fixed") continue;
      // Descendentes de quem corta o que transborda (overflow hidden) não contam além do pai.
      const r = el.getBoundingClientRect();
      let b = r.bottom;
      for (let p = el.parentElement; p && p !== raiz; p = p.parentElement) {
        const ov = getComputedStyle(p).overflow;
        if (ov !== "visible") { b = Math.min(b, p.getBoundingClientRect().bottom); }
      }
      if (b > fundo) fundo = b;
    }
  }

  // Conversão de coordenadas do canvas principal (o maior dentro da área).
  let canvas = null;
  const canvases = area.tagName === "CANVAS" ? [area] : [...area.querySelectorAll("canvas")];
  for (const c of canvases) {
    const r = c.getBoundingClientRect();
    if (!canvas || r.width * r.height > canvas.a) canvas = { el: c, a: r.width * r.height };
  }
  let conversao = null;
  if (canvas) {
    const c = canvas.el;
    const r = c.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dpr = Number(c.getAttribute("data-dpr")) || 1;
    // Fórmula da razão (a que o código novo usa): (clientX - rect.left) × canvas.width / rect.width.
    const lx = ((cx - r.left) * c.width) / r.width;
    const ly = ((cy - r.top) * c.height) / r.height;
    // Fórmula antiga dos jogos: (clientX - rect.left) / gameScale (em unidades do layout CSS do canvas).
    const cssW = c.offsetWidth || c.width;
    const cssH = c.offsetHeight || c.height;
    const ex = escala ? (cx - r.left) / escala : null;
    const ey = escala ? (cy - r.top) / escala : null;
    const topo = document.elementFromPoint(cx, cy);
    conversao = {
      buffer: { w: c.width, h: c.height },
      css: { w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 },
      layout: { w: cssW, h: cssH },
      proporcaoBuffer: Math.round((c.width / c.height) * 1000) / 1000,
      proporcaoCss: Math.round((r.width / r.height) * 1000) / 1000,
      razao: { x: Math.round(lx * 100) / 100, y: Math.round(ly * 100) / 100, esperado: { x: c.width / 2, y: c.height / 2 } },
      razaoOk: Math.abs(lx - c.width / 2) <= 1 && Math.abs(ly - c.height / 2) <= 1,
      porEscala: ex == null ? null : { x: Math.round(ex * 100) / 100, y: Math.round(ey * 100) / 100, esperado: { x: cssW / 2, y: cssH / 2 } },
      porEscalaOk: ex == null ? null : Math.abs(ex - cssW / 2) <= 1 && Math.abs(ey - cssH / 2) <= 1,
      centroAtinge: topo ? topo.tagName.toLowerCase() : null,
      centroNoCanvas: topo === c,
      dpr,
    };
  }

  const de = document.documentElement;
  const areaDentro = dentro(ra);
  const controlesForaDaTela = controles.filter((c) => !c.dentro).length;
  return {
    W, H,
    scrollY: window.scrollY,
    docAltura: de.scrollHeight,
    origemArea: origem,
    area: r2o(ra),
    areaDentro,
    escala,
    titulo: tit ? r2o(tit.getBoundingClientRect()) : null,
    fundoConteudo: Math.round(fundo * 10) / 10,
    controles,
    controlesForaDaTela,
    controlesCobertos: controles.filter((c) => c.dentro && !c.livre).length,
    cabe: areaDentro && controlesForaDaTela === 0,
    precisaRolar: ra.bottom > H + TOL || controles.some((c) => c.rect.bottom > H + TOL),
    conversao,
    viewportMetas: [...document.querySelectorAll("meta[name=viewport]")].map((m) => m.content),
  };
}

// ---------- execução ----------

const exe = chromiumMaisNovo();
console.log(`chromium: ${exe}`);
const browser = await chromium.launch({ executablePath: exe, headless: true });

const resultado = {
  rotulo,
  data: new Date().toISOString(),
  basePt,
  baseEn,
  chromium: exe,
  medicoes: [],
};

async function novoContexto(vp, base) {
  const host = new URL(base).host;
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.mobile ? 2 : 1,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
    serviceWorkers: "block",
    userAgent: vp.mobile
      ? "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"
      : undefined,
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
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
    return route.continue();
  });
  return ctx;
}

async function esperarArea(page) {
  await page
    .waitForFunction(
      () => {
        const main = document.querySelector("main");
        if (!main) return false;
        if (document.querySelector("[data-game-area]")) return true;
        const raiz = [...main.children].find((c) => c.tagName === "DIV" || c.tagName === "SECTION");
        if (!raiz) return false;
        return !!raiz.querySelector("canvas") || [...raiz.querySelectorAll("*")].some((e) => /^scale\(/.test(e.style.transform) && /top/.test(e.style.transformOrigin));
      },
      null,
      { timeout: 20000 },
    )
    .catch(() => {});
  // Fontes, ResizeObserver e o primeiro quadro do jogo.
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page.waitForTimeout(1200);
}

async function iniciar(page, jogo, vp) {
  const passos = INICIO[jogo] || [];
  const feitos = [];
  for (const re of passos) {
    if (re && re.pular) {
      await page.waitForTimeout(1500);
      if (vp.mobile) await page.touchscreen.tap(4, Math.round(vp.height / 2));
      else await page.keyboard.press("Space");
      feitos.push({ passo: "pular", texto: null });
      await page.waitForTimeout(1500);
      continue;
    }
    const botoes = page.locator("main button:visible");
    const n = await botoes.count();
    let clicou = false;
    for (let i = 0; i < n; i++) {
      const b = botoes.nth(i);
      const txt = ((await b.innerText().catch(() => "")) || "").trim();
      if (re.test(txt)) {
        // Sem rolar: clica no centro do retângulo se estiver na tela; senão
        // usa o evento sintético (o jogo começa, mas isso fica registrado).
        const box = await b.boundingBox();
        const naTela = box && box.y >= 0 && box.y + box.height <= vp.height && box.x >= 0 && box.x + box.width <= vp.width;
        if (naTela) {
          const cx = box.x + box.width / 2;
          const cy = box.y + box.height / 2;
          if (vp.mobile) await page.touchscreen.tap(cx, cy);
          else await page.mouse.click(cx, cy);
        } else {
          await b.dispatchEvent("click");
        }
        feitos.push({ passo: String(re), texto: txt.slice(0, 30), naTela: !!naTela });
        clicou = true;
        await page.waitForTimeout(700);
        break;
      }
    }
    if (!clicou) feitos.push({ passo: String(re), texto: null });
  }
  await page.waitForTimeout(1200);
  return feitos;
}

// Teste real: no Acerte a Mosca, clicar no centro da mosca e ver os pontos.
async function testeRealMosca(page, vp) {
  const lerPontos = () =>
    page.evaluate(() => {
      // O placar do HUD: o número em 14px (Press Start 2P) logo abaixo do
      // rótulo de pontos, dentro da caixa do jogo.
      const divs = [...document.querySelectorAll("main div")].filter(
        (d) => d.children.length === 0 && d.style.fontSize === "14px" && /^[\d.,]+$/.test(d.textContent.trim()),
      );
      return divs.length ? divs[0].textContent.trim() : null;
    });
  const antes = await lerPontos();
  let depois = antes;
  let tentativas = 0;
  let foraDaTela = 0;
  for (; tentativas < 30; tentativas++) {
    const centro = await page.evaluate(() => {
      // A mosca: o div com z-index 50 que contém o <svg> dela.
      const cands = [...document.querySelectorAll("main div")].filter((d) => d.style.zIndex === "50" && d.querySelector("svg"));
      if (!cands.length) return null;
      const r = cands[0].querySelector("svg").getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (!centro) { await page.waitForTimeout(300); continue; }
    // Mosca fora da tela (jogo cortado embaixo): o clique sintético até
    // chega, mas um jogador não alcançaria. Fica registrado.
    if (centro.y > vp.height || centro.y < 0 || centro.x > vp.width || centro.x < 0) foraDaTela++;
    if (vp.mobile) await page.touchscreen.tap(centro.x, centro.y);
    else await page.mouse.click(centro.x, centro.y);
    await page.waitForTimeout(250);
    depois = await lerPontos();
    if (depois !== antes && depois !== null) break;
  }
  return { pontosAntes: antes, pontosDepois: depois, tentativas: tentativas + 1, cliquesForaDaTela: foraDaTela, acertou: depois !== antes && depois !== null };
}

async function medirJogo(ctx, page, base, jogo, vp, idioma) {
  const url = `${base}/jogos/${jogo}`;
  const reg = { jogo, viewport: vp.nome, idioma, url };
  try {
    await page.goto(url, { waitUntil: "load", timeout: 45000 });
    await esperarArea(page);
    reg.inicial = await page.evaluate(medirNaPagina, TOL);
    const shot = vp.nome === "1366x768" || vp.nome === "1366x625" || AMOSTRA.includes(jogo);
    if (shot) {
      await page.screenshot({ path: path.join(outDir, `${jogo}-${vp.nome}-${idioma}.png`) });
    }
    // Com o jogo rodando (melhor esforço).
    if ((INICIO[jogo] || []).length) {
      reg.passosInicio = await iniciar(page, jogo, vp);
      reg.jogando = await page.evaluate(medirNaPagina, TOL);
      if (shot) await page.screenshot({ path: path.join(outDir, `${jogo}-${vp.nome}-${idioma}-jogando.png`) });
      if (jogo === "acerteamosca") reg.testeReal = await testeRealMosca(page, vp);
    }
  } catch (err) {
    reg.erro = String(err && err.message ? err.message : err).slice(0, 300);
  }
  const ini = reg.inicial || {};
  const jog = reg.jogando || {};
  console.log(
    `${idioma} ${vp.nome.padEnd(9)} ${jogo.padEnd(14)} ` +
      (reg.erro
        ? `ERRO ${reg.erro}`
        : `inicial: ${ini.cabe ? "cabe" : "NÃO cabe"} area=${ini.area ? ini.area.w + "x" + ini.area.h + "@" + ini.area.y : "?"} esc=${ini.escala}` +
          (reg.jogando ? ` | jogando: ${jog.cabe ? "cabe" : "NÃO cabe"} area=${jog.area ? jog.area.w + "x" + jog.area.h + "@" + jog.area.y : "?"} ctrlFora=${jog.controlesForaDaTela}` : "") +
          (reg.testeReal ? ` | mosca: ${reg.testeReal.acertou ? "acertou" : "não acertou"}` : "")),
  );
  return reg;
}

for (const vp of vpsSel) {
  for (const [idioma, base] of [["pt", basePt], ["en", baseEn]]) {
    if (idioma === "en" && !EN_VIEWPORTS.includes(vp.nome)) continue;
    const ctx = await novoContexto(vp, base);
    for (const jogo of jogosSel) {
      // Página nova por jogo: nada de estado (laço do jogo, áudio) vazando.
      const page = await ctx.newPage();
      resultado.medicoes.push(await medirJogo(ctx, page, base, jogo, vp, idioma));
      await page.close();
    }
    await ctx.close();
  }
}

await browser.close();

// Rodada parcial (--jogos/--viewports) sobre um resultado.json que já existe:
// troca só as medições refeitas e mantém as outras.
const arquivo = path.join(outDir, "resultado.json");
if ((opt.jogos || opt.viewports) && fs.existsSync(arquivo)) {
  const anterior = JSON.parse(fs.readFileSync(arquivo, "utf8"));
  const chave = (m) => `${m.jogo}|${m.viewport}|${m.idioma}`;
  const novas = new Set(resultado.medicoes.map(chave));
  resultado.medicoes = [...anterior.medicoes.filter((m) => !novas.has(chave(m))), ...resultado.medicoes];
  resultado.parciais = [...(anterior.parciais || []), { data: resultado.data, jogos: opt.jogos || null, viewports: opt.viewports || null }];
  resultado.data = anterior.data;
}

// Resumo: jogo × viewport (PT) → cabe/não cabe e altura da área.
const resumo = {};
for (const m of resultado.medicoes) {
  const k = `${m.jogo}|${m.viewport}|${m.idioma}`;
  const est = m.jogando && !m.jogando.erro ? m.jogando : m.inicial;
  resumo[k] = m.erro || !est || est.erro
    ? { erro: m.erro || (est && est.erro) || "sem medição" }
    : {
        cabeInicial: !!(m.inicial && m.inicial.cabe),
        cabeJogando: m.jogando ? !!m.jogando.cabe : null,
        alturaArea: m.inicial && m.inicial.area ? m.inicial.area.h : null,
        alturaAreaJogando: m.jogando && m.jogando.area ? m.jogando.area.h : null,
        fundoArea: m.inicial && m.inicial.area ? m.inicial.area.bottom : null,
        escala: m.inicial ? m.inicial.escala : null,
      };
}
resultado.resumo = resumo;
fs.writeFileSync(arquivo, JSON.stringify(resultado, null, 2));
console.log(`\nresultado: ${arquivo}`);
