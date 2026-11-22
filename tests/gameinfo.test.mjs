// Texto editorial das páginas de jogo (GameInfo) aberto e no HTML do servidor.
//
// O AdSense marcou o nailedthefly.com com "Conteúdo de baixo valor"
// (27/05/2026). A auditoria de 21/11/2026 achou o texto de cada jogo dentro
// de <details> recolhidos: o revisor via só o canvas. Estes testes garantem
// que o texto volta a ficar visível, sem clique e sem JavaScript.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { check, source, repoPath } from "./helpers.mjs";

const GAMEINFO = "src/components/GameInfo.jsx";

check("GameInfo renders every section open (no <details>/<summary>)", () => {
  const src = source(GAMEINFO);
  const codigo = src.replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/<details\b/.test(codigo), "GameInfo voltou a recolher o texto em <details>");
  assert.ok(!/<summary\b/.test(codigo), "GameInfo voltou a usar <summary>");
  assert.ok(/<h3\b[^>]*>\s*\{d\.summary\}/.test(codigo), "cada seção precisa de um título <h3>");
  assert.ok(/d\.body\.map/.test(codigo), "os parágrafos de cada seção precisam ser renderizados");
});

check("GameInfo is a server component (text goes out in the server HTML)", () => {
  const src = source(GAMEINFO);
  assert.ok(!/^\s*["']use client["']/m.test(src), "GameInfo virou componente de cliente");
});

check("no CSS hides GameInfo text (display:none / opacity 0 / height 0)", () => {
  const src = source(GAMEINFO);
  assert.ok(!/display:\s*["']none["']/.test(src));
  assert.ok(!/opacity:\s*0\b/.test(src));
  assert.ok(!/(max)?[hH]eight:\s*0\b/.test(src));
});

check("every indexable game page renders GameInfo from its server page.js", () => {
  const dir = repoPath("src/app/[locale]/jogos");
  const semTexto = [];
  for (const slug of fs.readdirSync(dir)) {
    const rel = path.join("src/app/[locale]/jogos", slug, "page.js");
    if (!fs.existsSync(repoPath(rel))) continue;
    const page = source(rel);
    if (!/<GameInfo\s+content=\{content\}\s+locale=\{locale\}\s*\/>/.test(page)) semTexto.push(slug);
    if (/^\s*["']use client["']/m.test(page)) semTexto.push(`${slug} (page.js é client)`);
  }
  assert.deepEqual(semTexto, []);
});
