// Runs every *.test.mjs in this directory and exits non-zero on failure.
import fs from "node:fs";
import path from "node:path";
import { report } from "./helpers.mjs";

const dir = import.meta.dirname;
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".test.mjs")).sort();

for (const f of files) {
  console.log(`\n=== ${f} ===`);
  await import(path.join(dir, f));
}

const { failures, passes } = report();
console.log(`\n${passes} passed, ${failures} failed`);

// Clean up the .mjs copies loadModule() leaves behind.
for (const f of fs.readdirSync(dir).filter((f) => f.startsWith(".tmp-"))) {
  fs.unlinkSync(path.join(dir, f));
}

process.exit(failures === 0 ? 0 : 1);
