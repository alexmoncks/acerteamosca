// kungfu-combat.js — pure combat math for Kung Fu Castle.
// No PixiJS, no game state — only values in, values out.

/** Frames per second the game's delta time is expressed in. */
const FPS = 60;

/**
 * Health after `dt` frames of passive regeneration, clamped to `maxHp`.
 *
 * The rate is a percentage of MAX health per second, so a character with a
 * larger pool heals proportionally faster in absolute points.
 *
 * @param {number} hp         Current health
 * @param {number} maxHp      Full health for this character
 * @param {number} pctPerSec  Regen rate, in % of maxHp per second
 * @param {number} dt         PixiJS ticker delta (1.0 === one frame at 60fps)
 * @returns {number}          New health, never above `maxHp`
 */
export function regenHp(hp, maxHp, pctPerSec, dt) {
  return Math.min(maxHp, hp + maxHp * (pctPerSec / 100) * (dt / FPS));
}

/**
 * Fraction of an enemy's attack animation spent winding up, before the limb
 * connects.
 *
 * Damage used to land on the same tick the animation started, which left the
 * player nothing to see and nothing to answer — the backflip could only ever be
 * a guess. 0.55 puts the blow a little past the middle of every PixelLab combat
 * template we use, which is where the arm or leg is actually extended.
 */
export const ENEMY_WINDUP = 0.55;

/**
 * Ticks between an enemy starting its attack and the blow connecting.
 *
 * An animation runs `speed` frames per tick, so it lasts `frames / speed`
 * ticks. Deriving the wind-up from the animation keeps the two in sync: a
 * 3-frame jab telegraphs briefly, a heavy swing takes its time.
 *
 * @param {{frames: unknown[], speed: number}} [anim]  the animation being played
 * @param {number} [fraction]  share of the animation spent winding up
 * @returns {number} ticks, never negative or NaN
 */
export function windupTicks(anim, fraction = ENEMY_WINDUP) {
  const frames = anim?.frames?.length ?? 0;
  const speed = anim?.speed;
  if (!frames || !speed || !Number.isFinite(speed) || speed <= 0) return 0;
  return (frames / speed) * fraction;
}

/**
 * Whether a wound-up enemy blow actually connects, re-checked at the impact
 * tick rather than when the animation started.
 *
 * Everything that can change during the wind-up is re-read here, and each `no`
 * is a defensive option the player earns:
 *   - walking or flipping out of range
 *   - jumping over it
 *   - the backflip's invulnerability
 *   - hitting the enemy first, which staggers it and cancels the blow
 *
 * Attacking is deliberately NOT on that list. It used to grant blanket
 * immunity, which made mashing punch strictly better than any real defence.
 *
 * @param {{x: number, alive: boolean, hitTimer: number}} enemy
 * @param {{x: number, grounded: boolean, dodging: boolean}} player
 * @param {number} combatRange  max horizontal distance a melee blow reaches
 */
export function enemyHitLands(enemy, player, combatRange) {
  if (!enemy.alive) return false;
  if (enemy.hitTimer > 0) return false;   // staggered mid-swing
  if (player.dodging) return false;       // invulnerable for the whole flip
  if (!player.grounded) return false;     // airborne, the blow passes under
  return Math.abs(player.x - enemy.x) <= combatRange;
}

/**
 * Stagger an enemy: it recoils, and whatever it was swinging dies with the
 * interruption.
 *
 * Clearing `attackImpact` is the whole point. Checking `hitTimer` at the impact
 * tick is not enough, because the stun (20 ticks) is shorter than several
 * wind-ups — capanga-cinza's kick takes 25.7. Hit that enemy on the first tick
 * of its swing and it would recover before the impact, then land the blow out
 * of an idle pose with nothing on screen to explain it.
 */
export function staggerEnemy(enemy, stunTicks) {
  enemy.hitTimer = stunTicks;
  enemy.attackImpact = 0;
  // Levar golpe cancela o poder em preparo, em qualquer ponto dele. É a punição
  // por atravessar a distância que o chefe abriu — sem ela, recuar seria de
  // graça e o jogador não teria motivo para perseguir.
  enemy.powerState = null;
}

/** Os dois estados do poder. Fora deles, o chefe luta como qualquer inimigo. */
export const POWER_STATES = { recuar: "recuar", carregar: "carregar" };

