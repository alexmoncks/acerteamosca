# Kung Fu Castle — Roteiro da Apresentação (60s, 8-bit MSX2)

Sequência de **12 imagens estáticas de 5,0s cada = 60,0s exatos**.

**Estética: chinesa.** Este roteiro segue
`docs/superpowers/specs/kungfu-castle-biblia-visual-chinesa.md`, que substitui
as referências japonesas dos specs anteriores. Kung fu é arte marcial
**chinesa**; o jogo se passa num **templo-fortaleza chinês**, no estilo do
Devil's Temple do Kung Fu Master (1984) — não num castelo japonês. Nenhuma
cena tem torii, shoji, tatami, samurai, ninja, kimono, sakura ou oni.

Base narrativa: `src/components/games/kungfu-historia.js` (5 painéis, 26,5s) +
textos em `src/messages/pt.json` → `historia.*` + os movesets e stats em
`docs/2026-03-30-kungfu-castle-bosses.md` (dos quais só as **descrições
visuais** foram substituídas pelas versões chinesas da bíblia).

Por que 12×5s e não os 5 painéis originais: os 5 painéis do *attract mode*
existem para o jogador **antes da fase 1**, com arte que o jogo já carrega.
Esta apresentação é outra peça — ela mostra o elenco inteiro (os 5 chefes, um
por andar), o que o attract mode resolve num painel só. Cinco segundos é o
tempo de ler uma linha de legenda com folga e ainda olhar a imagem.

---

## 1. Padrão de cor — MSX2

MSX2 (SCREEN 5): **16 cores simultâneas** escolhidas de uma paleta de **512**
(RGB333 — 3 bits por canal, 8 níveis: `0 36 73 109 146 182 219 255`).
Toda cor abaixo é RGB333-legal.

### Paleta fixa da apresentação (16 cores)

| # | Hex | RGB333 | Uso |
|---|-----|--------|-----|
| 0 | `#000000` | 0,0,0 | preto / contorno / vazio |
| 1 | `#242424` | 1,1,1 | sombra dura |
| 2 | `#24246D` | 1,1,3 | azul-noite (céu baixo) |
| 3 | `#4949B6` | 2,2,5 | azul (céu alto, montanhas) |
| 4 | `#6D49B6` | 3,2,5 | roxo (robes do Senhor) |
| 5 | `#B649DB` | 5,2,6 | magenta (qi de sombra, hanfu) |
| 6 | `#B62424` | 5,1,1 | vermelho (paifang, pilares, faixa) |
| 7 | `#FF4924` | 7,2,1 | laranja-fogo (tocha, braseiro) |
| 8 | `#FFB649` | 7,5,2 | âmbar (lanterna de papel) |
| 9 | `#FFFF92` | 7,7,4 | amarelo (dourado, dragão, qi) |
| 10 | `#6DB624` | 3,5,1 | verde (bambu) |
| 11 | `#24B66D` | 1,5,3 | jade (telha curva) |
| 12 | `#49DBFF` | 2,6,7 | ciano (lua, aço) |
| 13 | `#926D49` | 4,3,2 | marrom (madeira, laca, pele) |
| 14 | `#B6B6B6` | 5,5,5 | cinza (pedra, robe de treino) |
| 15 | `#FFFFFF` | 7,7,7 | branco (changshan, texto) |

As cores por fase da bíblia (`#c0392b` paifang, `#d4a017` dourado, `#4a7c6f`
jade…) são para os tilesets do jogo. Aqui elas foram mapeadas para o vizinho
MSX2 mais próximo — a restrição de 16 cores é o pedido desta peça e vence.

**Regras de aplicação**
- Sem gradiente suave. Transição de céu = **dithering ordenado 2×2 / 4×4**
  (o xadrez de pixel que é a assinatura visual do MSX2).
- Sem anti-aliasing. Borda de pixel dura, 100% opaca.
- Contorno preto (`#000000`) em toda figura.
- Grade de pixel visível e uniforme.

