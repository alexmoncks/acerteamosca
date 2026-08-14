# Kung Fu Castle — Fase 2: Portão do Castelo

**Date:** 2026-08-14
**Scope:** Segunda fase jogável — cenário próprio, pool de inimigos novo, e o Guardião do Portão com máquina de estados completa
**Approach:** Cenário vira dado por fase; IA do chefe sai para um módulo puro e testável

---

## Contexto

A fase 1 está fechada e verificada. O que impede a fase 2 hoje:

1. O cenário é construído **uma única vez** em `buildScene()`, com o tileset, o
   parallax e o `PROP_LAYOUT` da fase 1 cravados. `loadPhase()` limpa inimigos e
   partículas mas não toca no cenário — entrar na fase 2 mostraria o jardim da
   fase 1 com inimigos novos.
2. O loop de inimigos é genérico: anda até o jogador e bate. O Guardião precisa
   de 8 golpes com telegrafia, bloqueio e 3 fases de comportamento.

Todos os assets da fase 2 já existem no disco. Os dois parallax foram gerados
em 2026-08-14 (`fase2-parallax-castelo.png`, `fase2-parallax-muralha.png`).

---

## Arquitetura

```
src/components/games/
├── kungfu-assets.js    manifesto + loader (ganha fase 2)
├── kungfu-anim.js      AnimController (inalterado)
├── kungfu-combat.js    matemática pura de combate (ganha nada)
├── kungfu-boss.js      NOVO — máquina de estados do chefe, pura
└── KungFuCastle.jsx    orquestração (ganha cenário por fase)
```

`kungfu-boss.js` não importa PixiJS e não toca em estado do jogo. Recebe
valores, devolve o próximo estado e uma lista de **intenções**; quem aplica é o
`update()`. É o que torna a luta testável sem navegador.

---

## Parte 1 — Cenário por fase

### O problema de ordem de profundidade

`gameLayer` guarda o sprite do jogador **e** as tiles de chão. `fgLayer` guarda
props **e** as partículas. Limpar essas camadas inteiras na troca de fase
destruiria jogador e partículas.

**Solução:** quatro contêineres de cenário criados uma única vez em
`buildScene()`, em índices fixos dentro das camadas existentes:

```
bgLayer   → [bgScenery]                        céu + castelo distante
midLayer  → [midScenery]                       muralha + ponte
gameLayer → [groundScenery, ...playerSprite,   tiles + props no nível do chão
             ...enemySprites]
fgLayer   → [fgScenery, ...particles]          props à frente
```

`clearScenery(game)` chama `removeChildren()` **nos contêineres**, destruindo os
filhos; nunca destrói os contêineres. A ordem de profundidade fica estável entre
fases porque os índices dos contêineres nunca mudam. Isso também reproduz
exatamente a profundidade atual da fase 1: props de chão já são adicionados
antes do jogador, e props de frente antes das partículas.

### PHASE_SCENERY

```js
const PHASE_SCENERY = {
  1: {
    levelWidth: 2400,
    sky: { type: "starfield", color: 0x06061a, stars: 200 },
    bg:  [{ asset: "parallax-montanhas", tile: true, scale: 2.2, alpha: 0.6, y: "horizon", parallax: 0.15 }],
    mid: [{ asset: "parallax-arvores",   tile: true, y: "ground-overlap", parallax: 0.5 }],
    tileset: "fase1-jardim",
    props: [ /* PROP_LAYOUT atual, movido para cá sem alteração */ ],
  },
  2: {
    levelWidth: 2600,
    sky: { type: "gradient", from: 0xd97706, to: 0x2a1b3d },
    bg:  [{ asset: "fase2-parallax-castelo", every: 520, alpha: 0.75, parallax: 0.15 }],
    mid: [
      { asset: "fase2-parallax-muralha", tile: true, parallax: 0.5 },
      { asset: "ponte-madeira", x: 900, scale: 2, parallax: 0.5 },
    ],
    tileset: "fase2-portao-chao",
    props: [ /* tabela abaixo */ ],
  },
};
```

Chaves de posicionamento: `tile: true` repete o asset por toda a largura da fase;
`every: N` repete a cada N px (para elementos esparsos como a silhueta do
castelo); `x: N` posiciona uma única vez. `y` aceita as âncoras simbólicas
`"horizon"` (logo acima da linha de árvores) e `"ground-overlap"` (base
sobreposta ao chão), resolvidas na construção.

`levelWidth` já existe como `game.levelWidth` e é usado pelo clamp do jogador,
pela câmera e pelo alcance do especial. Só o código de **construção** do cenário
usa a constante `LEVEL_WIDTH` direto — essas ocorrências passam a ler a largura
da fase.