/**
 * Teto de tempo recuando, em ticks.
 *
 * Sem desistência, um jogador colado prende o chefe recuando até a parede e a
 * luta trava — ele nunca chega à distância e nunca carrega. Passado o teto, ele
 * carrega de onde estiver, o que também é a recompensa de quem persegue: o
 * poder sai de perto, com menos espaço para o jogador.
 */
export const MAX_RECUO = 90;

/**
 * Um passo da máquina de poder de um chefe.
 *
 * A troca que este mecanismo compra: o chefe ganha um golpe que dói mais e
 * alcança mais longe; o jogador ganha uma janela em que o chefe está longe,
 * parado e vulnerável. Um sem o outro seria só dano extra sem resposta.
 *
 * Devolve o que o laço do jogo deve fazer neste tick — nunca mexe em sprite,
 * animação ou posição, para poder ser testado sem navegador:
 *   { acao: "nada" }                        segue a rotina normal
 *   { acao: "recuar", direcao: 1 | -1 }     ande para longe do jogador
 *   { acao: "carregar", anim }              comece a carga
 *   { acao: "carregando" }                  fique parado
 *   { acao: "golpe", anim, damage, range }  solte o poder
 *
 * @param {object} enemy   com powerState, powerTimer, powerCooldown
 * @param {object} player
 * @param {object} [power] BOSS_STATS.power; ausente = o chefe não tem poder
 * @param {number} dt
 */
export function powerStep(enemy, player, power, dt) {
  if (!power || !enemy.alive) return { acao: "nada" };

  if (enemy.powerState === POWER_STATES.carregar) {
    enemy.powerTimer -= dt;
    if (enemy.powerTimer > 0) return { acao: "carregando" };
    enemy.powerState = null;
    enemy.powerCooldown = power.cooldown;
    return { acao: "golpe", anim: power.strike, damage: power.damage, range: power.range };
  }

  if (enemy.powerState === POWER_STATES.recuar) {
    enemy.powerTimer -= dt;
    const longe = Math.abs(player.x - enemy.x) >= power.distance;
    if (longe || enemy.powerTimer <= 0) {
      enemy.powerState = POWER_STATES.carregar;
      enemy.powerTimer = power.charge;
      return { acao: "carregar", anim: power.windup };
    }
    return { acao: "recuar", direcao: player.x > enemy.x ? -1 : 1 };
  }

  if (enemy.powerCooldown > 0) {
    enemy.powerCooldown -= dt;
    return { acao: "nada" };
  }
  if (enemy.hitTimer > 0) return { acao: "nada" }; // atordoado não começa nada

  enemy.powerState = POWER_STATES.recuar;
  enemy.powerTimer = MAX_RECUO;
  return { acao: "recuar", direcao: player.x > enemy.x ? -1 : 1 };
}

/**
 * Advance a pending blow by `dt` and report whether it connects on this tick.
 *
 * Returns true at most once per scheduled blow: the counter is zeroed as it
 * resolves, so a long frame (background tab, GC pause — `dt` is not 1.0) makes
 * the blow land late rather than vanish or land twice.
 *
 * The game loop owns the consequences (health, the hit animation, particles);
 * this owns the decision, so the decision is testable without a browser. That
 * split is deliberate: while the decision lived inline in the loop, the only
 * test tying the two together was a regex for the function's name, and a gate
 * granting blanket immunity was reintroduced without a single test failing.
 */
/**
 * Quantos inimigos podem estar com um golpe em preparo ao mesmo tempo.
 *
 * Cabem cinco em cena e nada os impedia de golpear no mesmo quadro. Na fase 1
 * isso custava 40 de vida por rodada e passava; na fase 3, com o assassino de
 * jian a 15, custa 75 — o jogador morre em 1,3 rodada parado, antes de ter o
 * que responder. Beat-em-up resolve isso desde sempre com uma senha de ataque:
 * dois entram, o resto cerca e espera. O cerco continua sendo pressão, mas
 * pressão que dá para ler.
 */
export const MAX_ATTACKERS = 2;

/** Quantos inimigos da lista já estão com um golpe agendado. */
export function countWindingUp(enemies) {
  let n = 0;
  for (const e of enemies) if (e.attackImpact > 0) n++;
  return n;
}

export function tickAttackImpact(enemy, player, combatRange, dt) {
  if (!(enemy.attackImpact > 0)) return false;
  enemy.attackImpact -= dt;
  if (enemy.attackImpact > 0) return false;
  enemy.attackImpact = 0;
  return enemyHitLands(enemy, player, combatRange);
}
