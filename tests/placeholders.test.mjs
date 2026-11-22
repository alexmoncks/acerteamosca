// Placeholders e promessas de prêmio.
//
// A auditoria AdSense de 21/11/2026 achou no ar, no jogo principal, "GANHE
// PRÊMIOS", um cupom de 20% na "Loja XYZ" e uma faixa "PATROCINADO POR — SUA
// MARCA AQUI"; e no 3Invader uma tela de "patrocinador" sem patrocinador, cujo
// botão CONTINUAR injetava o popunder do Adsterra. Promessa de prêmio que não
// existe e cara de site em construção pesam contra na revisão manual.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { check, source, repoPath } from "./helpers.mjs";

const PROIBIDOS = [
  /GANHE PR[EÊ]MIOS/i,
  /WIN PRIZES/i,
  /Loja XYZ/i,
  /XYZ Store/i,
  /SUA MARCA AQUI/i,
  /YOUR BRAND HERE/i,
  /Cupom de \d+%/i,
  /discount coupon/i,
  /Nosso patrocinador/i,
  /Our sponsor keeps/i,
];

function arquivos(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...arquivos(full));
    else if (/\.(js|jsx|json)$/.test(e.name)) out.push(full);
  }
  return out;
}

check("no placeholder or fake prize copy anywhere in src/", () => {
  const achados = [];
  for (const f of arquivos(repoPath("src"))) {
    const rel = path.relative(repoPath("."), f);
    const txt = source(rel);
    for (const re of PROIBIDOS) if (re.test(txt)) achados.push(`${rel}: ${re}`);
  }
  assert.deepEqual(achados, []);
});

check("3Invader starts without a sponsor gate and never injects third-party ads", () => {
  const src = source("src/components/games/ThreeInvader.jsx");
  assert.ok(!/screen === "sponsor"/.test(src), "a tela de patrocinador voltou");
  const codigo = src.replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/adsConfig|adsterra/i.test(codigo), "o 3Invader voltou a falar com o Adsterra");
  assert.ok(!/createElement\("script"\)/.test(src), "o 3Invader injeta script de terceiros");
});

check("both languages keep the same keys for the Acerte a Mosca game", () => {
  const pt = JSON.parse(source("src/messages/pt.json")).games.acerteamosca;
  const en = JSON.parse(source("src/messages/en.json")).games.acerteamosca;
  assert.deepEqual(Object.keys(pt).sort(), Object.keys(en).sort());
  assert.ok(pt.winMessage && en.winMessage, "a mensagem de vitória sumiu");
});

check("no dead Adsterra code is left in src/ (only comments may mention it)", () => {
  for (const f of [
    "src/config/ads.js",
    "src/components/AdsTerraBanner.jsx",
    "src/components/AdsTerraPopunder.jsx",
    "src/components/AdsTerraSocialBar.jsx",
  ]) {
    assert.ok(!fs.existsSync(repoPath(f)), `${f} voltou`);
  }
  const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "");
  const ofensores = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.(js|jsx|css|json)$/.test(e.name)) {
        const codigo = semComentarios(fs.readFileSync(full, "utf8"));
        if (/adsterra|adsConfig|profitablecpmratenetwork|highperformanceformat|turnstilesocially/i.test(codigo)) ofensores.push(full);
      }
    }
  };
  walk(repoPath("src"));
  assert.deepEqual(ofensores, []);
});