### Céu em gradiente

A fase 1 desenha o céu com `Graphics` (retângulo + estrelas). A fase 2 usa o
mesmo mecanismo com faixas horizontais interpolando de `from` a `to`, sem
textura — crepúsculo alaranjado no topo do horizonte escurecendo para o alto.

### Props da fase 2

| Asset | x | Camada | Observação |
|---|---|---|---|
| `portao-madeira` | 60 | game | portão de entrada, atrás do jogador |
| `estandarte` | 240, 780, 1500, 2100 | fg | estandartes de guerra |
| `tocha-fogo` | 180, 620, 1180, 1740, 2280 | fg | tochas fincadas no chão |
| `braseiro-fogo` | 420, 1360, 2000 | game | braseiros |
| `pilar-ornamentado` | 520, 1600 | game | pilares |
| `komainu` | 340, 2260 | game | estátuas guardiãs |
| `portao-madeira-aberto` | 2500 | game | saída para a fase 3 |

---

## Parte 2 — Inimigos e chefe

### PHASE_CONFIG

```js
2: {
  enemies: ["guarda-bastao", "ninja", "kunoichi"],
  boss: "guardiao-portao",
  killThreshold: 100,
},
```

Os três inimigos já estão no `buildEnemyManifest()`. `MAX_PHASE` deriva de
`PHASE_CONFIG`, então a vitória passa automaticamente a ser depois da fase 2 —
nenhuma mudança necessária.

### BOSS_STATS

```js
"guardiao-portao": {
  hp: 35, damage: 14, speed: 1.2, score: 1500, frameSize: 68,
  hitbox: { w: 26, h: 52, ox: 21, oy: 8 },
  groundOffset: 12,
  spriteFacing: -1,   // como todos os chefes, a arte olha para oeste
  ai: "guardiao",     // liga a máquina de estados
},
```

O doc de chefes dizia sprite 48×56; os arquivos no disco são **68×68**. Vale o
arquivo. A hitbox precisa ser medida na transparência antes de fechar o número
acima — o valor listado é estimativa a partir da hitbox do `mestre-capangas`.

### Manifesto de animações

13 folhas, todas 68px. Velocidade derivada da duração de cada golpe
(`frames / duração_em_frames`), igual ao que foi feito no soco do jogador:

| Anim | Frames | Uso |
|---|---|---|
| `idle` | 3 | parado / reposicionando |
| `walk` | 6 | aproximação |
| `horizontal-swing` | 6 | golpe base |
| `overhead-smash` | 4 | golpe telegrafado |
| `stuck` | 4 | maça presa — janela de punição |
| `earthquake` | 4 | AoE de tela (fase C) |
| `shield-block` | 4 | bloqueio |
| `charge` | 6 | investida blindada |
| `kick` | 7 | chute surpresa |
| `taunt` | 4 | provocação + cura |
| `hit` | 6 | dano recebido |
| `death` | 7 | derrota |
| `stand` | 1 | não usado pelo jogo |

---

## Parte 3 — kungfu-boss.js

### Golpes

```js
export const BOSS2_MOVES = {
  horizontalSwing: { anim: "horizontal-swing", windup: 25, active: 10, recovery: 35,
                     damage: 14, range: 55, knockback: 40 },
  overheadSmash:   { anim: "overhead-smash",   windup: 40, active: 6,  recovery: 90,
                     damage: 18, range: 40, stuckAnim: "stuck" },
  shieldBlock:     { anim: "shield-block",     windup: 0,  active: 60, recovery: 20,
                     blocks: ["punch", "kick", "flyKick"], reflect: 3 },
  armoredCharge:   { anim: "charge",           windup: 20, active: 60, recovery: 30,
                     damage: 15, chargeSpeed: 3.5, superArmor: true },
  surpriseKick:    { anim: "kick",             windup: 12, active: 8,  recovery: 25,
                     damage: 10, range: 40 },
  taunt:           { anim: "taunt",            windup: 0,  active: 60, recovery: 0,
                     heal: 3, vulnerable: true },
  earthquake:      { anim: "earthquake",       windup: 50, active: 10, recovery: 40,
                     damage: 10, aoe: true, dodgeBy: "jump" },
};
```

`tripleCombo` não é um golpe: é uma sequência
`[horizontalSwing, horizontalSwing, surpriseKick]` com 10 frames de intervalo,
resolvida pelo cursor de padrão.

### Fases de combate

| Fase | HP | Vel. | Padrão |
|---|---|---|---|
| A | 35–24 | 1.0× | swing, smash, block, swing, kick |
| B | 23–12 | 1.3× | combo, smash, taunt, charge, combo, block |
| C | 11–0 | 1.6× | earthquake, charge, combo, smash, earthquake, charge |

