# Conteúdo Editorial das Páginas de Jogo — Design Spec

**Data:** 2026-04-27
**Autor:** brainstorming session
**Contexto:** Item 2 do relatório de adequação Google AdSense ("Páginas Individuais para cada Jogo" + "Mínimo de 300 palavras por jogo")

## Objetivo

Adicionar conteúdo editorial bilíngue (PT+EN) de ~350-400 palavras por idioma em cada uma das 14 páginas de jogo, atingindo o requisito mínimo do Google AdSense de 300+ palavras por página individual de jogo, **sem prejudicar a UX do jogador** (que quer jogar, não ler).

## Requisitos

### Funcionais
- Texto descritivo, instrucional e contextual em todas as 14 páginas de jogo
- Bilíngue: PT (acerteamosca.com.br) e EN (nailedthefly.com)
- Conteúdo crawlável por bots de busca/AdSense **sem necessidade de JS** (deve estar no HTML inicial)
- 5 seções por jogo: Sobre / Como jogar / Controles / Dicas / Origem do gênero
- ~350-400 palavras por idioma por jogo (total ~9.800 palavras)

### Não-funcionais
- UX: jogador acessa página → canvas pronto para jogar imediatamente, texto fica abaixo do fold sem competir por atenção
- SEO: páginas continuam sendo SSG (statically generated), sem custo extra de runtime
- Manutenibilidade: estrutura comum a todos os 14 jogos, fácil de editar e adicionar novos jogos

### Fora de escopo
- Imagens/screenshots por jogo (pode ser plano futuro)
- Vídeo embed (YouTube etc.)
- Comentários ou rating de usuários
- Categorização visual por gênero na home (item 4 do relatório AdSense — separado)

## Arquitetura

### Componente novo: `src/components/GameInfo.jsx`

Server component, sem hooks, recebe `content` e `locale` como props. Renderiza:

```jsx
<aside style={{ maxWidth: 800, margin: "40px auto 0", padding: "0 20px" }}>
  <h2 style={...}>{c.title}</h2>
  <p style={...}>{c.intro}</p>
  {c.details.map((d) => (
    <details style={...}>
      <summary style={...}>{d.summary}</summary>
      <div style={...}>
        {d.body.map((para) => <p>{para}</p>)}
      </div>
    </details>
  ))}
</aside>
```

Onde `c` é o objeto resolvido do conteúdo (`contentPT` ou `contentEN`).

**Por que `<details>`:** elemento HTML5 nativo, totalmente indexável por crawlers (bot lê o conteúdo dentro mesmo se colapsado), zero JS, comportamento de toggle nativo, acessível por teclado.

### Estrutura do objeto `content` por jogo

Padrão fixo, replicado em cada `page.js`:

```js
const content = {
  pt: {
    title: "Sobre o Wordle BR",
    intro: "Adivinhe a palavra de 5 letras em 6 tentativas...",
    details: [
      { summary: "Como jogar", body: ["...", "..."] },
      { summary: "Controles", body: ["..."] },
      { summary: "Dicas e estratégias", body: ["...", "..."] },
      { summary: "Origem do jogo", body: ["...", "..."] },
    ],
  },
  en: { /* same shape */ },
};
```

Resolve via `const c = locale === "en" ? content.en : content.pt;`.

### Integração no `page.js` de cada jogo

Cada arquivo passa por 3 mudanças:

1. **`metadata` estático → `generateMetadata({ params })` bilíngue:**
   ```js
   export async function generateMetadata({ params }) {
     const { locale } = await params;
     const isPt = locale === "pt";
     return {
       title: isPt ? "..." : "...",
       description: isPt ? "..." : "...",
       alternates: { canonical: isPt ? "/jogos/wordle" : "/jogos/wordle" },
       openGraph: { ... }
     };
   }
   ```

2. **JSON-LD passa a usar `inLanguage` por locale.** Mantém o resto do schema VideoGame.

3. **Default export passa a ser async + renderiza `<GameInfo>`:**
   ```jsx
   export default async function WordlePage({ params }) {
     const { locale } = await params;
     setRequestLocale(locale);
     return (
       <>
         <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(locale)) }} />
         <WordleBR />
         <GameInfo content={content} locale={locale} />
       </>
     );
   }
   ```

### Estilo visual

Alinhado ao tema do site:
- Container: `maxWidth: 800, margin: "40px auto 0"`
- Título da seção (h2): `Press Start 2P`, `#00f0ff`, fontSize 14
- Intro (`<p>`): `Fira Code`, `#ccd6f6`, fontSize 13
- `<summary>`: `Press Start 2P`, fontSize 11, padding "10px 14px", border-left 2px `#00f0ff`, cursor pointer
- `<details>`: marginBottom 12, padding interno
- Cor do body do details: `#8892b0`, fontSize 12, lineHeight 1.7
- Sem ícones extras (o triângulo nativo do `<details>` basta)

## Diretrizes de redação do conteúdo

Para garantir consistência entre os 14 jogos, todos os textos seguem:

### Tom
- **PT:** descontraído, brasileiro, próximo do jogador, sem jargão técnico desnecessário
- **EN:** equivalente em inglês casual, mas sem gírias regionais

### Estrutura por seção

**`title`** (h2): "Sobre o [Nome do Jogo]" / "About [Game Name]"

**`intro`** (~50 palavras): pitch curto. O quê é o jogo, gênero, e por que é divertido. Termina com call-to-action implícito.

**`details[0]` Como jogar / How to play** (~70-90 palavras, 1-2 parágrafos):
- Objetivo do jogo
- Mecânica principal (movimento, ataque, ação)
- Condição de vitória/derrota

