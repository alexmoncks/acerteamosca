# Plano 2.0 — GameInfo Infra + Wordle Template

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a infraestrutura técnica (`GameInfo.jsx` reutilizável) e converter `jogos/wordle/page.js` em template completo bilíngue (PT+EN) com ≥350 palavras por idioma, servindo de modelo para os 13 jogos restantes nos planos seguintes (2.1, 2.2, 2.3).

**Architecture:**
- Componente `GameInfo` (server component) renderiza `<aside>` com `<details>` HTML5 nativos para 4 seções colapsáveis (Como jogar / Controles / Dicas / Origem) + intro sempre visível.
- Cada `page.js` de jogo passa a ser async server component com `generateMetadata({ params })` bilíngue. JSON-LD recebe `inLanguage` baseado no locale.
- Componente do jogo (canvas client) é isolado num client wrapper `GameClient.jsx` por jogo (necessário porque `next/dynamic({ ssr: false })` de jogo pesado precisa estar dentro de um arquivo `"use client"` para evitar warnings em Server Components do Next 14).
- Conteúdo PT+EN inline no `page.js` como objetos JS (mesmo padrão das páginas legais já mergeadas).

**Tech Stack:** Next.js 14 App Router, JavaScript, next-intl 4.8, inline styles tema cyan/Press Start 2P, sem novas dependências.

---

## File Structure

**Create:**
- `src/components/GameInfo.jsx` — server component reutilizável que renderiza intro + `<details>` por seção
- `src/app/[locale]/jogos/wordle/GameClient.jsx` — client wrapper isolando `dynamic({ ssr: false })` de WordleBR

**Modify:**
- `src/app/[locale]/jogos/wordle/page.js` — converter de server síncrono para server async; substituir `metadata` estático por `generateMetadata`; JSON-LD bilíngue; renderizar `<GameInfo>`; importar wrapper client em vez de fazer dynamic direto

---

## Task 1: Criar componente `GameInfo.jsx`

**Files:**
- Create: `src/components/GameInfo.jsx`

- [ ] **Step 1: Escrever `src/components/GameInfo.jsx`**

```jsx
export default function GameInfo({ content, locale }) {
  const c = locale === "en" ? content.en : content.pt;

  return (
    <aside style={asideStyle}>
      <h2 style={h2Style}>{c.title}</h2>
      <p style={introStyle}>{c.intro}</p>
      {c.details.map((d, i) => (
        <details key={i} style={detailsStyle}>
          <summary style={summaryStyle}>{d.summary}</summary>
          <div style={bodyStyle}>
            {d.body.map((para, j) => (
              <p key={j} style={paraStyle}>
                {para}
              </p>
            ))}
          </div>
        </details>
      ))}
    </aside>
  );
}

const asideStyle = {
  maxWidth: 800,
  margin: "40px auto 0",
  padding: "0 20px",
  color: "#ccd6f6",
  fontFamily: "'Fira Code', monospace",
  lineHeight: 1.7,
};

const h2Style = {
  fontFamily: "'Press Start 2P', monospace",
  fontSize: 14,
  color: "#00f0ff",
  textShadow: "0 0 8px rgba(0,240,255,0.3)",
  marginBottom: 12,
  letterSpacing: 0.5,
};

const introStyle = {
  fontSize: 13,
  color: "#ccd6f6",
  marginBottom: 24,
};

const detailsStyle = {
  marginBottom: 12,
  background: "rgba(0,240,255,0.04)",
  borderLeft: "2px solid rgba(0,240,255,0.4)",
  borderRadius: 4,
  overflow: "hidden",
};

const summaryStyle = {
  fontFamily: "'Press Start 2P', monospace",
  fontSize: 11,
  color: "#00f0ff",
  padding: "12px 16px",
  cursor: "pointer",
  letterSpacing: 0.5,
  userSelect: "none",
};

const bodyStyle = {
  padding: "4px 16px 14px",
};

const paraStyle = {
  fontSize: 12,
  color: "#8892b0",
  marginBottom: 10,
};
```

