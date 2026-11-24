// Tiro ao Alvo: o botão de mudo precisa de nome acessível (PT/EN) e estado.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { check, source } from "./helpers.mjs";

check("Tiro ao Alvo: o botão de mudo tem aria-label fixo e aria-pressed", () => {
  const src = source("src/components/games/TiroAoAlvo.jsx");
  assert.match(src, /aria-label=\{t\("muteLabel"\)\}/);
  assert.match(src, /aria-pressed=\{muted\}/);
  assert.doesNotMatch(src, /aria-label=\{muted \? t\("unmuteLabel"\)/);
});

check("Tiro ao Alvo: rótulo fixo de mudo em PT e EN", () => {
  const pt = JSON.parse(readFileSync("src/messages/pt.json", "utf8"));
  const en = JSON.parse(readFileSync("src/messages/en.json", "utf8"));
  assert.equal(pt.games.tiroaoalvo.muteLabel, "Silenciar");
  assert.equal(en.games.tiroaoalvo.muteLabel, "Mute");
});
