# 5 Novos Jogos — Plataforma Acerte a Mosca — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 new games (Wordle BR, Memory Game, 2048, Bubble Shooter, Deep Attack) to the Acerte a Mosca platform, including multiplayer WebSocket support for Memory and 2048, registration improvements, and analytics tracking.

**Architecture:** Each game is a single `.jsx` component in `src/components/games/`, loaded via Next.js App Router dynamic import. Games use inline styles (no Tailwind). Canvas-based games (Bubble Shooter, Deep Attack) use requestAnimationFrame loops. DOM-based games (Wordle, Memory, 2048) use CSS animations. Multiplayer uses dedicated WebSocket servers following the existing Pong/Ships pattern.

**Tech Stack:** Next.js 14 (App Router), React 18, Prisma (PostgreSQL), WebSocket (`ws` package), Canvas API, CSS 3D Transforms, Google Analytics (gtag), Google AdSense.

**Spec:** `docs/superpowers/specs/2026-03-15-cinco-novos-jogos-design.md`

---

## File Structure

### New Files
```
src/components/games/WordleBR.jsx          - Wordle BR game component
src/components/games/MemoryGame.jsx        - Memory Game component (solo + online)
src/components/games/Game2048.jsx          - 2048 game component (solo + online)
src/components/games/BubbleShooter.jsx     - Bubble Shooter game component (canvas)
src/components/games/DeepAttack.jsx        - Deep Attack game component (canvas)
src/app/jogos/wordle/page.js               - Wordle page route
src/app/jogos/memory/page.js               - Memory page route
src/app/jogos/2048/page.js                 - 2048 page route
src/app/jogos/bubbleshooter/page.js        - Bubble Shooter page route
src/app/jogos/deepattack/page.js           - Deep Attack page route
server/ws-memory.js                        - Memory multiplayer WS server
server/ws-2048.js                          - 2048 multiplayer WS server
```

### Modified Files
```
prisma/schema.prisma                       - Score model: fields optional + metadata Json?
src/app/api/scores/route.js                - Accept optional fields + metadata
src/app/api/jogadores/route.js             - Validation: name min 3, email regex, phone format, unique name
src/components/RegisterModal.jsx           - Validation UI, phone mask, error display
src/hooks/useJogador.js                    - Propagate server errors
src/components/MobileControls.jsx          - Add BubbleShooterMobileControls, DeepAttackMobileControls
src/app/page.js                            - Add 5 new game entries to homepage
src/components/games/AcerteAMosca.jsx      - Add gtag events
src/components/games/Pong.jsx              - Add gtag events
src/components/games/Ships.jsx             - Add gtag events
package.json                               - Add ws:memory, ws:2048 scripts
.env.example                               - Add WS_MEMORY_URL, WS_2048_URL
```

---

## Chunk 1: Shared Infrastructure

### Task 1: Prisma Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Update Score model**

Make game-specific fields optional and add metadata:

```prisma
model Score {
  id          String   @id @default(cuid())
  pontos      Int
  acertos     Int?
  erros       Int?
  melhorCombo Int?
  precisao    Int?
  metadata    Json?
  jogo        String   @default("acerteamosca")
  jogadorId   String
  jogador     Jogador  @relation(fields: [jogadorId], references: [id])
  criadoEm    DateTime @default(now())

  @@index([jogadorId])
  @@index([jogo, pontos])
}
```

- [ ] **Step 2: Create migration and push schema changes**

Run: `npx prisma migrate dev --name make_score_fields_optional_add_metadata`
Expected: migration created and applied successfully, no data loss (fields made nullable)