- [ ] **Step 2: Verificar import**

Run: `cd /home/alexmoncks/projects/acerteamosca && node -e "console.log('GameInfo file size:', require('fs').statSync('src/components/GameInfo.jsx').size, 'bytes')"`
Expected: tamanho > 1000 bytes (sanity check de que arquivo foi escrito).

---

## Task 2: Criar wrapper client `GameClient.jsx` para Wordle

**Files:**
- Create: `src/app/[locale]/jogos/wordle/GameClient.jsx`

- [ ] **Step 1: Escrever `src/app/[locale]/jogos/wordle/GameClient.jsx`**

```jsx
"use client";

import dynamic from "next/dynamic";

const WordleBR = dynamic(() => import("@/components/games/WordleBR"), {
  ssr: false,
});

export default function GameClient() {
  return <WordleBR />;
}
```

**Por que existe:** isolar `dynamic({ ssr: false })` num arquivo client component evita warnings/erros do Next 14 quando importado a partir de Server Component async. O `page.js` passa a fazer `import GameClient from "./GameClient"` em vez de fazer o dynamic direto.

---

## Task 3: Atualizar `wordle/page.js` para template completo bilíngue

**Files:**
- Modify: `src/app/[locale]/jogos/wordle/page.js`

- [ ] **Step 1: Substituir conteúdo INTEGRAL de `src/app/[locale]/jogos/wordle/page.js`**

Use Write (não Edit) para sobrescrever o arquivo inteiro com:

