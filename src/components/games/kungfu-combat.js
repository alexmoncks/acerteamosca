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
