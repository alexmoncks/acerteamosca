// Defesa no código contra Anúncios Automáticos (Playwright headless).
//
// Fora do padrão *.test.mjs de propósito: o `npm test` (tests/run.mjs) não
// roda este arquivo. Ele precisa de um servidor local no ar e de um Chromium.
//
// Uso:
//   node tests/e2e/auto-ads.e2e.mjs <base> [--variantes=A,B,C,D|real] [--paginas=/,/jogos/wordle]
//        [--segundos=10] [--viewports=desktop,mobile] [--ins] [--json=arquivo]
//   node tests/e2e/auto-ads.e2e.mjs http://localhost:3193 --variantes=A,B,C,D
//
// O servidor deve ser um build com NEXT_PUBLIC_ADSENSE_PLACEHOLDERS=1 e sem
// NEXT_PUBLIC_ADSENSE_SLOT_* (nenhum <ins> do site). Use -H localhost: com
// -H 127.0.0.1 o next-intl entra em laço 307.
//
// Variantes (reescrevendo o script inline do <head> no HTML que chega ao
// navegador; o nonce da CSP continua válido, só muda o texto do script):
//   A    = o HTML como está no build (no fae3a89: adsbygoogle.js?client=...);
//   B    = adsbygoogle.js sem ?client=;
//   C    = B + push único {google_ad_client, enable_page_level_ads: false}
//          antes de o adsbygoogle.js entrar;
//   D    = A + o mesmo push de C;
//   real = sem reescrita (para medir o código já alterado).
//
// Em cada página e variante: contexto novo, escolha "granted" gravada antes
// do carregamento, cabeçalho CF-IPCountry: BR no pedido da página (região
// "fora": o <head> manda o "granted", como para um visitante do Brasil que
// aceitou), 10 s parado. Conta os pedidos a googleads.g.doubleclick.net/
// pagead/ads (ABORTADOS: nenhum anúncio é entregue nem conta impressão) e a
// pagead2.googlesyndication.com/pagead/managed/js/adsense (a configuração dos
// Anúncios Automáticos), os da mensagem do Google (fundingchoicesmessages),
// os <ins> que o Auto ads põe na página e os erros de console/TagError.
//
// --ins: depois do carregamento, põe um <ins> manual com slot numérico FALSO
// (1234567890) e data-adtest="on" e faz o push({}): confere que a unidade
// manual ainda gera pedido pagead/ads (com slotname=1234567890). Só local.
import fs from "node:fs";
import path from "node:path";

const PW = process.env.PLAYWRIGHT_MODULE || "/home/alexmarra/projects/inss-obras/node_modules/playwright/index.mjs";
const { chromium } = await import(PW);

const [base, ...resto] = process.argv.slice(2);
if (!base) {
  console.error("uso: node tests/e2e/auto-ads.e2e.mjs <base> [--variantes=A,B,C,D|real] [--paginas=/,/jogos/wordle] [--segundos=10] [--viewports=desktop,mobile] [--ins] [--json=arquivo]");
  process.exit(2);
}
const opt = Object.fromEntries(resto.filter((a) => a.startsWith("--")).map((a) => {
  const [k, v] = a.slice(2).split("=");
  return [k, v === undefined ? true : v];
}));
const VARIANTES = String(opt.variantes || "A,B,C,D").split(",");
const PAGINAS = String(opt.paginas || "/,/jogos/wordle").split(",");
const SEGUNDOS = Number(opt.segundos || 10);
const VIEWPORTS = String(opt.viewports || "desktop,mobile").split(",");
const COM_INS = !!opt.ins;
const PUB = "ca-pub-4148140889800778";
const SLOT_FALSO = "1234567890";

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

const VP = {
  desktop: {
    viewport: { width: 1366, height: 768 },
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  },
};

const TAG_COM_CLIENT = `adsbygoogle.js?client=${PUB}`;
const PUSH_CONFIG = `(window.adsbygoogle=window.adsbygoogle||[]).push({google_ad_client:"${PUB}",enable_page_level_ads:false});`;
const INJECAO = 'a("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

// Reescreve o HTML da página conforme a variante. Devolve [html, aplicou].
function reescrever(html, variante) {
  if (variante === "A" || variante === "real") return [html, true];
  let h = html;
  if (variante === "B" || variante === "C") {
    if (!h.includes(TAG_COM_CLIENT)) return [h, false];
    h = h.split(TAG_COM_CLIENT).join("adsbygoogle.js");
  }
  if (variante === "C" || variante === "D") {
    // só no script de verdade (no payload RSC as aspas vêm escapadas)
    const i = h.indexOf(INJECAO);
    if (i < 0) return [h, false];
    h = h.slice(0, i) + PUSH_CONFIG + h.slice(i);
  }
  return [h, true];
}

const exe = chromiumMaisNovo();
console.log(`chromium: ${exe}`);
const browser = await chromium.launch({ executablePath: exe, headless: true });
const host = new URL(base).host;
const resultados = [];