**A paleta não é obedecida pelo modelo — ela é imposta depois.**
Entre 74% e 96% dos pixels de cada cena saíram fora das 16 cores, mesmo com os
hex listados no prompt. `scripts/msx2-quantize.mjs` troca cada pixel pela cor
legal mais próxima (distância redmean) e é ele que torna "MSX2" uma
propriedade do arquivo em vez de uma intenção do prompt.

### Formato
- **Nativo MSX2:** 256×212 px.
- **Entrega:** 16:9, **1920×1080**, PNG indexado de 16 cores (16–96 KB cada).

---

## 2. Prefixo de estilo (colar em TODO prompt)

```
8-bit pixel art in MSX2 SCREEN 5 style, strict 16-color palette, use ONLY
these hex colors and no others: #000000 #242424 #24246D #4949B6 #6D49B6
#B649DB #B62424 #FF4924 #FFB649 #FFFF92 #6DB624 #24B66D #49DBFF #926D49
#B6B6B6 #FFFFFF. Hard pixel edges, no anti-aliasing, no soft gradients,
ordered 2x2 checkerboard dithering for all shading and sky transitions,
flat color blocks, solid black outlines, chunky visible pixel grid, drawn
on a low 256x144 pixel grid then upscaled nearest-neighbor. 1987
home-computer arcade aesthetic. ANCIENT CHINESE temple fortress, wuxia
martial arts setting, Kung Fu Master 1984 Devil's Temple style, Chinese
architecture with curved tiled roofs and dougong brackets, red gold and
jade accents. STRICTLY NOT JAPANESE: no torii, no shoji, no tatami, no
samurai, no ninja, no kimono, no sakura, no oni mask. No text, no letters,
no logo, no watermark, no UI.
```

A negativa explícita é necessária: sem ela o modelo entrega torii e samurai,
porque é o que "castelo + artes marciais + pixel art" traz por padrão.

---

## 3. As 12 cenas

Legenda = texto na tela, fonte bitmap branca (`#FFFFFF`) sobre tarja preta
(`#000000`) no terço inferior, escrita letra a letra a 0,035 s/caractere
(`VELOCIDADE_TEXTO`), começando após o fade de 0,6s. **A legenda, o logo e a
faixa do andar não estão dentro dos PNGs** — são compostos por cima, o que
preserva a escrita letra a letra e permite trocar `pt.json` por `en.json` sem
regerar imagem nenhuma.

| # | Arquivo | Tempo | Faixa na tela |
|---|---------|-------|---------------|
| 1 | `cena-01-titulo.png` | 0:00 | — (logo) |
| 2 | `cena-02-templo.png` | 0:05 | — |
| 3 | `cena-03-trono.png` | 0:10 | — |
| 4 | `cena-04-rapto.png` | 0:15 | — |
| 5 | `cena-05-paifang.png` | 0:20 | — |
| 6 | `cena-06-heroi.png` | 0:25 | — |
| 7 | `cena-07-andar1.png` | 0:30 | ANDAR 1 · PÁTIO DA FRENTE (前院) |
| 8 | `cena-08-andar2.png` | 0:35 | ANDAR 2 · PORTÃO DA MONTANHA (山門) |
| 9 | `cena-09-andar3.png` | 0:40 | ANDAR 3 · SALÃO PRINCIPAL (大殿) |
| 10 | `cena-10-andar4.png` | 0:45 | ANDAR 4 · TORRE (塔樓) |
| 11 | `cena-11-andar5.png` | 0:50 | ANDAR 5 · PAVILHÃO DO TOPO (頂閣) |
| 12 | `cena-12-fim.png` | 0:55 | — (logo + endereço) |

---

