// Tiro ao Alvo: o AudioContext fecha no unmount, para a música não continua
// depois que a pessoa sai da página.
import assert from "node:assert/strict";
import { check, source } from "./helpers.mjs";

check("Tiro ao Alvo: SkeetAudio fecha o AudioContext com close() protegido", () => {
  const src = source("src/components/games/TiroAoAlvo.jsx");
  assert.match(src, /close\(\)\s*\{[\s\S]*?this\.stopMusic\(\);[\s\S]*?ctx\.close\(\)/);
  assert.match(src, /ret\.catch\(\(\) => \{\}\)/);
});

check("Tiro ao Alvo: o unmount chama close() (não só stopMusic)", () => {
  const src = source("src/components/games/TiroAoAlvo.jsx");
  assert.match(src, /useEffect\(\(\) => \{\s*return \(\) => \{\s*if \(rafRef\.current\) cancelAnimationFrame\(rafRef\.current\);\s*audioRef\.current\?\.close\(\);/);
});
