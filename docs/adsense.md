# Google AdSense no Acerte a Mosca

Publisher: `ca-pub-4148140889800778` (público, o mesmo do `ads.txt`). Vale para os dois domínios: `acerteamosca.com.br` (PT) e `nailedthefly.com` (EN), com as mesmas rotas.

O site foi aprovado no AdSense em 11/2026. Os anúncios saem de **blocos manuais** (`src/components/AdBanner.jsx`) em posições fixas, todos sujeitos ao consentimento prévio do lote 2 (`src/lib/consent.js`).

## Anúncios Automáticos: desligados no painel

O código não liga nem desliga os Anúncios Automáticos. Isso é feito no painel (**Anúncios → Por site → acerteamosca.com.br / nailedthefly.com**). A recomendação é:

- **Anúncios Automáticos DESLIGADOS** nos dois sites. Ficam só os blocos manuais desta página.
- Se for ligar por algum motivo, no mínimo:
  - exclua as páginas de jogo (**Exclusões de página**: `acerteamosca.com.br/jogos/*` e `nailedthefly.com/jogos/*`);
  - desligue os **formatos de sobreposição**: âncora, vinheta e coluna lateral (side rail);
  - desligue os anúncios dentro da página nas áreas de jogo e confira o resultado na prévia do painel.

**Por quê:** o Auto ads decide sozinho onde pôr o anúncio. Ele pode cair dentro da área do jogo, entre o canvas e os botões de toque ou perto dos botões de fim de partida. A âncora fica fixa no rodapé da tela, onde estão os controles de toque (o Kung Fu Castle, por exemplo, tem botões `position: fixed` no rodapé). A vinheta interrompe a navegação entre os jogos. Tudo isso é clique acidental, que a política do AdSense proíbe e que pode suspender a conta. Os blocos manuais ficam onde o código e os testes garantem.

## Unidades a criar no painel

Em **Anúncios → Por unidade de anúncio → Anúncios de display**. Crie todas como **Responsivo**, nunca com tamanho fixo: o código já define o `data-ad-format` e a reserva de altura de cada uma (`AD_PLACEMENTS` em `src/lib/ads.js`). Depois de criar, copie **só o número** do `data-ad-slot` para a variável de ambiente.

| Nome da unidade | Tipo no painel | Formato no código | Reserva (mobile / desktop) | Variável de ambiente | Onde aparece |
|---|---|---|---|---|---|
| `AAM - Home topo` | Display, horizontal, responsivo | `horizontal` (320x50/320x100 no celular, 728x90 no desktop) | 100px / 90px | `NEXT_PUBLIC_ADSENSE_SLOT_HOME_TOP` | `/`: entre o destaque do 3INVADER e a grade de jogos |
| `AAM - Home rodapé` | Display, quadrado, responsivo | `auto` | 280px / 250px | `NEXT_PUBLIC_ADSENSE_SLOT_HOME_BOTTOM` | `/`: no fim, depois do FAQ |
| `AAM - Jogo rodapé` | Display, quadrado, responsivo | `auto` | 280px / 250px | `NEXT_PUBLIC_ADSENSE_SLOT_GAME_FOOTER` | `/jogos/*` (exceto `kungfucastle`): no fim, depois do texto editorial (GameInfo) |
| `AAM - Conteúdo rodapé` | Display, quadrado, responsivo | `auto` | 280px / 250px | `NEXT_PUBLIC_ADSENSE_SLOT_CONTENT_BOTTOM` | `/sobre`: no fim, depois do texto |

Uma unidade serve aos dois domínios (o relatório separa por site). Se quiser ver PT e EN separados por unidade, crie oito (o nome com ` PT`/` EN`). Hoje o código usa um ID por placement.

As variáveis são `NEXT_PUBLIC_*` e entram no bundle no **build**: no Railway, ponha no serviço e faça um novo deploy (o `Dockerfile` declara `ARG`/`ENV` de todas). Variável vazia ou não numérica: o bloco não renderiza.

### Reserva de altura (CLS)

A caixa `.ad-slot` tem `min-height` por placement, com media query em 768px (`AD_DESKTOP_MIN_WIDTH`):

- `home_top` está perto da primeira dobra, acima da grade de jogos. Reserva a altura do maior tamanho horizontal de cada faixa (100 no celular, 90 no desktop), para a grade não pular.
- `home_bottom`, `game_footer` e `content_bottom` ficam no fim da página. O `auto` no celular quase sempre entrega um retângulo (300x250, 336x280): reserva 280. No desktop (caixa de até 900px) pode vir 728x90 ou um retângulo de 250: reserva 250. Um anúncio de 90 deixa sobra em branco, mas não empurra nada. Reservar só 90 faria a página pular 160px quando viesse um retângulo.

Bloco sem anúncio (`data-ad-status="unfilled"`) some inteiro, com o rótulo, pelo CSS que o Google suporta (`globals.css`).

## Posições e regras

Política do AdSense sobre cliques acidentais, garantida pelos testes (`tests/adsense.test.mjs`):

- nenhum bloco dentro de componente de jogo (`src/components/games`), sobre o canvas, perto de controles de toque ou dos botões de fim de jogo;
- nada sticky, flutuante ou sobreposto;
- margem de 48px em volta de cada bloco e o rótulo "Publicidade" / "Advertisement";
- nas páginas de jogo, o bloco é o último item, depois do GameInfo.