**`details[1]` Controles / Controls** (~40-60 palavras, 1 parágrafo + lista bullet):
- Desktop: setas, espaço, mouse, etc.
- Mobile: tap, swipe, botões touch

**`details[2]` Dicas e estratégias / Tips and strategies** (~80-100 palavras, 1 parágrafo):
- 4-6 dicas práticas, em forma de bullet ou frase corrida
- Foco em coisas que ajudam a fazer mais pontos / passar de fase

**`details[3]` Origem do gênero / Origin** (~80-100 palavras, 1-2 parágrafos):
- História do gênero ou do jogo clássico que inspirou (ex: Pong → Atari 1972; Wordle → Josh Wardle 2021)
- Curiosidades que agregam contexto cultural
- Fecha com como esta versão dialoga com o original

### Vocabulário SEO
Cada texto deve incluir naturalmente:
- Nome do jogo (em PT e EN respectivos)
- Termos de busca relevantes (ex: "jogo de palavras grátis", "wordle em português", "Pong online", "puzzle game free")
- "navegador", "online", "grátis" / "browser", "online", "free"
- Sem keyword stuffing — escrita natural sempre

## Decomposição em sub-planos

Conteúdo total grande (~9800 palavras). Vamos dividir em planos sequenciais:

### Plano 2.0 — Infraestrutura + jogo template
- Criar `src/components/GameInfo.jsx`
- Atualizar `src/app/[locale]/jogos/wordle/page.js` como **referência completa** (todas as 3 mudanças, conteúdo PT+EN escrito 100%)
- Smoke test: `/jogos/wordle` e `/en/jogos/wordle` mostram texto

### Plano 2.1 — Batch A (5 jogos populares/prioritários)
- pong, acerteamosca, 3invader, brickbreaker, kungfucastle
- Mesma estrutura técnica + conteúdo escrito

### Plano 2.2 — Batch B (5 jogos)
- 2048, bubbleshooter, memory, jacare, tiroaoalvo

### Plano 2.3 — Batch C (3 jogos restantes)
- ships, batalha-naval, deepattack

Cada plano (2.1, 2.2, 2.3) será executável independentemente e pode ser priorizado pelo user.

## Lista dos 14 jogos e ângulo histórico (referência para redação)

| Slug | Nome PT | Nome EN | Gênero | Inspiração histórica |
|---|---|---|---|---|
| acerteamosca | Acerte a Mosca | Nailed The Fly | Reflexo / Click | Próprio (2024) |
| pong | Pong | Pong | Arcade clássico | Atari 1972 (Allan Alcorn) |
| ships | Ships | Ships | Naval / Ricochete | Battleship + arcade clássicos |
| wordle | Wordle BR | Wordle | Word puzzle | Josh Wardle 2021 |
| memory | Memory Game | Memory | Memory match | Concentration 1959 |
| 2048 | 2048 | 2048 | Sliding number | Gabriele Cirulli 2014 |
| bubbleshooter | Bubble Shooter | Bubble Shooter | Match-3 / Aim | Puzzle Bobble (Taito 1994) |
| deepattack | Deep Attack | Deep Attack | Space shooter | Galaga / Asteroids |
| jacare | Jacaré | Jacare | Crossy road | Frogger (Konami 1981) |
| tiroaoalvo | Tiro ao Alvo | Target Shooter | Aiming / FPS lite | Duck Hunt (Nintendo 1984) |
| batalha-naval | Batalha Naval | Battleship | Strategy / Grid | Battleship (1931 paper game) |
| brickbreaker | Brick Breaker | Brick Breaker | Paddle / Brick | Breakout (Atari 1976, Steve Wozniak) |
| 3invader | 3Invader | 3Invader | Shoot-em-up | Space Invaders (Taito 1978) |
| kungfucastle | Kung Fu Castle | Kung Fu Castle | Side-scroll beat-em-up | Kung-Fu Master (Irem 1984) |

## Critérios de sucesso

- ✅ Cada `/[locale]/jogos/<slug>` tem ≥300 palavras de texto crawlável (verificar com curl + word count)
- ✅ Texto aparece abaixo do componente do jogo, não sobreposto/competindo
- ✅ `<details>` colapsam/expandem nativamente sem JS extra
- ✅ Ambos os locales (`/jogos/...` e `/en/jogos/...`) mostram conteúdo apropriado
- ✅ JSON-LD `inLanguage` reflete o locale corretamente
- ✅ `npx next build` continua compilando todas as 14 páginas como SSG (sem regredir performance)
- ✅ Footer global continua aparecendo nas páginas atualizadas

## Riscos e mitigações

**Risco:** Texto na página pode parecer "spam SEO" e prejudicar UX.
**Mitigação:** Seções colapsadas por padrão, intro curta, copy descontraída e útil (não keyword-spam).

**Risco:** Tradução EN inferior em jogos com referências culturais brasileiras.
**Mitigação:** Tradução adapta o tom e mantém termos consagrados (ex: "Acerte a Mosca" → "Nailed The Fly", já estabelecido no domínio EN).

**Risco:** Plano longo gera fadiga no executor / risco de erro composto.
**Mitigação:** Decomposição em 4 planos sequenciais (2.0 / 2.1 / 2.2 / 2.3).

## Self-review

- ✅ Sem placeholders ("TBD", etc.)
- ✅ Internamente consistente (estrutura única replicada em 14 jogos)
- ✅ Escopo decomposto em 4 sub-planos sequenciais
- ✅ Ambiguidades resolvidas (locale switching: mesmo padrão das páginas legais; UX: `<details>` decidido com user)
