// kungfu-boss-ai.js — Boss behavior state machines for Kung Fu Castle.
// Each boss has phases (HP thresholds), attack patterns with cooldowns,
// telegraph windows, and recovery frames.

// ── Boss AI states ───────────────────────────────────────────────────────
const S = {
  IDLE: "idle",
  APPROACH: "approach",
  TELEGRAPH: "telegraph",
  ATTACK: "attack",
  RECOVER: "recover",
  STUNNED: "stunned",
  ENRAGED: "enraged_roar",
  SUMMON: "summon",
  DEATH: "death",
};

// ── Attack definitions per boss ──────────────────────────────────────────

const BOSS_ATTACKS = {
  "mestre-capangas": {
    punch:  { anim: "punch",  telegraph: "windup", telegraphDur: 20, dur: 24, recover: 30, reach: 30, dmg: 12, hitStart: 12, hitEnd: 6, hitH: 24, hitOy: 8, knockback: 8 },
    charge: { anim: "charge", telegraph: null,      telegraphDur: 0,  dur: 40, recover: 40, reach: 160, dmg: 15, hitStart: 20, hitEnd: 5, hitH: 30, hitOy: 4, knockback: 20, speed: 4.5 },
    stomp:  { anim: "stomp",  telegraph: "windup", telegraphDur: 30, dur: 30, recover: 50, reach: 80,  dmg: 18, hitStart: 15, hitEnd: 5, hitH: 48, hitOy: 0, knockback: 12, aoe: true },
    grab:   { anim: "grab",   telegraph: null,      telegraphDur: 0,  dur: 35, recover: 35, reach: 24,  dmg: 20, hitStart: 18, hitEnd: 8, hitH: 30, hitOy: 8, knockback: 5 },
  },

  "guardiao-portao": {
    swing:    { anim: "horizontal-swing", telegraph: null,     telegraphDur: 0,  dur: 28, recover: 35, reach: 40,  dmg: 15, hitStart: 14, hitEnd: 6, hitH: 28, hitOy: 6, knockback: 14 },
    smash:    { anim: "overhead-smash",   telegraph: null,     telegraphDur: 0,  dur: 35, recover: 50, reach: 35,  dmg: 22, hitStart: 20, hitEnd: 5, hitH: 48, hitOy: 0, knockback: 10, aoe: true },
    charge:   { anim: "charge",           telegraph: "taunt",  telegraphDur: 30, dur: 45, recover: 60, reach: 200, dmg: 18, hitStart: 22, hitEnd: 5, hitH: 34, hitOy: 4, knockback: 25, speed: 5.0 },
    kick:     { anim: "kick",             telegraph: null,     telegraphDur: 0,  dur: 22, recover: 25, reach: 28,  dmg: 12, hitStart: 11, hitEnd: 5, hitH: 24, hitOy: 14, knockback: 8 },
    block:    { anim: "shield-block",     telegraph: null,     telegraphDur: 0,  dur: 60, recover: 10, reach: 0,   dmg: 0,  hitStart: 0,  hitEnd: 0, hitH: 0,  hitOy: 0, knockback: 0, blocking: true },
    quake:    { anim: "earthquake",       telegraph: "taunt",  telegraphDur: 25, dur: 40, recover: 55, reach: 200, dmg: 20, hitStart: 20, hitEnd: 5, hitH: 48, hitOy: 0, knockback: 15, aoe: true, groundOnly: true },
  },

  "senhor-sombras": {
    combo:    { anim: "ninja-combo",   telegraph: null,        telegraphDur: 0,  dur: 30, recover: 25, reach: 28,  dmg: 14, hitStart: 10, hitEnd: 5, hitH: 24, hitOy: 8, knockback: 8, multiHit: 3 },
    dashKick: { anim: "dash-kick",     telegraph: null,        telegraphDur: 0,  dur: 28, recover: 30, reach: 120, dmg: 16, hitStart: 14, hitEnd: 5, hitH: 28, hitOy: 10, knockback: 18, speed: 5.5 },
    shuriken: { anim: "shuriken",      telegraph: null,        telegraphDur: 0,  dur: 25, recover: 35, reach: 300, dmg: 10, hitStart: 12, hitEnd: 5, hitH: 12, hitOy: 16, knockback: 4, ranged: true, projSpeed: 6 },
    shadow:   { anim: "shadow-strike", telegraph: "vanish",    telegraphDur: 20, dur: 20, recover: 40, reach: 30,  dmg: 20, hitStart: 10, hitEnd: 5, hitH: 30, hitOy: 4, knockback: 14, teleport: true },
    sweep:    { anim: "shadow-sweep",  telegraph: null,        telegraphDur: 0,  dur: 24, recover: 28, reach: 35,  dmg: 12, hitStart: 12, hitEnd: 5, hitH: 16, hitOy: 32, knockback: 6 },
    smoke:    { anim: "smoke-bomb",    telegraph: null,        telegraphDur: 0,  dur: 30, recover: 20, reach: 0,   dmg: 0,  hitStart: 0,  hitEnd: 0, hitH: 0,  hitOy: 0, knockback: 0, evasion: true },
  },

  "general-oni": {
    dualSlash:  { anim: "dual-slash",    telegraph: null,          telegraphDur: 0,  dur: 28, recover: 30, reach: 35,  dmg: 16, hitStart: 14, hitEnd: 5, hitH: 28, hitOy: 6, knockback: 10 },
    kick:       { anim: "kick",          telegraph: null,          telegraphDur: 0,  dur: 24, recover: 25, reach: 30,  dmg: 14, hitStart: 12, hitEnd: 5, hitH: 24, hitOy: 14, knockback: 8 },
    spinBlades: { anim: "spin-blades",   telegraph: "oni-roar",    telegraphDur: 25, dur: 35, recover: 45, reach: 50,  dmg: 20, hitStart: 10, hitEnd: 5, hitH: 40, hitOy: 4, knockback: 16, aoe: true },
    counter:    { anim: "counter-slash", telegraph: "cross-block", telegraphDur: 40, dur: 20, recover: 30, reach: 40,  dmg: 22, hitStart: 10, hitEnd: 5, hitH: 30, hitOy: 6, knockback: 14, counter: true },
    leap:       { anim: "crushing-leap", telegraph: null,          telegraphDur: 0,  dur: 40, recover: 50, reach: 120, dmg: 24, hitStart: 25, hitEnd: 5, hitH: 48, hitOy: 0, knockback: 20, aoe: true, aerial: true },
    thrust:     { anim: "thrust-lunge",  telegraph: null,          telegraphDur: 0,  dur: 30, recover: 35, reach: 100, dmg: 18, hitStart: 15, hitEnd: 5, hitH: 24, hitOy: 10, knockback: 12, speed: 4.0 },
  },

  "senhor-castelo": {
    swordSlash: { anim: "sword-slash",    telegraph: "draw-sword",    telegraphDur: 20, dur: 24, recover: 25, reach: 40,  dmg: 18, hitStart: 12, hitEnd: 5, hitH: 30, hitOy: 6, knockback: 10 },
    flyingKick: { anim: "flying-kick",    telegraph: null,            telegraphDur: 0,  dur: 30, recover: 35, reach: 100, dmg: 16, hitStart: 15, hitEnd: 5, hitH: 28, hitOy: 8, knockback: 16, speed: 5.0, aerial: true },
    crescentK:  { anim: "crescent-kick",  telegraph: null,            telegraphDur: 0,  dur: 26, recover: 28, reach: 32,  dmg: 14, hitStart: 13, hitEnd: 5, hitH: 28, hitOy: 4, knockback: 12 },
    steelPalm:  { anim: "steel-palm",     telegraph: null,            telegraphDur: 0,  dur: 22, recover: 30, reach: 26,  dmg: 16, hitStart: 11, hitEnd: 5, hitH: 24, hitOy: 8, knockback: 8 },
    kiBlast:    { anim: "ki-blast",       telegraph: null,            telegraphDur: 0,  dur: 30, recover: 40, reach: 300, dmg: 14, hitStart: 15, hitEnd: 5, hitH: 20, hitOy: 12, knockback: 10, ranged: true, projSpeed: 7 },
    kiBarrier:  { anim: "ki-barrier",     telegraph: null,            telegraphDur: 0,  dur: 50, recover: 15, reach: 0,   dmg: 0,  hitStart: 0,  hitEnd: 0, hitH: 0,  hitOy: 0, knockback: 0, blocking: true },
    imperial:   { anim: "imperial-combo", telegraph: "supreme-strike",telegraphDur: 30, dur: 40, recover: 50, reach: 35,  dmg: 28, hitStart: 15, hitEnd: 5, hitH: 40, hitOy: 0, knockback: 20, multiHit: 5 },
    devastation:{ anim: "devastation",    telegraph: "supreme-strike",telegraphDur: 40, dur: 35, recover: 60, reach: 180, dmg: 30, hitStart: 18, hitEnd: 5, hitH: 48, hitOy: 0, knockback: 25, aoe: true },
  },
};