```jsx
import { setRequestLocale } from "next-intl/server";
import GameInfo from "@/components/GameInfo";
import GameClient from "./GameClient";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isPt = locale === "pt";
  return {
    title: isPt
      ? "Wordle em Português — Jogue Grátis Online | Acerte a Mosca"
      : "Wordle in Portuguese — Play Free Online | Nailed The Fly",
    description: isPt
      ? "Jogue Wordle em português! Adivinhe a palavra de 5 letras em 6 tentativas. Jogo online grátis sem download, funciona no celular e computador."
      : "Play Wordle in Portuguese! Guess the 5-letter word in 6 tries. Free online game, no download, works on mobile and desktop.",
    keywords: isPt
      ? ["wordle português", "wordle brasileiro", "wordle online", "jogo de palavras", "adivinhar palavra"]
      : ["wordle portuguese", "wordle brazilian", "wordle online", "word game", "guess the word"],
    alternates: {
      canonical: "/jogos/wordle",
      languages: {
        "pt-BR": "https://acerteamosca.com.br/jogos/wordle",
        "en": "https://nailedthefly.com/en/jogos/wordle",
      },
    },
    openGraph: {
      title: isPt ? "Wordle em Português - Jogue Grátis" : "Wordle in Portuguese - Play Free",
      description: isPt
        ? "Adivinhe a palavra de 5 letras em 6 tentativas! Jogo online grátis."
        : "Guess the 5-letter word in 6 tries! Free online game.",
      url: isPt
        ? "https://acerteamosca.com.br/jogos/wordle"
        : "https://nailedthefly.com/en/jogos/wordle",
    },
  };
}

function buildJsonLd(locale) {
  const isPt = locale === "pt";
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "Wordle BR",
    description: isPt
      ? "Jogue Wordle em português! Adivinhe a palavra de 5 letras em 6 tentativas."
      : "Play Wordle in Portuguese! Guess the 5-letter word in 6 tries.",
    url: isPt
      ? "https://acerteamosca.com.br/jogos/wordle"
      : "https://nailedthefly.com/en/jogos/wordle",
    genre: ["Puzzle", "Word Game"],
    gamePlatform: "Web Browser",
    operatingSystem: "Any",
    applicationCategory: "Game",
    inLanguage: isPt ? "pt-BR" : "en",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: isPt ? "BRL" : "USD",
      availability: "https://schema.org/InStock",
    },
    publisher: {
      "@type": "Organization",
      name: isPt ? "Acerte a Mosca" : "Nailed The Fly",
      url: isPt ? "https://acerteamosca.com.br" : "https://nailedthefly.com",
    },
  };
}

const content = {
  pt: {
    title: "Sobre o Wordle BR",
    intro:
      "O Wordle BR é a versão brasileira do clássico jogo diário de adivinhar palavras. Sua missão é descobrir uma palavra secreta de 5 letras em até 6 tentativas. A cada palpite, o jogo mostra cores indicando quais letras estão na posição certa, quais existem na palavra mas em outro lugar, e quais não fazem parte da resposta.",
    details: [
      {
        summary: "Como jogar",
        body: [
          "Digite uma palavra de cinco letras válida em português e confirme. As letras pintam de verde quando estão na posição correta, amarelo quando existem na palavra mas em outro lugar, e cinza quando não fazem parte da resposta.",
          "Use cada feedback para refinar o próximo palpite. Você tem seis tentativas até descobrir a palavra do dia. O jogo aceita acentos e cedilha quando aplicáveis. Cada dia traz uma palavra nova — vale tentar antes do café e antes de dormir.",
        ],
      },
      {
        summary: "Controles",
        body: [
          "No computador, basta digitar com o teclado normal: letras de A a Z, Enter para confirmar e Backspace para apagar. No celular, um teclado virtual aparece automaticamente na tela com todas as letras do alfabeto.",
          "As cores nas teclas refletem palpites anteriores: letras já marcadas como cinzas ficam apagadas para evitar repetir tentativas perdidas.",
        ],
      },
      {
        summary: "Dicas e estratégias",
        body: [
          "Comece com palavras ricas em vogais como ROUBO, IDEAL ou AÚREO — assim você descarta ou confirma rapidamente as letras mais comuns. Evite repetir letras nas primeiras tentativas para maximizar a informação extraída.",
          "Quando souber duas ou três letras, pense em palavras frequentes do português: AGORA, MUNDO, PORTA, NOITE são bons candidatos. Use a segunda tentativa para testar consoantes diferentes da primeira. Lembre-se: posição importa — uma letra amarela na segunda casa NÃO está na segunda casa da resposta.",
        ],
      },
      {
        summary: "Origem do jogo",
        body: [
          "O Wordle foi criado em 2021 pelo engenheiro de software galês Josh Wardle como presente para a esposa, fã de jogos de palavras. Ele publicou a versão original em um site simples e em janeiro de 2022 já tinha milhões de jogadores diários.",
          "O New York Times comprou o jogo no mesmo mês por uma cifra na casa baixa dos sete dígitos em dólar. O sucesso virou febre mundial, com adaptações em centenas de idiomas. O Wordle BR é a versão brasileira que respeita as regras originais, mas usa um dicionário em português com palavras de uso cotidiano no Brasil — sem termos arcaicos ou regionalismos obscuros.",
        ],
      },
    ],
  },
  en: {
    title: "About Wordle BR",
    intro:
      "Wordle is the daily word-guessing puzzle that took the world by storm. Your mission: find a hidden 5-letter word in 6 tries. Each guess reveals which letters are in the right position, which exist in the word but elsewhere, and which are not part of the answer. This Brazilian Portuguese version follows the same rules with a curated Portuguese dictionary.",
    details: [
      {
        summary: "How to play",
        body: [
          "Type a valid 5-letter Portuguese word and submit. Letters turn green when correctly placed, yellow when present but in the wrong position, and gray when not in the word at all.",
          "Use each round of feedback to narrow down the answer. You have six attempts before the word reveals itself. The game accepts Portuguese accents and cedilla (ç) when needed. A new word is published every day at midnight Brazilian time.",
        ],
      },
      {
        summary: "Controls",
        body: [
          "On desktop, just type with your keyboard: letters A to Z, Enter to confirm, Backspace to delete. On mobile, an on-screen keyboard appears automatically with the full alphabet.",
          "Tile colors on the keyboard reflect previous guesses — letters already ruled out as gray fade to avoid wasting attempts on them.",
        ],
      },
      {
        summary: "Tips and strategies",
        body: [
          "Start with vowel-rich words like ROUBO, IDEAL or AÚREO to quickly filter common letters. Avoid repeating letters in early tries to maximize the information you extract from each attempt.",
          "Once you know two or three correct letters, think of high-frequency Portuguese words: AGORA, MUNDO, PORTA, NOITE are strong candidates. Use the second guess to test consonants completely different from your first. And remember position matters — a yellow tile in slot two is NOT in slot two of the answer.",
        ],
      },
      {
        summary: "Origin of the game",
        body: [
          "Wordle was created in 2021 by Welsh software engineer Josh Wardle as a gift for his partner, a word-game enthusiast. He launched it on a simple personal site, and by January 2022 it had millions of daily players.",
          "The New York Times acquired the game that same month for a low-seven-figure sum. The phenomenon spawned hundreds of language adaptations and clones worldwide. Wordle BR is the Brazilian-Portuguese take on the format, keeping the original rules but using a curated Portuguese dictionary focused on everyday vocabulary spoken in Brazil today — no archaic terms or obscure regionalisms.",
        ],
      },
    ],
  },
};

export default async function WordlePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const jsonLd = buildJsonLd(locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GameClient />
      <GameInfo content={content} locale={locale} />
    </>
  );
}
```

