// CSP estrita com nonce por pedido (lote 2): comportamento, não texto.
//
// Roda o middleware de verdade (src/middleware.js, com o next-intl e o
// NextRequest do Next) em Node e confere o que sai: um nonce novo a cada
// pedido, a CSP na resposta, o mesmo nonce nos cabeçalhos que o Next repassa
// ao render (x-nonce e content-security-policy) e nenhum valor forjado pelo
// cliente. Confere também que o Next tira o nosso nonce da CSP com a função
// dele (getScriptNonceFromHeader), que é o que põe o nonce nos chunks.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire, registerHooks } from "node:module";
import { check, source, repoPath, loadModule } from "./helpers.mjs";

const csp = await loadModule("src/lib/csp.js");
const require = createRequire(repoPath("package.json"));
const { getScriptNonceFromHeader } = require("next/dist/server/app-render/get-script-nonce-from-header.js");

// O Next 14 não tem "exports" no package.json: em ESM puro, "next/server"
// precisa do ".js". O webpack do Next resolve sozinho; aqui, um hook.
registerHooks({
  resolve(spec, ctx, next) {
    return next(/^next\/(server|headers|navigation)$/.test(spec) ? `${spec}.js` : spec, ctx);
  },
});
const { NextRequest } = await import("next/server");

