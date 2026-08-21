// kungfu-historia.js — a apresentação da história, em 8 bits.
//
// O que arcade chama de attract mode: cinco painéis antes da fase 1, sobre a
// faixa "Kungfu Castle Opening Screen", dizendo por que o herói vai subir cinco
// andares. Sem isso ele sobe porque o jogo mandou.
//
// Os painéis são DADOS, como o cenário. Nada aqui desenha nem conhece PixiJS:
// a montagem recebe esta tabela e a executa, o que deixa a duração, a ordem e a
// composição conferíveis sem navegador.
//
// **Toda arte já existe no jogo.** Um painel de história desenhado à parte
// mostraria personagens que o jogador não vai reencontrar — e é justamente o
// contrário do que a abertura serve para fazer.

/** A moldura do jogo. Os painéis são compostos nela, não em outra resolução. */
export const LARGURA = 480;
export const ALTURA = 320;

/** Faixa que toca por baixo da apresentação inteira. */
export const TRILHA_ABERTURA = "abertura";

/**
 * Quanto tempo o texto leva para aparecer, em segundos por caractere.
 *
 * Texto que surge de uma vez é lido antes de o painel assentar e o jogador
 * passa o resto do tempo esperando. Escrito letra a letra, a leitura acompanha
 * a imagem. 0,035 dá ~28 caracteres por segundo, perto de leitura confortável.
 */
export const VELOCIDADE_TEXTO = 0.035;

/** Tempo de fade entre painéis, em segundos. */
export const FADE = 0.6;

/**
 * Os painéis.
 *
 * `fundo` são camadas desenhadas do fundo para a frente, `figuras` são os
 * personagens. Todo `asset` aponta para arte que o jogo já carrega:
 *   - "prop:<nome>"    → public/images/kungfucastle/props/<nome>.png
 *   - "player:<anim>"  → o herói, quadro 0 da animação
 *   - "boss:<id>"      → o chefe, quadro 0 do idle
 *
 * `chao` é a linha em que as figuras pisam: abaixo dela o painel escurece, o
 * que dá piso a personagem que senão flutuaria no degradê.
 *
 * `x` é o CENTRO da figura e `y` o topo dela, em coordenadas de 480×320; `escala`
 * multiplica o tamanho do quadro original. `espelhar` inverte no eixo x, para
 * um personagem olhar para o outro sem pedir arte nova.
 *
 * `tint` escurece uma camada sem pedir arte nova — é o mesmo recurso que separa
 * inimigo de jogador no combate. As camadas de parallax foram pintadas para
 * ficar ATRÁS de um cenário inteiro; sozinhas num painel elas saem mais claras
 * que a figura principal e roubam o olho. O tint as devolve ao fundo.
 */
export const PAINEIS = [
  {
    id: "castelo",
    chave: "historia.castelo",
    dur: 5.0,
    // Céu claro embaixo, escuro em cima. O castelo é uma SILHUETA escura: com o
    // céu escuro atrás ele some, e tint não resolve — tint multiplica, só
    // escurece. Quem tem de mudar é o fundo.
    ceu: ["#070716", "#5c4a86"],
    chao: 258,
    fundo: [
      { asset: "prop:parallax-montanhas", x: 240, y: 186, escala: 1.875, tint: 0x3a3566 },
      { asset: "prop:fase2-parallax-castelo", x: 240, y: 86, escala: 1.7 },
    ],
    figuras: [
      { asset: "prop:lanterna-papel", x: 64, y: 182, escala: 1.6 },
      { asset: "prop:lanterna-papel", x: 416, y: 182, escala: 1.6 },
    ],
  },
  {
    id: "trono",
    chave: "historia.trono",
    dur: 5.5,
    ceu: ["#0d0510", "#33101b"],
    chao: 240,
    fundo: [
      { asset: "prop:biombo-dourado", x: 132, y: 96, escala: 2.2, tint: 0x9c8a5a },
      { asset: "prop:biombo-dourado", x: 372, y: 96, escala: 2.2, tint: 0x9c8a5a },
    ],
    figuras: [
      { asset: "prop:trono-sombrio", x: 226, y: 112, escala: 2.0 },
      // O chefe final no trono: é a primeira vez que o jogador o vê, e ele só
      // reaparece cinco andares depois.
      { asset: "boss:senhor-castelo", x: 224, y: 102, escala: 1.5 },
      { asset: "prop:princesa-amarrada", x: 352, y: 128, escala: 2.0, olhaPara: 224 },
    ],
  },
  {
    id: "portao",
    chave: "historia.portao",
    dur: 5.0,
    ceu: ["#07070f", "#1e1839"],
    chao: 252,
    fundo: [
      { asset: "prop:parallax-arvores", x: 240, y: 104, escala: 1.875, tint: 0x2b2340 },
      { asset: "prop:paifang", x: 268, y: 40, escala: 2.2 },
    ],
    figuras: [
      { asset: "prop:tocha-fogo", x: 386, y: 194, escala: 1.8 },
      // O herói de costas para a câmera não existe como sprite; ele entra de
      // perfil à esquerda, olhando para o arco.
      { asset: "player:idle", x: 132, y: 146, escala: 2.2, olhaPara: 268 },
    ],
  },
  {
    id: "mestres",
    chave: "historia.mestres",
    dur: 6.0,
    ceu: ["#0a0508", "#31141f"],
    chao: 250,
    fundo: [],
    // Os cinco chefes em fila, do primeiro andar ao topo, cada um um pouco
    // maior que o anterior. É o painel que diz "isto é o que te espera" sem uma
    // palavra — e a escala crescente diz em que ordem.
    figuras: [
      { asset: "boss:mestre-capangas", x: 52, y: 172, escala: 1.15 },
      { asset: "boss:guardiao-portao", x: 146, y: 165, escala: 1.25 },
      { asset: "boss:senhor-sombras", x: 240, y: 158, escala: 1.35 },
      { asset: "boss:general-oni", x: 334, y: 151, escala: 1.45 },
      { asset: "boss:senhor-castelo", x: 420, y: 135, escala: 1.25 },
    ],
  },
  {
    id: "heroi",
    chave: "historia.heroi",
    dur: 5.0,
    ceu: ["#100604", "#411609"],
    chao: 256,
    fundo: [
      { asset: "prop:escada-pedra-externa", x: 372, y: 96, escala: 2.0, tint: 0x8a6a52 },
    ],
    figuras: [
      { asset: "prop:braseiro-fogo", x: 74, y: 184, escala: 2.0 },
      // Olhando para a escada: é para lá que ele vai quando o painel sair.
      { asset: "player:idle", x: 196, y: 112, escala: 3.0, olhaPara: 372 },
    ],
  },
];

