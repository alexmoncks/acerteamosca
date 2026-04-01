// kungfu-anim.js — AnimController
// Manages sprite animation states with priority-based transitions.
// Does NOT import PixiJS — only manipulates sprite.texture and sprite.scale.x.

// ── Priority map ──────────────────────────────────────────────────────────────
const PRIORITY = {
  idle: 0,
  walk: 1,
  jump: 2,
  crouch: 2,
  punch: 3,
  kick: 3,
  flyKick: 3,
  sweep: 3,
  special: 3,
  attack: 3,
  hit: 4,
  death: 5,
};

/**
 * Returns the priority number for the given animation name.
 * Unknown names default to priority 1 (walk-level).
 * @param {string} name
 * @returns {number}
 */
function getPriority(name) {
  const p = PRIORITY[name];
  return p !== undefined ? p : 1;
}

// ── AnimController ────────────────────────────────────────────────────────────

export class AnimController {
  /**
   * @param {object} opts
   * @param {object} opts.sprite  - PixiJS Sprite instance (already in stage)
   * @param {object} opts.anims   - { [name]: { frames: Texture[], speed, loop, next? } }
   */
  constructor({ sprite, anims }) {
    this.sprite = sprite;
    this.anims = anims;

    // Internal state
    this._state = null;
    this._frameIndex = 0;
    this._frameTimer = 0;
    this._done = false;

    // Start with the first available animation (prefer 'idle')
    const startName = anims.idle ? "idle" : Object.keys(anims)[0];
    if (startName) {
      this._applyState(startName);
    }
  }

  // ── Public getters ──────────────────────────────────────────────────────────

  /** Current animation name. */
  get state() {
    return this._state;
  }

  /** True when a non-looping animation has finished its last frame. */
  get done() {
    return this._done;
  }

  // ── Public methods ──────────────────────────────────────────────────────────

  /**
   * Request a state change. Transitions are only accepted when:
   *   - The new state has higher priority than the current, OR
   *   - The new state has equal priority AND the current anim is done (or is a
   *     lower-priority animation), EXCEPT that same-priority attack states
   *     (priority 3) cannot restart mid-animation.
   *   - When the current animation is `done`, lower-priority states are also
   *     accepted (so idle/walk can resume after an attack finishes).
   *
   * @param {string} name
   */
  play(name) {
    if (!this.anims[name]) return; // Unknown animation — ignore

    const newPri = getPriority(name);
    const curPri = getPriority(this._state);

    // Always allow if there is no current state
    if (this._state === null) {
      this._applyState(name);
      return;
    }

    // When the current anim is done, accept any state (lower-priority included)
    if (this._done) {
      this._applyState(name);
      return;
    }

    // Strictly higher priority always wins
    if (newPri > curPri) {
      this._applyState(name);
      return;
    }

    // Equal priority: block same-priority attack restarts mid-animation (pri 3)
    if (newPri === curPri) {
      if (newPri === 3 && name !== this._state) {
        // Allow switching to a *different* attack when current is not mid-run
        // (frameIndex === 0 means it just started — allow override)
        if (this._frameIndex > 0) return; // mid-animation — block
      }
      // Same name: don't restart
      if (name === this._state) return;
      this._applyState(name);
      return;
    }

    // Lower priority — blocked while current anim is still running
  }

  /**
   * Force-switch animation, ignoring priority. Use for state resets
   * like landing from a jump where lower-priority idle must take over.
   * @param {string} name
   */
  forcePlay(name) {
    if (this.anims[name]) {
      this._applyState(name);
    }
  }

  /**
   * Set the horizontal facing direction.
   * @param {number} dir  +1 = right, -1 = left
   */
  setFacing(dir) {
    this.sprite.scale.x = Math.abs(this.sprite.scale.x) * dir;
    // anchor.x = 0.5 on the sprite ensures the pivot stays centred
  }

  /**
   * Advance the frame timer and swap texture when needed.
   * @param {number} dt  Delta time (seconds or PixiJS ticker delta)
   */
  update(dt) {
    if (this._state === null) return;

    const anim = this.anims[this._state];
    if (!anim || !anim.frames || anim.frames.length === 0) return;

    // If the anim is already done (hold-last-frame mode), nothing to advance
    if (this._done) return;

    this._frameTimer += anim.speed * dt;

    if (this._frameTimer >= 1) {
      this._frameTimer -= 1;
      this._frameIndex++;

      if (this._frameIndex >= anim.frames.length) {
        if (anim.loop) {
          // Loop back to first frame
          this._frameIndex = 0;
        } else if (anim.next) {
          // Auto-transition to the next named animation
          this._applyState(anim.next);
          return;
        } else {
          // Hold last frame and mark as done
          this._frameIndex = anim.frames.length - 1;
          this._done = true;
        }
      }

      this.sprite.texture = anim.frames[this._frameIndex];
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Immediately switch to the named animation, resetting frame counters.
   * @param {string} name
   */
  _applyState(name) {
    this._state = name;
    this._frameIndex = 0;
    this._frameTimer = 0;
    this._done = false;

    const anim = this.anims[name];
    if (anim && anim.frames && anim.frames.length > 0) {
      this.sprite.texture = anim.frames[0];
    }
  }
}
