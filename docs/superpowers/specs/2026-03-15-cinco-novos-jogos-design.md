# Design: 5 Novos Jogos — Plataforma Acerte a Mosca

**Data:** 2026-03-15
**Status:** Aprovado

---

## 1. Arquitetura e Padroes Gerais

### Estrutura de arquivos (por jogo)

Cada jogo segue o padrao existente:

```
src/components/games/<NomeJogo>.jsx    -> componente do jogo (unico arquivo)
src/app/jogos/<slug>/page.js           -> page com dynamic() import, ssr: false
server/ws-<slug>.js                    -> (so Memory e 2048) servidor WebSocket
```

### Padroes a seguir

- **Inline styles** (sem Tailwind) — consistente com jogos existentes
- **"use client"** no componente do jogo
- **Canvas** para jogos com animacao continua (Bubble Shooter, Deep Attack)
- **DOM/divs** para jogos de grid (2048, Memory, Wordle)
- Importar `AdBanner`, `RegisterModal`, `useJogador`, `useGameScale` como os jogos atuais
- **Export default** do componente principal

### Homepage

Atualizar o array `jogos` em `src/app/page.js` com os 5 novos jogos:

| Jogo            | slug           | emoji | cor       |
|-----------------|----------------|-------|-----------|
| 2048            | `2048`         | 🔢    | `#f59e0b` |
| Bubble Shooter  | `bubbleshooter`| 🫧    | `#e879f9` |
| Deep Attack     | `deepattack`   | 🚀    | `#22d3ee` |
| Memory Game     | `memory`       | 🧠    | `#34d399` |
| Wordle BR       | `wordle`       | 🔤    | `#a3e635` |

### Ordem de construcao

1. Wordle BR
2. Memory Game (single -> multiplayer WS)
3. 2048 (single -> multiplayer WS de corrida)
4. Bubble Shooter
5. Deep Attack

### Analytics e Rastreabilidade

- Google Analytics tag: `G-GK3BJXYPF4`
- AdSense client: `ca-pub-4148140889800778`
- Cada jogo dispara eventos gtag nos momentos-chave:
  ```js
  window.gtag?.("event", "game_start", { game_name: "<slug>" });
  window.gtag?.("event", "game_end", { game_name: "<slug>", score: <valor> });
  ```
- `AdBanner` com slot especifico por jogo para tracking de receita por pagina

---

## 2. Requisito Transversal: Melhorias no Cadastro

Aplicavel a todos os jogos (novos e existentes).

### Frontend (`RegisterModal.jsx`)

- **Nome**: minimo 3 caracteres, mostrar erro inline em vermelho
- **Email**: validacao de formato com regex, mostrar erro inline
- **WhatsApp**: mascara automatica `(99) 99999-9999`, aceitar so numeros
- **Erros**: mensagens em vermelho abaixo de cada campo invalido
- **Sanitizacao**: trim nos campos, strip HTML tags no frontend

### Backend (`/api/jogadores/route.js`)

- **Nome**: min 3 chars, sanitizar contra injection (strip tags, trim)
- **Email**: validar formato server-side com regex
- **WhatsApp**: validar formato `(XX) XXXXX-XXXX` se fornecido
- **Nome duplicado**: rejeitar com erro "Nome ja cadastrado" (query `findFirst` por nome)
- **Protecao contra injection**: Prisma parameterized queries (ja faz por padrao) + sanitizar inputs antes de salvar

### Comportamento

- Modal aparece uma unica vez — apos cadastro, cookie persiste (via `useJogador`)
- Todos os 8 jogos usam o mesmo `RegisterModal` e `useJogador`

---

## 3. Wordle BR

**Tipo:** DOM (grid de divs, sem canvas)

### Gameplay

- 6 tentativas para adivinhar palavra de 5 letras em PT-BR
- Array de ~150 palavras hardcoded (maiusculas, sem acentos)
- Feedback de cores: verde (posicao certa), amarelo (letra existe, posicao errada), cinza (nao existe)
- Tratamento correto de letras duplicadas (primeiro marca verdes, depois amarelos)
- Validacao: so aceita palavras do banco

### Visual

- Grid 5x6 de tiles com flip sequencial ao submeter (100ms delay entre tiles)
- Bounce animation ao acertar
- Shake na linha ao tentar palavra invalida
- Tile ativo com borda highlight
- Cores: verde `#6aaa64`, amarelo `#c9b458`, cinza `#787c7e`, fundo escuro `#050510`

### Interface

- Teclado virtual QWERTY-BR com ENTER e backspace
- Teclado fisico + virtual simultaneo
- Toast temporario para mensagens ("Palavra nao encontrada", "Parabens!", "A palavra era: X")
- Modal de instrucoes (icone ?)
- Botao compartilhar resultado (grid de emojis copiado para clipboard)
- Botao "Nova Palavra"
- AdBanner + analytics events