### CENA 1 — TÍTULO · `0:00 → 0:05`
**Legenda:** *(sem legenda — só o logo)*
**Imagem:** Fundo de tela de título. Pagode-fortaleza chinês de cinco níveis
em silhueta `#242424`, telhados curvos arrebitados com borda jade `#24B66D`,
pequeno e centrado **baixo** no quadro — o terço superior fica **vazio** para
o logo entrar por cima. Céu `#000000` → `#24246D` → `#4949B6` em dithering.
Lua cheia `#49DBFF` à direita. Duas lanternas de papel vermelhas `#B62424`
acesas `#FFB649` nos cantos inferiores.

---

### CENA 2 — O TEMPLO · `0:05 → 0:10`
**Legenda:** "Cinco andares. Em cada um, um mestre. No topo, o Senhor do Castelo."
**Imagem:** Plano geral do **pagode (宝塔) de cinco níveis**, de frente.
Silhueta `#242424`, telhados chineses fortemente arrebitados com borda jade
`#24B66D`, dougong visível sob cada beiral, pilares vermelhos `#B62424`,
janelas acesas `#FFB649`. Cada nível menor que o de baixo — a leitura é
"cinco andares, um acima do outro". Montanhas `#4949B6` ditherizadas ao fundo.
Lanternas de papel vermelhas na base.
*(Deriva do painel `castelo`.)*

---

### CENA 3 — O TRONO · `0:10 → 0:15`
**Legenda:** "Ele mandou buscar a princesa."
**Imagem:** Salão do trono do templo. Biombos laqueados `#926D49` com dragões
dourados `#FFFF92` nas laterais. Tapete vermelho `#B62424` sobre piso de
madeira escura. Ao centro, trono de madeira entalhado com dragões `#242424`.
Sentado nele, o **Senhor do Castelo**: robes de seda púrpura `#6D49B6` com
bordado de dragão dourado `#FFFF92` e mangas largas, coque com grampo de
coroa dourada, **bigode longo e fino**, rosto frio, **jian cerimonial com
borla**. Aura de qi dourado.
*(Deriva do painel `trono`.)*

---

### CENA 4 — O RAPTO · `0:15 → 0:20`
**Legenda:** "Os capangas a arrastaram pelo pátio — e o portão se fechou atrás dela."
**Imagem:** Pátio de pedra à noite, **muito escuro**, só luz de tocha. Três
figuras **grandes** no quadro. Dois capangas chineses de túnica escura e
tarja na cabeça **arrastam** a princesa para a direita — ela recua, os pés
raspando o chão. **Hanfu** de seda rosa/branca com mangas longas fluidas e
faixa `#B649DB`, cabelo em **coque duplo com fitas vermelhas**. Um sapato de
pano ficou para trás. À direita, portão de madeira `#926D49` com tachas de
bronze se fechando. Tochas `#FF4924` em suportes de ferro. Leão **shishi** de
pedra em silhueta à esquerda.

---

### CENA 5 — O PAIFANG · `0:20 → 0:25`
**Legenda:** "Ninguém do vilarejo atravessou aquele arco e voltou. Um homem foi assim mesmo."
**Imagem:** **Paifang (牌坊)** — arco cerimonial chinês de madeira vermelha
`#B62424` com vários telhados curvos empilhados em jade `#24B66D`, dougong
ornamentado e vigas entalhadas — à direita do centro, de perfil. Leão
**shishi** na base. Bambu e ameixeira em flor `#242424` atrás, ditherizados.
Tocha `#FF4924` em suporte de ferro no pilar direito. À esquerda, pequeno na
moldura, o **herói** de perfil olhando o arco: **changshan** de treino branco
`#FFFFFF` com **botões-sapo**, **faixa vermelha** `#B62424`, sapatos de pano
pretos.
*(Deriva do painel `portao`. Torii → paifang.)*

---

