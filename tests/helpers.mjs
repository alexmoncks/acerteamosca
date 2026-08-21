// Minimal test helpers — no framework, just node:assert and a counter.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const ROOT = path.resolve(import.meta.dirname, "..");
let failures = 0;
let passes = 0;

export function check(name, fn) {
  try {
    const r = fn();
    // Um teste que devolve promessa não é esperado por ninguém aqui: suas
    // asserções escapariam e ele "passaria" sem ter conferido nada. Falhar
    // alto é melhor do que um PASS mentiroso.
    if (r && typeof r.then === "function") {
      r.catch(() => {});
      throw new Error("o corpo do teste é assíncrono; check() é síncrono");
    }
    passes++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failures++;
    console.log(`  FAIL  ${name}\n        ${err.message}`);
  }
}

export function near(a, b, eps = 1e-9) {
  assert.ok(Math.abs(a - b) <= eps, `expected ~${b}, got ${a}`);
}

export function report() {
  return { failures, passes };
}

/** Read a source file from the repo as text. */
export function source(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

export function repoPath(relPath) {
  return path.join(ROOT, relPath);
}

/**
 * Import a repo module as ESM. package.json has no "type": "module", so a
 * plain .js file is treated as CommonJS and cannot be imported directly —
 * copy it next to the tests with an .mjs extension first.
 */
export async function loadModule(relPath) {
  const src = repoPath(relPath);
  const tmp = path.join(import.meta.dirname, ".tmp-" + path.basename(relPath) + ".mjs");
  fs.copyFileSync(src, tmp);
  return import(`${tmp}?v=${fs.statSync(src).mtimeMs}`);
}
