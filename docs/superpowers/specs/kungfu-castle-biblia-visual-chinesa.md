# Kung Fu Castle — Bíblia Visual (Estética Chinesa)

**Status:** Correção que substitui as referências japonesas dos specs anteriores
**Aplicar a:** fases, inimigos, bosses, cutscene, props, tilesets

---

## Contexto

Kung fu é arte marcial **chinesa**. O jogo se passa num **templo-fortaleza chinês**
(estilo do Devil's Temple do Kung Fu Master original, 1984), não num castelo japonês.

Toda referência a torii, tatami, shoji, samurai, ninja, kimono, sakura e oni
deve ser substituída pelos equivalentes chineses abaixo.

---

## Style Reference Global (usar em TODOS os prompts PixelLab)

```
Side-scrolling beat'em up, 32x32 pixel art, ancient Chinese temple fortress,
wuxia martial arts setting, retro arcade Kung Fu Master style,
clean black outlines, limited palette, red gold and jade color accents,
Chinese architecture with curved tiled roofs and dougong brackets
```

---

## Tabela de Substituição

| Elemento | Antes (japonês) | Agora (chinês) |
|----------|----------------|----------------|
| Local | Castelo feudal / tenshu | Templo-fortaleza / pagode (宝塔) |
| Portal | Torii vermelho | Paifang (牌坊) — arco cerimonial |
| Piso interno | Tatami | Madeira escura + tapetes vermelhos |
| Porta | Shoji (papel branco) | Treliça de madeira + portal lua (月亮门) |
| Guardião de pedra | Komainu | Leões guardiões shishi (石獅) |
| Lanterna | Ishidoro (pedra) | Lanterna de papel vermelha suspensa |
| Árvore | Cerejeira (sakura) | Ameixeira (梅花) + bambu + pinheiro |
| Roupa herói | Karate gi + faixa preta | Changshan de treino, botões-sapo, faixa vermelha |
| Roupa princesa | Kimono rosa | Hanfu de seda rosa com mangas longas fluidas |
| Cabelo princesa | Kanzashi | Coque duplo com fitas e grampos de jade |
| Guerreiro pesado | Samurai + katana | General com dao (sabre curvo) + armadura lamelar |
| Assassino | Ninja | Assassino wuxia de preto, lenço no rosto |
| Guerreira | Kunoichi | Nüxia (女侠) — guerreira wuxia |
| Demônio | Oni (máscara vermelha com chifres) | Yaksha / máscara de ópera chinesa |
| Espadas | Katana + wakizashi | Jian (reta) + dao (curva) |
| Bastão | Bō | Gun (棍) — bastão longo chinês |
| Maça | Kanabō | Chuí (锤) — martelo de guerra |
| Projétil | Shuriken | Dardo voador / faca de arremesso (飞刀) |
| Idioma nos títulos | 外庭, 城門, 城内 | 前院, 山門, 大殿, 塔樓, 頂閣 |

---

## Personagens Corrigidos

### Herói — Lutador de Kung Fu

```
create_character(
  description="Chinese kung fu fighter in white training changshan with
  frog button closures and red cloth sash at waist, black cloth shoes,
  short black hair, determined focused expression, classic wushu stance,
  side-view, 32x32 pixel art, wuxia martial arts hero",
  n_directions=2, size=32
)
```

Animações inalteradas (idle, walk, punch, kick, jump, crouch, flying-kick,
sweep, hit, special) — apenas a descrição do personagem muda.

### Princesa — Chinesa

```
create_character(
  description="Chinese princess in flowing pink silk hanfu with long
  draping sleeves and embroidered plum blossoms, long black hair in
  double buns with red ribbons and jade hairpins, delicate graceful face,
  side-view, 32x32 pixel art, ancient Chinese noblewoman",
  n_directions=2, size=32
)
```

Cutscene (amarrada, libertada, virando, abraço) — mesma sequência,
apenas hanfu no lugar de kimono.

---

## Inimigos Corrigidos

| Nome (novo) | Descrição PixelLab |
|-------------|-------------------|
| Capanga branco | weak thug in worn white cloth tunic and trousers, cloth belt, simple dull face, slouched, barefoot, Chinese street ruffian |
| Capanga cinza | tougher thug in gray tunic with cloth headband, stronger build, aggressive scowl, Chinese martial arts brawler |
| Capanga rápido | fast agile thug with red headband, slim wiry build, light red tunic, running pose, Chinese street fighter |
| Guarda com gun | temple guard in dark gray padded armor holding long wooden gun staff diagonally, conical hat, Chinese temple guardian |
| Atirador | assassin in black with cloth face wrap, holding flying dart, throwing pose, Chinese wuxia assassin |
| Assassino | wuxia assassin in dark blue robes with face wrap, athletic build, combat stance, Chinese martial arts killer |
| Assassino com jian | elite assassin in dark blue wielding straight jian sword with tassel, both hands, Chinese swordsman stance |
| General | armored Chinese general in dark red lamellar armor with winged helmet, large imposing build, holding dao curved saber |
| Nüxia | female wuxia warrior in purple silk robes with flowing sleeves, slim agile build, long hair with ribbon, Chinese heroine |
| Lançador de bombas | stocky soldier in dark green padded uniform holding round black powder bomb with fuse, Chinese foot soldier |

Stats, AI e animações permanecem exatamente como no doc de inimigos.
Apenas a descrição visual muda.

---

## Bosses Corrigidos

### Boss 1 — Mestre dos Capangas (48×48)

```
massive brutish Chinese brawler, huge barrel chest and big belly,
shaved head with scar over left eye, wearing open white training robe
showing chest, wide brown sash, huge fists, cloth shoes,
menacing grin, Chinese gang boss, side-view, 48x48 pixel art
```

### Boss 2 — Guardião do Portão (48×56)

```
imposing temple gate guardian in heavy dark red lamellar armor with
golden winged helmet, wielding massive iron chui war hammer,
solid square build, cold unwavering eyes, veteran Chinese warrior,
side-view, 48x56 pixel art
```
Kanabō → **chuí** (martelo de guerra chinês). Mecânica idêntica.

### Boss 3 — Senhor das Sombras (48×48)

```
legendary shadow master in all black robes with deep purple accents,
hooded with face wrap, only glowing purple eyes visible, slim elegant
silhouette, dark shadow qi swirling around body, ethereal presence,
Chinese wuxia shadow lord, side-view, 48x48 pixel art
```
Shuriken triplo → **três dardos voadores em leque**.

### Boss 4 — General Yaksha (56×56)

```
demonic Chinese general in black lamellar armor with red Chinese opera
demon mask with horns and fangs, golden glowing eyes behind mask,
wielding dao curved saber in right hand and jian straight sword in left,
tattered dark cape, large intimidating build, Chinese demon warlord,
side-view, 56x56 pixel art
```
Oni → **máscara de ópera chinesa / yaksha**. Katana+wakizashi → **dao + jian**.

### Boss 5 — Senhor do Templo (64×64)

```
Chinese temple master in ornate dark purple silk robes with golden
dragon embroidery and wide sleeves, long black hair in topknot with
golden crown pin, long thin mustache, aristocratic cold face,
ceremonial jian sword with tassel at waist, radiating golden qi aura,
tall imposing regal presence, Chinese wuxia grandmaster final boss,
side-view, 64x64 pixel art
```
Tachi → **jian cerimonial com borla**. "Energia ki" → **qi (气)**.
Aura dourada de qi é ainda mais apropriada no contexto wuxia.

---

## Fases Corrigidas

### Fase 1 — Pátio da Frente (前院)

```
create_sidescroller_tileset(
  lower="stone path with moss, packed earth, Chinese temple courtyard ground",
  transition="carved stone border with lotus motifs"
)
```

Props: lanterna de papel vermelha suspensa, ameixeira em flor (梅花),
bambu, rocha de jardim chinês (太湖石), ponte de pedra arqueada.

### Fase 2 — Portão da Montanha (山門)

```
create_sidescroller_tileset(
  lower="dark stone courtyard, worn flagstones, Chinese temple entrance",
  transition="stone steps with dragon carvings"
)
```

Props: **paifang** (arco cerimonial de madeira vermelha com telhado curvo),
tocha em suporte de ferro, estandarte de guerra, portão de madeira com
tachas de bronze, **leões shishi** de pedra, barril.

### Fase 3 — Salão Principal (大殿)

```
create_sidescroller_tileset(
  lower="dark polished wooden floor with red carpet runner, Chinese temple hall",
  transition="carved wooden threshold beam"
)
```

Props: **portal lua** (月亮门) circular, treliça de madeira, armadura
lamelar em suporte, biombo laqueado, escada de madeira, vaso Ming,
**jian** em suporte de parede.

### Fase 4 — Torre (塔樓)

```
create_sidescroller_tileset(
  lower="dark polished hardwood floor, luxury Chinese pagoda upper floors",
  transition="ornate carpet border, red with gold dragon pattern"
)
```

Props: biombo laqueado dourado com dragões, vaso de porcelana azul-branca,
lanterna de seda vermelha, janela treliçada com vista de montanhas,
pergaminho de caligrafia, piso que desaba.

### Fase 5 — Pavilhão do Topo (頂閣)

```
create_sidescroller_tileset(
  lower="dark ceremonial stone floor, purple tinted, carved dragon patterns,
  Chinese temple throne hall, ominous"
)
```

Props: trono de madeira entalhado com dragões, janela circular com lua cheia,
pilar vermelho com dragão dourado enrolado, cortina de seda rasgada,
braseiro de bronze, princesa amarrada.

### Escadas (4 transições)

| Transição | Descrição |
|-----------|-----------|
| 1→2 | wide stone outdoor staircase to temple gate, moss, dragon-carved balustrade |
| 2→3 | indoor wooden staircase through stone doorway, red lacquered steps |
| 3→4 | ornate wooden staircase with red carpet and golden dragon handrail |
| 4→5 | narrow spiral stone staircase with wall torches, pagoda tower interior |

---

## Paletas Corrigidas

| Fase | Cores dominantes |
|------|-----------------|
| 1 — Pátio | Verde bambu `#4a7c3f`, branco-ameixeira `#f5e6e8`, pedra `#8a8a7a` |
| 2 — Portão | Vermelho paifang `#c0392b`, dourado `#d4a017`, pedra escura `#4a4a4a` |
| 3 — Salão | Madeira laca `#5c2018`, vermelho tapete `#8b1a1a`, dourado `#d4a017` |
| 4 — Torre | Dourado `#d4a017`, carmesim `#8b0000`, jade `#4a7c6f` |
| 5 — Topo | Roxo-escuro `#2a0040`, dourado `#d4a017`, lua `#f0e68c` |

---

## Ação Necessária

Os specs anteriores (`kungfu-castle-fases-pixellab.md`,
`kungfu-castle-inimigos-design.md`, `kungfu-castle-bosses-design.md`,
`kungfu-castle-cutscene-vitoria.md`) mantêm válidos:

- Stats, HP, dano, velocidade, pontos
- Comportamentos de AI e código JavaScript
- Fases de combate dos bosses e movesets
- Lista de animações por personagem
- Estrutura de pastas e integração PixiJS

**Substituir apenas** as descrições visuais dos prompts `create_character`,
`create_map_object` e `create_sidescroller_tileset` pelas versões chinesas
deste documento.
