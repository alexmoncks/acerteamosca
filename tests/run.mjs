// Runs every *.test.mjs in this directory and exits non-zero on failure.
import fs from "node:fs";
import path from "node:path";
import { report } from "./helpers.mjs";

const dir = import.meta.dirname;
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".test.mjs")).sort();

// A test file that throws at import time (a failing loadModule(), any
// top-level statement outside check()) must not crash the whole run: it
// would skip every alphabetically-later suite and leave the .tmp-* cleanup
// unrun. Count it as a failure and move on to the next file instead.
let importFailures = 0;

for (const f of files) {
  console.log(`\n=== ${f} ===`);
  try {
    await import(path.join(dir, f));
  } catch (err) {
    importFailures++;
    console.log(`  FAIL  ${f} (failed to load)\n        ${err.stack || err.message}`);
  }
}

const { failures, passes } = report();
const totalFailures = failures + importFailures;
console.log(`\n${passes} passed, ${totalFailures} failed`);

// Clean up the .mjs copies loadModule() leaves behind.
for (const f of fs.readdirSync(dir).filter((f) => f.startsWith(".tmp-"))) {
  fs.unlinkSync(path.join(dir, f));
}

process.exit(totalFailures === 0 ? 0 : 1);
