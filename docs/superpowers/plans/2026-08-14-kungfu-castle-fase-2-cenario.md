# Fase 2 do Kung Fu Castle — Cenário por Fase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar a fase 2 (Portão do Castelo) jogável — cenário próprio reconstruído na troca de fase, pool de inimigos `guarda-bastao`/`ninja`/`kunoichi`, e o Guardião do Portão presente com o comportamento genérico de chefe já existente.

**Architecture:** O cenário sai de dentro do `buildScene()` e vira dado declarativo num módulo puro (`kungfu-scenery.js`). Quatro contêineres persistentes em índices fixos guardam o cenário dentro das camadas existentes, de modo que a troca de fase esvazie apenas os filhos deles — nunca as camadas, que também guardam o sprite do jogador e as partículas.

**Tech Stack:** Next.js 14, PixiJS v8, JavaScript puro (sem TypeScript), sharp para inspeção de sprites, Node 22 com `node:assert` para testes.

**Spec:** `docs/superpowers/specs/2026-08-14-kungfu-castle-fase-2-design.md`

## Global Constraints

- Sem TypeScript. Os arquivos são `.js`/`.jsx` com JSDoc para tipos.
- Módulos `kungfu-*.js` que não sejam o `.jsx` **não importam PixiJS** e não tocam em estado do jogo. Só `kungfu-assets.js` importa `pixi.js`, e apenas para `Assets`, `Texture` e `Rectangle`.
- Todos os frames de sprite são quadrados. Jogador e inimigos usam 48px; chefes usam o `frameSize` declarado em `BOSS_STATS` (68px para os dois chefes existentes).
- **Toda arte de chefe é desenhada virada para OESTE**; jogador e inimigos comuns, para LESTE. Chefe novo exige `spriteFacing: -1` em `BOSS_STATS`.
- `dt` é o `ticker.deltaTime` do PixiJS: `1.0` equivale a um frame a 60fps. Qualquer conversão para segundos usa `dt / 60`.
- Nunca rodar `npm run build` com o servidor de desenvolvimento no ar: os dois compartilham `.next` e o build sobrescreve os chunks do dev, derrubando-o com `MODULE_NOT_FOUND`.
- Nunca usar `pkill -f` com padrão amplo — ele casa com a própria linha de comando do agente e mata a sessão. Para parar o dev server, descubra o PID pela porta (`ss -ltnp | grep 3100`) e mate a cadeia de pais.

---

### Task 1: Runner de testes durável

O projeto não tem runner. Os testes escritos na sessão de 2026-08-14 (facing dos chefes, regeneração de vida, timing de golpes, esquiva) vivem em diretório temporário e se perdem. Esta task cria o runner e traz esses testes para o repositório, para que o trabalho da fase 1 fique protegido contra regressão antes de mexermos no cenário.

**Files:**
- Create: `tests/run.mjs`
- Create: `tests/helpers.mjs`
- Create: `tests/facing.test.mjs`
- Create: `tests/regen.test.mjs`
- Create: `tests/tuning.test.mjs`
- Create: `tests/dodge.test.mjs`
- Modify: `package.json` (bloco `scripts`)

**Interfaces:**
- Consumes: nada
- Produces: `npm test`; `tests/helpers.mjs` exportando `check(name, fn)`, `near(a, b, eps)`, `report()`, `loadModule(relPath)`

- [ ] **Step 1: Escrever o helper de testes**

`tests/helpers.mjs`:

```js
// Minimal test helpers — no framework, just node:assert and a counter.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const ROOT = path.resolve(import.meta.dirname, "..");
let failures = 0;
let passes = 0;

export function check(name, fn) {
  try {
    fn();
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
```

- [ ] **Step 2: Escrever o runner**

`tests/run.mjs`:

```js
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
```

- [ ] **Step 3: Rodar o runner vazio para confirmar que ele funciona**

Run: `node tests/run.mjs`
Expected: `0 passed, 0 failed`, exit 0. Nenhum arquivo `*.test.mjs` existe ainda.

- [ ] **Step 4: Escrever o primeiro teste migrado — direção da arte dos chefes**

`tests/facing.test.mjs`. Este teste protege a correção mais sutil da fase 1: toda folha de chefe é desenhada virada para oeste, ao contrário de jogador e inimigos.

```js
import assert from "node:assert/strict";
import { check, source, loadModule } from "./helpers.mjs";

const { AnimController } = await loadModule("src/components/games/kungfu-anim.js");
const GAME = source("src/components/games/KungFuCastle.jsx");

const EAST = 1;
const WEST = -1;

function makeController(baseFacing) {
  const sprite = { scale: { x: 1, y: 1 }, texture: null };
  const anims = { idle: { frames: ["f0", "f1"], speed: 0.1, loop: true } };
  return { ctrl: new AnimController({ sprite, anims, baseFacing }), sprite };
}

/** Direction the character actually appears to look at on screen. */
const visualFacing = (sprite, art) => Math.sign(sprite.scale.x) * art;

check("east-drawn art looks west when told to face west", () => {
  const { ctrl, sprite } = makeController(EAST);
  ctrl.setFacing(WEST);
  assert.equal(visualFacing(sprite, EAST), WEST);
});

check("west-drawn art (bosses) looks west when told to face west", () => {
  const { ctrl, sprite } = makeController(WEST);
  ctrl.setFacing(WEST);
  assert.equal(visualFacing(sprite, WEST), WEST);
});

check("west-drawn art (bosses) looks east when told to face east", () => {
  const { ctrl, sprite } = makeController(WEST);
  ctrl.setFacing(EAST);
  assert.equal(visualFacing(sprite, WEST), EAST);
});

check("omitting baseFacing keeps the east-drawn default", () => {
  const sprite = { scale: { x: 1, y: 1 }, texture: null };
  const ctrl = new AnimController({
    sprite,
    anims: { idle: { frames: ["f0"], speed: 0.1, loop: true } },
  });
  ctrl.setFacing(WEST);
  assert.equal(visualFacing(sprite, EAST), WEST);
});

check("repeated setFacing calls do not accumulate scale", () => {
  const { ctrl, sprite } = makeController(WEST);
  ctrl.setFacing(WEST);
  ctrl.setFacing(WEST);
  ctrl.setFacing(EAST);
  ctrl.setFacing(WEST);
  assert.equal(Math.abs(sprite.scale.x), 1);
});

check("every boss in BOSS_STATS declares spriteFacing: -1", () => {
  const block = GAME.match(/const BOSS_STATS = \{[\s\S]*?\n\};/);
  assert.ok(block, "BOSS_STATS not found");
  const bosses = [...block[0].matchAll(/"([a-z-]+)":\s*\{/g)].map((m) => m[1]);
  assert.ok(bosses.length > 0, "no bosses parsed");
  for (const b of bosses) {
    const entry = block[0].match(new RegExp(`"${b}":\\s*\\{[\\s\\S]*?\\n  \\},`));
    assert.ok(entry, `entry for ${b} not found`);
    assert.match(entry[0], /spriteFacing:\s*-1/, `${b} must declare spriteFacing: -1`);
  }
});
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `node tests/run.mjs`
Expected: `=== facing.test.mjs ===` com 6 PASS, `6 passed, 0 failed`.

- [ ] **Step 6: Escrever o teste de regeneração**

`tests/regen.test.mjs`:

```js
import assert from "node:assert/strict";
import { check, near, source, loadModule } from "./helpers.mjs";