// ── Phase definitions (HP thresholds + available attacks) ────────────────

const BOSS_PHASES = {
  "mestre-capangas": [
    { hpAbove: 0.75, attacks: ["punch", "punch", "charge"], approachSpeed: 1.5, summonCount: 0 },
    { hpAbove: 0.50, attacks: ["punch", "charge", "stomp"], approachSpeed: 1.8, summonCount: 2, enrageOnEnter: true },
    { hpAbove: 0.25, attacks: ["punch", "charge", "stomp", "grab"], approachSpeed: 2.0, summonCount: 2 },
    { hpAbove: 0,    attacks: ["charge", "stomp", "grab", "stomp"], approachSpeed: 2.5, summonCount: 3, enrageOnEnter: true },
  ],

  "guardiao-portao": [
    { hpAbove: 0.75, attacks: ["swing", "kick", "block"], approachSpeed: 1.2, summonCount: 0 },
    { hpAbove: 0.50, attacks: ["swing", "smash", "charge", "block"], approachSpeed: 1.4, summonCount: 0, enrageOnEnter: true },
    { hpAbove: 0.25, attacks: ["smash", "charge", "quake", "kick"], approachSpeed: 1.6, summonCount: 2 },
    { hpAbove: 0,    attacks: ["smash", "charge", "quake", "quake"], approachSpeed: 1.8, summonCount: 3, enrageOnEnter: true },
  ],

  "senhor-sombras": [
    { hpAbove: 0.75, attacks: ["combo", "dashKick", "shuriken"], approachSpeed: 2.5, summonCount: 0 },
    { hpAbove: 0.50, attacks: ["combo", "dashKick", "shadow", "shuriken"], approachSpeed: 3.0, summonCount: 0, enrageOnEnter: true },
    { hpAbove: 0.25, attacks: ["shadow", "dashKick", "sweep", "smoke", "shuriken"], approachSpeed: 3.5, summonCount: 2 },
    { hpAbove: 0,    attacks: ["shadow", "shadow", "dashKick", "combo", "smoke"], approachSpeed: 4.0, summonCount: 0, enrageOnEnter: true },
  ],

  "general-oni": [
    { hpAbove: 0.75, attacks: ["dualSlash", "kick", "thrust"], approachSpeed: 1.8, summonCount: 0 },
    { hpAbove: 0.50, attacks: ["dualSlash", "spinBlades", "thrust", "counter"], approachSpeed: 2.0, summonCount: 0, enrageOnEnter: true },
    { hpAbove: 0.25, attacks: ["spinBlades", "leap", "counter", "thrust"], approachSpeed: 2.2, summonCount: 3 },
    { hpAbove: 0,    attacks: ["leap", "spinBlades", "counter", "dualSlash"], approachSpeed: 2.5, summonCount: 4, enrageOnEnter: true },
  ],

  "senhor-castelo": [
    { hpAbove: 0.80, attacks: ["steelPalm", "crescentK", "flyingKick"], approachSpeed: 2.0, summonCount: 0 },
    { hpAbove: 0.60, attacks: ["swordSlash", "flyingKick", "kiBlast", "kiBarrier"], approachSpeed: 2.2, summonCount: 0, enrageOnEnter: true },
    { hpAbove: 0.35, attacks: ["swordSlash", "imperial", "kiBlast", "flyingKick"], approachSpeed: 2.5, summonCount: 2 },
    { hpAbove: 0.15, attacks: ["imperial", "kiBlast", "devastation", "kiBarrier"], approachSpeed: 2.8, summonCount: 3, enrageOnEnter: true },
    { hpAbove: 0,    attacks: ["devastation", "imperial", "flyingKick", "swordSlash"], approachSpeed: 3.2, summonCount: 0, enrageOnEnter: true },
  ],
};