- [ ] **Step 2: Validar build**

Run: `cd /home/alexmoncks/projects/acerteamosca && npx next build 2>&1 | tail -30`
Expected:
- "Compiled successfully" ou ausência de "Failed to compile"
- Rota `/[locale]/jogos/wordle` aparece como `● (SSG)` na lista
- Sem warnings sobre `dynamic` + `ssr: false` em Server Component

Se aparecer warning tipo "ssr: false is not allowed in Server Components" — significa que o wrapper `GameClient.jsx` não foi criado ou não está sendo usado. Voltar para Task 2.

---

## Task 4: Validação visual (smoke test do conteúdo)

**Files:** nenhum, validação manual.

- [ ] **Step 1: Subir dev server em porta livre**

Run em background: `cd /home/alexmoncks/projects/acerteamosca && PORT=3939 npm run dev`
Aguardar até `curl -s -o /dev/null -w "%{http_code}" http://localhost:3939/jogos/wordle` retornar `200`.

- [ ] **Step 2: Confirmar conteúdo PT crawlable**

Run:
```bash
curl -s http://localhost:3939/jogos/wordle | grep -o -E '(Sobre o Wordle BR|Como jogar|Controles|Dicas e estratégias|Origem do jogo|Josh Wardle|AÚREO)' | sort -u
```
Expected: deve listar TODAS estas strings: "Sobre o Wordle BR", "Como jogar", "Controles", "Dicas e estratégias", "Origem do jogo", "Josh Wardle", "AÚREO".

Se faltar alguma, o conteúdo PT está mal renderizado.

- [ ] **Step 3: Confirmar contagem de palavras ≥300 (PT)**

Run:
```bash
curl -s http://localhost:3939/jogos/wordle | python3 -c "
import sys, re
html = sys.stdin.read()
text = re.sub(r'<[^>]+>', ' ', html)
text = re.sub(r'\s+', ' ', text)
words = [w for w in text.split() if len(w) > 1]
print(f'Total tokens (rough): {len(words)}')
"
```
Expected: contagem total > 500 (inclui chrome do site + footer; conteúdo do jogo sozinho ~360, mas esse smoke check é para garantir que NÃO ficou vazio).

- [ ] **Step 4: Confirmar conteúdo EN crawlable**

Run:
```bash
curl -s http://localhost:3939/en/jogos/wordle | grep -o -E '(About Wordle BR|How to play|Controls|Tips and strategies|Origin of the game|Josh Wardle)' | sort -u
```
Expected: TODAS estas strings presentes (em inglês).

- [ ] **Step 5: Confirmar JSON-LD usa locale correto**