const { regenHp } = await loadModule("src/components/games/kungfu-combat.js");
const GAME = source("src/components/games/KungFuCastle.jsx");
const FPS = 60;

check("player: 0.5%/s of 100 max gains 0.5 HP in one second", () => {
  near(regenHp(50, 100, 0.5, FPS), 50.5);
});

check("boss: 2.5%/s of 25 max gains 0.625 HP in one second", () => {
  near(regenHp(10, 25, 2.5, FPS), 10.625);
});

check("60 ticks at dt=1 equals one tick at dt=60", () => {
  let hp = 20;
  for (let i = 0; i < FPS; i++) hp = regenHp(hp, 100, 0.5, 1);
  near(hp, regenHp(20, 100, 0.5, FPS), 1e-9);
});

check("never exceeds max", () => {
  assert.equal(regenHp(99.99, 100, 0.5, FPS), 100);
});

check("zero elapsed time changes nothing", () => {
  assert.equal(regenHp(37.5, 100, 0.5, 0), 37.5);
});

check("boss regen runs before the player-attack damage block", () => {
  const regen = GAME.search(/e\.hp\s*=\s*regenHp\(/);
  const damage = GAME.indexOf("if (player.attacking && inHitWindow)");
  assert.ok(regen > -1 && damage > -1, "expected both blocks present");
  assert.ok(regen < damage, "boss regen must run before damage, or a killing blow gets undone");
});

check("player regen runs after the death-sequence early return", () => {
  const dying = GAME.indexOf("if (player.dying) {");
  const regen = GAME.search(/player\.hp\s*=\s*regenHp\(/);
  assert.ok(regen > dying && dying > -1, "player regen must sit after the death-sequence return");
});
```

- [ ] **Step 7: Escrever o teste de timing de golpes e salto**

`tests/tuning.test.mjs`. O modelo de "qual frame está na tela" é validado contra o `AnimController` real antes de ser usado nas asserções de timing.

```js
import assert from "node:assert/strict";
import { check, near, source, loadModule } from "./helpers.mjs";

const { AnimController } = await loadModule("src/components/games/kungfu-anim.js");
const GAME = source("src/components/games/KungFuCastle.jsx");
const ASSETS = source("src/components/games/kungfu-assets.js");
const FPS = 60;

const animFrameAt = (speed, elapsed) => Math.floor(speed * elapsed);

for (const [speed, frames] of [[0.33, 6], [0.32, 7], [0.21, 9]]) {
  check(`animFrameAt matches AnimController at speed ${speed}`, () => {
    const sheet = Array.from({ length: frames }, (_, i) => `f${i}`);
    const sprite = { scale: { x: 1, y: 1 }, texture: null };
    const ctrl = new AnimController({ sprite, anims: { a: { frames: sheet, speed, loop: false } } });
    ctrl.forcePlay("a");
    for (let n = 1; n <= frames / speed; n++) {
      ctrl.update(1);
      assert.equal(sheet.indexOf(sprite.texture), Math.min(animFrameAt(speed, n), frames - 1));
    }
  });
}

function attack(name) {
  const m = GAME.match(new RegExp(`${name}:\\s*\\{([^}]*)\\}`));
  assert.ok(m, `ATTACKS.${name} not found`);
  const num = (k) => parseFloat(m[1].match(new RegExp(`${k}:\\s*(-?[\\d.]+)`))[1]);
  return { duration: num("duration"), hitStart: num("hitStart"), hitEnd: num("hitEnd") };
}

function animSpeed(name) {
  const m = ASSETS.match(new RegExp(`${name}:\\s*\\{[^}]*player/[^"]*"\\s*,\\s*speed:\\s*([\\d.]+)`));
  assert.ok(m, `player anim '${name}' speed not found`);
  return parseFloat(m[1]);
}

function framesDuringHitWindow(atkName, animName) {
  const a = attack(atkName);
  const speed = animSpeed(animName);
  const shown = new Set();
  for (let n = 1; n <= a.duration; n++) {
    const timer = a.duration - n;
    if (timer <= 0) break;
    if (timer <= a.hitStart && timer > a.hitEnd) shown.add(animFrameAt(speed, n));
  }
  return shown;
}

// punch.png has 6 frames and only extends the arm on index 5;
// kick.png has 7 frames and extends on indices 3-4.
check("punch damage lands while the arm is extended (frame 5)", () => {
  assert.ok(framesDuringHitWindow("punch", "punch").has(5));
});

check("punch deals no damage during the wind-up (frames 0-3)", () => {
  const shown = framesDuringHitWindow("punch", "punch");
  for (const f of [0, 1, 2, 3]) assert.ok(!shown.has(f), `hit window covers wind-up frame ${f}`);
});

check("kick damage lands on its extension frames (3-4)", () => {
  const shown = framesDuringHitWindow("kick", "kick");
  assert.ok(shown.has(3) || shown.has(4));
});

const konst = (n) => parseFloat(GAME.match(new RegExp(`const ${n}\\s*=\\s*(-?[\\d.]+)`))[1]);

// The game integrates with Euler: vy += GRAVITY; y += vy. Simulate that, not
// the closed form, so the assertion matches what actually runs.
function simulateJump(force, gravity) {
  let y = 0, vy = force, peak = 0, frames = 0;
  for (let i = 0; i < 600; i++) {
    vy += gravity;
    y += vy;
    frames++;
    if (y >= 0) break;
    peak = Math.min(peak, y);
  }
  return { height: -peak, airtimeFrames: frames };
}

check("jump peaks at ~60px", () => {
  near(simulateJump(konst("JUMP_FORCE"), konst("GRAVITY")).height, 60, 4);
});

check("jump airtime is ~0.70s", () => {
  near(simulateJump(konst("JUMP_FORCE"), konst("GRAVITY")).airtimeFrames / FPS, 0.70, 0.05);
});

check("jump animation spans the airtime", () => {
  const { airtimeFrames } = simulateJump(konst("JUMP_FORCE"), konst("GRAVITY"));
  near(9 / animSpeed("jump"), airtimeFrames, 6);
});

check("flying kick keeps its ~30px arc", () => {
  const mult = parseFloat(GAME.match(/player\.vy\s*=\s*JUMP_FORCE\s*\*\s*([\d.]+)/)[1]);
  const v = Math.abs(konst("JUMP_FORCE")) * mult;
  near((v * v) / (2 * konst("GRAVITY")), 30, 4);
});

check("crouch is not force-restarted on every held frame", () => {
  const block = GAME.match(/\/\/ CROUCH[\s\S]{0,400}?\n  \}/);
  assert.ok(block, "crouch block not found");
  assert.match(block[0], /if \(!player\.crouching\)[\s\S]*?forcePlay\("crouch"\)/);
});

check("the idle/walk block does not override a held crouch", () => {
  assert.match(GAME, /if \(!player\.attacking && !player\.crouching\) \{/);
});
```

- [ ] **Step 8: Escrever o teste da esquiva**

`tests/dodge.test.mjs`:

```js
import assert from "node:assert/strict";
import { check, near, source, repoPath } from "./helpers.mjs";
import fs from "node:fs";

const GAME = source("src/components/games/KungFuCastle.jsx");
const ASSETS = source("src/components/games/kungfu-assets.js");
const konst = (n) => parseFloat(GAME.match(new RegExp(`const ${n}\\s*=\\s*(-?[\\d.]+)`))[1]);

check("backflip.png exists", () => {
  assert.ok(fs.existsSync(repoPath("public/images/kungfucastle/player/backflip.png")));
});

check("backflip is registered as a player animation", () => {
  assert.match(ASSETS, /backflip:\s*\{[^}]*player\/backflip\.png/);
});

check("the animation spans the whole dodge", () => {
  const speed = parseFloat(ASSETS.match(/backflip:\s*\{[^}]*speed:\s*([\d.]+)/)[1]);
  near(10 / speed, konst("DODGE_DURATION"), 2);
});

check("dodge lasts 28 frames and cools down for 40", () => {
  assert.equal(konst("DODGE_DURATION"), 28);
  assert.equal(konst("DODGE_COOLDOWN"), 40);
});

check("dodge clears the enemy's 23px combat range", () => {
  assert.ok(konst("DODGE_SPEED") * konst("DODGE_DURATION") > 23 * 1.8);
});

check("the double-tap compares the facing stored when the timer was armed", () => {
  assert.match(GAME, /tapFacing\.left\s*===\s*1/);
  assert.match(GAME, /tapFacing\.right\s*===\s*-1/);
});

check("same-direction double-tap still starts a run", () => {
  assert.match(GAME, /player\.running\s*=\s*player\.tapTimer\.left\s*>\s*0/);
});

check("the dodge reuses the attack lock, so input is blocked and damage is nil", () => {
  const fn = GAME.match(/function startDodge[\s\S]*?\n\}/);
  assert.ok(fn, "startDodge not found");
  assert.match(fn[0], /player\.attacking\s*=\s*true/);
  assert.match(fn[0], /player\.attackType\s*=\s*null/);
  assert.match(fn[0], /player\.facing\s*=\s*originalFacing/);
});

check("enemy damage stays gated on !player.attacking", () => {
  assert.match(GAME, /if \(!player\.attacking\) \{\n\s*player\.hp -= e\.damage/);
});

check("a dodge cannot start while airborne, busy, or on cooldown", () => {
  const fn = GAME.match(/function canDodge[\s\S]*?\n\}/);
  assert.ok(fn, "canDodge not found");
  for (const g of ["grounded", "attacking", "dodging", "dodgeCooldown"]) {
    assert.match(fn[0], new RegExp(g), `canDodge must check ${g}`);
  }
});
```

- [ ] **Step 9: Adicionar o script npm**

Em `package.json`, dentro de `"scripts"`, logo após `"start": "next start",`:

```json
    "test": "node tests/run.mjs",
```

- [ ] **Step 10: Rodar a suíte inteira**

Run: `npm test`
Expected: quatro blocos `=== *.test.mjs ===`, todos PASS, `0 failed`, exit 0.

- [ ] **Step 11: Commit**

```bash
git add tests/ package.json
git commit -m "test: add node test runner and cover phase 1 fixes"
```

---

### Task 2: Módulo de dados de cenário

**Files:**
- Create: `src/components/games/kungfu-scenery.js`
- Create: `tests/scenery.test.mjs`

**Interfaces:**
- Consumes: nada
- Produces:
  - `PHASE_SCENERY` — objeto `{ [phase: number]: PhaseScenery }`
  - `sceneryAssetPaths()` — retorna `string[]` com todos os caminhos públicos citados por qualquer fase, sem duplicatas
  - `PhaseScenery` = `{ levelWidth: number, sky: SkySpec, bg: Band[], mid: Band[], tileset: string, props: Prop[] }`
  - `SkySpec` = `{ type: "starfield", color: number, stars: number }` ou `{ type: "gradient", from: number, to: number }`
  - `Band` = `{ asset: string, parallax: number, tile?: boolean, every?: number, x?: number, scale?: number, alpha?: number, y?: "horizon" | "ground-overlap" | number }`
  - `Prop` = `{ asset: string, x: number, y: number, layer: "bg" | "game" | "fg" }`

- [ ] **Step 1: Escrever o teste que falha**

`tests/scenery.test.mjs`:

```js
import assert from "node:assert/strict";
import fs from "node:fs";
import { check, source, repoPath, loadModule } from "./helpers.mjs";

const { PHASE_SCENERY, sceneryAssetPaths } = await loadModule(
  "src/components/games/kungfu-scenery.js",
);
const GAME = source("src/components/games/KungFuCastle.jsx");

check("every phase in PHASE_CONFIG has scenery", () => {
  const block = GAME.match(/const PHASE_CONFIG = \{[\s\S]*?\n\};/);
  assert.ok(block, "PHASE_CONFIG not found");
  const phases = [...block[0].matchAll(/^\s{2}(\d+):\s*\{/gm)].map((m) => Number(m[1]));
  assert.ok(phases.length > 0, "no phases parsed");
  for (const p of phases) {
    assert.ok(PHASE_SCENERY[p], `phase ${p} has no PHASE_SCENERY entry`);
  }
});

check("every asset referenced by any phase exists on disk", () => {
  for (const path of sceneryAssetPaths()) {
    assert.ok(fs.existsSync(repoPath("public" + path)), `missing asset: ${path}`);
  }
});

check("sceneryAssetPaths returns no duplicates", () => {
  const paths = sceneryAssetPaths();
  assert.equal(paths.length, new Set(paths).size);
});

check("each phase declares a positive levelWidth", () => {
  for (const [phase, s] of Object.entries(PHASE_SCENERY)) {
    assert.ok(s.levelWidth > 0, `phase ${phase} has no levelWidth`);
  }
});

check("every prop layer is a known layer name", () => {
  for (const [phase, s] of Object.entries(PHASE_SCENERY)) {
    for (const p of s.props) {
      assert.ok(["bg", "game", "fg"].includes(p.layer),
        `phase ${phase}: prop ${p.asset} has unknown layer "${p.layer}"`);
    }
  }
});

check("every band declares a parallax factor between 0 and 1", () => {
  for (const [phase, s] of Object.entries(PHASE_SCENERY)) {
    for (const b of [...s.bg, ...s.mid]) {
      assert.ok(b.parallax >= 0 && b.parallax <= 1,
        `phase ${phase}: band ${b.asset} parallax ${b.parallax} out of range`);
    }
  }
});

check("phase 1 keeps its current layout: 2400px, starfield, 16 props", () => {
  const s = PHASE_SCENERY[1];
  assert.equal(s.levelWidth, 2400);
  assert.equal(s.sky.type, "starfield");
  assert.equal(s.tileset, "fase1-jardim");
  assert.equal(s.props.length, 16); // matches the current PROP_LAYOUT exactly
});

check("phase 2 uses the castle-gate tileset and a gradient sky", () => {
  const s = PHASE_SCENERY[2];
  assert.equal(s.tileset, "fase2-portao-chao");
  assert.equal(s.sky.type, "gradient");
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npm test`
Expected: FAIL — `ENOENT` ao copiar `src/components/games/kungfu-scenery.js`, que ainda não existe.

- [ ] **Step 3: Escrever o módulo**

`src/components/games/kungfu-scenery.js`. Os 11 props da fase 1 são exatamente o `PROP_LAYOUT` que hoje está em `KungFuCastle.jsx:189-208` — copie os valores sem alterar nenhum, para que a fase 1 continue idêntica.

```js
// kungfu-scenery.js — declarative scenery description, one entry per phase.
// No PixiJS, no game state: values in, values out.

/**
 * @typedef {{ type: "starfield", color: number, stars: number }
 *          |{ type: "gradient", from: number, to: number }} SkySpec
 * @typedef {{ asset: string, parallax: number, tile?: boolean, every?: number,
 *             x?: number, scale?: number, alpha?: number,
 *             y?: "horizon" | "ground-overlap" | number }} Band
 * @typedef {{ asset: string, x: number, y: number, layer: "bg"|"game"|"fg" }} Prop
 */

export const PHASE_SCENERY = {
  1: {
    levelWidth: 2400,
    sky: { type: "starfield", color: 0x06061a, stars: 200 },
    bg: [
      { asset: "parallax-montanhas", tile: true, scale: 2.2, alpha: 0.6, y: "horizon", parallax: 0.15 },
    ],
    mid: [
      { asset: "parallax-arvores", tile: true, y: "ground-overlap", parallax: 0.5 },
    ],
    tileset: "fase1-jardim",
    props: [
      { asset: "torii-vermelho",       x: 60,   y: 10, layer: "game" },
      { asset: "cerejeira-sakura",     x: 200,  y: 5,  layer: "bg" },
      { asset: "lanterna-ishidoro",    x: 350,  y: 4,  layer: "fg" },
      { asset: "pedra-decorativa",     x: 500,  y: 1,  layer: "game" },
      { asset: "cerejeira-sakura",     x: 700,  y: 5,  layer: "bg" },
      { asset: "komainu",              x: 850,  y: 2,  layer: "game" },
      { asset: "cerca-bambu",          x: 1000, y: 4,  layer: "fg" },
      { asset: "lanterna-ishidoro",    x: 1150, y: 4,  layer: "fg" },
      { asset: "cerejeira-sakura",     x: 1350, y: 8,  layer: "fg" },
      { asset: "pedra-decorativa",     x: 1500, y: 1,  layer: "game" },
      { asset: "komainu",              x: 1650, y: 4,  layer: "fg" },
      { asset: "lanterna-ishidoro",    x: 1800, y: 2,  layer: "game" },
      { asset: "cerejeira-sakura",     x: 1950, y: 5,  layer: "bg" },
      { asset: "cerca-bambu",          x: 2100, y: 6,  layer: "fg" },
      { asset: "portao-arco-pedra",    x: 2300, y: 4,  layer: "game" },
      { asset: "escada-pedra-externa", x: 2370, y: 10, layer: "game" },
    ],
  },

  2: {
    levelWidth: 2600,
    // Twilight: warm orange at the horizon darkening to deep violet overhead.
    sky: { type: "gradient", from: 0x2a1b3d, to: 0xd97706 },
    bg: [
      { asset: "fase2-parallax-castelo", every: 520, alpha: 0.75, y: "horizon", parallax: 0.15 },
    ],
    mid: [
      { asset: "fase2-parallax-muralha", tile: true, y: "ground-overlap", parallax: 0.5 },
      { asset: "ponte-madeira", x: 900, scale: 2, y: "ground-overlap", parallax: 0.5 },
    ],
    tileset: "fase2-portao-chao",
    props: [
      { asset: "portao-madeira",         x: 60,   y: 0, layer: "game" },
      { asset: "tocha-fogo",             x: 180,  y: 2, layer: "fg" },
      { asset: "estandarte",             x: 240,  y: 6, layer: "fg" },
      { asset: "komainu",                x: 340,  y: 2, layer: "game" },
      { asset: "braseiro-fogo",          x: 420,  y: 1, layer: "game" },
      { asset: "pilar-ornamentado",      x: 520,  y: 0, layer: "game" },
      { asset: "tocha-fogo",             x: 620,  y: 2, layer: "fg" },
      { asset: "estandarte",             x: 780,  y: 6, layer: "fg" },
      { asset: "tocha-fogo",             x: 1180, y: 2, layer: "fg" },
      { asset: "braseiro-fogo",          x: 1360, y: 1, layer: "game" },
      { asset: "estandarte",             x: 1500, y: 6, layer: "fg" },
      { asset: "pilar-ornamentado",      x: 1600, y: 0, layer: "game" },
      { asset: "tocha-fogo",             x: 1740, y: 2, layer: "fg" },
      { asset: "braseiro-fogo",          x: 2000, y: 1, layer: "game" },
      { asset: "estandarte",             x: 2100, y: 6, layer: "fg" },
      { asset: "komainu",                x: 2260, y: 2, layer: "game" },
      { asset: "tocha-fogo",             x: 2280, y: 2, layer: "fg" },
      { asset: "portao-madeira-aberto",  x: 2500, y: 0, layer: "game" },
    ],
  },
};

/** Public path for a tileset name. */
const tilesetPath = (name) => `/images/kungfucastle/tiles/${name}.png`;

/** Public path for a prop or parallax asset name. */
const propPath = (name) => `/images/kungfucastle/props/${name}.png`;

/**
 * Every public asset path any phase's scenery needs, de-duplicated.
 * kungfu-assets.js feeds this straight into Assets.load().
 * @returns {string[]}
 */
export function sceneryAssetPaths() {
  const set = new Set();
  for (const phase of Object.values(PHASE_SCENERY)) {
    set.add(tilesetPath(phase.tileset));
    for (const band of [...phase.bg, ...phase.mid]) set.add(propPath(band.asset));
    for (const prop of phase.props) set.add(propPath(prop.asset));
  }
  return [...set];
}

/** Names of every tileset used across phases. */
export function sceneryTilesetNames() {
  return [...new Set(Object.values(PHASE_SCENERY).map((p) => p.tileset))];
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test`
Expected: bloco `=== scenery.test.mjs ===` com 8 PASS. O teste "every phase in PHASE_CONFIG has scenery" passa porque `PHASE_CONFIG` só tem a fase 1 até agora, e `PHASE_SCENERY[1]` existe.

- [ ] **Step 5: Commit**

```bash
git add src/components/games/kungfu-scenery.js tests/scenery.test.mjs
git commit -m "feat(kungfu): declarative per-phase scenery data"
```

---

### Task 3: Manifesto de assets — tilesets múltiplos, props da fase 2, chefe 2

**Files:**
- Modify: `src/components/games/kungfu-assets.js:192-202` (SCENERY_PATHS), `:149-163` (BOSS_MANIFEST), `:278-312` (montagem do `scenery`)
- Modify: `src/components/games/KungFuCastle.jsx:145` (único uso de `scenery.tileset`)
- Modify: `tests/scenery.test.mjs`

**Interfaces:**
- Consumes: `sceneryAssetPaths()`, `sceneryTilesetNames()` da Task 2
- Produces: `loadAllAssets()` passa a devolver `scenery.tilesets` — um objeto `{ [name: string]: Texture[] }` com 16 texturas por tileset — no lugar de `scenery.tileset`. `scenery.props` passa a conter também os assets de parallax. `textures.bosses["guardiao-portao"]` passa a existir.

- [ ] **Step 1: Escrever o teste que falha**

Acrescente ao final de `tests/scenery.test.mjs`:

```js
check("the asset manifest loads every scenery path from PHASE_SCENERY", () => {
  const ASSETS = source("src/components/games/kungfu-assets.js");
  assert.match(ASSETS, /sceneryAssetPaths/,
    "kungfu-assets.js must build its scenery list from kungfu-scenery.js");
  assert.ok(!/const SCENERY_PATHS = \[/.test(ASSETS),
    "the hardcoded SCENERY_PATHS array must be gone");
});

check("guardiao-portao is in the boss manifest with all 12 used animations", () => {
  const ASSETS = source("src/components/games/kungfu-assets.js");
  const block = ASSETS.match(/"guardiao-portao":\s*bossAnims\([\s\S]*?\]\),/);
  assert.ok(block, "guardiao-portao missing from BOSS_MANIFEST");
  for (const a of ["idle", "walk", "horizontal-swing", "overhead-smash", "stuck",
                   "earthquake", "shield-block", "charge", "kick", "taunt", "hit", "death"]) {
    assert.match(block[0], new RegExp(`\\["${a}"`), `missing anim ${a}`);
  }
});

check("every boss sheet named in the manifest exists on disk", () => {
  const ASSETS = source("src/components/games/kungfu-assets.js");
  for (const m of ASSETS.matchAll(/bossAnims\("([a-z-]+)",\s*\d+,\s*\[([\s\S]*?)\]\)/g)) {
    const boss = m[1];
    for (const a of m[2].matchAll(/\["([a-z-]+)"/g)) {
      const file = repoPath(`public/images/kungfucastle/bosses/${boss}/${a[1]}.png`);
      assert.ok(fs.existsSync(file), `missing sheet: ${boss}/${a[1]}.png`);
    }
  }
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npm test`
Expected: 3 FAIL — `SCENERY_PATHS` ainda existe e `guardiao-portao` não está no manifesto.

- [ ] **Step 3: Substituir SCENERY_PATHS pela lista derivada**

Em `kungfu-assets.js`, adicione o import no topo, logo após o import do PixiJS:

```js
import { sceneryAssetPaths, sceneryTilesetNames } from "./kungfu-scenery";
```

Apague o bloco `const SCENERY_PATHS = [ ... ];` inteiro (linhas 192-202) e troque o laço que o consumia:

```js
  for (const path of sceneryAssetPaths()) {
    srcSet.add(path);
  }
```

- [ ] **Step 4: Cortar todos os tilesets, não só um**

Substitua o bloco que monta `tileset` (a partir de `const tilesetSrc = textureMap[...]`) por:

```js
  // Tilesets: each is a 128×128 sheet, a 4×4 grid of 32×32 Wang tiles → 16 textures
  const TILE_SIZE = 32;
  const tilesets = {};
  for (const name of sceneryTilesetNames()) {
    const src = textureMap[`/images/kungfucastle/tiles/${name}.png`];
    if (!src) {
      console.warn(`[kungfu-assets] Tileset not found: ${name}`);
      continue;
    }
    const frames = [];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const rect = new Rectangle(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        frames.push(new Texture({ source: src.source, frame: rect }));
      }
    }
    tilesets[name] = frames;
  }
```

- [ ] **Step 5: Carregar todo prop citado por qualquer fase**

Substitua o bloco `const PROP_NAMES = [ ... ]` e seu laço por uma derivação da mesma fonte, para que nunca fiquem fora de sincronia:

```js
  // Props (and parallax bands) come straight from the scenery description.
  const props = {};
  for (const path of sceneryAssetPaths()) {
    if (!path.includes("/props/")) continue;
    const name = path.split("/").pop().replace(".png", "");
    const tex = textureMap[path];
    if (!tex) console.warn(`[kungfu-assets] Scenery prop not found: ${name}`);
    props[name] = tex;
  }

  const scenery = { tilesets, props };
```

Remova as constantes `parallaxMountains` e `parallaxTrees` — os dois passam a ser props comuns, acessados por nome.

- [ ] **Step 6: Acrescentar o Guardião ao manifesto de chefes**

Em `BOSS_MANIFEST`, após a entrada de `mestre-capangas`:

```js
  "guardiao-portao": bossAnims("guardiao-portao", 68, [
    ["idle",             { speed: 0.08, loop: true }],
    ["walk",             { speed: 0.10, loop: true }],
    ["horizontal-swing", { speed: 0.12, next: "idle" }],
    ["overhead-smash",   { speed: 0.09, next: "idle" }],
    ["stuck",            { speed: 0.05, loop: true }],
    ["earthquake",       { speed: 0.09, next: "idle" }],
    ["shield-block",     { speed: 0.07, loop: true }],
    ["charge",           { speed: 0.14, loop: true }],
    ["kick",             { speed: 0.16, next: "idle" }],
    ["taunt",            { speed: 0.07, next: "idle" }],
    ["hit",              { speed: 0.15, next: "idle" }],
    ["death",            { speed: 0.08 }],
  ]),
```

`stand.png` fica de fora: é um frame único sem uso no jogo.

- [ ] **Step 7: Corrigir o único consumidor de `scenery.tileset`**

Em `KungFuCastle.jsx:145`, troque:

```js
  if (scenery.tileset && scenery.tileset.length >= 16) {
```

por:

```js
  const phase1Tiles = scenery.tilesets["fase1-jardim"];
  if (phase1Tiles && phase1Tiles.length >= 16) {
```

e as três linhas seguintes que indexam `scenery.tileset[12]`, `[3]` e `[6]` passam a indexar `phase1Tiles`. As duas referências a `scenery.parallaxMountains` (linhas 113-121) viram `scenery.props["parallax-montanhas"]`, e as de `scenery.parallaxTrees` (131-137) viram `scenery.props["parallax-arvores"]`. Este é um passo de ponte: a Task 4 remove esse código inteiro.

- [ ] **Step 8: Rodar os testes**

Run: `npm test`
Expected: todos PASS, incluindo os 3 novos.

- [ ] **Step 9: Verificar que a fase 1 não mudou visualmente**

Suba o servidor numa porta livre e confirme que o jardim continua idêntico:

```bash
npx next dev -p 3100 > /tmp/next-dev.log 2>&1 &
until grep -q "Ready in" /tmp/next-dev.log; do sleep 1; done
curl -s -o /dev/null -w "%{http_code}\n" -L http://localhost:3100/jogos/kungfucastle
```

Expected: `200`. Abra a página, clique em INICIAR e confirme montanhas, árvores, chão de grama e os props no mesmo lugar.

- [ ] **Step 10: Commit**

```bash
git add src/components/games/kungfu-assets.js src/components/games/KungFuCastle.jsx tests/scenery.test.mjs
git commit -m "feat(kungfu): load scenery assets from the phase description"
```

---

### Task 4: Construir e destruir cenário por fase

**Files:**
- Modify: `src/components/games/KungFuCastle.jsx:96-219` (substituído por chamada a `buildScenery`), `:70-95` (criação das camadas)
- Modify: `tests/scenery.test.mjs`

**Interfaces:**
- Consumes: `PHASE_SCENERY` da Task 2, `scenery.tilesets` e `scenery.props` da Task 3
- Produces:
  - `buildScenery(game, phase)` — popula os contêineres e ajusta `game.levelWidth`
  - `clearScenery(game)` — destrói os filhos dos contêineres, preservando os contêineres
  - `game.sceneryLayers` = `{ bg, mid, ground, fg }`, quatro `Container` persistentes

- [ ] **Step 1: Escrever o teste que falha**

Acrescente ao final de `tests/scenery.test.mjs`:

```js
check("clearScenery empties the scenery containers, never the layers", () => {
  const fn = GAME.match(/function clearScenery[\s\S]*?\n\}/);
  assert.ok(fn, "clearScenery not found");
  assert.match(fn[0], /sceneryLayers/,
    "must operate on the dedicated containers");
  assert.ok(!/(bgLayer|midLayer|gameLayer|fgLayer)\.removeChildren/.test(fn[0]),
    "clearing a whole layer would destroy the player sprite and the particles");
});

check("the ground scenery container sits below the player in gameLayer", () => {
  const build = GAME.match(/const groundScenery[\s\S]{0,400}/);
  assert.ok(build, "groundScenery container not created");
  const groundIdx = GAME.indexOf("gameLayer.addChild(groundScenery)");
  const playerIdx = GAME.indexOf("gameLayer.addChild(playerSprite)");
  assert.ok(groundIdx > -1 && playerIdx > -1, "expected both addChild calls");
  assert.ok(groundIdx < playerIdx,
    "groundScenery must be added before the player or props would cover it");
});

check("loadPhase rebuilds the scenery", () => {
  const fn = GAME.match(/function loadPhase[\s\S]*?\n\}/);
  assert.ok(fn, "loadPhase not found");
  assert.match(fn[0], /clearScenery\(game\)/);
  assert.match(fn[0], /buildScenery\(game,\s*n\)/);
});

check("levelWidth comes from the phase, not the old constant", () => {
  assert.ok(!/const LEVEL_WIDTH\s*=/.test(GAME),
    "LEVEL_WIDTH must be replaced by per-phase levelWidth");
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npm test`
Expected: 4 FAIL — nenhuma dessas funções existe.

- [ ] **Step 3: Criar os quatro contêineres**

Em `buildScene()`, logo após `app.stage.addChild(bgLayer, midLayer, gameLayer, fgLayer, hudLayer);`:

```js
  // Scenery lives in dedicated containers at fixed indices, so a phase change
  // can empty them without touching the player sprite (gameLayer) or the
  // particles (fgLayer), which share those same layers.
  const bgScenery = new Container();
  const midScenery = new Container();
  const groundScenery = new Container();
  const fgScenery = new Container();
  bgLayer.addChild(bgScenery);
  midLayer.addChild(midScenery);
  gameLayer.addChild(groundScenery);
  fgLayer.addChild(fgScenery);
```

`gameLayer.addChild(groundScenery)` acontece **antes** de `gameLayer.addChild(playerSprite)` na linha 220, garantindo que o chão e os props de nível fiquem sempre atrás do jogador. O mesmo vale para `fgScenery` e as partículas.

- [ ] **Step 4: Escrever as duas funções**

Acrescente antes de `function loadPhase`:

```js
// ============================================================
// SCENERY — built per phase, torn down on phase change
// ============================================================

/** Resolve a band's symbolic y anchor to a pixel value. */
function resolveBandY(y, texHeight) {
  if (typeof y === "number") return y;
  if (y === "ground-overlap") return GROUND_Y - texHeight + 18;
  return GROUND_Y - 10 - texHeight + 28; // "horizon"
}

/** Paint the phase's sky into a Graphics. */
function drawSky(g, spec, width) {
  if (spec.type === "starfield") {
    g.rect(0, 0, width, CH);
    g.fill({ color: spec.color });
    for (let i = 0; i < spec.stars; i++) {
      const sx = Math.random() * width;
      const sy = Math.random() * (GROUND_Y - 40);
      const size = Math.random() < 0.15 ? 2 : 1;
      g.rect(sx, sy, size, size);
      g.fill({ color: 0xffffff, alpha: 0.3 + Math.random() * 0.7 });
    }
    return;
  }
  // gradient: horizontal bands interpolating `from` (top) to `to` (horizon)
  const BANDS = 32;
  const from = spec.from, to = spec.to;
  for (let i = 0; i < BANDS; i++) {
    const t = i / (BANDS - 1);
    const r = Math.round((((from >> 16) & 0xff) * (1 - t)) + (((to >> 16) & 0xff) * t));
    const gg = Math.round((((from >> 8) & 0xff) * (1 - t)) + (((to >> 8) & 0xff) * t));
    const b = Math.round(((from & 0xff) * (1 - t)) + ((to & 0xff) * t));
    g.rect(0, (i * CH) / BANDS, width, CH / BANDS + 1);
    g.fill({ color: (r << 16) | (gg << 8) | b });
  }
}

/**
 * Populate the scenery containers for `phase` and set the level width.
 * @param {object} game
 * @param {number} phase
 */
function buildScenery(game, phase) {
  const spec = PHASE_SCENERY[phase];
  if (!spec) {
    console.warn(`[kungfu] no scenery for phase ${phase}`);
    return;
  }
  const { scenery } = game.textures;
  const { bg, mid, ground, fg } = game.sceneryLayers;
  game.levelWidth = spec.levelWidth;

  // -- Sky
  const sky = new Graphics();
  drawSky(sky, spec.sky, spec.levelWidth);
  bg.addChild(sky);

  // -- Parallax bands
  const addBand = (band, container) => {
    const tex = scenery.props[band.asset];
    if (!tex) return;
    const scale = band.scale || 1;
    const w = tex.width * scale;
    const h = tex.height * scale;
    const y = resolveBandY(band.y, h);
    const step = band.tile ? w : band.every;
    if (step) {
      // Two extra repetitions past the level edge, matching the current
      // phase-1 loop (`Math.ceil(LEVEL_WIDTH / w) + 2`).
      for (let x = 0; x < spec.levelWidth + step * 2; x += step) {
        const s = new Sprite(tex);
        s.scale.set(scale);
        s.x = x;
        s.y = y;
        if (band.alpha !== undefined) s.alpha = band.alpha;
        container.addChild(s);
      }
    } else {
      const s = new Sprite(tex);
      s.scale.set(scale);
      s.x = band.x || 0;
      s.y = y;
      if (band.alpha !== undefined) s.alpha = band.alpha;
      container.addChild(s);
    }
  };
  for (const band of spec.bg) addBand(band, bg);
  for (const band of spec.mid) addBand(band, mid);

  // -- Ground: grass row at feet level + transition + brick rows below
  const tiles = scenery.tilesets[spec.tileset];
  if (tiles && tiles.length >= 16) {
    const TILE = 32;
    const across = Math.ceil(spec.levelWidth / TILE);
    const GRASS_OFFSET = 52; // surface sits ~14px from the top of the tile
    const rows = [
      { tex: tiles[12], y: GROUND_Y - GRASS_OFFSET },
      { tex: tiles[3],  y: GROUND_Y - GRASS_OFFSET + TILE },
    ];
    for (const { tex, y } of rows) {
      for (let col = 0; col < across; col++) {
        const s = new Sprite(tex);
        s.x = col * TILE;
        s.y = y;
        ground.addChild(s);
      }
    }
    const brickStartY = GROUND_Y - GRASS_OFFSET + TILE * 2;
    const rowsNeeded = Math.ceil((CH - brickStartY) / TILE) + 1;
    for (let row = 0; row < rowsNeeded; row++) {
      for (let col = 0; col < across; col++) {
        const s = new Sprite(tiles[6]);
        s.x = col * TILE;
        s.y = brickStartY + row * TILE;
        ground.addChild(s);
      }
    }
  }

  // -- Props. anchor (0.5, 1) means x is the CENTRE and y sinks the prop
  // below the ground line — this is exactly the current phase-1 placement,
  // so do not "simplify" it or every prop shifts.
  const target = { bg: mid, game: ground, fg };
  for (const { asset, x, y, layer } of spec.props) {
    const tex = scenery.props[asset];
    if (!tex) {
      console.warn(`[kungfu] prop not found: ${asset}`);
      continue;
    }
    const s = new Sprite(tex);
    s.anchor.set(0.5, 1);
    s.x = x;
    s.y = GROUND_Y + y;
    (target[layer] || ground).addChild(s);
  }
}

/** Destroy everything buildScenery created, keeping the containers. */
function clearScenery(game) {
  for (const container of Object.values(game.sceneryLayers)) {
    for (const child of container.removeChildren()) child.destroy();
  }
}
```

Note que props com `layer: "bg"` vão para o contêiner **mid** — é o comportamento atual da fase 1, onde `"bg"` significava `midLayer`.

- [ ] **Step 5: Trocar o bloco antigo pela chamada**

Apague as linhas 96-219 de `KungFuCastle.jsx` (do comentário `// -- Starry night sky` até o fim do laço de `PROP_LAYOUT`, exclusive a linha 220 do `playerSprite`). O `game` ainda não existe nesse ponto de `buildScene`, então a chamada vai **depois** da criação do objeto de estado, logo antes do `return`:

```js
  game.sceneryLayers = { bg: bgScenery, mid: midScenery, ground: groundScenery, fg: fgScenery };
  buildScenery(game, 1);
```

No objeto de estado, acrescente `sceneryLayers: null` e troque `levelWidth: LEVEL_WIDTH` por `levelWidth: 0` — `buildScenery` o preenche.

Adicione o import no topo do arquivo:

```js
import { PHASE_SCENERY } from "./kungfu-scenery";
```

Remova `const LEVEL_WIDTH = 2400;` e a propriedade `levelWidth: LEVEL_WIDTH`.

- [ ] **Step 6: Reconstruir o cenário na troca de fase**

Em `loadPhase(game, n)`, logo após `game.phase = n;`:

```js
  clearScenery(game);
  buildScenery(game, n);
```

- [ ] **Step 7: Rodar os testes**

Run: `npm test`
Expected: todos PASS.

- [ ] **Step 8: Confirmar que a fase 1 continua idêntica**

Suba o dev server e jogue a fase 1. Montanhas, árvores, chão e os 11 props devem estar exatamente onde estavam. Se algo se moveu, compare os valores de `PHASE_SCENERY[1].props` com o `PROP_LAYOUT` do commit anterior:

```bash
git show HEAD~1:src/components/games/KungFuCastle.jsx | sed -n '189,208p'
```

- [ ] **Step 9: Commit**

```bash
git add src/components/games/KungFuCastle.jsx tests/scenery.test.mjs
git commit -m "refactor(kungfu): build scenery per phase, rebuilt on transition"
```

---

### Task 5: Ligar a fase 2

**Files:**
- Modify: `src/components/games/KungFuCastle.jsx` (`PHASE_CONFIG`, `BOSS_STATS`)
- Create: `tests/fase2.test.mjs`

**Interfaces:**
- Consumes: tudo das tasks anteriores
- Produces: `PHASE_CONFIG[2]` e `BOSS_STATS["guardiao-portao"]`

- [ ] **Step 1: Medir a hitbox real do Guardião**

O valor no spec é estimativa. Meça na transparência do sprite:

```bash
node -e "
const s=require('./node_modules/sharp/lib/index.js');
(async()=>{
  const F=68;
  const {data,info}=await s('public/images/kungfucastle/bosses/guardiao-portao/idle.png')
    .extract({left:0,top:0,width:F,height:F}).ensureAlpha().raw()
    .toBuffer({resolveWithObject:true});
  let minX=F,maxX=0,minY=F,maxY=0;
  for(let y=0;y<F;y++)for(let x=0;x<F;x++){
    if(data[(y*F+x)*info.channels+3]>16){
      if(x<minX)minX=x; if(x>maxX)maxX=x;
      if(y<minY)minY=y; if(y>maxY)maxY=y;
    }
  }
  console.log('hitbox: { w:',maxX-minX+1,', h:',maxY-minY+1,', ox:',minX,', oy:',minY,'}');
})();
"
```

Anote a saída — ela substitui os números do passo 5.

- [ ] **Step 2: Conferir se o jogador alcança o chefe**

Na fase 1 descobriu-se que o soco alcança `player.x + 44` enquanto a hitbox do
`mestre-capangas` começa em `player.x + 46` — o jogador precisa dar um passo à
frente para acertar. Com a hitbox medida no passo 1, refaça a conta:

- O chefe para quando `|player.x - e.x| <= COMBAT_RANGE` (23), ou seja em
  `e.x ≈ player.x + 23`
- A hitbox dele começa em `e.x + ox`, ou seja `player.x + 23 + ox`
- O soco alcança `player.x + 24 + 2 + 18 = player.x + 44`

Se `23 + ox > 44` (isto é, `ox > 21`), o jogador **não consegue acertar parado** e
precisa avançar. Isso é aceitável e é o comportamento atual da fase 1 — mas
anote o número no commit para o plano da IA do chefe, que decide se `COMBAT_RANGE`
passa a ser por chefe.

- [ ] **Step 3: Escrever o teste que falha**

`tests/fase2.test.mjs`:

```js
import assert from "node:assert/strict";
import { check, source } from "./helpers.mjs";

const GAME = source("src/components/games/KungFuCastle.jsx");

check("phase 2 is configured with its three enemies and its boss", () => {
  const block = GAME.match(/const PHASE_CONFIG = \{[\s\S]*?\n\};/)[0];
  const entry = block.match(/\n  2:\s*\{[\s\S]*?\n  \},/);
  assert.ok(entry, "PHASE_CONFIG[2] not found");
  for (const e of ["guarda-bastao", "ninja", "kunoichi"]) {
    assert.match(entry[0], new RegExp(`"${e}"`), `phase 2 must spawn ${e}`);
  }
  assert.match(entry[0], /boss:\s*"guardiao-portao"/);
});

check("phase 2 does not reuse phase 1's enemies", () => {
  const block = GAME.match(/const PHASE_CONFIG = \{[\s\S]*?\n\};/)[0];
  const entry = block.match(/\n  2:\s*\{[\s\S]*?\n  \},/)[0];
  for (const e of ["capanga-branco", "capanga-cinza", "capanga-rapido"]) {
    assert.ok(!entry.includes(`"${e}"`), `phase 2 should not spawn ${e}`);
  }
});

check("the Guardião has stats matching the design doc", () => {
  const entry = GAME.match(/"guardiao-portao":\s*\{[\s\S]*?\n  \},/);
  assert.ok(entry, "BOSS_STATS['guardiao-portao'] not found");
  assert.match(entry[0], /hp:\s*35/);
  assert.match(entry[0], /score:\s*1500/);
  assert.match(entry[0], /frameSize:\s*68/);
  assert.match(entry[0], /spriteFacing:\s*-1/);
});

check("MAX_PHASE now derives to 2", () => {
  const block = GAME.match(/const PHASE_CONFIG = \{[\s\S]*?\n\};/)[0];
  const phases = [...block.matchAll(/^\s{2}(\d+):\s*\{/gm)].map((m) => Number(m[1]));
  assert.equal(Math.max(...phases), 2);
});
```

- [ ] **Step 4: Rodar para ver falhar**

Run: `npm test`
Expected: 4 FAIL.

- [ ] **Step 5: Adicionar a configuração**

Em `PHASE_CONFIG`, após a entrada da fase 1 (substituindo o comentário `// TODO: phases 2–5`):

```js
  2: {
    enemies: ["guarda-bastao", "ninja", "kunoichi"],
    boss: "guardiao-portao",
    killThreshold: 100,
  },
  // TODO: phases 3–5 — add { enemies, boss, killThreshold } when content ready
```

Em `BOSS_STATS`, após `mestre-capangas` (use os números medidos no passo 1 no lugar dos abaixo):

```js
  "guardiao-portao": {
    hp: 35, damage: 14, speed: 1.2, score: 1500, frameSize: 68,
    hitbox: { w: 26, h: 52, ox: 21, oy: 8 },
    groundOffset: 12,
    // Como todos os chefes, a arte é desenhada virada para oeste.
    spriteFacing: -1,
  },
```

- [ ] **Step 6: Rodar os testes**

Run: `npm test`
Expected: todos PASS. O teste "every phase in PHASE_CONFIG has scenery" da Task 2 agora exercita a fase 2 de verdade.

- [ ] **Step 7: Commit**

```bash
git add src/components/games/KungFuCastle.jsx tests/fase2.test.mjs
git commit -m "feat(kungfu): wire up phase 2 — castle gate"
```

---

### Task 6: Verificação em jogo da transição 1→2

**Files:**
- Create: `tests/manual/fase2-transicao.mjs`

**Interfaces:**
- Consumes: tudo
- Produces: capturas de tela em `tests/manual/out/`

Esta task não roda em `npm test` — precisa de navegador e do dev server. É a única forma de confirmar que o cenário realmente troca.

- [ ] **Step 1: Escrever o driver**

`tests/manual/fase2-transicao.mjs`. Requer um hook temporário: adicione `window.__kfGame = scene;` logo após `gameRef.current = scene;` em `KungFuCastle.jsx`, e **remova ao final desta task**.

```js
// Manual check: does the 1→2 transition swap the scenery?
// Requires: dev server on :3100, and a temporary `window.__kfGame = scene`
// hook right after `gameRef.current = scene`.
import { chromium } from "playwright";
import fs from "node:fs";

const OUT = new URL("./out/", import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto("http://localhost:3100/jogos/kungfucastle", { waitUntil: "domcontentloaded" });
const accept = page.getByRole("button", { name: /aceitar|accept/i });
if (await accept.count()) await accept.first().click();
const start = page.getByRole("button", { name: /iniciar|start|jogar/i });
await start.waitFor({ state: "visible", timeout: 30000 });
await start.click();
await page.waitForSelector("canvas", { timeout: 30000 });
await page.waitForFunction(() => window.__kfGame, null, { timeout: 60000 });
const canvas = page.locator("canvas");

await page.waitForTimeout(1500);
await canvas.screenshot({ path: `${OUT}/01-fase1.png` });
const before = await page.evaluate(() => ({
  phase: window.__kfGame.phase,
  levelWidth: window.__kfGame.levelWidth,
  ground: window.__kfGame.sceneryLayers.ground.children.length,
  player: !!window.__kfGame.playerSprite,
}));

// Jump straight to phase 2 instead of grinding 100 kills.
await page.evaluate(() => {
  const g = window.__kfGame;
  g.enemies.forEach((e) => { e.alive = false; e.hp = 0; });
  g.killCount = 999;
  g.bossDefeated = true;
  g.bossDefeatedFrame = -999;
});
await page.waitForTimeout(1200);
for (let i = 0; i < 12; i++) {   // skip the phase-clear screen
  await page.keyboard.press("Space");
  await page.waitForTimeout(300);
}
await page.waitForTimeout(1500);
await canvas.screenshot({ path: `${OUT}/02-fase2.png` });

const after = await page.evaluate(() => {
  const g = window.__kfGame;
  return {
    phase: g.phase,
    levelWidth: g.levelWidth,
    ground: g.sceneryLayers.ground.children.length,
    player: !!g.playerSprite,
    particles: g.particles.length,
    enemyTypes: [...new Set(g.enemies.map((e) => e.type))],
  };
});
await browser.close();

console.log("before:", JSON.stringify(before));
console.log("after: ", JSON.stringify(after));

const fails = [];
if (after.phase !== 2) fails.push(`phase is ${after.phase}, expected 2`);
if (after.levelWidth !== 2600) fails.push(`levelWidth is ${after.levelWidth}, expected 2600`);
if (!after.player) fails.push("the player sprite was destroyed by the phase change");
if (after.ground === 0) fails.push("no ground tiles were rebuilt");
const phase1Enemies = ["capanga-branco", "capanga-cinza", "capanga-rapido"];
if (after.enemyTypes.some((t) => phase1Enemies.includes(t)))
  fails.push(`phase 1 enemies still spawning: ${after.enemyTypes}`);

console.log(fails.length ? `\nFAILURES:\n- ${fails.join("\n- ")}` : "\nAll checks passed.");
console.log(errors.length ? `console errors:\n${errors.join("\n")}` : "no console errors");
process.exit(fails.length ? 1 : 0);
```

- [ ] **Step 2: Subir o dev server**

Nunca com um build rodando ao mesmo tempo — os dois compartilham `.next`.

```bash
npx next dev -p 3100 > /tmp/next-dev.log 2>&1 &
until grep -qE "Ready in|Error:" /tmp/next-dev.log; do sleep 1; done
```

- [ ] **Step 3: Rodar o driver**

Run: `node tests/manual/fase2-transicao.mjs`
Expected: `All checks passed.` e `no console errors`.

- [ ] **Step 4: Olhar as duas capturas**

Abra `tests/manual/out/01-fase1.png` e `02-fase2.png`. A primeira mostra o jardim noturno com torii e cerejeiras; a segunda, o pátio do portão com céu de crepúsculo, muralha ao fundo, ponte, estandartes e tochas. **Se a segunda mostrar o jardim, o cenário não foi reconstruído** — volte à Task 4.

- [ ] **Step 5: Remover o hook temporário**

```bash
sed -i '/window.__kfGame = scene;/d' src/components/games/KungFuCastle.jsx
grep -n "__kfGame" src/components/games/KungFuCastle.jsx || echo "hook removido"
```

- [ ] **Step 6: Build de produção**

Pare o dev server antes — descubra o PID pela porta, nunca por `pkill -f`:

```bash
PID=$(ss -ltnp 2>/dev/null | grep 3100 | grep -oP 'pid=\K[0-9]+' | head -1)
[ -n "$PID" ] && kill -9 $PID $(ps -o ppid= -p $PID | tr -d ' ')
sleep 2
npm run build 2>&1 | grep -iE "error|warn|Compiled successfully"
```

Expected: `✓ Compiled successfully`, sem erros nem warnings.

- [ ] **Step 7: Commit**

```bash
git add tests/manual/
git commit -m "test(kungfu): manual driver for the phase 1→2 transition"
```

---

## Notas para quem executar

**O que este plano deliberadamente não faz.** O Guardião entra na fase 2 usando o loop genérico de inimigos — anda até o jogador e usa `horizontal-swing` como golpe. Ele será derrotável e a fase será jogável de ponta a ponta, mas 8 das 12 animações ficarão ociosas. A máquina de estados vem no plano seguinte, e é ela que transforma a luta.

**O risco que já conhecemos.** `BOSS_REGEN_PCT_PER_SEC` é 2,5%/s. Sobre os 35 HP do Guardião isso dá 0,875 HP/s, contra 0,625 do chefe da fase 1. Se a luta parecer arrastada na Task 6, não mexa na constante global — ela está calibrada para o chefe 1. Anote o problema para o plano da IA, que tem a opção de mover a taxa para dentro de `BOSS_STATS`.

**Ordem importa.** As Tasks 3 e 4 juntas trocam a forma do objeto `scenery`. Entre elas o jogo continua funcionando porque a Task 3 inclui um passo de ponte (passo 7) que adapta os consumidores antigos. Não pule esse passo achando que a Task 4 vai limpar tudo — o commit da Task 3 precisa ficar verde sozinho.
