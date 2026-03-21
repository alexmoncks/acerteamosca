# 🎮 Prompts para CLI — Jogos Acerte a Mosca

> 5 prompts prontos para o Claude Code CLI criar jogos completos em React.
> Um jogo por categoria. Copie e cole cada prompt no terminal.

---

## 1️⃣ PUZZLE & LÓGICA → 2048

```
Crie um jogo 2048 completo em um único arquivo React (.jsx) com as seguintes especificações:

GAMEPLAY:
- Grid 4x4 com tiles numéricos (2, 4, 8, 16... até 2048)
- Movimento por swipe (touch) e setas do teclado (desktop)
- Ao deslizar, todos os tiles se movem na direção escolhida
- Tiles com mesmo valor se fundem ao colidir (2+2=4, 4+4=8, etc)
- Após cada movimento válido, um novo tile (2 ou 4) aparece em posição aleatória
- Vitória ao criar um tile 2048; derrota quando não há mais movimentos possíveis

VISUAL:
- Design moderno e limpo com cantos arredondados nos tiles
- Cada valor tem uma cor distinta (gradiente de tons quentes: bege→amarelo→laranja→vermelho→roxo)
- Animações suaves de slide (200ms ease) e merge (pop scale 1.1→1.0)
- Fonte bold nos números, tamanho proporcional ao valor (números grandes = fonte menor)
- Responsivo: o grid ocupa no máximo 400px de largura, centralizado

INTERFACE:
- Header com título "2048", score atual e best score (salvo em state)
- Botão "Novo Jogo" que reseta o board
- Mensagem de overlay semi-transparente ao vencer ou perder, com botão "Jogar Novamente"
- Área de branding no topo: espaço reservado de 60px de altura com texto "Patrocinado por [Marca]" em cinza claro — será usado para inserir logo do anunciante

TÉCNICO:
- Componente funcional React com hooks (useState, useEffect, useCallback)
- Lógica de merge correta: cada tile só pode fundir uma vez por movimento
- Touch handling com touchstart/touchend calculando direção do swipe (threshold 30px)
- Sem dependências externas além do React e Tailwind (classes utilitárias)
- Export default do componente principal
```

---

## 2️⃣ MATCH & ARCADE → Bubble Shooter

```
Crie um jogo Bubble Shooter completo em um único arquivo React (.jsx) com as seguintes especificações:

GAMEPLAY:
- Tabuleiro hexagonal com bolhas coloridas (6 cores: vermelho, azul, verde, amarelo, roxo, laranja)
- Canhão na parte inferior central que rotaciona para mirar
- Controle estilo Pong — mecânica de mira com setas + disparo:
  - DESKTOP: seta ← e → do teclado rotacionam o ângulo do canhão (incrementos de 3°), Espaço ou seta ↑ dispara
  - MOBILE: 3 botões grandes na parte inferior da tela: [◄ Esquerda] [🔥 Atirar] [► Direita]
  - Os botões mobile devem ter no mínimo 60px de altura, espaçados, com touch feedback visual (scale 0.95 + cor)
  - Segurar o botão de direção rotaciona continuamente (repeat a cada 80ms enquanto pressionado via onTouchStart/onTouchEnd)
- O ângulo do canhão varia entre 10° e 170° (nunca atira para baixo/horizontal)
- Linha de mira pontilhada visível mostrando a trajetória atual (incluindo 1 ricochete nas paredes)
- A bolha viaja em linha reta na direção apontada, ricocheteando nas paredes laterais
- Ao encostar em bolhas do tabuleiro, gruda na posição mais próxima do grid hexagonal
- Grupos de 3+ bolhas da mesma cor são eliminados
- Bolhas "soltas" (sem conexão com o topo) caem e somem (pontos bônus)
- Novas linhas de bolhas descem periodicamente (a cada 5 disparos)
- Game over quando bolhas ultrapassam a linha inferior

VISUAL:
- Bolhas circulares com gradiente radial e brilho (efeito glossy)
- Canvas para renderização fluida do tabuleiro e bolhas
- Canhão visível: triângulo/retângulo estilizado que rotaciona suavemente acompanhando o ângulo atual
- Linha de mira pontilhada (tracejada branca semi-transparente) que atualiza em tempo real ao girar
- Animação de explosão ao eliminar grupo (partículas dispersando)
- Animação de queda com gravidade para bolhas soltas
- Fundo escuro (dark navy #0a0e27) com borda sutil luminosa no tabuleiro
- Botões de controle mobile: estilo d-pad arredondado, cores contrastantes sobre fundo escuro
- Responsivo: largura máxima 400px, altura proporcional, botões se adaptam à largura

INTERFACE:
- Score no topo com animação de incremento
- Preview da próxima bolha ao lado do canhão
- Contador de disparos até próxima descida de linha ("Descida em: 3 tiros")
- Botão de pausa e restart
- Barra de branding no topo: 60px com texto "Patrocinado por [Marca]"
- Os controles de seta + disparo ficam ABAIXO do canvas, nunca sobrepostos ao tabuleiro
- Em desktop os botões mobile ficam ocultos (media query ou detecção de touch)

TÉCNICO:
- Usar <canvas> para o tabuleiro e renderização das bolhas via requestAnimationFrame
- Coordenadas hexagonais (offset coordinates) para posicionamento no grid
- Detecção de colisão circular entre bolha disparada e bolhas do grid
- BFS/flood-fill para detectar grupos de mesma cor e bolhas desconectadas
- Física de ricochete nas paredes (reflexão do ângulo)
- Ângulo do canhão em useRef para atualização contínua sem re-render
- onTouchStart/onTouchEnd nos botões para rotação contínua (setInterval no touch, clearInterval no release)
- onKeyDown/onKeyUp no window para controle por teclado com a mesma lógica de repeat
- Componente funcional React com useRef para canvas e useEffect para game loop
- Sem dependências externas além de React e Tailwind
- Export default do componente principal
```