### Tecnico

- `useState` para currentGuess, guesses[], gameStatus ('playing'|'won'|'lost')
- `useEffect` para keydown listener
- `useJogador`, `useGameScale`, `AdBanner`, `RegisterModal`
- Inline styles + CSS keyframes via `<style>` tag injetada

---

## 4. Memory Game

**Tipo:** DOM (grid de divs com CSS 3D flip)

### Gameplay — Single Player

- 3 niveis: Facil (4x3=12), Medio (4x4=16), Dificil (6x4=24)
- Virar 2 cartas por vez; par = permanecem viradas e somem; nao par = voltam apos 800ms
- Pontuacao: menos tentativas = mais pontos, bonus por tempo rapido
- Timer contando desde o inicio

### Gameplay — Multiplayer Online (WebSocket)

- Criar/entrar em sala via room link (padrao Pong/Ships)
- Turnos alternados: jogador A vira 2 cartas -> jogador B vira 2 cartas
- Ambos veem o mesmo tabuleiro em tempo real
- Quem encontra um par marca ponto e joga novamente
- Vence quem tiver mais pares ao final
- Se desconectar, o outro vence automaticamente

### Visual

- Cartas com flip 3D real (CSS `perspective` + `rotateY`)
- Verso: padrao geometrico gradiente (azul->roxo)
- Frente: emojis grandes sobre fundo branco
- Match: brilho verde + scale antes de sumir
- Erro: shake + flash vermelho
- Confetti ao completar
- Responsivo: max-width 500px

### Interface

- Seletor de dificuldade + modo (Solo / Online)
- Header: movimentos, timer (MM:SS), pares encontrados
- Multiplayer: indicador de turno, placar dos dois jogadores, status da conexao
- Tela de vitoria: tempo, movimentos, rating (1-3 estrelas), botoes replay/mudar dificuldade
- AdBanner + analytics events

### Tecnico

- Fisher-Yates shuffle no inicio
- Max 2 cartas viradas, bloquear input durante comparacao
- CSS 3D: `perspective(1000px)`, `transform-style: preserve-3d`, `backface-visibility: hidden`
- `server/ws-memory.js` — gerencia salas, sincroniza tabuleiro, turnos, e pares
- Reutilizar padrao de rooms de `ws-pong.js`/`ws-ships.js`

---

## 5. 2048

**Tipo:** DOM (grid de divs com CSS transitions)

### Gameplay — Single Player

- Grid 4x4 com tiles numericos (2, 4, 8... ate 2048)
- Movimento por swipe (touch) e setas do teclado
- Tiles com mesmo valor se fundem ao colidir (cada tile funde so uma vez por movimento)
- Novo tile (2 ou 4) aparece em posicao aleatoria apos cada movimento valido
- Vitoria ao criar tile 2048; derrota quando nao ha movimentos possiveis

### Gameplay — Multiplayer Online (WebSocket)

- Criar/entrar em sala via room link (padrao Pong/Ships)
- Cada jogador tem seu proprio grid 4x4
- Ambos jogam simultaneamente (nao e por turnos)
- Placar lado a lado: score de cada jogador visivel em tempo real
- Vence quem atingir 2048 primeiro, ou quem tiver maior score quando o oponente perder
- Se desconectar, o outro vence
- Servidor sincroniza: eventos de "game over" e "atingiu 2048", score atual de cada jogador
- Cada jogador processa seu grid localmente (servidor nao valida cada movimento)

### Visual

- Cantos arredondados nos tiles
- Cada valor com cor distinta (gradiente bege->amarelo->laranja->vermelho->roxo)
- Animacoes: slide (200ms ease) e merge (pop scale 1.1->1.0)
- Fonte bold, tamanho proporcional ao valor
- Responsivo: grid max 400px centralizado
- Multiplayer: grid principal + mini preview do oponente

### Interface

- Header: titulo "2048", score atual, best score
- Botao "Novo Jogo"
- Overlay semi-transparente ao vencer/perder com "Jogar Novamente"
- Multiplayer: botao "Jogar Online", sala com link copiavel, placar do oponente, status conexao
- AdBanner + analytics events (game_start, game_end com score, modo solo/online)

### Tecnico

- Estado do grid: array 4x4, logica de merge por direcao
- Touch: `touchstart`/`touchend` com threshold 30px para direcao do swipe
- `server/ws-2048.js` — gerencia salas, broadcast de score/status entre jogadores
- Comunicacao leve: so envia score atualizado e eventos (started, game_over, reached_2048)

---

## 6. Bubble Shooter

