// JSON-LD serializado sem quebrar o <script>.
//
// Code Review do lote 1: JSON.stringify não escapa "<", então um texto com
// "</script>" fecharia a tag do JSON-LD. Toda saída de JSON-LD passa por
// src/lib/json-ld.js.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { check, source, repoPath, loadModule } from "./helpers.mjs";

const { jsonLdHtml } = await loadModule("src/lib/json-ld.js");

check("jsonLdHtml escapes <, >, & and line separators and stays valid JSON", () => {
  const dado = { name: "</script><script>alert(1)</script>", d: "a & b > c", ls: "x\u2028y\u2029z", n: 1 };
  const out = jsonLdHtml(dado);
  assert.ok(!/[<>&\u2028\u2029]/.test(out), out);
  assert.ok(out.includes("\\u003c/script\\u003e"));
  assert.deepEqual(JSON.parse(out), dado);
});

check("every application/ld+json script uses jsonLdHtml, never JSON.stringify", () => {
  const ofensores = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.(js|jsx)$/.test(e.name)) {
        const src = fs.readFileSync(full, "utf8");
        if (/__html:\s*JSON\.stringify\(/.test(src)) ofensores.push(full);
      }
    }
  };
  walk(repoPath("src"));
  assert.deepEqual(ofensores, []);
  assert.match(source("src/app/[locale]/layout.js"), /__html: jsonLdHtml\(/);
  assert.match(source("src/app/[locale]/HomeClient.jsx"), /__html: jsonLdHtml\(webPageLd\)/);
});