---

## 3️⃣ AÇÃO & REFLEXO → Caça a Mosca (Whack-a-Mole temático)

```
Crie um jogo "Caça a Mosca" (variação temática de Whack-a-Mole) em um único arquivo React (.jsx) com as seguintes especificações:

GAMEPLAY:
- Grid 3x3 com 9 "buracos" (áreas circulares) de onde moscas aparecem
- Moscas surgem aleatoriamente em 1-3 buracos simultaneamente
- O jogador deve clicar/tocar na mosca antes que ela desapareça
- Tempo de exposição da mosca: começa em 1200ms, diminui progressivamente até 400ms
- Frequência de aparição aumenta com o tempo
- Partida dura 60 segundos (countdown timer)
- A cada 15 segundos, aparece uma "mosca dourada" que vale 5x pontos
- Penalidade de -1 ponto por clique em buraco vazio (mínimo 0)
- Combo system: acertos consecutivos multiplicam pontos (x2 após 5, x3 após 10, x5 após 20)

VISUAL:
- Estilo cartoon/divertido com cores vibrantes
- Mosca desenhada em SVG inline: corpo escuro, asas translúcidas, olhos grandes vermelhos
- Animação de entrada: mosca sobe do buraco com rotação leve (wiggle)
- Animação de acerto: mosca espirala e some com estrelas de impacto
- Animação de miss: ondinha vermelha no buraco
- Cursor personalizado em forma de mata-mosca (via CSS cursor ou div seguindo o mouse)
- Efeito de screen shake sutil ao acertar mosca dourada
- Responsivo: grid máximo 360px, centralizado

INTERFACE:
- Timer grande no topo (countdown 60s) com barra de progresso
- Score com animação de pop ao pontuar
- Indicador de combo atual (flames/fogo quando combo > 5)
- Tela inicial com botão "JOGAR" e instruções rápidas
- Tela final com score, melhor score, acertos/erros, maior combo
- Botão "Jogar Novamente" na tela final
- Barra de branding: 60px no topo com "Patrocinado por [Marca]"

TÉCNICO:
- Componente funcional React com useState, useEffect, useCallback, useRef
- useRef para timers (setInterval/setTimeout) com cleanup adequado no useEffect
- Estado do jogo: 'idle' | 'playing' | 'finished'
- Array de 9 posições com estado individual (empty/fly/goldenFly/hit/miss)
- Randomização com peso para evitar repetição do mesmo buraco consecutivamente
- Animações via CSS transitions e keyframes (sem libs externas)
- Sons opcionais via Web Audio API (buzz da mosca, slap do acerto) — implementar mas manter mutável
- Sem dependências externas além de React e Tailwind
- Export default do componente principal
```

---

## 4️⃣ CARTAS & ESTRATÉGIA → Memory Game (Jogo da Memória)

```
Crie um Jogo da Memória completo em um único arquivo React (.jsx) com as seguintes especificações:

GAMEPLAY:
- Grid de cartas viradas para baixo (3 níveis: 4x3=12, 4x4=16, 6x4=24 cartas)
- O jogador vira 2 cartas por vez clicando/tocando nelas
- Se formam par (mesmo ícone), as cartas permanecem viradas e somem com animação
- Se não formam par, as cartas voltam a ficar viradas após 800ms
- O jogo termina quando todos os pares são encontrados
- Pontuação baseada em: menos tentativas = mais pontos, bônus por tempo rápido
- Timer contando o tempo desde o início

VISUAL:
- Cartas com flip animation 3D real (CSS perspective + rotateY)
- Verso das cartas: padrão geométrico elegante em gradiente (ex: azul→roxo)
- Frente das cartas: ícones/emojis grandes e claros sobre fundo branco
- Ícones temáticos variados: 🍎🚀⚽🎵🌟🎯🐱🌈🔥💎🎪🏆 (usar emojis como conteúdo)
- Animação de match: cartas brilham em verde e escalam levemente antes de sumir
- Animação de erro: cartas tremem (shake) brevemente em vermelho
- Confetti/partículas ao completar o jogo
- Responsivo: cartas com tamanho flexível, gap uniforme, max-width 500px

INTERFACE:
- Seletor de dificuldade na tela inicial (Fácil 4x3 / Médio 4x4 / Difícil 6x4)
- Header com: movimentos feitos, timer (MM:SS), e pares encontrados
- Estrelas de rating ao final (3 estrelas = perfeito, 2 = bom, 1 = ok) baseado em tentativas
- Tela de vitória com stats: tempo, movimentos, rating, e botões "Jogar Novamente" / "Mudar Dificuldade"
- Barra de branding: 60px no topo com "Patrocinado por [Marca]"

TÉCNICO:
- Componente funcional React com useState, useEffect, useCallback, useMemo
- Shuffle das cartas com Fisher-Yates no início de cada partida
- Lógica de flip controlada: máximo 2 cartas viradas simultaneamente, bloquear input durante comparação
- CSS 3D transform para flip: perspective(1000px), transform-style preserve-3d, backface-visibility hidden
- Transições suaves (400ms ease-in-out para flip, 300ms para match/unmatch)
- useMemo para gerar o deck embaralhado apenas quando dificuldade muda
- Sem dependências externas além de React e Tailwind
- Export default do componente principal
```