Run:
```bash
curl -s http://localhost:3939/jogos/wordle | grep -o '"inLanguage":"[^"]*"'
curl -s http://localhost:3939/en/jogos/wordle | grep -o '"inLanguage":"[^"]*"'
```
Expected:
- PT: `"inLanguage":"pt-BR"`
- EN: `"inLanguage":"en"`

- [ ] **Step 6: Confirmar `<details>` HTML presente (não convertido em JS)**

Run:
```bash
curl -s http://localhost:3939/jogos/wordle | grep -c "<details" 
curl -s http://localhost:3939/jogos/wordle | grep -c "<summary"
```
Expected: ambos retornam `4` (4 seções colapsáveis).

- [ ] **Step 7: Encerrar dev server**

Run: `pkill -f "next dev" 2>/dev/null; pkill -f "node.*next" 2>/dev/null; echo done`

---

## Task 5: Commit

**Files:** todos os anteriores.

- [ ] **Step 1: Revisar diff**

Run: `cd /home/alexmoncks/projects/acerteamosca && git status --short && echo "---" && git diff --stat src/components/GameInfo.jsx src/app/\[locale\]/jogos/wordle/`
Expected: 2 arquivos novos (GameInfo.jsx, GameClient.jsx) e 1 modificado (page.js do wordle).

- [ ] **Step 2: Stage e commit**

Run:
```bash
cd /home/alexmoncks/projects/acerteamosca && git add \
  src/components/GameInfo.jsx \
  src/app/\[locale\]/jogos/wordle/GameClient.jsx \
  src/app/\[locale\]/jogos/wordle/page.js \
  docs/superpowers/specs/2026-04-27-conteudo-paginas-jogos-adsense-design.md \
  docs/superpowers/plans/2026-04-27-game-info-wordle-template.md
```

Depois:
```bash
cd /home/alexmoncks/projects/acerteamosca && git commit -m "$(cat <<'EOF'
feat(games): add GameInfo component and wordle bilingual template

Introduces a reusable GameInfo server component (intro + 4 collapsible
<details> sections) and converts the wordle page into a bilingual
async server component with generateMetadata, locale-aware JSON-LD,
and 350+ words of editorial content per locale (PT + EN).

Sets the template for the remaining 13 game pages, planned in
follow-up plans 2.1, 2.2 and 2.3. Required for Google AdSense
approval (item 2 of the AdSense compliance report).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Confirmar commit**

Run: `cd /home/alexmoncks/projects/acerteamosca && git log -1 --stat`
Expected: novo commit listando 5 arquivos (GameInfo.jsx, GameClient.jsx, wordle/page.js, spec, plano).

---

## Self-Review

**Spec coverage:**
- ✅ `GameInfo.jsx` reutilizável — Task 1
- ✅ Bilíngue PT+EN — Task 3 (objeto `content` inline)
- ✅ ≥300 palavras crawlable — Task 3 (4 details + intro, ~360 palavras por idioma) e validado em Task 4
- ✅ `<details>` HTML5 nativo (sem JS) — Task 1 (componente usa `<details>`/`<summary>`) e validado em Task 4 step 6
- ✅ JSON-LD `inLanguage` por locale — Task 3 (`buildJsonLd(locale)`) e validado em Task 4 step 5
- ✅ Estilo cyan/Press Start 2P — Task 1
- ✅ Wrapper client para isolar `dynamic({ ssr: false })` — Task 2
- ⚠️ Cobertura completa dos 14 jogos — **fora do escopo deste plano** (apenas wordle como template; restantes em planos 2.1, 2.2, 2.3)

**Placeholder scan:** sem TBDs, código completo, comandos exatos.

**Type consistency:** chave `details` (não `sections`) usada de forma consistente em `GameInfo.jsx` (Task 1) e em `content` (Task 3); chaves `summary` e `body` consistentes; nomes `pt`/`en` consistentes; `setRequestLocale` importado de `next-intl/server` em Task 3 (mesmo padrão das páginas legais já mergeadas).

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-27-game-info-wordle-template.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