/** Duração da apresentação inteira, em segundos. */
export function duracaoTotal(paineis = PAINEIS) {
  return paineis.reduce((soma, p) => soma + p.dur, 0);
}

/**
 * Qual painel está no ar no instante `t`, e há quanto tempo.
 *
 * @returns {{indice: number, painel: object, local: number}|null} null depois do fim
 */
export function painelEm(t, paineis = PAINEIS) {
  let acc = 0;
  for (let i = 0; i < paineis.length; i++) {
    if (t < acc + paineis[i].dur) {
      return { indice: i, painel: paineis[i], local: t - acc };
    }
    acc += paineis[i].dur;
  }
  return null;
}

/**
 * Opacidade do painel no instante local — entra com fade, sai com fade.
 *
 * Corte seco entre painéis pisca; o fade é o que os costura numa sequência só.
 */
export function opacidadeEm(local, dur, fade = FADE) {
  if (local < 0 || local > dur) return 0;
  if (local < fade) return local / fade;
  if (local > dur - fade) return Math.max(0, (dur - local) / fade);
  return 1;
}

/**
 * Quantos caracteres do texto já foram escritos no instante local.
 *
 * A escrita só começa depois do fade de entrada: texto surgindo sobre um painel
 * ainda transparente fica ilegível justo no começo, que é quando o jogador olha.
 */
export function letrasEm(local, total, velocidade = VELOCIDADE_TEXTO, fade = FADE) {
  const depois = local - fade;
  if (depois <= 0) return 0;
  return Math.min(total, Math.floor(depois / velocidade));
}

/**
 * Todo asset que a apresentação precisa, para poder ser pré-carregada.
 *
 * Sem isto o primeiro quadro de cada painel apareceria vazio enquanto o PNG
 * chega — e um painel dura cinco segundos, então a falha ocuparia um quinto do
 * tempo dele.
 */
export function assetsDaHistoria(paineis = PAINEIS) {
  const fora = new Set();
  for (const p of paineis) {
    for (const f of [...(p.fundo ?? []), ...(p.figuras ?? [])]) fora.add(f.asset);
  }
  return [...fora];
}

/**
 * Para que lado a figura tem de ser desenhada: 1 como veio, -1 espelhada.
 *
 * A arte do elenco olha para a DIREITA parada — é a mesma convenção do jogo,
 * onde `facing = 1` é leste e todos os cinco chefes declaram `spriteFacing: 1`.
 * Uma figura que encara algo à sua esquerda precisa ser invertida.
 */
export const OLHA_NATIVO = 1;

export function espelhamentoDe(figura) {
  if (figura.olhaPara == null) return 1;
  const paraDireita = figura.olhaPara > figura.x;
  return paraDireita === (OLHA_NATIVO === 1) ? 1 : -1;
}

/** As chaves de tradução que a apresentação exige. */
export function chavesDaHistoria(paineis = PAINEIS) {
  return paineis.map((p) => p.chave);
}