**Tipo:** Canvas (renderizacao via requestAnimationFrame)

### Gameplay

- Tabuleiro hexagonal com bolhas coloridas (6 cores)
- Canhao na parte inferior central que rotaciona para mirar
- Controles:
  - **Desktop**: setas <-/-> rotacionam (3 graus por incremento), Espaco ou seta cima dispara
  - **Mobile**: 3 botoes grandes abaixo do canvas — [Esquerda] [Atirar] [Direita] (min 60px altura)
  - Segurar botao de direcao = rotacao continua (repeat a cada 80ms)
- Angulo do canhao: 10 a 170 graus (nunca atira horizontal/para baixo)
- Linha de mira pontilhada com 1 ricochete nas paredes
- Bolha viaja em linha reta, ricocheteia nas paredes laterais
- Gruda na posicao mais proxima do grid hexagonal ao encostar
- Grupos de 3+ mesma cor eliminados
- Bolhas sem conexao com o topo caem (pontos bonus)
- Novas linhas descem a cada 5 disparos
- Game over quando bolhas ultrapassam linha inferior

### Visual

- Bolhas com gradiente radial glossy
- Canhao: retangulo estilizado que rotaciona suavemente
- Linha de mira: tracejada branca semi-transparente, atualiza em tempo real
- Animacao de explosao (particulas) ao eliminar grupo
- Animacao de queda com gravidade para bolhas soltas
- Fundo escuro navy `#0a0e27` com borda luminosa no tabuleiro
- Botoes mobile: estilo d-pad arredondado, contrastantes
- Desktop: botoes mobile ocultos
- Responsivo: max 400px largura

### Interface

- Score no topo com animacao de incremento
- Preview da proxima bolha ao lado do canhao
- Contador "Descida em: X tiros"
- Botoes pausa e restart
- AdBanner + analytics events

### Tecnico

- Canvas com `requestAnimationFrame` para game loop
- Coordenadas hexagonais (offset coordinates) para grid
- Colisao circular entre bolha disparada e bolhas do grid
- BFS/flood-fill para detectar grupos e bolhas desconectadas
- Reflexao de angulo para ricochete
- Angulo em `useRef` para atualizacao continua sem re-render
- `onTouchStart`/`onTouchEnd` + `setInterval`/`clearInterval` para rotacao continua
- `onKeyDown`/`onKeyUp` no window com mesma logica

---

## 7. Deep Attack (clone River Raid espacial)

**Tipo:** Canvas (scrolling vertical continuo)

### Gameplay

- Nave do jogador na parte inferior, corredor espacial scrollando para baixo (top-down)
- Corredor com paredes que se estreitam/alargam, criando passagens
- Inimigos variados spawnam de cima:
  - **Aliens basicos**: movem em linha reta para baixo (1 tiro para destruir)
  - **Aliens zigzag**: movem lateralmente enquanto descem (1 tiro)
  - **Naves grandes**: mais lentas, 3 tiros para destruir, mais pontos
  - **Barreiras/asteroides**: indestrutiveis, desviar
- **Energia**: barra que diminui constantemente; coletar power-ups para reabastecer
- Game over: colidir com inimigo/parede ou energia acabar
- Dificuldade progressiva: velocidade de scroll aumenta, mais inimigos, passagens mais estreitas
- Controles:
  - **Desktop**: setas <-/-> movem nave, Espaco atira
  - **Mobile**: 3 botoes abaixo do canvas — [Esquerda] [Atirar] [Direita] (segurar = movimento continuo)
  - Tiro automatico opcional (toggle) para mobile

### Visual

- Fundo: espaco profundo com estrelas em parallax (2-3 camadas)
- Nave do jogador: triangulo estilizado com glow
- Inimigos: formas geometricas coloridas distintas por tipo
- Tiros: lasers com trail de luz
- Explosoes: particulas ao destruir inimigos
- Power-ups de energia: icone pulsante verde/azul
- Paredes do corredor: linhas com glow neon
- Responsivo: max 400px largura

### Interface

- Score no topo
- Barra de energia (fuel gauge) visivel, muda cor (verde->amarelo->vermelho)
- Tela inicial com "DEEP ATTACK" + botao jogar
- Game over: score final, best score, botao replay
- Botoes mobile ocultos em desktop
- AdBanner + analytics events

### Tecnico

- Canvas com `requestAnimationFrame`
- Arrays de entidades: inimigos[], tiros[], powerups[], estrelas[]
- Spawn system: timers baseados em distancia percorrida / dificuldade
- Colisao retangular (AABB) entre nave/tiros e inimigos/paredes
- Corredor gerado proceduralmente: array de segmentos com largura variavel
- Parallax: 2-3 camadas de estrelas com velocidades diferentes
