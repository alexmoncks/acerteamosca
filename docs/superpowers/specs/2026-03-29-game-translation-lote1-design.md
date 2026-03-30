# Game Translation Lote 1 Design

**Date:** 2026-03-29
**Status:** Approved

## Context

i18n infrastructure is complete (next-intl, middleware, dictionaries, locale routing). Now translating game components — Lote 1 covers 5 simple games + the shared RegisterModal.

## Scope

~77 translatable strings across 6 components:

| Component | File | Strings |
|-----------|------|---------|
| Acerte a Mosca | `src/components/games/AcerteAMosca.jsx` | ~15 |
| 2048 | `src/components/games/Game2048.jsx` | ~9 |
| Memory Game | `src/components/games/MemoryGame.jsx` | ~14 |
| Pong | `src/components/games/Pong.jsx` | ~16 |
| Tiro ao Alvo | `src/components/games/TiroAoAlvo.jsx` | ~13 |
| RegisterModal | `src/components/RegisterModal.jsx` | ~10 |

## Approach

### Parallel Execution (6 agents)

Each agent modifies only its own `.jsx` file:
1. Adds `import { useTranslations } from "next-intl";`
2. Adds `const t = useTranslations("games.SLUG");` (or `"register"` for RegisterModal)
3. Replaces all hardcoded PT strings with `t("key")` calls
4. Reports the complete PT and EN translation strings as output

### Sequential Final Step

After all 6 agents complete, one sequential step merges all translation strings into `src/messages/pt.json` and `src/messages/en.json` under their respective namespaces.

### Translation Namespaces

- `games.acerteamosca.*` — Acerte a Mosca game strings
- `games.pong.*` — Pong game strings
- `games.memory.*` — Memory Game strings
- `games.game2048.*` — 2048 game strings
- `games.tiroaoalvo.*` — Tiro ao Alvo game strings
- `register.*` — Shared registration modal strings

### Pattern Per Game Component

```jsx
// Before
<h1>ACERTE A MOSCA</h1>
<button>JOGAR DE NOVO</button>

// After
import { useTranslations } from "next-intl";
// inside component:
const t = useTranslations("games.acerteamosca");
<h1>{t("title")}</h1>
<button>{t("playAgain")}</button>
```

## Files Summary

| Action | File | What |
|--------|------|------|
| Modify | `src/components/games/AcerteAMosca.jsx` | Replace PT strings with t() |
| Modify | `src/components/games/Game2048.jsx` | Replace PT strings with t() |
| Modify | `src/components/games/MemoryGame.jsx` | Replace PT strings with t() |
| Modify | `src/components/games/Pong.jsx` | Replace PT strings with t() |
| Modify | `src/components/games/TiroAoAlvo.jsx` | Replace PT strings with t() |
| Modify | `src/components/RegisterModal.jsx` | Replace PT strings with t() |
| Modify | `src/messages/pt.json` | Add games.* and register.* namespaces |
| Modify | `src/messages/en.json` | Add games.* and register.* namespaces |

## Out of Scope

- Lote 2 games (Bubble Shooter, Deep Attack, Ships, Batalha Naval, Brick Breaker, Jogo do Jacaré)
- Lote 3 games (3Invader narrative, Wordle EN dictionary)
- Game page metadata translation (Sub-project 3)