async function medir({ pagina, variante, vpNome }) {
  const ctx = await browser.newContext({ ...VP[vpNome], serviceWorkers: "block" });
  await ctx.addInitScript(() => {
    try { localStorage.setItem("acerteamosca_consent_v1", "granted"); } catch {}
  });
  const r = {
    pagina, variante, viewport: vpNome, reescrita: null,
    pagead_ads: 0, pagead_ads_slot_falso: 0, pagead_ads_formatos: [], managed_js_adsense: 0, fundingchoices: 0,
    adsbygoogle_js: [], ins_auto: 0, ins_total: 0, erros: [], hosts_google: {},
  };
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    let u;
    try { u = new URL(req.url()); } catch { return route.abort(); }
    if (u.protocol === "data:" || u.protocol === "blob:") return route.continue();
    const google = /(^|\.)(google|googlesyndication|doubleclick|googletagservices|googletagmanager|gstatic|googleadservices|adtrafficquality)\.[a-z.]+$/.test(u.hostname) || /\.google$/.test(u.hostname);
    if (u.host === host) {
      if (req.resourceType() === "document") {
        const resp = await route.fetch({ headers: { ...req.headers(), "cf-ipcountry": "BR" } });
        const ct = resp.headers()["content-type"] || "";
        if (!ct.includes("text/html")) return route.fulfill({ response: resp });
        const [html, aplicou] = reescrever(await resp.text(), variante);
        if (r.reescrita === null) r.reescrita = aplicou;
        const headers = { ...resp.headers() };
        delete headers["content-length"];
        delete headers["content-encoding"];
        return route.fulfill({ status: resp.status(), headers, body: html });
      }
      if (u.pathname.startsWith("/api/") && req.method() !== "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
      }
      return route.continue();
    }
    if (!google) return route.abort();
    const chave = u.hostname + u.pathname.split("/").slice(0, 3).join("/");
    r.hosts_google[chave] = (r.hosts_google[chave] || 0) + 1;
    if (u.hostname === "googleads.g.doubleclick.net" && u.pathname.startsWith("/pagead/ads")) {
      r.pagead_ads++;
      if (u.searchParams.get("slotname") === SLOT_FALSO) r.pagead_ads_slot_falso++;
      r.pagead_ads_formatos.push(`slotname=${u.searchParams.get("slotname") || "-"} format=${u.searchParams.get("format") || "-"}`);
      return route.abort(); // nenhum anúncio entregue
    }
    if (u.hostname === "pagead2.googlesyndication.com" && u.pathname.startsWith("/pagead/managed/js/adsense")) r.managed_js_adsense++;
    if (u.hostname === "pagead2.googlesyndication.com" && u.pathname.endsWith("/adsbygoogle.js")) r.adsbygoogle_js.push(u.search || "(sem query)");
    if (u.hostname.startsWith("fundingchoicesmessages.")) r.fundingchoices++;
    return route.continue();
  });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error" || /TagError|adsbygoogle|enable_page_level_ads/i.test(m.text())) {
      r.erros.push(`[console.${m.type()}] ${m.text().slice(0, 240)}`);
    }
  });
  page.on("pageerror", (e) => r.erros.push(`[pageerror] ${String(e.message || e).slice(0, 240)}`));
  await page.goto(base + pagina, { waitUntil: "load", timeout: 45000 });
  if (COM_INS) {
    await page.waitForTimeout(1500);
    await page.evaluate(({ pub, slot }) => {
      const ins = document.createElement("ins");
      ins.className = "adsbygoogle";
      ins.style.display = "block";
      ins.style.minHeight = "250px";
      ins.setAttribute("data-ad-client", pub);
      ins.setAttribute("data-ad-slot", slot);
      ins.setAttribute("data-ad-format", "auto");
      ins.setAttribute("data-full-width-responsive", "true");
      ins.setAttribute("data-adtest", "on");
      ins.setAttribute("data-e2e-falso", "1");
      (document.querySelector("main") || document.body).appendChild(ins);
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { console.error("push manual: " + e.message); }
    }, { pub: PUB, slot: SLOT_FALSO });
  }
  await page.waitForTimeout(SEGUNDOS * 1000);
  const dom = await page.evaluate(() => ({
    ins_total: document.querySelectorAll("ins.adsbygoogle").length,
    ins_auto: document.querySelectorAll("ins.adsbygoogle-noablate, .google-auto-placed, ins.adsbygoogle[data-anchor-status], ins.adsbygoogle[data-vignette-loaded]").length,
    status_falso: document.querySelector("ins[data-e2e-falso]")?.getAttribute("data-ad-status") ?? null,
    // os <ins> que não são do site nem do teste: os que o Auto ads põe
    ins_attrs: [...document.querySelectorAll("ins.adsbygoogle:not([data-e2e-falso])")].map((el) =>
      [el.className, ...[...el.attributes].filter((a) => a.name.startsWith("data-")).map((a) => `${a.name}=${a.value}`)].join(" ").slice(0, 300)),
    ads_attr: document.documentElement.getAttribute("data-aam-ads"),
    tags: !!window.__aamGoogleTags,
    granted: !!window.__aamGranted,
  }));
  Object.assign(r, dom);
  await ctx.close();
  return r;
}

for (const vpNome of VIEWPORTS) {
  for (const pagina of PAGINAS) {
    for (const variante of VARIANTES) {
      const r = await medir({ pagina, variante, vpNome });
      resultados.push(r);
      console.log(
        `${vpNome.padEnd(7)} ${pagina.padEnd(16)} ${variante.padEnd(4)} reescrita=${r.reescrita} ` +
          `pagead/ads=${r.pagead_ads} (slot falso ${r.pagead_ads_slot_falso}) managed/js/adsense=${r.managed_js_adsense} ` +
          `fundingchoices=${r.fundingchoices} ins=${r.ins_total} auto=${r.ins_auto} status_falso=${r.status_falso} ` +
          `tags=${r.tags} granted=${r.granted} adsbygoogle.js=${r.adsbygoogle_js.join("|") || "-"} erros=${r.erros.length}`,
      );
      for (const e of r.erros) console.log(`        ${e}`);
      for (const f of r.pagead_ads_formatos) console.log(`        pagead/ads: ${f}`);
      for (const a of r.ins_attrs) console.log(`        <ins> fora do site: ${a}`);
    }
  }
}

if (opt.json) fs.writeFileSync(String(opt.json), JSON.stringify({ base, data: new Date().toISOString(), resultados }, null, 2));
await browser.close();