Ao **entrar** na fase C o chefe invoca dois `guarda-bastao`. A troca de fase
dispara um `taunt` de transição e um flash de cor.

### A função

```js
/**
 * @param {object} state  { phase, cursor, mode, timer, moveKey, seqIndex }
 * @param {object} ctx    { hp, maxHp, dist, facing, playerGrounded, blockedAttack }
 * @param {number} dt
 * @returns {{ state, anim, intents }}
 */
export function stepBossAI(state, ctx, dt)
```

`mode` percorre `approach → windup → active → recovery → approach`, com desvios
para `stuck` (após `overheadSmash`), `blocking` e `taunting`.

Nada é aplicado dentro da função. Ela devolve **intenções**, e o `update()` as
executa:

| Intenção | Efeito no `update()` |
|---|---|
| `{ type: "move", vx }` | `e.x += vx` |
| `{ type: "hit", damage, range, knockback }` | testa alcance e aplica dano ao jogador |
| `{ type: "aoe", damage, dodgeBy }` | dano em tela inteira, ignorado se o jogador está no ar |
| `{ type: "summon", types }` | `spawnEnemy()` por tipo |
| `{ type: "heal", amount }` | `e.hp = min(maxHp, e.hp + amount)` |
| `{ type: "reflect", damage }` | dano ao jogador ao ser bloqueado |

### Regras de bloqueio

Durante `blocking`, `punch`, `kick` e `flyKick` não causam dano e devolvem
`reflect: 3`. `sweep` e `special` **atravessam** o bloqueio. É a lição que a
luta ensina: rasteira e especial contra guarda alta.

### Janela de punição

`overheadSmash` tem 40 frames de telegrafia e, após o impacto, 90 frames de
`stuck` — 1,5 s em que o chefe não se move nem revida. É a maior janela de dano
da luta, e a razão de o golpe valer 18 de dano.

---

## Interações com o que já existe

**Regeneração.** `BOSS_REGEN_PCT_PER_SEC` é 2,5%/s. Sobre 35 HP dá 0,875 HP/s,
contra 0,625 do chefe 1 — 40% a mais em pontos absolutos, numa luta que já é
mais longa por causa das janelas de telegrafia. **Medir antes de aceitar**: se
alongar demais, a taxa vira por chefe (`regenPctPerSec` em `BOSS_STATS`) em vez
de constante global.

**Facing.** O chefe usa `spriteFacing: -1` como todos. Durante `armoredCharge` o
facing trava no início da investida — senão ele giraria no meio ao ultrapassar
o jogador.

**Esquiva do jogador.** A pirueta dá invulnerabilidade total por 28 frames. Contra
`earthquake` (evitável pulando) isso cria um segundo caminho de escape — é
aceitável e coerente.

**Alcance do soco.** Continua valendo a folga de 2 px encontrada na fase 1: o
soco alcança `player.x+44` e a hitbox do chefe começa depois disso. Com a hitbox
do Guardião (`ox: 21`) a folga muda; medir na implementação.

---

## Testes

**Puros (`kungfu-boss.js`):** transições de `mode` respeitando windup/active/
recovery; seleção de fase por faixa de HP; avanço do cursor e do `tripleCombo`;
`stuck` dura 90 frames após o smash; bloqueio deixa passar só sweep/special e
devolve reflect; invocação dispara uma única vez ao entrar na fase C;
independência de frame rate (mesmo tratamento de `dt` do `regenHp`).

**Puros (cenário):** todo asset citado em `PHASE_SCENERY` existe no disco; toda
fase de `PHASE_CONFIG` tem entrada em `PHASE_SCENERY`; todo chefe em
`PHASE_CONFIG` tem `BOSS_STATS` e manifesto.

**Estruturais:** `clearScenery` opera sobre os contêineres e não sobre as
camadas — o sprite do jogador e as partículas sobrevivem à troca de fase.

**Em jogo:** transição 1→2 mostra o cenário novo; o chefe percorre o padrão da
fase A; a janela de `stuck` é punível; o bloqueio rejeita soco e aceita rasteira;
`earthquake` não acerta quem está no ar.

---

## Fora de escopo

- Fases 3, 4 e 5 (assets de tileset e props existem; chefes também)
- Projéteis — `atirador` e `lancador-bomba` têm animação de arremesso mas o jogo
  não tem entidade de projétil. Nenhum dos dois está no pool da fase 2.
- Controles mobile: `KungFuCastleMobileControls` retorna `null` hoje.
