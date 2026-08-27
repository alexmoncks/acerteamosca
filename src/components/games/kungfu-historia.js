// kungfu-historia.js — a apresentação da história, em 8 bits.
//
// O que arcade chama de attract mode: doze telas antes da fase 1, sobre a
// faixa "Kungfu Castle Opening Screen", dizendo por que o herói vai subir cinco
// andares. Sem isso ele sobe porque o jogo mandou.
//
// As cenas são DADOS, como o cenário. Nada aqui desenha nem conhece PixiJS:
// a montagem recebe esta tabela e a executa, o que deixa a duração, a ordem e a
// composição conferíveis sem navegador.
//
// ── Por que isto mudou ──────────────────────────────────────────────────────
//
// A primeira versão eram CINCO painéis compostos com a arte que o jogo já
// carrega, e ela defendia esse limite: painel desenhado à parte mostraria
// personagens que o jogador não vai reencontrar. O limite caiu por dois
// motivos:
//
//   1. Metade destas cenas não é componível com o elenco. Salão do trono,
//      o rapto no pátio, o confronto no pavilhão, o pagode visto de fora —
//      são enquadramentos, não personagens de pé sobre um degradê, e não
//      existem em `props/` nem em folha de sprite nenhuma.
//   2. Com um chefe por tela em vez dos cinco enfileirados num painel só, a
//      abertura apresenta o elenco de verdade: o jogador chega no andar 3
//      tendo visto quem mora lá.
//
// O que a objeção original protegia continua valendo, e continua valendo aqui:
// as cenas seguem a mesma bíblia visual que os sprites do jogo
// (`docs/superpowers/specs/kungfu-castle-biblia-visual-chinesa.md`) — changshan
// branco e faixa vermelha no herói, paifang no lugar de torii, dao e jian no
// lugar de katana. Quem vê a abertura reconhece quem encontra na fase 1.

/**
 * A moldura da abertura, em 16:9.
 *
 * O jogo roda em 480×320 (3:2), mas esta tela tem Application própria e as
 * cenas foram compostas em 16:9. Espremê-las no 3:2 do jogo cortaria as
 * lanternas dos cantos, que é onde metade das cenas ancora a composição.
 */
export const LARGURA = 480;
export const ALTURA = 270;

/** Onde os PNGs da abertura moram. */
export const BASE_CENAS = "/images/kungfucastle/historia";

/** Faixa que toca por baixo da apresentação inteira. */
export const TRILHA_ABERTURA = "abertura";

/**
 * Quanto tempo o texto leva para aparecer, em segundos por caractere.
 *
 * Texto que surge de uma vez é lido antes de a cena assentar e o jogador
 * passa o resto do tempo esperando. Escrito letra a letra, a leitura acompanha
 * a imagem. 0,035 dá ~28 caracteres por segundo, perto de leitura confortável.
 */
export const VELOCIDADE_TEXTO = 0.035;

/** Tempo de fade entre cenas, em segundos. */
export const FADE = 0.6;

/** Duração do estouro branco no único corte seco da sequência, em segundos. */
export const FLASH = 0.1;

/**
 * As cenas.
 *
 * `arquivo` é o PNG em BASE_CENAS — uma imagem inteira, não uma composição de
 * camadas. `chave` e `faixa` são chaves de tradução, não texto: a legenda e a
 * tarja do andar são compostas por cima na hora de desenhar, o que permite
 * trocar de idioma sem regerar imagem nenhuma.
 *
 * `boss` amarra a cena ao chefe daquele andar, com o id que PHASE_CONFIG usa —
 * `general-oni` e `senhor-castelo` continuam com os nomes antigos no código
 * mesmo depois de a bíblia visual os ter rebatizado, porque renomear id de
 * chefe é mexer no jogo, não na abertura.
 *
 * `logo` põe o logotipo na tela; `corte: "flash"` troca o fade de entrada por
 * corte seco com estouro branco.
 */
