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
