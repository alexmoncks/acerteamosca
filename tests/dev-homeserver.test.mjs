// Ambiente de dev do homeserver (scripts/dev-homeserver.sh).
//
// O front da prévia fala com o WebSocket em ws://127.0.0.1:PORTA pela
// Tailscale. A CSP só acrescenta origens ws:// (sem TLS) que estejam nos
// NEXT_PUBLIC_WS_*; em produção eles são wss:// e a CSP tem que ficar igual.
import assert from "node:assert/strict";
import { check, source } from "./helpers.mjs";

const WS_VARS = [
  "NEXT_PUBLIC_WS_URL",
  "NEXT_PUBLIC_WS_SHIPS_URL",
  "NEXT_PUBLIC_WS_MEMORY_URL",
  "NEXT_PUBLIC_WS_2048_URL",
  "NEXT_PUBLIC_WS_BATALHA_URL",
];

// Reavalia o trecho de next.config.js que monta as origens com o ambiente
// pedido, sem carregar o plugin do next-intl.
function connectSrc(env) {
  const salvo = {};
  for (const k of WS_VARS) {
    salvo[k] = process.env[k];
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  }
  const src = source("next.config.js");
  const trecho = src.slice(src.indexOf("const WS_DEV_ORIGINS"), src.indexOf("const CONTENT_SECURITY_POLICY"));
  const origens = new Function(`${trecho}; return WS_DEV_ORIGINS;`)();
  for (const k of WS_VARS) {
    if (salvo[k] === undefined) delete process.env[k];
    else process.env[k] = salvo[k];
  }
  return ["connect-src 'self' https: wss:", ...origens].join(" ");
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

check("next.config.js builds connect-src from WS_DEV_ORIGINS", () => {
  assert.ok(/\["connect-src 'self' https: wss:", \.\.\.WS_DEV_ORIGINS\]/.test(source("next.config.js")));
});

check("ws-unified listens on HOST only when HOST is set (Railway keeps all interfaces)", () => {
  const src = source("server/ws-unified.js");
  assert.ok(/const HOST = process\.env\.HOST \|\| undefined;/.test(src));
  assert.ok(/server\.listen\(PORT, HOST,/.test(src));
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