---

## 5️⃣ PALAVRAS & TRIVIA → Wordle BR

```
Crie um clone de Wordle em Português Brasileiro em um único arquivo React (.jsx) com as seguintes especificações:

GAMEPLAY:
- O jogador tem 6 tentativas para adivinhar uma palavra de 5 letras em português
- Banco de palavras embutido no código: array de no mínimo 100 palavras comuns de 5 letras em PT-BR (ex: GATOS, MUNDO, FESTA, PRAIA, LIVRO, CARRO, PLANO, VERDE, TIGRE, NUVEM, PEDRA, FOLHA, PONTO, TERMO, MUSEU, etc.)
- Após cada tentativa, cada letra recebe feedback de cor:
  - 🟩 Verde: letra correta na posição correta
  - 🟨 Amarelo: letra existe na palavra mas em outra posição
  - ⬛ Cinza escuro: letra não existe na palavra
- Letras duplicadas tratadas corretamente (ex: se palavra é MORRO e jogador digita MOTOR, o primeiro O fica verde, o segundo fica amarelo apenas se houver O restante)
- Validação: só aceitar palavras válidas do banco (rejeitar palavras inexistentes com shake animation)

VISUAL:
- Grid 5x6 de tiles quadrados com bordas suaves
- Animação de flip sequencial ao submeter (cada tile flipa com 100ms de delay entre eles, revelando a cor)
- Animação de bounce ao acertar a palavra (tiles pulam em sequência tipo wave)
- Animação de shake na linha ao tentar palavra inválida
- Tile ativo (sendo digitado) tem borda mais grossa/highlight
- Cores claras e acessíveis: verde (#6aaa64), amarelo (#c9b458), cinza (#787c7e), fundo branco
- Teclado virtual na parte inferior com as mesmas cores de feedback nas teclas já usadas
- Responsivo: grid e teclado se adaptam à tela, max-width 400px

INTERFACE:
- Teclado virtual QWERTY-BR layout com teclas ENTER e ← (backspace)
- Suporte simultâneo a teclado físico (onKeyDown) e teclado virtual (onClick)
- Toast/snackbar temporário para mensagens: "Palavra não encontrada", "Parabéns!", "A palavra era: XXXXX"
- Modal de instruções acessível por ícone ❓
- Tela de resultado com opção de compartilhar resultado em texto (grid de emojis copiado para clipboard)
- Botão "Nova Palavra" para jogar novamente com palavra aleatória diferente
- Barra de branding: 60px no topo com "Patrocinado por [Marca]"

TÉCNICO:
- Componente funcional React com useState, useEffect, useCallback, useRef
- Estado: currentGuess (string), guesses (array de tentativas), gameStatus ('playing'|'won'|'lost')
- useEffect para keydown listener do teclado físico
- Lógica de avaliação de cores com tratamento correto de letras duplicadas:
  1. Primeiro passo: marcar verdes (match exato)
  2. Segundo passo: marcar amarelos (match parcial, descontando os já marcados como verde)
  3. Restante: cinza
- Array de ~150 palavras PT-BR de 5 letras hardcoded (todas maiúsculas, sem acentos)
- Clipboard API para compartilhamento de resultado
- Sem dependências externas além de React e Tailwind
- Export default do componente principal
```

---

## 📋 Notas de Integração

Todos os jogos seguem o mesmo padrão para facilitar integração na plataforma Acerte a Mosca:

1. **Barra de branding** (60px topo) — slot para logo/nome do anunciante
2. **Arquivo único .jsx** — drop-in em qualquer projeto React
3. **Sem dependências externas** — apenas React + Tailwind
4. **Export default** — importável diretamente
5. **Responsivo** — max-width controlado, funciona em mobile e desktop
6. **Estado interno** — cada jogo gerencia seu próprio state

### Para usar no CLI:

```bash
# Copie o prompt desejado e execute:
claude "COLE_O_PROMPT_AQUI"

# Ou salve cada prompt em arquivo e passe como input:
claude < prompt-2048.txt
```