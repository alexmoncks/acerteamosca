# Efeitos sonoros — origem e licença

Duas fontes, ambas **CC0** (domínio público): não exigem atribuição e não
restringem uso comercial, que é o que um site com anúncios precisa. A
atribuição registrada aqui é cortesia e rastreabilidade, não obrigação.

## 1. Impactos — Kenney

Os impactos vêm do pacote **Impact Sounds (1.0)** de Kenney
(www.kenney.nl, 19-12-2019), publicado sob **Creative Commons Zero (CC0 1.0)**:
https://creativecommons.org/publicdomain/zero/1.0/

A licença original acompanha os arquivos em
`LICENSE-kenney-impact-sounds.txt` — é o `License.txt` do próprio zip, palavra
por palavra. A fonte primária fica junto do material de propósito: o site pode
mudar, e provar a licença depois sem ela significaria refazer a pesquisa. Ela
diz, textualmente, "free to use in personal, educational and commercial
projects" e "Support us by crediting Kenney (this is not mandatory)".

CC0 é dedicação ao domínio público: não exige atribuição e não restringe uso
comercial. A atribuição abaixo é cortesia, não obrigação — mas o site tem
anúncios, e registrar de onde veio cada arquivo é o que permite provar isso
depois sem ter de refazer a pesquisa.

| arquivo no jogo | original no pacote | por que este |
|---|---|---|
| `tapa.mp3` | `impactSoft_medium_000.ogg` | 0,12s, leve — pele em pele não desloca massa |
| `socoAcerta.mp3` | `impactPunch_medium_000.ogg` | soco de peso médio |
| `chuteAcerta.mp3` | `impactPunch_heavy_000.ogg` | mais massa que o soco |
| `jogadorApanha.mp3` | `impactSoft_heavy_000.ogg` | surdo, não estalado: é o jogador levando |
| `passoEscada.mp3` | `footstep_wood_000.ogg` | duas das três escadas são de madeira/tapete |

Processamento aplicado a todos, com ffmpeg: silêncio inicial removido,
`loudnorm` para -16 LUFS com pico em -3dBTP, mono 44,1kHz, mp3 96kbps. O
resultado são 44KB no total.

## 2. Gritos marciais — Freesound

O pacote "Voiceover Pack (Fighter)" da Kenney, também CC0, NÃO serviu: é um
locutor de arcade em inglês — "fight!", "round 1", "flawless victory" — e não
grunhido de luta. Uma fonte falhar não prova que não existe, então a busca
seguiu no Freesound, filtrada a CC0.

**"Ninja Vocalizations, Several Types"**, de WannyManny, CC0:
https://freesound.org/people/WannyManny/sounds/632075/

São 47 segundos com 21 vocalizações sem palavra nenhuma — o que evita o
problema do pacote da Kenney, que era falar inglês num jogo wuxia.

Não dá para escolher de ouvido aqui, então a escolha foi por medida: duração,
pico e brilho (energia acima de 2kHz contra o total) separam um kiai de soco
de um grunhido de dor e de um berro de chefe.

| nome no jogo | trecho do original | dur | pico | brilho | por que este |
|---|---|---|---|---|---|
| `gritoAtaque.mp3` | 4,003–4,355s | 0,35s | -9,6dB | -6,7 | o mais ALTO entre os curtos: o kiai é o que o jogador faz de mais barulhento |
| `gritoEsforco.mp3` | 19,707–20,036s | 0,33s | -21,0dB | -10,7 | curto e ESCURO, e mais baixo — dor não é grito de guerra |
| `gritoChefe.mp3` | 11,731–12,633s | 0,90s | -16,5dB | -10,1 | escuro e longo o bastante para cobrir a carga do poder |

As cargas dos chefes duram de 34 a 60 ticks (0,57s a 1,0s). Os 0,94s do
`gritoChefe` cobrem quase toda a carga longa e passam um pouco da mais curta
(a do Senhor das Sombras) — o berro entra no golpe em vez de acabar antes
dele, que é como um grito de luta soa mesmo.

Normalização: as vozes vão a **-18 LUFS**, dois decibéis abaixo dos impactos.
Voz no mesmo nível do soco cansa em dez segundos de jogo.

## Se algum não servir ao ouvido

Trocar é renomear um arquivo. Os nomes em `COM_AMOSTRA` são o contrato; o que
estiver em `<nome>.mp3` toca no lugar do sintetizado, sem tocar em código.