export const CENAS = [
  { id: "titulo",  arquivo: "cena-01-titulo.png",  dur: 5.0, logo: true },
  { id: "templo",  arquivo: "cena-02-templo.png",  dur: 5.0, chave: "historia.castelo" },
  { id: "trono",   arquivo: "cena-03-trono.png",   dur: 5.0, chave: "historia.trono" },
  { id: "rapto",   arquivo: "cena-04-rapto.png",   dur: 5.0, chave: "historia.rapto" },
  { id: "paifang", arquivo: "cena-05-paifang.png", dur: 5.0, chave: "historia.portao" },
  { id: "heroi",   arquivo: "cena-06-heroi.png",   dur: 5.0, chave: "historia.heroi" },

  // Um chefe por tela, na ordem dos andares. É o que o painel "mestres" da
  // versão antiga tentava fazer com cinco figuras enfileiradas.
  { id: "andar1",  arquivo: "cena-07-andar1.png",  dur: 5.0,
    chave: "historia.andar1", faixa: "historia.faixa1", boss: "mestre-capangas" },
  { id: "andar2",  arquivo: "cena-08-andar2.png",  dur: 5.0,
    chave: "historia.andar2", faixa: "historia.faixa2", boss: "guardiao-portao" },
  { id: "andar3",  arquivo: "cena-09-andar3.png",  dur: 5.0,
    chave: "historia.andar3", faixa: "historia.faixa3", boss: "senhor-sombras" },
  { id: "andar4",  arquivo: "cena-10-andar4.png",  dur: 5.0,
    chave: "historia.andar4", faixa: "historia.faixa4", boss: "general-oni" },

  // O único corte seco do minuto. Fade em tudo faz a sequência inteira ter o
  // mesmo peso; a quebra de ritmo é o que marca o clímax como clímax.
  { id: "andar5",  arquivo: "cena-11-andar5.png",  dur: 5.0, corte: "flash",
    chave: "historia.andar5", faixa: "historia.faixa5", boss: "senhor-castelo" },

  { id: "fim",     arquivo: "cena-12-fim.png",     dur: 5.0, logo: true },
];

/** Duração da apresentação inteira, em segundos. */
export function duracaoTotal(cenas = CENAS) {
  return cenas.reduce((soma, c) => soma + c.dur, 0);
}

/**
 * Qual cena está no ar no instante `t`, e há quanto tempo.
 *
 * @returns {{indice: number, cena: object, local: number}|null} null depois do fim
 */
export function cenaEm(t, cenas = CENAS) {
  let acc = 0;
  for (let i = 0; i < cenas.length; i++) {
    if (t < acc + cenas[i].dur) {
      return { indice: i, cena: cenas[i], local: t - acc };
    }
    acc += cenas[i].dur;
  }
  return null;
}

/**
 * Opacidade da cena no instante local — entra com fade, sai com fade.
 *
 * Corte seco entre cenas pisca; o fade é o que as costura numa sequência só.
 */
export function opacidadeEm(local, dur, fade = FADE) {
  if (local < 0 || local > dur) return 0;
  if (local < fade) return local / fade;
  if (local > dur - fade) return Math.max(0, (dur - local) / fade);
  return 1;
}

/**
 * Opacidade de UMA cena, respeitando o corte seco.
 *
 * A cena de corte não tem fade de entrada: ela já começa cheia, senão o
 * estouro branco por cima de uma imagem transparente vira um clarão cinza.
 * A saída continua com fade, porque a cena seguinte precisa entrar de algum
 * lugar.
 */
export function opacidadeDaCena(cena, local, fade = FADE) {
  if (cena.corte !== "flash") return opacidadeEm(local, cena.dur, fade);
  if (local < 0 || local > cena.dur) return 0;
  if (local > cena.dur - fade) return Math.max(0, (cena.dur - local) / fade);
  return 1;
}

/** Quanto do estouro branco ainda está na tela, de 1 a 0. */
export function flashEm(cena, local, duracao = FLASH) {
  if (cena.corte !== "flash" || local < 0 || local >= duracao) return 0;
  return 1 - local / duracao;
}

/**
 * Quantos caracteres do texto já foram escritos no instante local.
 *
 * A escrita só começa depois do fade de entrada: texto surgindo sobre uma cena
 * ainda transparente fica ilegível justo no começo, que é quando o jogador
 * olha.
 */
export function letrasEm(local, total, velocidade = VELOCIDADE_TEXTO, fade = FADE) {
  const depois = local - fade;
  if (depois <= 0) return 0;
  return Math.min(total, Math.floor(depois / velocidade));
}

/**
 * Todo arquivo que a apresentação precisa, para poder ser pré-carregada.
 *
 * Sem isto o primeiro quadro de cada cena apareceria vazio enquanto o PNG
 * chega — e uma cena dura cinco segundos, então a falha ocuparia um quinto do
 * tempo dela.
 */
export function arquivosDaHistoria(cenas = CENAS) {
  return cenas.map((c) => `${BASE_CENAS}/${c.arquivo}`);
}

/** As chaves de legenda que a apresentação exige. Cena sem legenda não entra. */
export function chavesDaHistoria(cenas = CENAS) {
  return cenas.filter((c) => c.chave).map((c) => c.chave);
}

/** As chaves de tarja de andar. */
export function faixasDaHistoria(cenas = CENAS) {
  return cenas.filter((c) => c.faixa).map((c) => c.faixa);
}

/** Os chefes apresentados, na ordem dos andares. */
export function chefesDaHistoria(cenas = CENAS) {
  return cenas.filter((c) => c.boss).map((c) => c.boss);
}