### CENA 6 — O HERÓI · `0:25 → 0:30`
**Legenda:** "Sem arma. Sem exército. Só o que ele aprendeu a fazer com as mãos."
**Imagem:** Plano médio-fechado do **lutador de kung fu** em três-quartos,
guarda de wushu — uma palma aberta à frente, um punho atrás. **Changshan** de
treino branco `#FFFFFF` com gola mandarim e **botões-sapo** visíveis no peito,
**faixa vermelha larga** `#B62424` na cintura, calça branca larga, **sapatos
de pano pretos**. Braseiro de bronze `#FF4924` à esquerda recortando o
contorno em âmbar. Escadaria de pedra com balaustrada entalhada de dragões
`#926D49` subindo à direita.
*(Deriva do painel `heroi`. Gi de caratê + faixa preta → changshan + faixa vermelha.)*

---

### CENA 7 — ANDAR 1 · PÁTIO DA FRENTE (前院) · `0:30 → 0:35`
**Legenda:** "O Mestre dos Capangas. Puro peso."
**Imagem:** Pátio-jardim do templo à noite: bambu `#6DB624`, **ameixeira em
flor**, rocha **taihu** (太湖石), ponte de pedra arqueada sobre um lago,
lanternas de papel vermelhas suspensas. Ao centro o **Mestre dos Capangas**:
brigão chinês massivo, peito e barriga enormes, **roupão de treino branco
aberto** `#B6B6B6` mostrando o peito, **faixa marrom larga** `#926D49`, cabeça
raspada com cicatriz no olho esquerdo, punhos enormes, sapatos de pano.

---

### CENA 8 — ANDAR 2 · PORTÃO DA MONTANHA (山門) · `0:35 → 0:40`
**Legenda:** "O Guardião do Portão. E o chuí."
**Imagem:** Interior do portão da montanha, pilares de madeira vermelhos
`#B62424`, portão com tachas de bronze `#926D49` ao fundo, tochas `#FF4924`
em suportes de ferro. Ao centro o **Guardião**: **armadura lamelar** vermelha
escura de plaquetas atadas, **elmo chinês alado** dourado `#FFFF92`,
empunhando o **chuí (锤)** — martelo de guerra de ferro de cabeça redonda —
erguido na direita. Barba preta densa, olhos frios.
*(Kanabō → chuí. Mecânica idêntica.)*

---

### CENA 9 — ANDAR 3 · SALÃO PRINCIPAL (大殿) · `0:40 → 0:45`
**Legenda:** "O Senhor das Sombras. Você não vê o golpe."
**Imagem:** Salão principal quase todo preto `#000000`/`#242424`. Ao fundo,
**portal lua (月亮门)** circular e treliça de madeira mal visíveis, tapete
vermelho no chão. Ao centro o **Senhor das Sombras**: robes pretos esvoaçantes
com detalhes roxo profundo `#6D49B6`, capuz e lenço no rosto, só os olhos
brilhando `#B649DB`, **qi de sombra** girando ao redor, **três dardos
voadores em leque** numa das mãos. Dois clones em dithering 50% atrás.
*(Ninja → assassino wuxia. Shuriken → dardos voadores.)*

---

### CENA 10 — ANDAR 4 · TORRE (塔樓) · `0:45 → 0:50`
**Legenda:** "O General Yaksha. Dao numa mão, jian na outra."
**Imagem:** Andar alto do pagode, piso de madeira escura, pilares vermelhos,
biombo laqueado dourado com dragões `#FFFF92`, **janela treliçada redonda**
com montanhas e lua cheia `#49DBFF`. Ao centro o **General Yaksha**: armadura
**lamelar** negra `#242424` com detalhes vermelhos, **máscara de ópera chinesa**
vermelha `#B62424` com chifres e presas, olhos dourados `#FFFF92` brilhando
atrás dela, **dao** (sabre curvo) na direita e **jian** (espada reta) na
esquerda, capa esfarrapada.
*(Oni → yaksha / ópera chinesa. Katana+wakizashi → dao+jian.)*

---