| Rota (PT e EN) | Bloco | Decisão |
|---|---|---|
| `/` | `home_top`, `home_bottom` | Home: entre o destaque e a grade; no fim, depois do FAQ. |
| `/jogos/2048`, `3invader`, `acerteamosca`, `batalha-naval`, `brickbreaker`, `bubbleshooter`, `deepattack`, `jacare`, `memory`, `pong`, `ships`, `tiroaoalvo`, `wordle` | `game_footer` | Depois do GameInfo, longe do canvas. |
| `/jogos/kungfucastle` | nenhum | Os botões de toque são `position: fixed` no rodapé da tela durante a partida. Um bloco abaixo do GameInfo passaria por baixo deles ao rolar. |
| `/sobre` | `content_bottom` | Única página de conteúdo com texto próprio (não há blog nem guias). |
| `/contato`, `/politica-de-privacidade`, `/termos-de-uso` | nenhum | Páginas institucionais/legais: sem anúncio. |

Se surgir uma página de conteúdo nova (blog, guia, "como jogar"), ela pode receber `<AdBanner placement="content_bottom" />` no fim do texto. Atualize o teste de posições.

## Fluxo de consentimento

Decisão do Alexander (22/11/2026): consentimento prévio em todo lugar, Brasil incluído.

1. **Antes do Aceitar:** o HTML não tem nenhuma tag do Google. Só o script inline `consent-default` (com nonce), que põe o Modo de consentimento em `denied`. Nenhum `adsbygoogle.js`, nenhuma requisição a googlesyndication/doubleclick, nenhum cookie. Os blocos ficam ocultos por CSS (`.ad-slot { display: none }`) e não pedem anúncio.
2. **Aceitar:** `acceptSiteChoice` grava a escolha, marca `<html data-aam-ads="on">` (os blocos aparecem), injeta o `adsbygoogle.js` e dispara o evento `acerteamosca:ads-on`. Cada bloco montado faz um `push` ao receber o evento, uma vez só.
3. **Visitas seguintes de quem aceitou:** o `consent-default` do `<head>` carrega as tags e marca `data-aam-ads="on"` antes da primeira pintura. A caixa já ocupa o espaço reservado desde o HTML, sem CLS. Cada bloco faz o `push` no mount.
4. **Recusar** (no aviso ou depois, pelo link "Privacidade e cookies" do rodapé): grava a recusa, remove o atributo (os blocos somem), manda `denied` e apaga os cookies do Google no domínio do site. Se as tags já estavam na página, recarrega. Daí em diante, nenhuma tag e nenhum bloco.

Constantes: `ADS_ATTR`, `ADS_ON_EVENT`, `adsConsented` e `whenAdsAllowed` em `src/lib/consent.js`.

## EEE, Reino Unido e Suíça (TCF)

No EEE, no Reino Unido e na Suíça, quem pede e registra o consentimento para anúncios é a **mensagem de consentimento do Google**: a ferramenta **Privacidade e mensagens** do AdSense, uma CMP certificada pelo Google e integrada ao IAB TCF v2. O `adsbygoogle.js` a carrega nessas regiões depois do Aceitar do site.

- Configure em **Privacidade e mensagens → Mensagens de consentimento europeias (GDPR)**, publicada para os dois sites, nos dois idiomas.
- O site **não concede nada** no EEE/UK/CH (`grantDecision` e `markGdprApplies` em `src/lib/cmp.js`/`consent.js`). O Aceitar do site só carrega a tag; a resposta à mensagem do Google decide se os anúncios serão personalizados, limitados ou não personalizados.
- O link "Privacidade e cookies" reabre a mensagem do Google nessas regiões.

## ads.txt

`public/ads.txt` tem exatamente:

```
google.com, pub-4148140889800778, DIRECT, f08c47fec0942fa0
```

O Next serve o arquivo estático nos dois domínios (`https://acerteamosca.com.br/ads.txt` e `https://nailedthefly.com/ads.txt`). No `www` dos dois, o middleware responde 301 para o domínio raiz, pelo `Host` ou pelo `X-Forwarded-Host`. O teste está em `tests/csp-nonce.test.mjs`. No painel, **Sites** deve mostrar o `ads.txt` como "Autorizado" nos dois.

## Prévia sem impressões reais

Para conferir o layout fora da produção (homeserver, `docs/dev-homeserver.md`):

- `NEXT_PUBLIC_ADSENSE_ADTEST="on"`: os blocos com ID ganham `data-adtest="on"`, e o Google trata as requisições como teste (sem impressão nem clique contado). Qualquer outro valor deixa o atributo de fora.
- `NEXT_PUBLIC_ADSENSE_PLACEHOLDERS="1"`: bloco sem ID numérico vira a mesma caixa (mesma reserva, mesmo rótulo, oculta até o Aceitar), com um retângulo tracejado escrito "Publicidade — `<placement>` (`<formato>`)" e **sem `<ins>`** (nunca pede anúncio).

As duas ficam vazias por padrão e **nunca** são definidas na produção. Build da prévia:

```bash
NEXT_PUBLIC_ADSENSE_ID=ca-pub-4148140889800778 NEXT_PUBLIC_ADSENSE_ADTEST=on \
NEXT_PUBLIC_ADSENSE_PLACEHOLDERS=1 NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production npm run build
```

Lembre-se de clicar em **Aceitar** no aviso de cookies: sem isso, nenhum bloco aparece, nem a caixa tracejada.
