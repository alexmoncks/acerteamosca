# Google AdSense no Acerte a Mosca

Publisher: `ca-pub-4148140889800778` (público, o mesmo do `ads.txt`). Vale para os dois domínios: `acerteamosca.com.br` (PT) e `nailedthefly.com` (EN), com as mesmas rotas.

O site foi aprovado no AdSense em 11/2026. Os anúncios saem de **blocos manuais** (`src/components/AdBanner.jsx`) em posições fixas, todos sujeitos ao consentimento prévio do lote 2 (`src/lib/consent.js`).

## Anúncios Automáticos: desligados no painel

Quem desliga os Anúncios Automáticos é o painel (**Anúncios → Por site → acerteamosca.com.br / nailedthefly.com**). O código tem uma defesa a mais (ver "Defesa no código contra Anúncios Automáticos", abaixo), mas ela **não substitui o painel**. A recomendação é:

- **Anúncios Automáticos DESLIGADOS** nos dois sites. Ficam só os blocos manuais desta página.
- Se for ligar por algum motivo, no mínimo:
  - exclua as páginas de jogo (**Exclusões de página**: `acerteamosca.com.br/jogos/*` e `nailedthefly.com/jogos/*`);
  - desligue os **formatos de sobreposição**: âncora, vinheta e coluna lateral (side rail);
  - desligue os anúncios dentro da página nas áreas de jogo e confira o resultado na prévia do painel.

**Por quê:** o Auto ads decide sozinho onde pôr o anúncio. Ele pode cair dentro da área do jogo, entre o canvas e os botões de toque ou perto dos botões de fim de partida. A âncora fica fixa no rodapé da tela, onde estão os controles de toque (o Kung Fu Castle, por exemplo, tem botões `position: fixed` no rodapé). A vinheta interrompe a navegação entre os jogos. Tudo isso é clique acidental, que a política do AdSense proíbe e que pode suspender a conta. Os blocos manuais ficam onde o código e os testes garantem.

## Defesa no código contra Anúncios Automáticos

**O que mudou (24/11/2026):** o `adsbygoogle.js` entra **sem `?client=ca-pub-…`** na URL (`consentDefaultScript` em `src/lib/consent.js`). As unidades manuais continuam funcionando, porque cada `<ins>` leva o `data-ad-client`. A verificação do site continua pela meta `google-adsense-account` do layout, e o `ads.txt` não muda.

**O que foi testado:** `tests/e2e/auto-ads.e2e.mjs` (Playwright, fora do `npm test`) contra um servidor local (`next start -H localhost -p 3193`), com um build com `NEXT_PUBLIC_ADSENSE_PLACEHOLDERS=1` (nenhum `<ins>` do site). A escolha "granted" fica gravada antes do carregamento, e o pedido leva `CF-IPCountry: BR` (o `<head>` manda o "granted", como para um visitante do Brasil que aceitou). Cada medição fica 10 s parada, em `/` e em `/jogos/wordle`, no desktop (1366x768) e no celular (390x844). As variantes entram pela reescrita do script inline no HTML (o nonce continua valendo). Os pedidos a `googleads.g.doubleclick.net/pagead/ads` são contados e **abortados**: nenhum anúncio é entregue e nenhuma impressão é contada.

| Variante | `pagead/ads` | `managed/js/adsense` | `<ins>` do Auto ads | Erros de console |
|---|---|---|---|---|
| A: `adsbygoogle.js?client=…` (até o `c7377ae`) | 1 | 1 | 1 | 0 |
| B: `adsbygoogle.js` sem `?client=` | **0** | **0** | **0** | 0 |
| C: B + push único `{google_ad_client, enable_page_level_ads: false}` | 1 | 1 | 1 | 0 |
| D: A + o push de C | 1 | 1 | 2 | 1: `TagError: Only one 'enable_page_level_ads' allowed per page.` |

Os números são por medição, e saíram iguais nas quatro combinações de página e tela (`/` e `/jogos/wordle`, desktop e celular). O `<ins>` do Auto ads é um `ins.adsbygoogle.adsbygoogle-noablate` com `data-ad-hi`, e o pedido dele sai com `format=0x0`: é o pedido de página dos formatos sobrepostos (âncora/vinheta).

**Unidade manual:** com um `<ins>` de slot numérico **falso** e `data-adtest="on"` (só no teste local, nunca commitado), A e B geram o pedido da unidade (`slotname=…`) do mesmo jeito, sem erro. Também foi conferido no build já com B, com os blocos do próprio site (slots falsos só por variável de ambiente, `--variantes=real`): cada bloco gera o seu pedido (`home_top`, `home_bottom`, `game_footer`), sem erro.

