# Padrão PixiJS v8 — Plataforma Acerte a Mosca

**Data:** 2026-03-30
**Status:** Aprovado
**Aplicação:** Jogos de ação com muitos sprites/partículas (beat'em up, shooters, platformers)
**Coexiste com:** Canvas 2D (jogos simples: puzzle, grid, card games)

---

## 1. Decisão Arquitetural

### Por que PixiJS imperativo (não @pixi/react)

- `@pixi/react` v8 exige React 19 — plataforma usa React 18
- Abordagem imperativa via `useRef` + `useEffect` se alinha ao padrão existente dos jogos canvas
- Componente continua sendo um único JSX — mesma estrutura de todos os outros jogos
- PixiJS Application gerenciada via ref, Ticker substitui requestAnimationFrame

### Quando usar PixiJS vs Canvas 2D

| Critério                        | PixiJS (WebGL)          | Canvas 2D               |
|---------------------------------|-------------------------|--------------------------|
| Sprites simultâneos na tela     | > 20                    | < 20                     |
| Partículas/efeitos visuais      | Sim                     | Mínimo                   |
| Parallax multi-camada           | Sim (Container nativo)  | Manual                   |
| Tipo de jogo                    | Ação, shooter, beat'em up | Puzzle, grid, card game |
| Performance mobile necessária   | Alta (GPU)              | Adequada (CPU)           |

---

## 2. Setup — Dependências

```bash
npm install pixi.js@^8.2.6
```

Apenas `pixi.js` — sem `@pixi/react`, sem `@pixi/particle-emitter`.
Partículas e efeitos são implementados com Graphics + Containers nativos do PixiJS v8.

---

## 3. Estrutura do Componente (Template)

```jsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import AdBanner from "@/components/AdBanner";
import RegisterModal from "@/components/RegisterModal";
import useJogador from "@/hooks/useJogador";
import useGameScale from "@/hooks/useGameScale";

// PixiJS — import imperativo
import { Application, Container, Graphics } from "pixi.js";

// ============================================================
// CONSTANTES DO JOGO
// ============================================================
const CANVAS_W = 400;
const CANVAS_H = 300;

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function MeuJogoPixi() {
  const containerRef = useRef(null);    // div que recebe o canvas
  const appRef = useRef(null);          // instância PixiJS Application
  const gameRef = useRef({});           // estado mutável do game loop (não causa re-render)
  const keysRef = useRef(new Set());    // teclas pressionadas

  const [screen, setScreen] = useState("menu"); // menu | playing | gameover
  const [score, setScore] = useState(0);

  const { jogador } = useJogador();
  const { scale, containerStyle } = useGameScale(CANVAS_W);

  // --------------------------------------------------------
  // INICIALIZAÇÃO PIXIJS
  // --------------------------------------------------------
  useEffect(() => {
    if (screen !== "playing") return;

    let destroyed = false;
    const app = new Application();

    (async () => {
      await app.init({
        width: CANVAS_W,
        height: CANVAS_H,
        backgroundColor: 0x050510,
        antialias: false,          // pixel art — sem antialias
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        preference: "webgl",       // forçar WebGL (não WebGPU)
      });

      if (destroyed) { app.destroy(); return; }

      // Injetar canvas no DOM
      containerRef.current?.appendChild(app.canvas);
      appRef.current = app;

      // ----- MONTAR CENA -----
      const scene = buildScene(app);
      gameRef.current = {
        ...scene,
        score: 0,
        gameOver: false,
      };

      // ----- GAME LOOP VIA TICKER -----
      app.ticker.add((ticker) => {
        if (gameRef.current.gameOver) return;

        const dt = ticker.deltaTime; // 1.0 = 60fps, 0.5 = 120fps
        update(gameRef.current, keysRef.current, dt);
      });
    })();

    return () => {
      destroyed = true;
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, [screen]);

  // --------------------------------------------------------
  // INPUT (keyboard)
  // --------------------------------------------------------
  useEffect(() => {
    const onDown = (e) => keysRef.current.add(e.code);
    const onUp = (e) => keysRef.current.delete(e.code);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // --------------------------------------------------------
  // RENDER (telas)
  // --------------------------------------------------------
  if (screen === "menu") {
    return (
      <div style={{ ...containerStyle, textAlign: "center", color: "#fff" }}>
        <h1 style={{ fontFamily: "'Press Start 2P', monospace" }}>MEU JOGO</h1>
        <button onClick={() => setScreen("playing")}>JOGAR</button>
      </div>
    );
  }

  if (screen === "gameover") {
    return (
      <div style={{ ...containerStyle, textAlign: "center", color: "#fff" }}>
        <h2>GAME OVER</h2>
        <p>Score: {score}</p>
        <button onClick={() => setScreen("playing")}>NOVAMENTE</button>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div
        ref={containerRef}
        style={{ width: CANVAS_W, height: CANVAS_H, margin: "0 auto" }}
      />
      <AdBanner slot="meujogo_bottom" />
    </div>
  );
}

// ============================================================
// CONSTRUIR CENA (chamado 1x no init)
// ============================================================
function buildScene(app) {
  // Camadas de parallax
  const bgLayer = new Container();
  const gameLayer = new Container();
  const fgLayer = new Container();
  const hudLayer = new Container();

  app.stage.addChild(bgLayer, gameLayer, fgLayer, hudLayer);

  // Jogador (desenhado com Graphics)
  const player = drawPlayer();
  player.x = 60;
  player.y = 200;
  gameLayer.addChild(player);

  // Array de inimigos, projetis, partículas
  const enemies = [];
  const particles = [];

  return {
    app,
    bgLayer, gameLayer, fgLayer, hudLayer,
    player,
    enemies,
    particles,
    cameraX: 0,
  };
}

// ============================================================
// DESENHAR JOGADOR (Graphics — sem assets externos)
// ============================================================
function drawPlayer() {
  const g = new Graphics();

  // Cabeça
  g.circle(16, 8, 8);
  g.fill({ color: 0xf4c48a });

  // Cabelo
  g.rect(8, 0, 16, 6);
  g.fill({ color: 0x1a1a1a });

  // Corpo (gi branco)
  g.rect(8, 16, 16, 20);
  g.fill({ color: 0xffffff });

  // Faixa
  g.rect(8, 24, 16, 3);
  g.fill({ color: 0x1a1a1a });

  // Pernas
  g.rect(8, 36, 6, 14);
  g.fill({ color: 0xffffff });
  g.rect(18, 36, 6, 14);
  g.fill({ color: 0xffffff });

  return g;
}

// ============================================================
// UPDATE (chamado a cada tick — NÃO CAUSAR RE-RENDER)
// ============================================================
function update(game, keys, dt) {
  const { player } = game;
  const speed = 3 * dt;

  // Movimento
  if (keys.has("ArrowLeft"))  player.x -= speed;
  if (keys.has("ArrowRight")) player.x += speed;

  // ... update inimigos, colisões, partículas, câmera
  // Todo estado mutável fica em gameRef.current
  // Só chamar setScore/setScreen quando necessário (fim do jogo)
}
```

---

## 4. Padrões Essenciais

### 4.1 Estado mutável vs React state

```
gameRef.current = { ... }   → Estado que muda a cada frame (posições, velocidades, HP)
                               NUNCA usar useState para isso — causa re-render a 60fps

useState / setScreen          → Mudança de tela (menu/playing/gameover)
useState / setScore           → Score exibido no React (atualizar a cada X frames, não todo tick)
```

**Regra**: dentro do `app.ticker.add()`, só usar refs. Chamar `setScreen("gameover")` apenas quando o jogo acaba.

### 4.2 Hierarquia de Containers (cena)

```
app.stage
├── bgLayer      (parallax fundo — velocidade 0.1-0.3x)
├── midLayer     (cenário meio — velocidade 0.5-0.7x)
├── gameLayer    (jogador, inimigos, projéteis — velocidade 1x)
├── fgLayer      (elementos à frente — velocidade 1.2x)
└── hudLayer     (HUD fixo — NÃO se move com câmera)
```

Parallax: cada layer tem `container.x = -cameraX * layerSpeed`.

### 4.3 Câmera

```js
function updateCamera(game, dt) {
  const { player, bgLayer, midLayer, gameLayer, fgLayer } = game;
  const targetX = player.x - CANVAS_W * 0.35;
  game.cameraX += (targetX - game.cameraX) * 0.1;
  game.cameraX = Math.max(0, Math.min(game.cameraX, game.levelWidth - CANVAS_W));

  bgLayer.x  = -game.cameraX * 0.1;
  midLayer.x = -game.cameraX * 0.5;
  gameLayer.x = -game.cameraX;
  fgLayer.x  = -game.cameraX * 1.2;
  // hudLayer.x = 0  (fixo)
}
```

### 4.4 Sprites com Graphics (sem assets)

Todos os jogos da plataforma desenham personagens com formas geométricas.
No PixiJS, usar `Graphics` ao invés de `ctx.fillRect()`:

```js
// Canvas 2D (padrão antigo)
ctx.fillStyle = "#fff";
ctx.fillRect(x, y, 16, 20);

// PixiJS v8 (padrão novo)
const g = new Graphics();
g.rect(0, 0, 16, 20);
g.fill({ color: 0xffffff });
gameLayer.addChild(g);
g.x = x;
g.y = y;
```

**Vantagem**: GPU batch rendering. 100 inimigos com `Graphics` = 1 draw call.

### 4.5 Partículas (sem lib externa)

```js
function spawnParticles(game, x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const p = new Graphics();
    p.circle(0, 0, 2 + Math.random() * 3);
    p.fill({ color });

    p.x = x;
    p.y = y;
    p.vx = (Math.random() - 0.5) * 6;
    p.vy = (Math.random() - 0.5) * 6 - 2;
    p.life = 1.0;
    p.decay = 0.02 + Math.random() * 0.03;

    game.fgLayer.addChild(p);
    game.particles.push(p);
  }
}

function updateParticles(game, dt) {
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 0.2 * dt; // gravidade
    p.life -= p.decay * dt;
    p.alpha = p.life;

    if (p.life <= 0) {
      p.destroy();
      game.particles.splice(i, 1);
    }
  }
}
```

### 4.6 Colisão (AABB — igual ao padrão canvas)

```js
function aabb(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}
```

Funciona igual — `Graphics` tem `.x`, `.y`, e dimensões via bounds.

### 4.7 Cleanup (evitar memory leak)

```js
// No return do useEffect:
return () => {
  destroyed = true;
  if (appRef.current) {
    appRef.current.destroy(true, { children: true });
    appRef.current = null;
  }
};
```

O `destroy(true, { children: true })` remove canvas do DOM e destrói todos os containers/graphics filhos.

---

## 5. Integração com Plataforma

Mantém exatamente o mesmo padrão:

```
src/components/games/KungFuCastle.jsx    → componente único
src/app/[locale]/jogos/kungfucastle/page.js  → dynamic() import, ssr: false
```

- `AdBanner`, `RegisterModal`, `useJogador`, `useGameScale` — usados normalmente no JSX
- Inline styles — sem Tailwind
- `"use client"` — obrigatório
- Score submission — mesmo endpoint `/api/scores`
- Mobile controls — mesmo componente `MobileControls.jsx`
- gtag events — mesmos padrões

**A única mudança** é dentro do JSX: onde antes tinha `<canvas ref={canvasRef}>`, agora tem `<div ref={containerRef}>` e o PixiJS injeta seu próprio canvas dentro.

---

## 6. Diferenças do Padrão Canvas 2D

| Aspecto            | Canvas 2D (antigo)                | PixiJS v8 (novo)                        |
|--------------------|-----------------------------------|-----------------------------------------|
| Elemento           | `<canvas ref={canvasRef}>`        | `<div ref={containerRef}>` + app.canvas |
| Game loop          | `requestAnimationFrame(loop)`     | `app.ticker.add((ticker) => ...)`       |
| Desenhar           | `ctx.fillRect()`, `ctx.arc()`     | `new Graphics().rect()`, `.circle()`    |
| Limpar tela        | `ctx.clearRect(0,0,W,H)`         | Automático pelo renderer                |
| Agrupamento        | Nenhum (tudo no mesmo ctx)        | `Container` (hierarquia de cena)        |
| Partículas         | Array + ctx.fillRect manual       | Array + Graphics com `.alpha`           |
| Performance        | CPU (1 thread)                    | GPU (batch rendering WebGL)             |
| Dependência npm    | Nenhuma                           | `pixi.js@^8.2.6`                        |
| Cleanup            | cancelAnimationFrame              | `app.destroy(true, {children: true})`   |

---

## 7. Checklist para Novo Jogo PixiJS

- [ ] `npm install pixi.js@^8.2.6` (se ainda não instalado)
- [ ] Criar `src/components/games/NomeJogo.jsx` com template acima
- [ ] Criar `src/app/[locale]/jogos/slug/page.js` com dynamic import
- [ ] Implementar `buildScene()` com hierarquia de containers
- [ ] Implementar `update()` com toda lógica no gameRef (sem re-renders)
- [ ] Adicionar mobile controls em `MobileControls.jsx`
- [ ] Adicionar ao array `jogos` na homepage
- [ ] AdBanner slot + gtag events + score submission
- [ ] Testar em mobile (performance WebGL)
- [ ] Testar cleanup (trocar de tela sem memory leak)
