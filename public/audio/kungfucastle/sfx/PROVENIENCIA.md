# Efeitos sonoros — origem e licença

Os arquivos deste diretório vêm do pacote **Impact Sounds (1.0)** de Kenney
(www.kenney.nl), publicado sob **Creative Commons Zero (CC0 1.0)**:
https://creativecommons.org/publicdomain/zero/1.0/

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

## O que ainda falta

**Gritos marciais (kiai).** O pacote "Voiceover Pack (Fighter)" da Kenney,
também CC0, é um LOCUTOR de arcade — "fight!", "round 1", "flawless victory" —
em inglês, não grunhido de luta. Não serve: destoa do wuxia e não é o que se
pediu. Os nomes `gritoAtaque`, `gritoEsforco` e `gritoChefe` estão declarados
em `COM_AMOSTRA` e ficam em silêncio até aparecer gravação. Silêncio é melhor
que um bipe fingindo ser voz.

O caminho mais barato para eles provavelmente é gravar: um "HÁ!" no celular
resolve, e dá ao jogo uma voz que nenhum banco de sons genérico dá.
