// Encaixe dos jogos na altura visível da tela.
//
// O pedido (Alexander): num monitor de 768px de altura o jogo cortava
// embaixo. A meta viewport não resolve isso no desktop — ela só diz ao
// celular a largura do layout. Até o fae3a89 a escala de cada jogo olhava só
// a LARGURA (useGameScale: innerWidth - 24); a altura nunca entrava na conta,
// e com a Navbar fixa (48px), o título e os controles, a caixa passava do
// fim da tela.
//
// Agora cada jogo mede o espaço que sobra para ele (o "slot" do GameFit, que
// é um item flex que cresce até preencher a altura visível menos a Navbar, o
// título e os controles) e escala a caixa lógica para caber nas DUAS
// dimensões, mantendo a proporção. O cabeçalho do site não se mexe e nada
// rola sozinho (opção (a) do pedido; justificativa em GameFit.jsx).
//
// Este arquivo é só matemática pura, sem DOM, para ser testada
// (tests/game-fit.test.mjs). Quem mede a página é src/hooks/useGameFit.js.

/** Altura da Navbar fixa (src/components/Navbar.jsx) e do paddingTop do <main>. */
export const NAVBAR_ALTURA = 48;

/**
 * Menor escala aceita. Abaixo disso a caixa para de encolher e a página
 * ganha rolagem em vez de virar um selo: só acontece em celular deitado
 * (390px de altura) com jogo alto e controles de toque embaixo.
 */
export const ESCALA_MINIMA = 0.25;

/** Maior escala padrão: os jogos não ampliam além do tamanho lógico. */
export const ESCALA_MAXIMA = 1;

const finito = (n) => typeof n === "number" && Number.isFinite(n);

/**
 * Escala que faz uma caixa lógica `largura` × `altura` caber em
 * `larguraDisponivel` × `alturaDisponivel`, mantendo a proporção.
 *
 * - limitada a [minima, maxima];
 * - arredondada PARA BAIXO em 4 casas: o arredondamento nunca empurra a
 *   caixa 1px para fora do espaço medido;
 * - entrada inválida (zero, negativo, NaN) não quebra o jogo: volta a escala
 *   máxima limitada pela dimensão que for válida, ou 1.
 */
export function escalaDeEncaixe({
  largura,
  altura,
  larguraDisponivel,
  alturaDisponivel,
  minima = ESCALA_MINIMA,
  maxima = ESCALA_MAXIMA,
}) {
  if (!(finito(largura) && largura > 0 && finito(altura) && altura > 0)) return 1;
  const max = finito(maxima) && maxima > 0 ? maxima : ESCALA_MAXIMA;
  const min = finito(minima) && minima > 0 ? Math.min(minima, max) : 0;
  const porLargura = finito(larguraDisponivel) && larguraDisponivel > 0 ? larguraDisponivel / largura : Infinity;
  const porAltura = finito(alturaDisponivel) && alturaDisponivel > 0 ? alturaDisponivel / altura : Infinity;
  let s = Math.min(porLargura, porAltura, max);
  if (!finito(s)) s = max;
  s = Math.max(min, s);
  return Math.floor(s * 10000) / 10000;
}

/** Escala e tamanho CSS resultante da caixa (largura × altura lógicas × escala). */
export function tamanhoEncaixado(opcoes) {
  const escala = escalaDeEncaixe(opcoes);
  return { escala, largura: opcoes.largura * escala, altura: opcoes.altura * escala };
}

/**
 * Altura que sobra para o conteúdo da página de jogo: a da janela menos a
 * Navbar, as margens seguras do iPhone (env(safe-area-inset-*), que o body
 * aplica como padding) e o que mais estiver reservado (título, controles).
 * Nunca negativa.
 */
export function alturaDisponivel({
  alturaJanela,
  topo = NAVBAR_ALTURA,
  reservado = 0,
  seguraTopo = 0,
  seguraBase = 0,
}) {
  const h = finito(alturaJanela) ? alturaJanela : 0;
  const tirar = [topo, reservado, seguraTopo, seguraBase].reduce((a, n) => a + (finito(n) && n > 0 ? n : 0), 0);
  return Math.max(0, h - tirar);
}

/**
 * Valor da variável CSS --aam-vh (1% da altura visível) para navegador SEM
 * dvh. Com dvh, devolve null: o CSS usa 100dvh direto e a variável nem é
 * criada. Sem dvh (iOS < 15.4, Chrome < 108), 100vh é a altura com a barra de
 * endereço ESCONDIDA — maior que a área visível —, e o jogo cortaria embaixo
 * no celular; window.innerHeight acompanha a barra.
 */
export function variavelVh({ suportaDvh, alturaJanela }) {
  if (suportaDvh) return null;
  if (!(finito(alturaJanela) && alturaJanela > 0)) return null;
  return `${Math.round(alturaJanela) / 100}px`;
}

/**
 * Declarações de min-height da raiz de cada jogo, em ordem de fallback (a
 * última que o navegador entende vence). As mesmas estão em
 * src/app/globals.css (.game-fit-root); o teste confere que batem.
 */
export const CSS_ALTURA_MINIMA = [
  "calc(100vh - var(--aam-topo) - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))",
  "calc(var(--aam-vh, 1vh) * 100 - var(--aam-topo) - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))",
  "calc(100dvh - var(--aam-topo) - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))",
];

/**
 * Converte um ponto da tela (clientX/clientY de mouse, toque ou ponteiro)
 * para coordenadas lógicas do jogo.
 *
 * Usa a razão entre o tamanho lógico e o retângulo NA TELA
 * (getBoundingClientRect, que já inclui o transform: scale da caixa), e não
 * offsetX nem offsetWidth: esses ignoram o transform e dariam coordenadas
 * erradas assim que a caixa encolhe para caber na altura.
 *
 * Para canvas com buffer em alta densidade (largura = lógica × dpr, como o
 * PixiJS do Kung Fu Castle), passe a largura LÓGICA, não canvas.width.
 */
export function clienteParaLogico(clientX, clientY, rect, larguraLogica, alturaLogica) {
  const rw = rect && rect.width > 0 ? rect.width : larguraLogica;
  const rh = rect && rect.height > 0 ? rect.height : alturaLogica;
  return {
    x: ((clientX - (rect ? rect.left : 0)) * larguraLogica) / rw,
    y: ((clientY - (rect ? rect.top : 0)) * alturaLogica) / rh,
  };
}

/** Deslocamento na tela (arrasto de dedo) → deslocamento lógico. */
export function deltaClienteParaLogico(dx, dy, rect, larguraLogica, alturaLogica) {
  const rw = rect && rect.width > 0 ? rect.width : larguraLogica;
  const rh = rect && rect.height > 0 ? rect.height : alturaLogica;
  return { x: (dx * larguraLogica) / rw, y: (dy * alturaLogica) / rh };
}

/**
 * Buffer interno de um canvas nítido: resolução lógica × devicePixelRatio
 * (limitado a [1, 3]). Só o tamanho CSS muda com o encaixe; o buffer e as
 * coordenadas lógicas do jogo continuam os mesmos — a escala não depende do
 * dpr.
 */
export function bufferDoCanvas(larguraLogica, alturaLogica, dpr = 1) {
  const d = finito(dpr) && dpr > 0 ? Math.min(3, Math.max(1, dpr)) : 1;
  return { width: Math.round(larguraLogica * d), height: Math.round(alturaLogica * d), dpr: d };
}