// ── Boss AI controller ──────────────────────────────────────────────────

export class BossAI {
  constructor(bossType) {
    this.type = bossType;
    this.attacks = BOSS_ATTACKS[bossType] || {};
    this.phases = BOSS_PHASES[bossType] || [];
    this.state = S.IDLE;
    this.timer = 60; // initial idle before first attack
    this.currentAttack = null;
    this.attackTimer = 0;
    this.phaseIndex = 0;
    this.lastPhaseIndex = -1;
    this.cooldowns = {};
    this.stunTimer = 0;
    this.blocking = false;
    this.chargeVx = 0;
    this.summonRequested = 0;
    this.projectiles = []; // active ranged projectiles
  }

  getCurrentPhase(hpRatio) {
    for (let i = 0; i < this.phases.length; i++) {
      if (hpRatio > this.phases[i].hpAbove) return i;
    }
    return this.phases.length - 1;
  }

  pickAttack(dist) {
    const phase = this.phases[this.phaseIndex];
    if (!phase) return null;

    const available = phase.attacks.filter(name => {
      const cd = this.cooldowns[name] || 0;
      if (cd > 0) return false;
      const atk = this.attacks[name];
      if (!atk) return false;
      // Ranged attacks only when far, melee when close-ish
      if (atk.ranged && dist < 60) return false;
      if (!atk.ranged && !atk.speed && dist > atk.reach + 20) return false;
      return true;
    });

    if (available.length === 0) return phase.attacks[0]; // fallback
    return available[Math.floor(Math.random() * available.length)];
  }