**A escolha foi B**, porque é a única que zera os pedidos numa página sem `<ins>` sem erro de console. A variante C piora: o push com `google_ad_client` **liga** o Auto ads mesmo com `enable_page_level_ads: false`, sem aviso nenhum. A D lança o TagError. Os testes (`tests/adsense.test.mjs`, `tests/consent.test.mjs`) conferem a URL sem query e que nenhum arquivo de `src/` usa `enable_page_level_ads`, `google_ad_client` ou `data-overlays`.

**O limite:** a defesa só vale para a página **sem bloco manual**. Com um `<ins>` na página (todas as páginas com bloco, quando os IDs estiverem no ar), o `data-ad-client` basta: com B, o `adsbygoogle.js` busca o `managed/js/adsense` e faz o pedido `format=0x0` do Auto ads, igual a A (medido com o slot falso). Quem decide se esse pedido traz âncora ou vinheta é a configuração do painel.

**O que o Google ainda respeita:**

- o painel: Auto ads ligado/desligado por site, as **Exclusões de página** e os formatos (âncora, vinheta, coluna lateral, anúncios dentro da página);
- o `data-ad-client`/`data-ad-slot` de cada `<ins>` (as unidades manuais);
- a meta `google-adsense-account` (verificação do site) e o `ads.txt`.

**O que não usar:**

- `data-overlays="bottom"` ou `"collapsed-bottom"` no script: segundo a ajuda do Google, ele **liga** âncoras mesmo com elas desligadas no painel;
- `enable_page_level_ads: false`: não é documentado como forma de desligar, e o teste mostrou que o push com `google_ad_client` liga o Auto ads; dois na página dão TagError.

**Consequência na mensagem do Google (EEE/UK/CH):** sem o `?client=`, o `adsbygoogle.js` só fica sabendo do publisher pelo `<ins>`. Espera-se, então, que a mensagem de consentimento do Google só apareça nas páginas com bloco manual. Nas páginas sem bloco, não há anúncio para consentir, e o `src/lib/cmp.js` segue a regra de sempre: no EEE nunca concede. Isso não pôde ser medido daqui, porque o teste sai de um IP do Brasil e em nenhuma variante houve pedido a `fundingchoicesmessages.google.com`. Confira na prévia, de uma conexão europeia, quando os IDs estiverem no ar.

**O painel continua obrigatório:** Anúncios Automáticos **desligados** nos dois sites (`acerteamosca.com.br` e `nailedthefly.com`). Se por algum motivo ficarem ligados, no mínimo `/jogos/*` excluídas nos dois e âncora, vinheta e coluna lateral desligadas.

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

Bloco sem anúncio (`data-ad-status="unfilled"`) some inteiro, com o rótulo, pelo sinal que o Google põe no `<ins>` (`globals.css`). São dois caminhos para o mesmo sinal:

- `.ad-slot:has(ins.adsbygoogle[data-ad-status="unfilled"])`, dentro de `@supports selector(:has(*))`. O `@supports` é necessário: sem ele, o minificador do Next junta essa regra com a de baixo num seletor só, e o navegador sem `:has()` descarta a regra inteira;
- `html[data-aam-ads="on"] .ad-slot[data-ad-vazio]`: o AdBanner observa o `data-ad-status` do próprio `<ins>` (`watchUnfilled` em `src/lib/ads.js`, MutationObserver), marca a caixa com `data-ad-vazio`, desmarca se o anúncio vier depois e desconecta no unmount. É o caminho do Firefox < 121.

**Pulo de layout (medido com `tests/e2e/bloco-vazio.e2e.mjs`, 24/11/2026):**

- **Páginas de jogo** (`/jogos/wordle`, `/jogos/acerteamosca`, desktop e celular): quando o `game_footer` colapsa, a área do jogo e o h1 do GameInfo **não se movem** (0px). Só a página encolhe (−325px no desktop, −355px no celular).
- **`home_bottom`:** o FAQ acima não se move.
- **`home_top`:** fica entre o destaque e a grade, perto da primeira dobra. **Não colapsa** quando o anúncio vem vazio: a reserva (100 px no celular, 90 px no desktop) e o rótulo "Publicidade" ficam, para a grade não pular (~205 px no desktop / ~215 px no celular, medido em 24/11/2026 antes desta mudança). O `<ins>` unfilled continua oculto; só a caixa reservada permanece. Os outros blocos (`home_bottom`, `game_footer`, `content_bottom`) seguem colapsando. É uma **decisão reversível**, que vai para o Alexander confirmar. Para voltar atrás, tire o `:not([data-placement="home_top"])` das duas regras em `globals.css`.
- **Rolado até o fim:** quando a página encolhe, o navegador puxa a rolagem para cima, e na tela o texto desce o tamanho do bloco. A posição no documento não muda. Isso só acontece se o "unfilled" chegar com a pessoa já no fim da página, e o "unfilled" vem logo depois da resposta do pedido de anúncio.

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
