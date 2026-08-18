# Kung Fu Castle — Roteiros de Cutscene

Seis peças: uma abertura, quatro passagens de fase e um final. Todas em pixel
art, na mesma moldura de 480×320 do jogo, com o mesmo elenco chinês da bíblia
visual.

## Regras que valem para todas

**Sem diálogo escrito na tela.** O jogo é mudo por opção — o que se entende, se
entende pela pose. Onde há texto, é um cartão inteiro em caracteres chineses com
tradução em legenda pequena, nunca um balão sobre a cena.

**Toda cutscene é pulável** com o mesmo botão que avança a tela de fase. Quem
está rejogando não deve pagar de novo por uma história que já viu.

**Nenhuma cutscene tira o controle por mais de oito segundos.** Acima disso o
jogador larga o controle e a tensão do combate esfria.

**Cada uma reaproveita a cena da fase.** São os mesmos contêineres, o mesmo
`buildScenery`, os mesmos sprites — o que muda é quem se move e para onde a
câmera olha. Cutscene que carrega arte própria custa memória e diverge do que
o jogador acabou de ver.

---

## 0. Abertura — antes da fase 1

**Onde:** o pátio da frente, à noite, câmera parada no paifang.

| t | O que acontece |
|---|---|
| 0,0s | Cena estática. Só o fogo das lanternas se mexe. |
| 1,0s | A princesa cruza o vão do paifang **arrastada** por dois capangas, um de cada braço. Ela resiste, os pés riscam o chão. |
| 2,5s | Saem por trás do arco. A última coisa a sumir é a manga rosa do hanfu. |
| 3,2s | O herói entra pela esquerda, andando. Para no centro. |
| 4,0s | Vira para o paifang — a animação `turn`, que existe. |
| 4,8s | Cartão: **前院** / "Pátio da Frente". |
| 6,0s | Cartão sai, HUD entra, controle devolvido. |

**Assets:** `princesa-amarrada` não serve aqui (ela está em pé, andando). Precisa
de uma animação de caminhada da princesa sendo puxada — ou, mais barato, os três
sprites deslizando com a `walk` que a princesa já tem no PixelLab.

**Por que abre assim:** o jogador precisa ver a princesa uma vez, cedo, para o
resto do jogo ter um motivo. Sem isso ele está atravessando cinco andares porque
o jogo mandou.

---

## 1. Fase 1 → 2 — a escada de pedra

**Onde:** ponta direita do pátio, ao pé da `escada-pedra-externa`.

| t | O que acontece |
|---|---|
| 0,0s | O Mestre dos Capangas cai. Partículas, o corpo some. |
| 0,8s | Silêncio. A câmera não se mexe. |
| 1,2s | O herói anda sozinho para a direita até a base da escada. |
| 2,4s | Sobe pela diagonal dos degraus, animação `climb`. |
| 3,6s | Sai pelo alto do quadro. Fade. |
| 4,2s | Cartão: **山門** / "Portão da Montanha". |

**Nota:** esta é a única passagem que já tem tudo de que precisa. É a que serve
de gabarito para as outras três.

---

## 2. Fase 2 → 3 — o portão que cede

**Onde:** ponta direita da muralha, no `portao-madeira-aberto`.

| t | O que acontece |
|---|---|
| 0,0s | O Guardião do Portão cai de joelhos, o chuí bate no chão antes dele. |
| 1,0s | O portão atrás dele **range e abre** — a folha vai de fechada a aberta. |
| 2,0s | O herói anda para a direita e some no vão escuro. |
| 3,2s | Fade. Cartão: **大殿** / "Salão Principal". |

**O que falta:** o portão fechado. Existe `portao-madeira` (fechado) e
`portao-madeira-aberto`; a abertura é uma troca de sprite, não uma animação. Se
quiser o range de verdade, são 3 ou 4 quadros intermediários em v3.

**Por que não é escada:** subir depois de derrubar o guardião do portão seria
repetir a batida da fase 1. Aqui a passagem é horizontal, para o andar mudar sem
o gesto se repetir.

---

## 3. Fase 3 → 4 — a escada de tapete

**Onde:** fundo do salão, na `escada-ornada-tapete`.

| t | O que acontece |
|---|---|
| 0,0s | O Senhor das Sombras se desfaz em fumaça em vez de cair — ele não morre, **some**. |
| 1,2s | A fumaça assenta. Onde ele estava, fica um dardo cravado no chão. |
| 2,0s | O herói anda até o dardo, **agacha** (animação `crouch`, que existe) e o pega. |
| 3,0s | Levanta, olha para cima da escada. |
| 3,8s | Sobe pelo tapete vermelho. |
| 5,0s | Fade. Cartão: **塔樓** / "Torre". |

**O que falta:** o sprite do dardo. É um `create_map_object` pequeno — ou, mais
barato, reaproveitar um quadro do `jian-suporte`.

**Por que o dardo:** é a primeira pista de que o Senhor das Sombras não foi
derrotado, só dispensado. Ele volta na fase 5 como invocação do Senhor do Templo,
se um dia essa mecânica existir.

---

## 4. Fase 4 → 5 — a escada em espiral

**Onde:** ponta da torre, na `escada-espiral-tochas`.

| t | O que acontece |
|---|---|
| 0,0s | O General Yaksha cai. A máscara de ópera **racha ao meio** e cai antes do corpo. |
| 1,4s | Sob a máscara não há rosto de demônio: é um homem comum, velho. |
| 2,2s | O herói olha. Não pega a máscara. Vira e vai. |
| 3,0s | Sobe a escada em espiral, mais estreita — a câmera acompanha mais de perto. |
| 4,2s | Fade. Cartão: **頂閣** / "Pavilhão do Topo". |

**O que falta:** a máscara rachada (`create_map_object`) e o rosto sob ela. O
rosto pode ser um único quadro estático, não precisa de animação.

**Por que a máscara:** é o único momento em que o jogo diz que os inimigos são
gente. Custa dois segundos e muda o tom do último andar.

---

## 5. Final — o pavilhão

**Onde:** sala do trono. Já tem toda a arte: `trono-sombrio`,
`princesa-amarrada`, e a pasta `cutscene/` com nove peças prontas.

| t | O que acontece | Asset |
|---|---|---|
| 0,0s | O Senhor do Templo cai. A aura dourada de qi se apaga devagar, não de uma vez. | animação `death` |
| 1,5s | A princesa está amarrada ao lado do trono. | `princess-tied` |
| 2,2s | O herói caminha até ela. | `hero-walk-to-princess` |
| 3,4s | Corta as cordas. | `hero-cut-ropes` |
| 4,2s | Ela se solta e se vira. | `princess-freed`, `princess-turn` |
| 5,0s | Ele se vira. | `hero-turn` |
| 5,6s | Abraço. | `hero-embrace`, `princess-embrace`, `embrace-together` |
| 6,8s | Câmera afasta. Fade para o cartão de vitória. | — |

**Nota:** os nove sprites da pasta `cutscene/` são da era japonesa e mostram o
karateca de gi branco com a princesa de kimono. Precisam ser regerados com a
âncora chinesa — é a última arte japonesa que sobrou no jogo, e é a última coisa
que o jogador vê.

---

## Ordem de execução sugerida

1. **Passagem da fase 1** — não precisa de arte nova e serve de gabarito.
2. **Passagem da fase 3** — mesma mecânica, mais o dardo.
3. **Final** — a arte existe, mas precisa ser reconvertida (9 sprites).
4. **Abertura** — precisa da princesa andando.
5. **Passagens 2 e 4** — precisam de arte nova (portão em movimento, máscara).