  update(enemy, player, dt, spawnEnemyCb, animController) {
    // Compare sprite centres, not left edges — boss frames are wider than the
    // player's, so edge-based maths flips facing and skews range at close quarters.
    const dx =
      (player.x + (player.frameSize || 48) / 2) -
      (enemy.x + (enemy.frameSize || 48) / 2);
    const dist = Math.abs(dx);
    const facing = dx > 0 ? 1 : -1;
    const hpRatio = enemy.hp / enemy.maxHp;

    // Determine current phase
    const newPhase = this.getCurrentPhase(hpRatio);
    if (newPhase !== this.phaseIndex) {
      this.phaseIndex = newPhase;
      const phaseDef = this.phases[newPhase];

      // Enrage roar on phase transition
      if (phaseDef?.enrageOnEnter && this.lastPhaseIndex !== newPhase) {
        this.lastPhaseIndex = newPhase;
        this.state = S.ENRAGED;
        this.timer = 50;
        animController?.forcePlay("war-cry") || animController?.forcePlay("idle");

        // Summon minions on phase transition
        if (phaseDef.summonCount > 0) {
          this.summonRequested = phaseDef.summonCount;
        }
        return { facing, vx: 0, hit: null };
      }
      this.lastPhaseIndex = newPhase;
    }

    // Decrement cooldowns
    for (const k of Object.keys(this.cooldowns)) {
      if (this.cooldowns[k] > 0) this.cooldowns[k] -= dt;
    }

    // Handle summon requests
    if (this.summonRequested > 0 && this.state !== S.ATTACK && this.state !== S.TELEGRAPH) {
      if (spawnEnemyCb) spawnEnemyCb();
      this.summonRequested--;
    }

    // Advance projectiles. Expired ones are flagged, not spliced — the game loop
    // drains them so it can destroy the attached graphics.
    for (const p of this.projectiles) {
      p.x += p.vx * dt;
      p.life -= dt;
      if (p.life <= 0) p.expired = true;
    }

    // State machine
    let vx = 0;
    let hitResult = null;
    this.blocking = false;

    switch (this.state) {
      case S.IDLE:
        this.timer -= dt;
        animController?.play("idle");
        if (this.timer <= 0) {
          this.state = S.APPROACH;
          this.timer = 0;
        }
        break;

      case S.ENRAGED:
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = S.APPROACH;
          this.timer = 0;
        }
        break;

      case S.STUNNED:
        this.stunTimer -= dt;
        animController?.play("stunned");
        if (this.stunTimer <= 0) {
          this.state = S.IDLE;
          this.timer = 20;
        }
        break;

      case S.APPROACH: {
        const phase = this.phases[this.phaseIndex];
        const approachSpeed = phase?.approachSpeed || 1.5;
        const combatRange = 28;

        if (dist > combatRange) {
          vx = facing * approachSpeed * dt;
          animController?.play("walk");
        } else {
          vx = 0;
        }

        // Pick an attack when close enough or after approaching for a while
        this.timer += dt;
        const inRange = dist <= combatRange + 10;
        const shouldAttack = inRange || this.timer > 90;

        if (shouldAttack) {
          const attackName = this.pickAttack(dist);
          if (attackName && this.attacks[attackName]) {
            this.currentAttack = attackName;
            const atk = this.attacks[attackName];
            if (atk.telegraph) {
              this.state = S.TELEGRAPH;
              this.timer = atk.telegraphDur;
              animController?.forcePlay(atk.telegraph);
            } else {
              this.state = S.ATTACK;
              this.attackTimer = atk.dur;
              animController?.forcePlay(atk.anim);
              if (atk.speed) {
                this.chargeVx = facing * atk.speed;
              }
            }
          }
        }
        break;
      }

      case S.TELEGRAPH:
        this.timer -= dt;
        if (this.timer <= 0) {
          const atk = this.attacks[this.currentAttack];
          if (atk) {
            this.state = S.ATTACK;
            this.attackTimer = atk.dur;
            animController?.forcePlay(atk.anim);
            if (atk.speed) {
              this.chargeVx = facing * atk.speed;
            }
            if (atk.ranged) {
              this.projectiles.push({
                x: enemy.x + facing * 20,
                y: enemy.y + (atk.hitOy || 16),
                vx: facing * (atk.projSpeed || 5),
                w: 8, h: atk.hitH || 12,
                dmg: atk.dmg,
                knockback: atk.knockback || 6,
                life: 120,
                color: atk.projColor || 0xffdd55,
              });
            }
            if (atk.teleport) {
              // Teleport behind player
              enemy.x = player.x - facing * 30;
            }
          }
        }
        break;

      case S.ATTACK: {
        const atk = this.attacks[this.currentAttack];
        this.attackTimer -= dt;

        if (atk?.blocking) {
          this.blocking = true;
          vx = 0;
        } else if (atk?.speed) {
          vx = this.chargeVx * dt;
        } else if (atk?.aerial) {
          // Simple arc: go up first half, come down second half
          const progress = 1 - (this.attackTimer / atk.dur);
          const arcY = -Math.sin(progress * Math.PI) * 60;
          enemy._arcY = arcY;
          vx = facing * (atk.speed || 3) * dt;
        }

        // Check hit window
        const inHitWindow = atk && this.attackTimer <= (atk.dur - atk.hitStart + atk.dur) / 2 &&
                           this.attackTimer > atk.hitEnd;
        // Simpler: use timer-based window
        const elapsed = atk ? atk.dur - this.attackTimer : 0;
        const hitActive = atk && elapsed >= atk.hitStart - 5 && this.attackTimer > atk.hitEnd;

        if (hitActive && !this._hitDelivered) {
          hitResult = {
            reach: atk.reach,
            dmg: atk.dmg,
            knockback: atk.knockback || 10,
            hitH: atk.hitH || 24,
            hitOy: atk.hitOy || 8,
            aoe: atk.aoe || false,
            groundOnly: atk.groundOnly || false,
          };
          this._hitDelivered = true;
        }

        if (this.attackTimer <= 0) {
          this._hitDelivered = false;
          enemy._arcY = 0;

          // Charge attacks that miss can cause stun
          if (atk?.speed && dist > atk.reach * 1.5) {
            this.state = S.STUNNED;
            this.stunTimer = 45;
            animController?.forcePlay("stunned") || animController?.forcePlay("hit");
          } else {
            this.state = S.RECOVER;
            this.timer = atk?.recover || 30;
            animController?.forcePlay("idle");
          }

          // Set cooldown for this attack
          this.cooldowns[this.currentAttack] = (atk?.recover || 30) + 20;
          this.currentAttack = null;
          this.chargeVx = 0;
        }
        break;
      }

      case S.RECOVER:
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = S.APPROACH;
          this.timer = 0;
        }
        break;

      case S.DEATH:
        animController?.forcePlay("death");
        break;
    }

    return { facing, vx, hit: hitResult, blocking: this.blocking };
  }

  onDeath() {
    this.state = S.DEATH;
  }

  isBlocking() {
    return this.blocking;
  }

  isStunned() {
    return this.state === S.STUNNED;
  }
}

export { S as BossState, BOSS_ATTACKS, BOSS_PHASES };
