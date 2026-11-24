// Tiro ao Alvo: o botão de mudo precisa de nome acessível (PT/EN) e estado.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { check, source } from "./helpers.mjs";

check("Tiro ao Alvo: o botão de mudo tem aria-label descritivo e aria-pressed", () => {
  const src = source("src/components/games/TiroAoAlvo.jsx");
  assert.match(src, /aria-label=\{muted \? t\("unmuteLabel"\) : t\("muteLabel"\)\}/);
  assert.match(src, /aria-pressed=\{muted\}/);
});

check("Tiro ao Alvo: rótulos de mudo em PT e EN", () => {
  const pt = JSON.parse(readFileSync("src/messages/pt.json", "utf8"));
  const en = JSON.parse(readFileSync("src/messages/en.json", "utf8"));
  assert.equal(pt.games.tiroaoalvo.muteLabel, "Silenciar");
  assert.equal(pt.games.tiroaoalvo.unmuteLabel, "Ativar som");
  assert.equal(en.games.tiroaoalvo.muteLabel, "Mute");
  assert.equal(en.games.tiroaoalvo.unmuteLabel, "Unmute");
});
