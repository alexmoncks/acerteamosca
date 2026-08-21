// kungfu-vitrine.js — a vitrine de golpes da tela inicial.
//
// Lógica pura: nenhum import, nenhum PixiJS, nenhum DOM. Quem desenha
// (KungFuVitrine.jsx) pergunta "que animação e que quadro agora?" e recebe.

/**
 * A ordem da vitrine, com `idle` entre cada golpe.
 *
 * O idle no meio é o lutador respirando: sem ele os golpes emendam e viram
 * agitação sem leitura, cada um indistinguível do seguinte.
 *
 * Fora daqui de propósito: `climb` (pede escada), `hit` (é apanhar), `crouch` e
 * `jump` (não fecham o ciclo parados), `turn` (sozinho lê como falha), `walk` e
 * `run` (andam sem sair do lugar) e `stand-east`/`stand-west` (um quadro só).
 */
export const SEQUENCIA = [
  "idle", "punch",
  "idle", "kick",
  "idle", "sweep",
  "idle", "flyKick",
  "idle", "backflip",
  "idle", "special",
];

/** O jogo roda a 60fps, e é dessa cadência que o `speed` do manifesto fala. */
const FPS = 60;

/**
 * Monta a vitrine: para cada passo de SEQUENCIA, quantos quadros e por quanto
 * tempo.
 *
 * O `speed` do manifesto é fração de quadro por tick, então a animação inteira
 * leva `quadros / speed` ticks — e `/ FPS` põe isso em segundos. Nenhuma
 * duração é digitada: mexer no `speed` de um golpe no manifesto muda a partida
 * e a vitrine juntas.
 *
 * @param {Record<string, number>} quadrosPorAnim  quadros de cada folha
 * @param {Record<string, number>} speedPorAnim    `speed` do ASSET_MANIFEST
 * @returns {{anim: string, quadros: number, duracaoMs: number}[]}
 */
export function montarPlano(quadrosPorAnim, speedPorAnim) {
  return SEQUENCIA.map((anim) => {
    const quadros = quadrosPorAnim[anim];
    const speed = speedPorAnim[anim];
    return { anim, quadros, duracaoMs: (quadros / speed / FPS) * 1000 };
  });
}

/**
 * Onde a vitrine está num instante: que animação, que quadro.
 *
 * O tempo dá a volta sozinho — a vitrine é um laço sem fim, e quem chama não
 * precisa saber a duração do ciclo para não estourar o fim.
 *
 * @param {{anim: string, quadros: number, duracaoMs: number}[]} plano
 * @param {number} tMs  milissegundos desde que a vitrine começou
 * @returns {{anim: string, quadro: number}}
 */
export function quadroEm(plano, tMs) {
  const ciclo = plano.reduce((soma, p) => soma + p.duracaoMs, 0);
  let t = ((tMs % ciclo) + ciclo) % ciclo; // % de negativo é negativo em JS

  for (const passo of plano) {
    if (t < passo.duracaoMs) {
      // Sem trava de borda: `t < passo.duracaoMs` garante razão menor que 1, e
      // medi que nem no valor mais próximo que o double expressa o floor chega
      // a `quadros`. Uma trava aqui seria código morto afirmando um perigo que
      // não existe.
      return { anim: passo.anim, quadro: Math.floor((t / passo.duracaoMs) * passo.quadros) };
    }
    t -= passo.duracaoMs;
  }

  // O laço acima cobre o ciclo inteiro, então isto não roda. Fica para a função
  // nunca devolver `undefined` se alguém mexer na conta lá em cima.
  const ultimo = plano[plano.length - 1];
  return { anim: ultimo.anim, quadro: ultimo.quadros - 1 };
}