// Copia o middleware e o que ele importa para uma pasta temporária, com os
// imports relativos apontando para as cópias .mjs, e carrega.
async function carregarMiddleware() {
  const dir = fs.mkdtempSync(path.join(import.meta.dirname, ".tmp-mw-"));
  try {
    for (const f of ["src/middleware.js", "src/lib/host-routing.js", "src/lib/csp.js", "src/i18n/routing.js"]) {
      const out = source(f)
        .replace(/from "\.\/i18n\/routing"/g, 'from "./routing.mjs"')
        .replace(/from "\.\/lib\/([a-z-]+)"/g, 'from "./$1.mjs"');
      fs.writeFileSync(path.join(dir, path.basename(f, ".js") + ".mjs"), out);
    }
    return (await import(path.join(dir, "middleware.mjs"))).default;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
const middleware = await carregarMiddleware();

function pedir(url, headers = {}) {
  const host = new URL(url).host;
  return middleware(new NextRequest(url, { headers: { host, ...headers } }));
}
const repassado = (res, nome) => res.headers.get(`x-middleware-request-${nome}`);
const nonceDe = (valor) => (String(valor).match(/'nonce-([^']+)'/) || [])[1];

check("generateNonce: 128 bits, base64, never repeats", () => {
  const vistos = new Set();
  for (let i = 0; i < 500; i++) {
    const n = csp.generateNonce();
    assert.ok(csp.isValidNonce(n), n);
    assert.equal(Buffer.from(n, "base64").length, 16);
    vistos.add(n);
  }
  assert.equal(vistos.size, 500);
});

check("buildCsp: nonce + strict-dynamic, no unsafe-inline/unsafe-eval in script-src", () => {
  const n = csp.generateNonce();
  const d = csp.parseCsp(csp.buildCsp({ nonce: n }));
  assert.ok(d["script-src"].includes(`'nonce-${n}'`));
  assert.ok(d["script-src"].includes("'strict-dynamic'"));
  assert.ok(!d["script-src"].includes("'unsafe-inline'"));
  assert.ok(!d["script-src"].includes("'unsafe-eval'"));
  assert.deepEqual(d["object-src"], ["'none'"]);
  assert.deepEqual(d["base-uri"], ["'self'"]);
  assert.ok(d["worker-src"].includes("'self'"));
  // nenhum outro directive pode reabrir script (script-src-elem/attr)
  assert.ok(!("script-src-elem" in d) && !("script-src-attr" in d));
});

check("buildCsp refuses a nonce that could break out of the header or the HTML attribute", () => {
  for (const ruim of [undefined, "", "curto", `abc'def${"x".repeat(20)}`, `${"a".repeat(20)}"><script>`, `${"a".repeat(20)} 'unsafe-inline'`, `${"a".repeat(20)};script-src *`]) {
    assert.throws(() => csp.buildCsp({ nonce: ruim }), /nonce/, String(ruim));
  }
});

check("Next.js reads our nonce from the CSP (getScriptNonceFromHeader)", () => {
  for (let i = 0; i < 50; i++) {
    const n = csp.generateNonce();
    assert.equal(getScriptNonceFromHeader(csp.buildCsp({ nonce: n })), n);
  }
});

check("frame-src keeps the AdSense creatives and the Google consent message", () => {
  const frame = csp.parseCsp(csp.buildCsp({ nonce: csp.generateNonce() }))["frame-src"];
  for (const d of ["googleads.g.doubleclick.net", "tpc.googlesyndication.com", "*.safeframe.googlesyndication.com",
    "fundingchoicesmessages.google.com", "*.google.com", "*.gstatic.com", "*.adtrafficquality.google"]) {
    assert.ok(frame.includes(`https://${d}`), `frame-src sem ${d}`);
  }
});

check("middleware: each page request gets its own nonce, in the response CSP and in the headers passed to the render", () => {
  const nonces = new Set();
  for (const [url, extra] of [
    ["https://acerteamosca.com.br/", {}],
    ["https://acerteamosca.com.br/jogos/wordle", {}],
    ["https://nailedthefly.com/jogos/pong", {}],
    ["http://127.0.0.1:3000/en/jogos/2048", {}],
    ["https://abc.up.railway.app/sobre", { "x-forwarded-host": "nailedthefly.com" }],
  ]) {
    const res = pedir(url, extra);
    assert.equal(res.status, 200, url);
    const cspResp = res.headers.get("content-security-policy");
    const n = nonceDe(cspResp);
    assert.ok(csp.isValidNonce(n), `${url}: sem nonce na CSP`);
    assert.equal(repassado(res, "x-nonce"), n, `${url}: x-nonce diferente do da CSP`);
    assert.equal(repassado(res, "content-security-policy"), cspResp, `${url}: CSP do pedido diferente da resposta`);
    assert.equal(getScriptNonceFromHeader(repassado(res, "content-security-policy")), n);
    nonces.add(n);
  }
  assert.equal(nonces.size, 5, "nonce repetido entre pedidos");
  // o mesmo caminho, duas vezes: dois nonces
  const a = nonceDe(pedir("https://acerteamosca.com.br/").headers.get("content-security-policy"));
  const b = nonceDe(pedir("https://acerteamosca.com.br/").headers.get("content-security-policy"));
  assert.notEqual(a, b);
});

check("middleware: a client-sent x-nonce or CSP request header is overwritten", () => {
  const res = pedir("https://acerteamosca.com.br/sobre", {
    "x-nonce": "AAAAAAAAAAAAAAAAAAAAAA==",
    "content-security-policy": "script-src 'nonce-AAAAAAAAAAAAAAAAAAAAAA==' 'unsafe-inline'",
  });
  const n = nonceDe(res.headers.get("content-security-policy"));
  assert.notEqual(n, "AAAAAAAAAAAAAAAAAAAAAA==");
  assert.equal(repassado(res, "x-nonce"), n);
  assert.ok(!/unsafe-inline/.test(repassado(res, "content-security-policy").split(";").find((d) => d.trim().startsWith("script-src"))));
});

check("middleware: the production CSP has no ws:// origin; the routing still works with the nonce", () => {
  const res = pedir("https://nailedthefly.com/");
  const d = csp.parseCsp(res.headers.get("content-security-policy"));
  assert.deepEqual(d["connect-src"], ["'self'", "https:", "wss:"]);
  // next-intl continua decidindo o idioma pelo domínio
  assert.equal(repassado(res, "x-next-intl-locale"), "en");
  assert.match(res.headers.get("x-middleware-rewrite"), /\/en$/);
  assert.equal(repassado(pedir("https://acerteamosca.com.br/sobre"), "x-next-intl-locale"), "pt");
});

check("middleware: 301s (www, /en on a production domain) are untouched", () => {
  const www = pedir("https://www.acerteamosca.com.br/jogos/pong?x=1");
  assert.equal(www.status, 301);
  assert.equal(www.headers.get("location"), "https://acerteamosca.com.br/jogos/pong?x=1");
  const en = pedir("https://acerteamosca.com.br/en/sobre");
  assert.equal(en.status, 301);
  assert.equal(en.headers.get("location"), "https://nailedthefly.com/sobre");
});

check("next.config.js no longer sends a static CSP (two CSPs would both apply and block the nonce)", () => {
  assert.ok(!/Content-Security-Policy/.test(source("next.config.js").replace(/^\s*\/\/.*$/gm, "")));
});

check("every <script> rendered by the layout and pages carries the nonce", () => {
  const semComentarios = (t) =>
    t.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const layout = semComentarios(source("src/app/[locale]/layout.js"));
  const scripts = layout.match(/<(?:script|Script)\b[^>]*?>/gs) || [];
  assert.ok(scripts.length >= 5, `achei ${scripts.length} scripts no layout`);
  for (const tag of scripts) assert.match(tag, /nonce=\{nonce\}/, tag);
  assert.match(source("src/components/JsonLd.jsx"), /nonce=\{getNonce\(\)\}/);
  const dir = repoPath("src/app/[locale]/jogos");
  for (const jogo of fs.readdirSync(dir)) {
    const f = path.join(dir, jogo, "page.js");
    if (!fs.existsSync(f)) continue;
    const s = semComentarios(fs.readFileSync(f, "utf8"));
    assert.ok(!/<script\b/.test(s), `${jogo}: <script> sem passar pelo <JsonLd>`);
  }
  assert.ok(!/<script\b/.test(semComentarios(source("src/app/[locale]/HomeClient.jsx"))), "HomeClient (cliente) não sabe o nonce");
});

check("no eval in the site code; every PixiJS Application loads pixi.js/unsafe-eval (CSP without 'unsafe-eval')", () => {
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : /\.(js|jsx|mjs)$/.test(e.name) ? [path.join(dir, e.name)] : []);
  const comEval = [];
  const pixiSemPolyfill = [];
  for (const f of walk(repoPath("src"))) {
    const s = fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    if (/(^|[^.\w])eval\s*\(|new Function\s*\(|set(?:Timeout|Interval)\(\s*["'`]/.test(s)) comEval.push(f);
    if (/new Application\s*\(/.test(s) && /from "pixi\.js"/.test(s) && !/import "pixi\.js\/unsafe-eval";/.test(s)) pixiSemPolyfill.push(f);
  }
  assert.deepEqual(comEval, []);
  assert.deepEqual(pixiSemPolyfill, []);
});