Note: Use `prisma migrate dev` (not `db push`) to create a tracked migration file for production deployments.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: make Score fields optional, add metadata Json for new games"
```

---

### Task 2: Update Scores API

**Files:**
- Modify: `src/app/api/scores/route.js`

- [ ] **Step 1: Update POST handler to accept optional fields + metadata**

Replace the POST handler to accept `metadata` as JSON pass-through. Fields `acertos`, `erros`, `melhorCombo`, `precisao` remain accepted for backwards compat but are now optional:

```js
export async function POST(request) {
  try {
    const jogadorId = getJogadorCookie();
    if (!jogadorId) {
      return NextResponse.json(
        { error: "Jogador não autenticado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { pontos, acertos, erros, melhorCombo, precisao, jogo, metadata } = body;

    if (typeof pontos !== "number") {
      return NextResponse.json(
        { error: "Pontos é obrigatório" },
        { status: 400 }
      );
    }

    const score = await prisma.score.create({
      data: {
        pontos,
        acertos: acertos ?? null,
        erros: erros ?? null,
        melhorCombo: melhorCombo ?? null,
        precisao: precisao ?? null,
        metadata: metadata ?? null,
        jogo: jogo || "acerteamosca",
        jogadorId,
      },
    });

    return NextResponse.json({ score });
  } catch (err) {
    console.error("POST /api/scores error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update GET handler to include metadata in response**

In the ranking map, add `metadata` to the returned fields:

```js
ranking: ranking.map((s) => ({
  nome: s.jogador.nome,
  pontos: s.pontos,
  acertos: s.acertos,
  precisao: s.precisao,
  melhorCombo: s.melhorCombo,
  metadata: s.metadata,
  data: s.criadoEm,
})),
```

- [ ] **Step 3: Verify existing Acerte a Mosca score submission still works**

Run: `npm run dev` and test manually or check that the dev server starts without errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/scores/route.js
git commit -m "feat: update scores API for optional fields and metadata"
```

---

### Task 3: Registration Validation — Backend

**Files:**
- Modify: `src/app/api/jogadores/route.js`

- [ ] **Step 1: Add sanitization helper and validation to POST handler**

Add at the top of the file:

```js
function sanitize(str) {
  return str.replace(/<[^>]*>/g, "").trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^\(\d{2}\) \d{5}-\d{4}$/.test(phone);
}
```

Update the POST handler validation section (before the existing `findUnique` call):

```js
const nome = sanitize(body.nome || "");
const email = (body.email || "").trim().toLowerCase();
const whatsapp = body.whatsapp || "";
const jogo = body.jogo || "acerteamosca";

if (!nome || nome.length < 3) {
  return NextResponse.json(
    { error: "Nome deve ter no mínimo 3 caracteres" },
    { status: 400 }
  );
}

if (!email || !isValidEmail(email)) {
  return NextResponse.json(
    { error: "Email inválido" },
    { status: 400 }
  );
}

if (whatsapp && !isValidPhone(whatsapp)) {
  return NextResponse.json(
    { error: "WhatsApp deve estar no formato (XX) XXXXX-XXXX" },
    { status: 400 }
  );
}
```

- [ ] **Step 2: Add unique name check**

After validation, before the existing `findUnique({ where: { email } })`:

```js
// Check for duplicate name (case-insensitive)
const existingName = await prisma.jogador.findFirst({
  where: { nome: { equals: nome, mode: "insensitive" } },
});

// If name is taken by another email, reject
if (existingName && existingName.email !== email) {
  return NextResponse.json(
    { error: "Nome já cadastrado" },
    { status: 400 }
  );
}
```

Also update the existing-email-update block. Wrap name check + create/update in a transaction to prevent race conditions:

```js
const jogador = await prisma.$transaction(async (tx) => {
  // Check duplicate name (case-insensitive)
  const existingName = await tx.jogador.findFirst({
    where: {
      nome: { equals: nome, mode: "insensitive" },
      email: { not: email },
    },
  });
  if (existingName) {
    throw new Error("NOME_DUPLICADO");
  }

  let existing = await tx.jogador.findUnique({ where: { email } });

  if (existing) {
    return tx.jogador.update({
      where: { email },
      data: { nome, whatsapp: whatsapp || existing.whatsapp },
    });
  } else {
    return tx.jogador.create({
      data: { nome, email, whatsapp: whatsapp || null, jogoOrigem: jogo },
    });
  }
});
```

Catch the `NOME_DUPLICADO` error and return 400:
```js
try {
  const jogador = await prisma.$transaction(async (tx) => { ... });
  setJogadorCookie(jogador.id);
  return NextResponse.json({ jogador: { id: jogador.id, nome: jogador.nome, email: jogador.email, jogoOrigem: jogador.jogoOrigem } });
} catch (err) {
  if (err.message === "NOME_DUPLICADO") {
    return NextResponse.json({ error: "Nome já cadastrado" }, { status: 400 });
  }
  throw err;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/jogadores/route.js
git commit -m "feat: add registration validation - name min 3, email regex, phone format, unique name"
```

---

### Task 4: Registration Validation — Frontend

**Files:**
- Modify: `src/hooks/useJogador.js`
- Modify: `src/components/RegisterModal.jsx`

- [ ] **Step 1: Update useJogador to propagate server errors**

In `useJogador.js`, update the `register` function to return errors:

```js
const register = useCallback(async (userData) => {
  setRegistering(true);
  try {
    const res = await fetch("/api/jogadores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: userData.name,
        email: userData.email,
        whatsapp: userData.phone,
        jogo: jogoOrigem,
      }),
    });
    const data = await res.json();
    if (data.error) {
      return { error: data.error };
    }
    if (data.jogador) {
      setUser(data.jogador);
      return data.jogador;
    }
  } catch (err) {
    console.error("Erro ao registrar:", err);
    return { error: "Erro de conexão. Tente novamente." };
  } finally {
    setRegistering(false);
  }
  return null;
}, [jogoOrigem]);
```

- [ ] **Step 2: Update RegisterModal with validation UI, phone mask, and server errors**

Rewrite `RegisterModal.jsx` with:
- Client-side validation (name min 3, email regex)
- Phone mask `(XX) XXXXX-XXXX`
- Server error display
- Inline error messages per field

Key additions to the component:

```js
const [errors, setErrors] = useState({});
const [serverError, setServerError] = useState("");

function formatPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function validate() {
  const e = {};
  const trimName = name.trim().replace(/<[^>]*>/g, "");
  if (trimName.length < 3) e.name = "Mínimo 3 caracteres";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Email inválido";
  setErrors(e);
  return Object.keys(e).length === 0;
}

async function handleSubmit() {
  if (!validate() || !consent || loading) return;
  setServerError("");
  const result = await onRegister({ name: name.trim().replace(/<[^>]*>/g, ""), email: email.trim(), phone });
  if (result?.error) {
    setServerError(result.error);
  }
}
```

For the phone input, use `onChange={e => setPhone(formatPhone(e.target.value))}`.

Display `errors.name`, `errors.email` below their respective fields in red (fontSize 10, color "#ff4444").
Display `serverError` above the submit button.

Update button `onClick` to call `handleSubmit` instead of the inline lambda.

- [ ] **Step 3: Verify registration flow works**

Run: `npm run dev`, test with:
- Name < 3 chars -> inline error
- Invalid email -> inline error
- Valid submission -> registers and closes modal

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useJogador.js src/components/RegisterModal.jsx
git commit -m "feat: add frontend registration validation, phone mask, server error display"
```

---

### Task 5: Analytics Events on Existing Games

**Files:**
- Modify: `src/components/games/AcerteAMosca.jsx`
- Modify: `src/components/games/Pong.jsx`
- Modify: `src/components/games/Ships.jsx`

- [ ] **Step 1: Add gtag events to AcerteAMosca**

Find the game start point (when state transitions to playing) and add:
```js
window.gtag?.("event", "game_start", { game_name: "acerteamosca" });
```

Find the game end point (when GAME_DURATION expires) and add:
```js
window.gtag?.("event", "game_end", { game_name: "acerteamosca", score: pontos });
```

- [ ] **Step 2: Add gtag events to Pong**

At game start (when match begins):
```js
window.gtag?.("event", "game_start", { game_name: "pong" });
```

At game end (when WIN_SCORE reached):
```js
window.gtag?.("event", "game_end", { game_name: "pong", score: playerScore });
```

- [ ] **Step 3: Add gtag events to Ships**

At game start:
```js
window.gtag?.("event", "game_start", { game_name: "ships" });
```

At game end:
```js
window.gtag?.("event", "game_end", { game_name: "ships", score: 0 });
```

- [ ] **Step 4: Commit**

```bash
git add src/components/games/AcerteAMosca.jsx src/components/games/Pong.jsx src/components/games/Ships.jsx
git commit -m "feat: add gtag analytics events to existing games"
```

---

### Task 6: Environment & Scripts Setup

**Files:**
- Modify: `.env.example`
- Modify: `package.json`

- [ ] **Step 1: Add new WS env vars to .env.example**

Append to `.env.example`:
```
# WebSocket servers for new games
NEXT_PUBLIC_WS_MEMORY_URL="ws://localhost:3004"
NEXT_PUBLIC_WS_2048_URL="ws://localhost:3005"
```

- [ ] **Step 2: Add new scripts to package.json**

Add to the `scripts` section:
```json
"ws:memory": "node server/ws-memory.js",
"ws:2048": "node server/ws-2048.js"
```

- [ ] **Step 3: Update local .env file**

Also add the same WS URLs to the actual `.env` file for local development (this file is gitignored):
```
NEXT_PUBLIC_WS_MEMORY_URL="ws://localhost:3004"
NEXT_PUBLIC_WS_2048_URL="ws://localhost:3005"
```

- [ ] **Step 4: Commit**

```bash
git add .env.example package.json
git commit -m "feat: add WS env vars and scripts for Memory and 2048 servers"
```

---

### Task 7: Homepage — Add 5 New Games

**Files:**
- Modify: `src/app/page.js`

- [ ] **Step 1: Add new game entries to the jogos array**

Add after the existing Ships entry:

```js
{
  slug: "wordle",
  nome: "Wordle BR",
  emoji: "🔤",
  desc: "Adivinhe a palavra de 5 letras em 6 tentativas!",
  cor: "#a3e635",
  destaque: false,
},
{
  slug: "memory",
  nome: "Memory Game",
  emoji: "🧠",
  desc: "Encontre os pares e desafie amigos online!",
  cor: "#34d399",
  destaque: false,
},
{
  slug: "2048",
  nome: "2048",
  emoji: "🔢",
  desc: "Deslize os blocos e some ate chegar no 2048! Jogue online.",
  cor: "#f59e0b",
  destaque: false,
},
{
  slug: "bubbleshooter",
  nome: "Bubble Shooter",
  emoji: "🫧",
  desc: "Mire, atire e estoure bolhas da mesma cor!",
  cor: "#e879f9",
  destaque: false,
},
{
  slug: "deepattack",
  nome: "Deep Attack",
  emoji: "🚀",
  desc: "Pilote sua nave, destrua aliens e sobreviva no espaco!",
  cor: "#22d3ee",
  destaque: false,
},
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.js
git commit -m "feat: add 5 new games to homepage"
```

---

## Chunk 2: Wordle BR

### Task 8: Wordle BR — Page Route

**Files:**
- Create: `src/app/jogos/wordle/page.js`

- [ ] **Step 1: Create page route with dynamic import**

Note: Existing pages use `"use client"` without metadata exports. New pages follow the same pattern for consistency. SEO metadata is handled via the root layout.

```js
"use client";

import dynamic from "next/dynamic";

const WordleBR = dynamic(() => import("@/components/games/WordleBR"), {
  ssr: false,
});

export default function WordlePage() {
  return <WordleBR />;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/jogos/wordle/page.js
git commit -m "feat: add Wordle BR page route with SEO metadata"
```

---

### Task 9: Wordle BR — Game Component

**Files:**
- Create: `src/components/games/WordleBR.jsx`

This is the largest task. The component should be ~600-800 lines. Key sections:

- [ ] **Step 1: Create component skeleton with imports, word lists, and state**

```js
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import AdBanner from "@/components/AdBanner";
import RegisterModal from "@/components/RegisterModal";
import useJogador from "@/hooks/useJogador";
import useGameScale from "@/hooks/useGameScale";
```

Word lists:
- `ANSWERS`: array of ~150 curated 5-letter PT-BR words (uppercase, no accents). Examples: GATOS, MUNDO, FESTA, PRAIA, LIVRO, CARRO, PLANO, VERDE, TIGRE, NUVEM, PEDRA, FOLHA, PONTO, TERMO, MUSEU, CAMPO, PORTA, NOITE, FONTE, BRAVO, RITMO, SINAL, etc.
- `VALID_GUESSES`: array of ~500+ valid 5-letter PT-BR words that includes all ANSWERS plus additional common words.

State:
```js
const [target, setTarget] = useState(() => ANSWERS[Math.floor(Math.random() * ANSWERS.length)]);
const [guesses, setGuesses] = useState([]);
const [currentGuess, setCurrentGuess] = useState("");
const [gameStatus, setGameStatus] = useState("playing"); // 'playing' | 'won' | 'lost'
const [shakeRow, setShakeRow] = useState(-1);
const [toast, setToast] = useState("");
const [revealingRow, setRevealingRow] = useState(-1);
```

- [ ] **Step 2: Implement color evaluation logic**

The core algorithm for evaluating guesses with correct duplicate letter handling:

```js
function evaluateGuess(guess, target) {
  const result = Array(5).fill("absent");
  const targetChars = target.split("");
  const guessChars = guess.split("");

  // First pass: mark greens (correct position)
  for (let i = 0; i < 5; i++) {
    if (guessChars[i] === targetChars[i]) {
      result[i] = "correct";
      targetChars[i] = null;
    }
  }

  // Second pass: mark yellows (present but wrong position)
  for (let i = 0; i < 5; i++) {
    if (result[i] === "correct") continue;
    const idx = targetChars.indexOf(guessChars[i]);
    if (idx !== -1) {
      result[i] = "present";
      targetChars[idx] = null;
    }
  }

  return result;
}
```

- [ ] **Step 3: Implement keyboard input handler**

Handle both physical keyboard (`onKeyDown` via `useEffect`) and virtual keyboard clicks. Core logic:

```js
const handleKey = useCallback((key) => {
  if (gameStatus !== "playing" || revealingRow >= 0) return;

  if (key === "ENTER") {
    if (currentGuess.length !== 5) return;
    if (!VALID_GUESSES.includes(currentGuess)) {
      setShakeRow(guesses.length);
      showToast("Palavra não encontrada");
      setTimeout(() => setShakeRow(-1), 600);
      return;
    }
    // Submit guess with reveal animation
    setRevealingRow(guesses.length);
    const newGuesses = [...guesses, currentGuess];
    setTimeout(() => {
      setGuesses(newGuesses);
      setCurrentGuess("");
      setRevealingRow(-1);
      if (currentGuess === target) {
        setGameStatus("won");
        window.gtag?.("event", "game_end", { game_name: "wordle", score: newGuesses.length });
      } else if (newGuesses.length >= 6) {
        setGameStatus("lost");
        showToast(`A palavra era: ${target}`);
        window.gtag?.("event", "game_end", { game_name: "wordle", score: 0 });
      }
    }, 5 * 100 + 300); // wait for flip animation
    return;
  }

  if (key === "BACKSPACE") {
    setCurrentGuess(prev => prev.slice(0, -1));
    return;
  }

  if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
    setCurrentGuess(prev => prev + key);
  }
}, [currentGuess, guesses, gameStatus, target, revealingRow]);
```

- [ ] **Step 4: Implement keyboard letter status tracking**

Track which letters have been used and their best status for coloring the virtual keyboard:

```js
function getKeyboardStatus(guesses, target) {
  const status = {};
  for (const guess of guesses) {
    const eval_ = evaluateGuess(guess, target);
    for (let i = 0; i < 5; i++) {
      const letter = guess[i];
      const current = status[letter];
      if (eval_[i] === "correct") status[letter] = "correct";
      else if (eval_[i] === "present" && current !== "correct") status[letter] = "present";
      else if (!current) status[letter] = "absent";
    }
  }
  return status;
}
```

- [ ] **Step 5: Implement the grid rendering**

Render the 6x5 grid with:
- Completed rows: colored tiles (green `#6aaa64`, yellow `#c9b458`, gray `#787c7e`)
- Current row: typed letters with highlighted border
- Empty rows: empty tiles with subtle border
- Flip animation: CSS keyframes injected via `<style>` tag, 100ms delay per tile
- Shake animation on invalid word
- Bounce animation on win

- [ ] **Step 6: Implement the virtual keyboard**

QWERTY-BR layout with 3 rows:
```
Q W E R T Y U I O P
 A S D F G H J K L
  ENTER Z X C V B N M ←
```

Each key colored based on `getKeyboardStatus`. onClick calls `handleKey`.

- [ ] **Step 7: Implement toast, share, and new game functionality**

- Toast: absolute positioned div that fades in/out with CSS transition
- Share: build emoji grid string and copy to clipboard via `navigator.clipboard.writeText()`
- New game: reset all state, pick new random word

- [ ] **Step 8: Implement instructions modal**

Simple modal triggered by ? icon in header. Shows game rules, color meanings.

- [ ] **Step 9: Wire up RegisterModal, AdBanner, useJogador, useGameScale, gtag, and score submission**

Follow the same pattern as `AcerteAMosca.jsx`:
- Show `RegisterModal` if `!user && checkedCookie`
- Fire `game_start` event when game begins
- AdBanner with slot `wordle_bottom`
- Use `useGameScale(400)` for responsive scaling (pass game's max width, not default 480)
- On game end (won or lost), submit score to `/api/scores`:
  ```js
  fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pontos: gameStatus === "won" ? (7 - guesses.length) * 100 : 0,
      jogo: "wordle",
      metadata: { tentativas: guesses.length, palavra: target },
    }),
  });
  ```

- [ ] **Step 10: Verify the game works**

Run: `npm run dev`, navigate to `/jogos/wordle`
Test: type a word, submit, check colors, win/lose, share, new game

- [ ] **Step 11: Commit**

```bash
git add src/components/games/WordleBR.jsx
git commit -m "feat: add Wordle BR game - 5-letter word guessing game in Portuguese"
```

---

## Chunk 3: Memory Game

### Task 10: Memory Game — Page Route

**Files:**
- Create: `src/app/jogos/memory/page.js`

- [ ] **Step 1: Create page route**

```js
"use client";

import dynamic from "next/dynamic";

const MemoryGame = dynamic(() => import("@/components/games/MemoryGame"), {
  ssr: false,
});

export default function MemoryPage() {
  return <MemoryGame />;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/jogos/memory/page.js
git commit -m "feat: add Memory Game page route"
```

---

### Task 11: Memory Game — Single Player Component

**Files:**
- Create: `src/components/games/MemoryGame.jsx`

- [ ] **Step 1: Create component with imports, constants, and state**

```js
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import AdBanner from "@/components/AdBanner";
import RegisterModal from "@/components/RegisterModal";
import useJogador from "@/hooks/useJogador";
import useGameScale from "@/hooks/useGameScale";
```

Constants:
```js
const EMOJIS = ["🍎", "🚀", "⚽", "🎵", "🌟", "🎯", "🐱", "🌈", "🔥", "💎", "🎪", "🏆"];
const DIFFICULTIES = {
  easy: { cols: 4, rows: 3, label: "Fácil" },
  medium: { cols: 4, rows: 4, label: "Médio" },
  hard: { cols: 6, rows: 4, label: "Difícil" },
};

const WS_URL = process.env.NEXT_PUBLIC_WS_MEMORY_URL || "ws://localhost:3004";
```

State:
```js
const [screen, setScreen] = useState("menu"); // 'menu' | 'playing' | 'finished' | 'online-lobby' | 'online-playing' | 'online-finished'
const [difficulty, setDifficulty] = useState("medium");
const [cards, setCards] = useState([]);
const [flipped, setFlipped] = useState([]);
const [matched, setMatched] = useState([]);
const [moves, setMoves] = useState(0);
const [timer, setTimer] = useState(0);
const [locked, setLocked] = useState(false);
```

- [ ] **Step 2: Implement Fisher-Yates shuffle and deck generation**

```js
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateDeck(difficulty) {
  const { cols, rows } = DIFFICULTIES[difficulty];
  const pairCount = (cols * rows) / 2;
  const selected = shuffle(EMOJIS).slice(0, pairCount);
  const deck = shuffle([...selected, ...selected]);
  return deck.map((emoji, i) => ({ id: i, emoji }));
}
```

- [ ] **Step 3: Implement card flip and matching logic**

Core game logic:
- Click card -> add to `flipped` (max 2)
- If 2 flipped: lock input, compare after 800ms
- Match: add both to `matched`, clear `flipped`
- No match: clear `flipped`
- All matched: game finished

```js
const handleCardClick = useCallback((index) => {
  if (locked || flipped.includes(index) || matched.includes(index)) return;
  if (flipped.length >= 2) return;

  const newFlipped = [...flipped, index];
  setFlipped(newFlipped);

  if (newFlipped.length === 2) {
    setMoves(m => m + 1);
    setLocked(true);
    const [a, b] = newFlipped;
    if (cards[a].emoji === cards[b].emoji) {
      setTimeout(() => {
        setMatched(prev => [...prev, a, b]);
        setFlipped([]);
        setLocked(false);
      }, 400);
    } else {
      setTimeout(() => {
        setFlipped([]);
        setLocked(false);
      }, 800);
    }
  }
}, [flipped, matched, locked, cards]);
```

- [ ] **Step 4: Implement timer and scoring**

Timer via `useEffect` + `setInterval` (1 second) when `screen === "playing"`.

Scoring formula:
```js
function calculateScore(moves, time, totalPairs) {
  const perfectMoves = totalPairs;
  const moveRatio = perfectMoves / Math.max(moves, perfectMoves);
  const timeBonus = Math.max(0, 1 - time / (totalPairs * 10));
  return Math.round((moveRatio * 800 + timeBonus * 200));
}

function calculateStars(moves, totalPairs) {
  const ratio = moves / totalPairs;
  if (ratio <= 1.5) return 3;
  if (ratio <= 2.5) return 2;
  return 1;
}
```

- [ ] **Step 5: Implement CSS 3D card flip rendering**

Inject `<style>` tag with:
```css
.memory-card { perspective: 1000px; cursor: pointer; }
.memory-card-inner {
  position: relative; width: 100%; height: 100%;
  transition: transform 0.4s ease-in-out;
  transform-style: preserve-3d;
}
.memory-card-inner.flipped { transform: rotateY(180deg); }
.memory-card-front, .memory-card-back {
  position: absolute; inset: 0;
  backface-visibility: hidden;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
}
.memory-card-front { transform: rotateY(180deg); background: #fff; }
.memory-card-back {
  background: linear-gradient(135deg, #667eea, #764ba2);
}
```

Each card rendered as a div with className approach using inline style fallbacks.

- [ ] **Step 6: Implement menu screen and finished screen**

Menu: difficulty selector buttons + "Jogar Solo" + "Jogar Online" buttons.
Finished: stars, time, moves, score, "Jogar Novamente" and "Mudar Dificuldade" buttons.

- [ ] **Step 7: Implement confetti effect on game completion**

Simple particle system: spawn ~50 divs with random colors, positions, and CSS animation (fall + fade).

- [ ] **Step 8: Wire up RegisterModal, AdBanner, useJogador, useGameScale, gtag, and score submission**

Same pattern as Wordle:
- RegisterModal before game
- AdBanner slot `memory_bottom`
- `useGameScale(500)` (Memory max-width is 500px)
- gtag events: `game_start` when playing begins, `game_end` with score
- Submit score on game end:
  ```js
  fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pontos: calculateScore(moves, timer, totalPairs),
      jogo: "memory",
      metadata: { pares: totalPairs, movimentos: moves, tempo: timer, dificuldade: difficulty },
    }),
  });
  ```

- [ ] **Step 9: Verify single-player works**

Run: `npm run dev`, navigate to `/jogos/memory`
Test: select difficulty, flip cards, match pairs, complete game, check stars/score

- [ ] **Step 10: Commit**

```bash
git add src/components/games/MemoryGame.jsx
git commit -m "feat: add Memory Game - single player with 3 difficulty levels"
```

---

### Task 12: Memory Game — WebSocket Server

**Files:**
- Create: `server/ws-memory.js`

- [ ] **Step 1: Create WS server following ws-pong.js pattern**

The server manages rooms with:
- Room creation with 6-char ID (same `genId()` as ws-pong.js)
- 2 players per room
- Shared card deck (shuffled server-side)
- Turn management (alternate turns, extra turn on match)
- Broadcast card flips and match results to both players

Key message types:
- Client -> Server: `{ type: "create", difficulty }`, `{ type: "join", roomId }`, `{ type: "flip", cardIndex }`
- Server -> Client: `{ type: "created", roomId, playerNum }`, `{ type: "joined", playerNum, deck, difficulty }`, `{ type: "start", deck, difficulty }`, `{ type: "flipped", cardIndex, playerNum }`, `{ type: "match", indices, playerNum, scores }`, `{ type: "nomatch", indices }`, `{ type: "turn", playerNum }`, `{ type: "gameover", scores, winner }`

```js
const { createServer } = require("http");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3004;
const sessions = new Map();

function genId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// EMOJIS and DIFFICULTIES same as client
// Server generates deck so both clients see the same cards
```

Session structure:
```js
{
  players: [ws1, ws2],
  deck: [...],
  difficulty: "medium",
  turn: 0, // player index
  flippedThisTurn: [],
  matched: [],
  scores: [0, 0],
  active: false,
}
```

- [ ] **Step 2: Implement message handlers for create, join, flip**

Handle the game flow:
1. Player 1 creates room -> gets roomId
2. Player 2 joins room -> both get `start` with deck and difficulty
3. Active player flips card -> broadcast to both
4. After 2 flips: check match, update scores, assign next turn
5. When all matched: send `gameover`

- [ ] **Step 3: Handle disconnection**

When a player disconnects, notify the other player they won, cleanup session.

- [ ] **Step 4: Test the WS server**

Run: `node server/ws-memory.js`
Expected: "Memory WS server listening on port 3004"

- [ ] **Step 5: Commit**

```bash
git add server/ws-memory.js
git commit -m "feat: add Memory Game WebSocket server for multiplayer"
```

---

### Task 13: Memory Game — Online Multiplayer Client

**Files:**
- Modify: `src/components/games/MemoryGame.jsx`

- [ ] **Step 1: Add WebSocket connection and lobby state**

Add state for online play:
```js
const wsRef = useRef(null);
const [roomId, setRoomId] = useState("");
const [playerNum, setPlayerNum] = useState(null);
const [onlineTurn, setOnlineTurn] = useState(0);
const [onlineScores, setOnlineScores] = useState([0, 0]);
const [opponentConnected, setOpponentConnected] = useState(false);
```

- [ ] **Step 2: Implement WS message handling**

Connect to WS server on lobby screen. Handle incoming messages to update game state (deck, flips, matches, turns, gameover).

- [ ] **Step 3: Implement online lobby UI**

- "Criar Sala" button -> sends `create` message, shows room code with copy-to-clipboard
- "Entrar em Sala" with text input for room code -> sends `join`
- Auto-join from URL query param (same pattern as Pong/Ships)
- Status indicators: "Aguardando oponente...", "Conectado!"

- [ ] **Step 4: Implement online gameplay modifications**

- Cards can only be flipped on your turn
- Flips are sent to server, server broadcasts to both
- Turn indicator: highlight whose turn it is
- Scores for both players visible

- [ ] **Step 5: Implement online game over screen**

Show winner, both scores, "Jogar Novamente" (creates new room).

- [ ] **Step 6: Test online multiplayer**

Run: `node server/ws-memory.js` in one terminal, `npm run dev` in another.
Open two browser tabs, create room in one, join in the other.
Test: turns alternate, matches score correctly, disconnection handled.

- [ ] **Step 7: Commit**

```bash
git add src/components/games/MemoryGame.jsx
git commit -m "feat: add Memory Game online multiplayer via WebSocket"
```

---

## Chunk 4: 2048

### Task 14: 2048 — Page Route

**Files:**
- Create: `src/app/jogos/2048/page.js`

- [ ] **Step 1: Create page route**

```js
"use client";

import dynamic from "next/dynamic";

const Game2048 = dynamic(() => import("@/components/games/Game2048"), {
  ssr: false,
});

export default function Game2048Page() {
  return <Game2048 />;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/jogos/2048/page.js
git commit -m "feat: add 2048 page route"
```

---

### Task 15: 2048 — Single Player Component

**Files:**
- Create: `src/components/games/Game2048.jsx`

- [ ] **Step 1: Create component with imports, tile colors, and state**

Tile color map:
```js
const TILE_COLORS = {
  2: { bg: "#eee4da", text: "#776e65" },
  4: { bg: "#ede0c8", text: "#776e65" },
  8: { bg: "#f2b179", text: "#f9f6f2" },
  16: { bg: "#f59563", text: "#f9f6f2" },
  32: { bg: "#f67c5f", text: "#f9f6f2" },
  64: { bg: "#f65e3b", text: "#f9f6f2" },
  128: { bg: "#edcf72", text: "#f9f6f2" },
  256: { bg: "#edcc61", text: "#f9f6f2" },
  512: { bg: "#edc850", text: "#f9f6f2" },
  1024: { bg: "#edc53f", text: "#f9f6f2" },
  2048: { bg: "#edc22e", text: "#f9f6f2" },
};
```

State:
```js
const [grid, setGrid] = useState(() => initGrid());
const [score, setScore] = useState(0);
const [bestScore, setBestScore] = useState(0);
const [gameStatus, setGameStatus] = useState("playing"); // 'playing' | 'won' | 'lost'
const [screen, setScreen] = useState("menu"); // 'menu' | 'playing' | 'online-lobby' | 'online-playing'
```

- [ ] **Step 2: Implement grid initialization and tile spawning**

```js
function initGrid() {
  const grid = Array(4).fill(null).map(() => Array(4).fill(0));
  addRandomTile(grid);
  addRandomTile(grid);
  return grid;
}

function addRandomTile(grid) {
  const empty = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (grid[r][c] === 0) empty.push([r, c]);
  if (empty.length === 0) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  grid[r][c] = Math.random() < 0.9 ? 2 : 4;
}
```

- [ ] **Step 3: Implement move logic with merge rules**

For each direction (up, down, left, right), implement:
1. Slide all tiles in direction
2. Merge adjacent same-value tiles (each tile merges only once per move)
3. Slide again after merge
4. Return whether the board changed and score gained

```js
function moveLeft(grid) {
  let moved = false;
  let gained = 0;
  const newGrid = grid.map(row => {
    // Remove zeros
    let tiles = row.filter(v => v !== 0);
    // Merge
    for (let i = 0; i < tiles.length - 1; i++) {
      if (tiles[i] === tiles[i + 1]) {
        tiles[i] *= 2;
        gained += tiles[i];
        tiles.splice(i + 1, 1);
      }
    }
    // Pad with zeros
    while (tiles.length < 4) tiles.push(0);
    if (tiles.some((v, i) => v !== row[i])) moved = true;
    return tiles;
  });
  return { grid: newGrid, moved, gained };
}
```

Implement `moveRight`, `moveUp`, `moveDown` by rotating/transposing the grid, applying `moveLeft`, then reversing.

- [ ] **Step 4: Implement game over and win detection**

```js
function canMove(grid) {
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) return true;
      if (c < 3 && grid[r][c] === grid[r][c + 1]) return true;
      if (r < 3 && grid[r][c] === grid[r + 1][c]) return true;
    }
  return false;
}

function hasWon(grid) {
  return grid.some(row => row.some(v => v >= 2048));
}
```

- [ ] **Step 5: Implement keyboard and swipe input**

Keyboard: `useEffect` with `onKeyDown` for arrow keys.
Swipe: `onTouchStart`/`onTouchEnd` with threshold 30px, calculate direction from delta.

```js
useEffect(() => {
  function handleKey(e) {
    if (gameStatus !== "playing") return;
    const dirs = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
    if (dirs[e.key]) {
      e.preventDefault();
      move(dirs[e.key]);
    }
  }
  window.addEventListener("keydown", handleKey);
  return () => window.removeEventListener("keydown", handleKey);
}, [gameStatus, grid]);
```

- [ ] **Step 6: Implement grid rendering with CSS transitions**

Grid container with fixed size, 4x4 cells. Each tile:
- Position via CSS `transform: translate()` with 200ms transition
- Merge animation: scale 1.1 -> 1.0 (pop effect)
- New tile animation: scale 0 -> 1 (appear effect)
- Background color from `TILE_COLORS`
- Font size smaller for larger numbers (1024, 2048)

- [ ] **Step 7: Implement header, overlays, and new game**

- Header: "2048" title, current score, best score
- Win overlay: semi-transparent green, "Voce chegou no 2048!", "Jogar Novamente"
- Lose overlay: semi-transparent red, "Sem movimentos!", "Jogar Novamente"
- New game button in header

- [ ] **Step 8: Wire up RegisterModal, AdBanner, useJogador, useGameScale, gtag, and score submission**

Same pattern. AdBanner slot `2048_bottom`. `useGameScale(400)`.
Submit score on game end:
```js
fetch("/api/scores", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    pontos: score,
    jogo: "2048",
    metadata: { maiorTile: Math.max(...grid.flat()), modo: "solo" },
  }),
});
```

- [ ] **Step 9: Verify single-player works**

Run: `npm run dev`, navigate to `/jogos/2048`
Test: swipe/arrow keys, merge tiles, reach 2048, game over state

- [ ] **Step 10: Commit**

```bash
git add src/components/games/Game2048.jsx
git commit -m "feat: add 2048 game - single player with swipe and keyboard controls"
```

---

### Task 16: 2048 — WebSocket Server

**Files:**
- Create: `server/ws-2048.js`

- [ ] **Step 1: Create WS server for 2048 race mode**

The server is simpler than Memory — it just synchronizes scores and game events, not game state:

```js
const { createServer } = require("http");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3005;
const sessions = new Map();
```

Session structure:
```js
{
  players: [ws1, ws2],
  scores: [0, 0],
  status: ["playing", "playing"], // per player
  active: false,
}
```

Message types:
- Client -> Server: `{ type: "create" }`, `{ type: "join", roomId }`, `{ type: "score_update", score }`, `{ type: "game_over" }`, `{ type: "reached_2048" }`
- Server -> Client: `{ type: "created", roomId, playerNum }`, `{ type: "start", playerNum }`, `{ type: "opponent_score", score }`, `{ type: "opponent_lost" }`, `{ type: "opponent_won" }`, `{ type: "you_win" }`, `{ type: "you_lose" }`

- [ ] **Step 2: Implement game logic**

When a player sends `reached_2048`:
- That player wins immediately
- Send `you_win` to them, `you_lose` to opponent

When a player sends `game_over` (no moves):
- If opponent is still playing, opponent wins
- If both lost, higher score wins

- [ ] **Step 3: Handle disconnection**

Other player wins automatically.

- [ ] **Step 4: Test the WS server**

Run: `node server/ws-2048.js`
Expected: "2048 WS server listening on port 3005"

- [ ] **Step 5: Commit**

```bash
git add server/ws-2048.js
git commit -m "feat: add 2048 WebSocket server for multiplayer race mode"
```

---

### Task 17: 2048 — Online Multiplayer Client

**Files:**
- Modify: `src/components/games/Game2048.jsx`

- [ ] **Step 1: Add online state and WS connection**

```js
const WS_URL = process.env.NEXT_PUBLIC_WS_2048_URL || "ws://localhost:3005";
const wsRef = useRef(null);
const [roomId, setRoomId] = useState("");
const [playerNum, setPlayerNum] = useState(null);
const [opponentScore, setOpponentScore] = useState(0);
const [opponentConnected, setOpponentConnected] = useState(false);
const [onlineResult, setOnlineResult] = useState(null); // 'won' | 'lost' | null
```

- [ ] **Step 2: Implement lobby UI**

Same pattern as Memory: create room, join room, copy link, auto-join from URL.

- [ ] **Step 3: Implement score broadcasting**

After each move, send current score to server:
```js
wsRef.current?.send(JSON.stringify({ type: "score_update", score }));
```

On `reached_2048` or `game_over`, send appropriate message.

- [ ] **Step 4: Implement opponent score display**

Show mini panel with opponent's current score. Update via WS messages.

- [ ] **Step 5: Implement online game over**

Display result: "Voce venceu!" / "Voce perdeu!" with both scores.

- [ ] **Step 6: Test online multiplayer**

Run both WS server and dev server. Two browser tabs, create/join room.
Test: scores update in real-time, first to 2048 wins, disconnection handled.

- [ ] **Step 7: Commit**

```bash
git add src/components/games/Game2048.jsx
git commit -m "feat: add 2048 online multiplayer race mode"
```

---

## Chunk 5: Bubble Shooter

### Task 18: Bubble Shooter — Page Route

**Files:**
- Create: `src/app/jogos/bubbleshooter/page.js`

- [ ] **Step 1: Create page route**

```js
"use client";

import dynamic from "next/dynamic";

const BubbleShooter = dynamic(() => import("@/components/games/BubbleShooter"), {
  ssr: false,
});

export default function BubbleShooterPage() {
  return <BubbleShooter />;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/jogos/bubbleshooter/page.js
git commit -m "feat: add Bubble Shooter page route"
```

---

### Task 19: Bubble Shooter — Mobile Controls

**Files:**
- Modify: `src/components/MobileControls.jsx`

- [ ] **Step 1: Add BubbleShooterMobileControls export**

Add below the existing exports, following the same `Btn` pattern:

```js
export function BubbleShooterMobileControls({ onRotateLeft, onRotateRight, onFire, onStopRotate }) {
  const mobile = useMobile();
  if (!mobile) return null;

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      gap: 20, marginTop: 16, padding: "0 12px",
    }}>
      <Btn label="◀" color="#e879f9" size={64}
        onPress={onRotateLeft} onRelease={onStopRotate} />
      <Btn label="🔥" color="#ff2d95" size={72} fontSize={24}
        onPress={onFire} onRelease={() => {}} />
      <Btn label="▶" color="#e879f9" size={64}
        onPress={onRotateRight} onRelease={onStopRotate} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MobileControls.jsx
git commit -m "feat: add BubbleShooterMobileControls to MobileControls"
```

---

### Task 20: Bubble Shooter — Game Component

**Files:**
- Create: `src/components/games/BubbleShooter.jsx`

This is the most complex game (~800-1000 lines). Key sections:

- [ ] **Step 1: Create component skeleton with constants**

```js
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import AdBanner from "@/components/AdBanner";
import RegisterModal from "@/components/RegisterModal";
import { BubbleShooterMobileControls } from "@/components/MobileControls";
import useJogador from "@/hooks/useJogador";
import useGameScale from "@/hooks/useGameScale";

const CANVAS_W = 400;
const CANVAS_H = 560;
const BUBBLE_R = 16;
const COLORS = ["#ff4444", "#4488ff", "#44cc44", "#ffcc00", "#aa44ff", "#ff8844"];
const COLS = 11; // 11 cols * 32px = 352px + offsets fits within 400px canvas with margin
const INITIAL_ROWS = 8;
const CANNON_Y = CANVAS_H - 40;
const SHOOT_SPEED = 10;
const GAME_OVER_LINE = CANVAS_H - 80;
const SHOTS_PER_DESCENT = 5;
```

- [ ] **Step 2: Implement hex grid data structure**

Odd-r offset coordinates:

```js
function hexToPixel(row, col) {
  const x = col * BUBBLE_R * 2 + (row % 2) * BUBBLE_R;
  const y = row * BUBBLE_R * 1.73;
  return { x: x + BUBBLE_R, y: y + BUBBLE_R };
}

function getNeighbors(row, col, maxRow, maxCol) {
  const even = row % 2 === 0;
  const dirs = even
    ? [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]]
    : [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]];
  return dirs
    .map(([dr, dc]) => [row + dr, col + dc])
    .filter(([r, c]) => r >= 0 && r < maxRow && c >= 0 && c < maxCol);
}
```

Grid stored as 2D array: `grid[row][col] = colorIndex | null`

- [ ] **Step 3: Implement BFS for group detection and floating bubble detection**

```js
function findGroup(grid, row, col) {
  const color = grid[row][col];
  if (color === null) return [];
  const visited = new Set();
  const queue = [[row, col]];
  visited.add(`${row},${col}`);
  while (queue.length > 0) {
    const [r, c] = queue.shift();
    for (const [nr, nc] of getNeighbors(r, c, grid.length, COLS)) {
      const key = `${nr},${nc}`;
      if (!visited.has(key) && grid[nr]?.[nc] === color) {
        visited.add(key);
        queue.push([nr, nc]);
      }
    }
  }
  return [...visited].map(k => k.split(",").map(Number));
}

function findFloating(grid) {
  // BFS from top row to find all connected bubbles
  const connected = new Set();
  const queue = [];
  for (let c = 0; c < COLS; c++) {
    if (grid[0]?.[c] !== null) {
      queue.push([0, c]);
      connected.add(`0,${c}`);
    }
  }
  while (queue.length > 0) {
    const [r, c] = queue.shift();
    for (const [nr, nc] of getNeighbors(r, c, grid.length, COLS)) {
      const key = `${nr},${nc}`;
      if (!connected.has(key) && grid[nr]?.[nc] !== null) {
        connected.add(key);
        queue.push([nr, nc]);
      }
    }
  }
  // Everything not connected is floating
  const floating = [];
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r][c] !== null && !connected.has(`${r},${c}`))
        floating.push([r, c]);
  return floating;
}
```

- [ ] **Step 4: Implement snap-to-grid algorithm**

When a shot bubble collides with a grid bubble or reaches the top:

```js
function findNearestEmpty(grid, px, py) {
  let bestDist = Infinity;
  let bestCell = null;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] !== null) continue;
      const { x, y } = hexToPixel(r, c);
      const dist = Math.sqrt((px - x) ** 2 + (py - y) ** 2);
      if (dist < bestDist) {
        bestDist = dist;
        bestCell = [r, c];
      }
    }
  }
  return bestCell;
}
```

- [ ] **Step 5: Implement cannon rendering and aim line**

The cannon rotates based on `angleRef.current` (10-170 degrees). Render:
- Cannon base rectangle at bottom center
- Aim line: dashed white line from cannon in direction of angle
- Aim line with 1 ricochet: if line hits left/right wall, reflect angle and continue

```js
function drawAimLine(ctx, angle) {
  const startX = CANVAS_W / 2;
  const startY = CANNON_Y;
  const dx = Math.cos(angle * Math.PI / 180);
  const dy = -Math.sin(angle * Math.PI / 180);

  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(startX, startY);

  // Trace line with ricochet
  let x = startX, y = startY;
  let vx = dx, vy = dy;
  for (let i = 0; i < 300; i++) {
    x += vx * 2;
    y += vy * 2;
    if (x <= BUBBLE_R || x >= CANVAS_W - BUBBLE_R) {
      vx = -vx; // ricochet
    }
    if (y <= 0) break;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}
```

- [ ] **Step 6: Implement shooting mechanics**

On fire:
- Create a moving bubble from cannon position in angle direction
- Move bubble each frame at SHOOT_SPEED
- Check wall collisions (reflect X)
- Check grid bubble collisions (distance < 2 * BUBBLE_R)
- On collision: snap to grid, check for groups of 3+, remove groups, find and drop floating bubbles

- [ ] **Step 7: Implement particle effects for explosions and falling bubbles**

Explosion: spawn particles at each removed bubble position, random velocity, fade out.
Falling: bubbles with gravity acceleration, fall off screen.

- [ ] **Step 8: Implement game loop with requestAnimationFrame**

Main loop:
1. Clear canvas
2. Draw background (navy #0a0e27)
3. Draw grid bubbles (glossy gradient)
4. Draw aim line
5. Draw cannon
6. Update and draw shot bubble (if active)
7. Update and draw particles
8. Draw score, next bubble preview, shots-to-descent counter
9. Check game over (any bubble below GAME_OVER_LINE)

- [ ] **Step 9: Implement new row descent every N shots**

After SHOTS_PER_DESCENT shots:
- Shift all grid rows down by 1
- Generate new random row at top
- Check game over after descent

- [ ] **Step 10: Implement keyboard and mobile controls**

Keyboard: ArrowLeft/Right rotate angle (3 degrees, continuous on hold), Space/ArrowUp fires.
Mobile: via `BubbleShooterMobileControls` — callbacks for rotate/fire.

- [ ] **Step 11: Implement game screens (menu, playing, game over)**

Menu: "BUBBLE SHOOTER" title + "Jogar" button.
Game over: final score, "Jogar Novamente" button.

- [ ] **Step 12: Wire up RegisterModal, AdBanner, useJogador, useGameScale, gtag, and score submission**

AdBanner slot `bubbleshooter_bottom`. `useGameScale(400)`. gtag events on start/end.
Submit score on game over:
```js
fetch("/api/scores", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    pontos: score,
    jogo: "bubbleshooter",
    metadata: { bolhasEstouradas: bubblesPopped },
  }),
});
```

- [ ] **Step 13: Verify the game works**

Run: `npm run dev`, navigate to `/jogos/bubbleshooter`
Test: aim, shoot, match 3+, chain reactions, descent, game over

- [ ] **Step 14: Commit**

```bash
git add src/components/games/BubbleShooter.jsx
git commit -m "feat: add Bubble Shooter game with hex grid, ricochet, and particle effects"
```

---

## Chunk 6: Deep Attack

### Task 21: Deep Attack — Page Route

**Files:**
- Create: `src/app/jogos/deepattack/page.js`

- [ ] **Step 1: Create page route**

```js
"use client";

import dynamic from "next/dynamic";

const DeepAttack = dynamic(() => import("@/components/games/DeepAttack"), {
  ssr: false,
});

export default function DeepAttackPage() {
  return <DeepAttack />;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/jogos/deepattack/page.js
git commit -m "feat: add Deep Attack page route"
```

---

### Task 22: Deep Attack — Mobile Controls

**Files:**
- Modify: `src/components/MobileControls.jsx`

- [ ] **Step 1: Add DeepAttackMobileControls export**

```js
export function DeepAttackMobileControls({ keysRef, onToggleAutoFire, autoFire }) {
  const mobile = useMobile();
  if (!mobile) return null;

  const press = (k) => keysRef.current.add(k);
  const release = (k) => keysRef.current.delete(k);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 20 }}>
        <Btn label="◀" color="#22d3ee" size={64}
          onPress={() => press("ArrowLeft")} onRelease={() => release("ArrowLeft")} />
        <Btn label="🔥" color="#ff2d95" size={72} fontSize={24}
          onPress={() => press(" ")} onRelease={() => release(" ")} />
        <Btn label="▶" color="#22d3ee" size={64}
          onPress={() => press("ArrowRight")} onRelease={() => release("ArrowRight")} />
      </div>
      <button
        onClick={onToggleAutoFire}
        style={{
          padding: "6px 16px", borderRadius: 6,
          background: autoFire ? "#22d3ee33" : "#22d3ee11",
          border: `1px solid ${autoFire ? "#22d3ee" : "#22d3ee55"}`,
          color: "#22d3ee", fontSize: 10,
          fontFamily: "'Press Start 2P', monospace",
          cursor: "pointer",
        }}
      >
        AUTO-FIRE: {autoFire ? "ON" : "OFF"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MobileControls.jsx
git commit -m "feat: add DeepAttackMobileControls with auto-fire toggle"
```

---

### Task 23: Deep Attack — Game Component

**Files:**
- Create: `src/components/games/DeepAttack.jsx`

~700-900 lines. Key sections:

- [ ] **Step 1: Create component skeleton with constants**

```js
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import AdBanner from "@/components/AdBanner";
import RegisterModal from "@/components/RegisterModal";
import { DeepAttackMobileControls } from "@/components/MobileControls";
import useJogador from "@/hooks/useJogador";
import useGameScale from "@/hooks/useGameScale";

const CANVAS_W = 400;
const CANVAS_H = 600;
const PLAYER_W = 30;
const PLAYER_H = 36;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 8;
const BULLET_W = 3;
const BULLET_H = 12;
const ENERGY_MAX = 100;
const ENERGY_DRAIN = 0.03; // per frame
const SCROLL_BASE_SPEED = 1.5;
```

- [ ] **Step 2: Implement parallax star layers**

3 layers of stars with different speeds:

```js
function initStars() {
  const layers = [[], [], []];
  const speeds = [0.3, 0.7, 1.2];
  const counts = [40, 25, 15];
  for (let l = 0; l < 3; l++) {
    for (let i = 0; i < counts[l]; i++) {
      layers[l].push({
        x: Math.random() * CANVAS_W,
        y: Math.random() * CANVAS_H,
        size: 1 + l * 0.5,
        alpha: 0.3 + l * 0.2,
        speed: speeds[l],
      });
    }
  }
  return layers;
}
```

- [ ] **Step 3: Implement procedural corridor generation**

```js
function initCorridor() {
  const segments = [];
  let centerX = CANVAS_W / 2;
  for (let i = 0; i < Math.ceil(CANVAS_H / 20) + 40; i++) {
    const width = CANVAS_W * 0.7; // initial width 70%
    centerX += (Math.random() - 0.5) * 10;
    centerX = Math.max(width / 2 + 10, Math.min(CANVAS_W - width / 2 - 10, centerX));
    segments.push({ leftWall: centerX - width / 2, rightWall: centerX + width / 2 });
  }
  return segments;
}
```

Corridor narrows based on distance traveled (difficulty progression):
```js
function getCorridorWidth(distance) {
  const minPct = 0.35;
  const maxPct = 0.7;
  const progress = Math.min(distance / 10000, 1);
  return CANVAS_W * (maxPct - (maxPct - minPct) * progress);
}
```

- [ ] **Step 4: Implement enemy types and spawning**

4 enemy types:
```js
const ENEMY_TYPES = {
  basic: { w: 24, h: 24, hp: 1, speed: 2, points: 10, color: "#ff4444" },
  zigzag: { w: 24, h: 24, hp: 1, speed: 1.5, points: 20, color: "#ffaa00", zigzag: true },
  big: { w: 36, h: 36, hp: 3, speed: 1, points: 50, color: "#aa44ff" },
  asteroid: { w: 28, h: 28, hp: Infinity, speed: 1.5, points: 0, color: "#888888", indestructible: true },
};
```

Spawn system based on distance traveled and difficulty:
```js
function shouldSpawn(distance, lastSpawnDist) {
  const spawnInterval = Math.max(80, 200 - distance / 100);
  return distance - lastSpawnDist > spawnInterval;
}
```

- [ ] **Step 5: Implement AABB collision detection**

```js
function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}
```

Check collisions:
- Player vs enemies -> game over
- Player vs walls -> game over
- Bullets vs enemies -> damage/destroy enemy
- Player vs power-ups -> collect

- [ ] **Step 6: Implement power-up spawning and energy system**

Energy drains per frame. Power-ups spawn periodically, float down. Collecting restores energy.

```js
function spawnPowerUp(distance) {
  return {
    x: Math.random() * (CANVAS_W - 30) + 15,
    y: -20,
    w: 20, h: 20,
    type: "energy",
    amount: 25,
  };
}
```

- [ ] **Step 7: Implement explosion particle system**

Similar to Bubble Shooter particles but with different colors per enemy type.

- [ ] **Step 8: Implement game loop with requestAnimationFrame**

Main loop each frame:
1. Read keys from `keysRef`
2. Move player (clamp within corridor walls)
3. Auto-fire or manual fire (Space key)
4. Update bullets (move up, remove if off-screen)
5. Update enemies (move based on type, remove if off-screen)
6. Update corridor scroll
7. Update stars (parallax)
8. Check collisions
9. Drain energy
10. Spawn enemies/power-ups
11. Update particles
12. Render everything
13. Check game over conditions

- [ ] **Step 9: Implement rendering**

Draw order:
1. Black background
2. Star layers (parallax)
3. Corridor walls (glow neon lines)
4. Power-ups (pulsing green/blue)
5. Enemies (geometric shapes with color)
6. Player bullets (laser trails)
7. Player ship (triangle with glow)
8. Particles (explosions)
9. HUD: score (top-left), energy bar (top-right)

- [ ] **Step 10: Implement keyboard and mobile controls**

Keyboard: ArrowLeft/Right for movement, Space to fire. Continuous input via `keysRef` Set.
Mobile: via `DeepAttackMobileControls` with same keysRef pattern.

- [ ] **Step 11: Implement game screens**

Menu: "DEEP ATTACK" title with space theme, "Jogar" button.
Game over: score, best score, distance, enemies destroyed, "Jogar Novamente".

- [ ] **Step 12: Wire up RegisterModal, AdBanner, useJogador, useGameScale, gtag, and score submission**

AdBanner slot `deepattack_bottom`. `useGameScale(400)`. gtag events.
Submit score on game over:
```js
fetch("/api/scores", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    pontos: score,
    jogo: "deepattack",
    metadata: { distancia: distance, inimigosDestruidos: enemiesDestroyed },
  }),
});
```

- [ ] **Step 13: Verify the game works**

Run: `npm run dev`, navigate to `/jogos/deepattack`
Test: move ship, shoot enemies, collect power-ups, corridor narrows, game over

- [ ] **Step 14: Commit**

```bash
git add src/components/games/DeepAttack.jsx
git commit -m "feat: add Deep Attack game - space shooter with corridor, enemies, and energy"
```

---

## Chunk 7: Final Integration

### Task 24: Final Verification

- [ ] **Step 1: Run dev server and verify all 8 games load from homepage**

Run: `npm run dev`
Navigate to `/` — verify all 8 game cards appear and link correctly.

- [ ] **Step 2: Verify each game route loads**

Test each URL:
- `/jogos/wordle`
- `/jogos/memory`
- `/jogos/2048`
- `/jogos/bubbleshooter`
- `/jogos/deepattack`

- [ ] **Step 3: Verify multiplayer for Memory and 2048**

Run WS servers: `node server/ws-memory.js` and `node server/ws-2048.js`
Test with two browser tabs for each game.

- [ ] **Step 4: Verify registration validation works across all games**

Test: name < 3 chars, invalid email, duplicate name — all should show errors.

- [ ] **Step 5: Build check**

Run: `npm run build`
Expected: builds successfully with no errors.

- [ ] **Step 6: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: final adjustments for 5 new games integration"
```
