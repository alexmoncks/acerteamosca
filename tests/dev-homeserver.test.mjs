// Ambiente de dev do homeserver (scripts/dev-homeserver.sh).
//
// O front da prévia fala com o WebSocket em ws://<host>:<porta>
// (definidos no .env.local, fora do repo). A CSP só acrescenta origens ws:// (sem TLS) que estejam nos
// NEXT_PUBLIC_WS_*; em produção eles são wss:// e a CSP tem que ficar igual.
import assert from "node:assert/strict";
import { check, source, loadModule } from "./helpers.mjs";

const WS_VARS = [
  "NEXT_PUBLIC_WS_URL",
  "NEXT_PUBLIC_WS_SHIPS_URL",
  "NEXT_PUBLIC_WS_MEMORY_URL",
  "NEXT_PUBLIC_WS_2048_URL",
  "NEXT_PUBLIC_WS_BATALHA_URL",
];

const csp = await loadModule("src/lib/csp.js");

// connect-src da CSP montada como o middleware monta (src/middleware.js):
// as origens vêm dos NEXT_PUBLIC_WS_*, nesta ordem.
function connectSrc(env) {
  const origens = csp.wsDevOrigins(WS_VARS.map((k) => env[k]));
  const d = csp.parseCsp(csp.buildCsp({ nonce: csp.generateNonce(), wsOrigins: origens }));
  return ["connect-src", ...d["connect-src"]].join(" ");
}

check("production CSP connect-src is unchanged with wss:// WebSocket URLs", () => {
  const env = Object.fromEntries(WS_VARS.map((k) => [k, "wss://ws.acerteamosca.com.br/pong"]));
  assert.equal(connectSrc(env), "connect-src 'self' https: wss:");
});

check("CSP connect-src is unchanged when no WebSocket URL is configured", () => {
  assert.equal(connectSrc({}), "connect-src 'self' https: wss:");
});

check("dev ws:// WebSocket origin is allowed once in connect-src", () => {
  const env = {
    NEXT_PUBLIC_WS_URL: "ws://127.0.0.1:3002/pong",
    NEXT_PUBLIC_WS_SHIPS_URL: "ws://127.0.0.1:3002/ships",
    NEXT_PUBLIC_WS_BATALHA_URL: "lixo que não é URL",
  };
  assert.equal(connectSrc(env), "connect-src 'self' https: wss: ws://127.0.0.1:3002");
});

check("the middleware builds connect-src from every NEXT_PUBLIC_WS_* (inlined at build time)", () => {
  const mw = source("src/middleware.js");
  for (const k of WS_VARS) assert.ok(mw.includes(`process.env.${k},`), `middleware sem ${k}`);
  assert.match(mw, /buildCsp\(\{ nonce, wsOrigins: WS_ORIGINS \}\)/);
});

check("ws-unified binds to WS_HOST only when it is set (Railway keeps all interfaces)", () => {
  const src = source("server/ws-unified.js");
  assert.ok(/const HOST = process\.env\.WS_HOST \|\| undefined;/.test(src));
  assert.ok(!/process\.env\.HOST\b/.test(src), "HOST genérico da plataforma não pode mudar o bind");
  assert.ok(/server\.listen\(PORT, HOST,/.test(src));
});

check("dev-homeserver.sh calls tmux only with a clean environment (no secret in tmux global env)", () => {
  const sh = source("scripts/dev-homeserver.sh");
  // junta continuações de linha e ignora comentários e textos entre aspas
  const codigo = sh
    .replace(/\\\n/g, " ")
    .split("\n")
    .filter((l) => !/^\s*#/.test(l))
    .map((l) => l.replace(/"[^"]*"/g, '""'))
    .join("\n");
  assert.ok(/env -i [^\n]*tmux ""/.test(codigo), "o wrapper tmuxl precisa de env -i");
  const diretos = codigo.split("\n").filter((l) => /(^|[\s;(])tmux\s/.test(l) && !/env -i/.test(l));
  assert.deepEqual(diretos, [], "chamada de tmux fora do wrapper tmuxl");
});

check("dev-homeserver.sh never prints the database password and keeps secrets 600", () => {
  const sh = source("scripts/dev-homeserver.sh");
  assert.ok(/openssl rand/.test(sh), "a senha tem que ser gerada com openssl");
  assert.ok(/chmod 600 \.env\b/.test(sh) && /chmod 600 \.env\.local/.test(sh));
  assert.ok(/umask 077/.test(sh));
  assert.ok(!/echo[^\n]*\$\{?senha/.test(sh), "o script ecoa a senha");
  assert.ok(!/echo[^\n]*\$\{?DATABASE_URL/.test(sh), "o script ecoa o DATABASE_URL");
  assert.ok(/127\.0\.0\.1:\$\{AAM_DB_PORT\}:5432/.test(sh), "o banco tem que ficar só em 127.0.0.1");
  assert.ok(/--restart unless-stopped/.test(sh));
});

check("dev-homeserver.sh and its doc keep the private IP and real ports out of the repo", () => {
  const sh = source("scripts/dev-homeserver.sh");
  const doc = source("docs/dev-homeserver.md");
  // Faixa CGNAT 100.64.0.0/10 (Tailscale) e IPs privados não podem aparecer.
  const privado = /\b(?:100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])|10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/;
  assert.ok(!privado.test(sh), "IP de rede privada no script");
  assert.ok(!privado.test(doc), "IP de rede privada no doc");
  // Padrões neutros, sobrescritos pelo ambiente na 1ª execução.
  assert.match(sh, /AAM_DEV_HOST_PADRAO="\$\{AAM_DEV_HOST:-127\.0\.0\.1\}"/);
  for (const v of ["AAM_APP_PORT", "AAM_EN_PORT", "AAM_WS_PORT", "AAM_DB_PORT"]) {
    assert.match(sh, new RegExp(`${v}_PADRAO="\\$\\{${v}:-\\d+\\}"`), `${v} sem padrão vindo do ambiente`);
  }
});