### CENA 11 — ANDAR 5 · PAVILHÃO DO TOPO (頂閣) · `0:50 → 0:55`
**Legenda:** "O Senhor do Castelo. Ele conhece todos os seus golpes."
**Imagem:** Pavilhão do topo. **Duas figuras grandes**, quase a altura toda do
quadro, de perfil, encarando-se. À **esquerda** o herói de **changshan branco
com faixa vermelha** e sapatos de pano, guarda de wushu. À **direita** o
**Senhor do Castelo**: robes de seda púrpura `#6D49B6` com bordado de dragão
dourado, coque com grampo de coroa, bigode longo e fino, **jian com borla
vermelha já sacado**, aura de qi dourado `#FFFF92` virando vermelho. Ao fundo,
pilar vermelho com **dragão dourado enrolado**, cortina de seda rasgada e
janela circular com lua cheia. Piso cerimonial de pedra com dragões
entalhados. É o clímax.

---

### CENA 12 — ENCERRAMENTO · `0:55 → 1:00`
**Legenda:** "Jogue grátis. acerteamosca.com.br"
**Imagem:** Fecha o círculo com o enquadramento da CENA 1 — pagode de cinco
níveis à noite visto de um pátio baixo, terço superior **vazio** para o logo.
No primeiro plano baixo, ao centro, o herói de costas em silhueta preta
`#000000`, a ponta da faixa caída, olhando o pagode. Lanternas de papel
vermelhas nos dois cantos. Lua `#49DBFF` à direita.

---

## 4. Trilha e transição

- **Áudio:** faixa `abertura` — a mesma de `TRILHA_ABERTURA` em
  `kungfu-historia.js` (`/audio/kungfucastle/bgm/`), em loop sob os 60s inteiros.
- **Transição entre cenas:** fade de **0,6s** (o `FADE` do módulo), não corte
  seco — corte seco pisca e desmancha a sequência.
- **Exceção:** entre CENA 10 e CENA 11, **corte seco com flash branco de dois
  quadros** — é a única quebra de ritmo do minuto, e ela marca o clímax.

---

## 5. Pipeline

```bash
bash scripts/baixar-apresentacao.sh            # brutos do Highsfield → bruto/
node scripts/msx2-quantize.mjs \
  public/images/kungfucastle/apresentacao/bruto \
  public/images/kungfucastle/apresentacao --w=1920
node scripts/contato-sheet.mjs \
  public/images/kungfucastle/apresentacao /tmp/contato.png --cel=440
```

Modelo: **Nano Banana Pro** (2K, 16:9), 2 créditos por cena. O Recraft V4.1 foi
testado por ter parâmetro `colors`, mas entregou paleta pior mesmo com as cores
travadas — e a quantização posterior torna esse parâmetro dispensável.

---

## 6. Pendências conhecidas

- **Nome do chefe 5.** A bíblia chinesa o chama de **Senhor do Templo**; o
  `pt.json` em produção diz **Senhor do Castelo** (`historia.castelo`), e o
  jogo se chama Kung Fu Castle. A apresentação usa a versão do `pt.json`.
  Se o nome for mudar, muda em `pt.json`/`en.json` primeiro.
- **Specs antigos ainda em japonês.** `kungfu-castle-pixellab-sprites.md`
  (linha 21, "white karate gi black belt"), `kungfu-castle-pixijs-design.md`
  e `kungfu-castle-init.md` ainda descrevem o protagonista como karateca. Foi
  daí que a primeira leva desta apresentação saiu errada. Valeria marcá-los
  como substituídos pela bíblia visual chinesa.
- ~~**Sprites do jogo.**~~ **Resolvido.** Os PNGs em
  `public/images/kungfucastle/player/` já foram regerados conforme a bíblia:
  túnica branca, **faixa vermelha**, sapatos escuros. A abertura e o jogo
  mostram o mesmo herói. A única diferença é a calça — escura no sprite,
  clara na cena 6 — que não vale uma regeração.
