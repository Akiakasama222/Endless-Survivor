// ======================================================================
// COMBAT: TARGETING, SWORD, DASH & SWIRL
// Finding targets, dealing damage, the sword swing and the Swirl special.
// ======================================================================

// Returns the nearest living enemy within `max` px of (x, y), ignoring enemies in the optional `skip` set.
function nearest(x, y, max, skip) {
  let b = null;
  let bd = max * max;
  for (const e of S.en) {
    if (e.hp <= 0 || (skip && skip.has(e)))
      continue;
    let d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (e.hr)
      d = Math.max(0, Math.sqrt(d) - (e.hr - 16)) ** 2;
    if (d < bd) {
      bd = d;
      b = e;
    }
  }
  return b;
}

// Deals d damage to enemy e (q = quiet: no sound / number). Handles the kill healing, kills, drops, Bleed explosions and Death Explosions.
function hit(e, d, q) {
  if (e.hp <= 0)
    return;
  d *= dnVuln();      // +damage taken during the day (daynight.js)
  const a = Math.min(d, e.hp);
  e.hp -= d;
  if (!q) {
    sfx('hit');
    e.fl = .1;
    S.tx.push({ x: e.x, y: e.y - 20, t: .6, s: d < 1 ? +d.toFixed(1) : Math.round(d) });
  }
  if (e.hp <= 0) {
    if (e.boss)
      bossDown(e);
    S.gm.push({ x: e.x, y: e.y });
    if (Math.random() < C.coinChance)      // coins drop right next to the XP gem
      S.cn.push({ x: e.x + (Math.random() - .5) * 18, y: e.y + (Math.random() - .5) * 18, v: e.boss ? C.coinBoss : C.coinValue });
    S.kills++;
    sfx('kill');
    if (S.ls && !S.nols)      // Lifesteal: killing an enemy heals a share of ITS max health (excess healing becomes a burst laser in healP)
      healP(e.mx * C.killHeal * S.ls);
    if (S.ns && ++S.kc >= C.shieldKills) {
      S.kc = 0;
      S.sh = Math.min(S.ns, S.sh + 1);
    }
    if (S.nsv && Math.random() < C.vortexChance * S.nsv)      // Soul Vortex: chance on kill to pull every enemy towards the player
      S.vt = C.vortexT;
    if (S.nd && Math.random() < C.deathBoomChance * S.nd)
      deathBoom(e.x, e.y, dmg() * (C.deathBoomDmg + C.deathBoomDmgPerLvl * (S.nd - 1)), C.deathBoomR, e);
    if (S.nbl && e.bl)
      deathBoom(e.x, e.y, dmg() * (C.bleedBoomDmg + C.bleedBoomPerLvl * (S.nbl - 1)), C.bleedBoomR, e);
  }
}

// Effects that trigger when ANY weapon hits an enemy directly (d = the damage of that hit): Bleed, Thunder Strike (proc, grimoire.js) and Homing Explosive Knives.
function onHit(e, d) {
  if (S.nbl && e.hp > 0)
    e.bl = { d: d * C.bleedPerLvl * S.nbl, c: e.bl ? e.bl.c : 0 };
  proc(e);
  if (S.nmi && Math.random() < C.missileChance * S.nmi && S.ms.length < 12)
    launchMissile(e);
}

// Soul Vortex: while S.vt > 0 every enemy (bosses excepted) is pulled towards the player. Each frame it closes a share of the distance (exponential, so far enemies move fast and near ones gently) and stops just outside touching range, so the pack lands in sword range.
function vortexStep(dt) {
  if (!(S.vt > 0))
    return;
  S.vt -= dt;
  const f = 1 - Math.exp(-C.vortexRate * dt);
  const stop = C.eHitR + C.pHitR + 12;
  for (const e of S.en) {
    if (e.boss || e.hp <= 0)
      continue;
    const dx = S.x - e.x;
    const dy = S.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d <= stop)
      continue;
    const m = Math.min(d * f, d - stop);
    e.x += dx / d * m;
    e.y += dy / d * m;
  }
}

// Draws the Soul Vortex swirl on the ground around the player (isometric ellipse, spiral arms turning inwards) while S.vt > 0.
function vortexDraw(g, SX, SY) {
  if (!(S.vt > 0))
    return;
  const k = Math.min(1, S.vt / C.vortexT);          // 1 -> 0 over the pull
  const fade = Math.min(1, k * 3, (1 - k) * 8 + .25);
  const cx = SX(S.x, S.y);
  const cy = SY(S.x, S.y);
  g.save();
  g.translate(cx, cy);
  g.scale(1, .5);
  g.lineCap = 'round';
  for (let arm = 0; arm < 3; arm++) {
    for (let ring = 0; ring < 2; ring++) {
      g.beginPath();
      for (let i = 0; i <= 28; i++) {
        const u = i / 28;
        const R = (150 - 125 * u) * (.5 + .5 * k) * (1 + ring * .35);                  // spiral that tightens towards the centre
        const a = arm * 2.094 + S.t * 9 + u * 4.2;
        const x = Math.cos(a) * R;
        const y = Math.sin(a) * R;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.strokeStyle = ring ? 'rgba(120,70,220,' + .5 * fade + ')' : 'rgba(215,160,255,' + .8 * fade + ')';
      g.lineWidth = ring ? 7 : 4;
      g.stroke();
    }
  }
  g.restore();
}

// Smoothly turns angle a towards angle b by fraction t, going the requested direction.
function angLerp(a, b, t, dir) {
  let d = b - a;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  if (dir < 0 && d > .5)
    d -= 6.2832;
  else if (dir > 0 && d < -.5)
    d += 6.2832;
  return a + d * t;
}

// Reach of the equipped weapon: the Sword's blade length (grows with Sword Range), or the attack range of the Bow / Grimoire (C.atkR). Health Siphon uses it as its range.
function weaponRange() {
  return S.wp === 'sword' ? C.swordR * (1 + C.swordRangePerLvl * S.sr) : C.atkR;
}

// Cooldown in seconds for a level-n timed ability.
function cdOf(n) {
  return Math.max(.5, 15 / (1 + .5 * (n - 1)));
}

// Advances the current sword swing and damages enemies the blade passes through.
function swingStep(dt) {
  if (!(S.sw > 0))
    return;
  const R = C.swordR * (1 + C.swordRangePerLvl * S.sr);
  const p0 = 1 - S.sw / S.sdur;
  S.sw -= dt;
  const p1 = 1 - Math.max(S.sw, 0) / S.sdur;
  const sd = S.sd || 1;
  const an = p => S.sa + sd * C.arc * (2 * p * p * (3 - 2 * p) - 1);
  const rr = p => C.arc * (2 * p * p * (3 - 2 * p) - 1);
  const r1 = rr(p1);
  const r0 = rr(p0);
  const a0 = S.sa + sd * r0;
  const a1 = S.sa + sd * r1;
  const mid = (a0 + a1) / 2;
  const half = Math.abs(a1 - a0) / 2 + .2;
  if (S.sw <= 0) {
    S.ba = an(1);
    S.la = S.t;
    S.sfade = .14;
    S.sfa0 = S.sa - sd * C.arc;
    S.sfa1 = an(1);
  }
  trSlash(S.x, S.y, R, mid, half);      // the blade also cuts down trees (trees.js)
  for (const e of S.en) {
    if (e.hp <= 0 || S.sh2.has(e))
      continue;
    const dx = e.x - S.x;
    const dy = e.y - S.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > R + (e.hr || C.eHitR))
      continue;
    let da = Math.atan2(dy, dx) - mid;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) > half && d > C.eHitR + C.pHitR + 12)      // enemies touching you are always hit: standing on top of you they have no direction, so the arc test would miss them
      continue;
    S.sh2.add(e);
    const dd = dmg();
    hit(e, dd);
    bloodHit(e);
    onHit(e, dd);
  }
}

// Sword weapon logic each frame: aims at the nearest enemy and starts a swing (every 3rd swing also throws a Swirl if owned).
function sword(dt) {
  const R = C.swordR * (1 + C.swordRangePerLvl * S.sr);
  if (!(S.sw > 0) && S.t - (S.la === undefined ? -9 : S.la) > 1.2) {
    const tn = nearest(S.x, S.y, C.atkR);
    if (tn) {
      const b = S.ba || 0;
      let df = Math.atan2(tn.y - S.y, tn.x - S.x) - b;
      df = Math.atan2(Math.sin(df), Math.cos(df));
      S.ba = b + df * Math.min(1, dt * 12);
    }
  }
  if (S.cd <= 0 && !(S.sw > 0)) {
    const t = nearest(S.x, S.y, R + 30);
    if (t) {
      const a = Math.atan2(t.y - S.y, t.x - S.x);
      const dd = dmg();
      S.cd = 1 / rate();
      S.sdur = Math.max(.07, .22 * C.fireRate / rate());
      S.sw = S.sdur;
      S.la = S.t;
      S.sa = a;
      S.st0 = S.t;      // the 3D character plays its attack animation from this moment (mage3d.js)
      S.sd = -(S.sd || 1);
      S.sh2 = new Set();
      sfx('swing');
      S.sc = (S.sc || 0) + 1;
      if (S.swl && S.sc % C.swirlEvery === 0)
        launchSwirl(t);
      mwQueue();      // MultiWield: delayed repeats of this attack
    }
    else
      S.cd = 0;
  }
}

// MultiWield (shared special augment, every weapon): every attack leaves S.nmw AFTERIMAGES (ghosts of the player, S.gh) standing where the attack was made.
// The n-th afterimage repeats the attack C.multiwieldDelay x n seconds later FROM ITS OWN SPOT (it throws the knives / orbs or swings the sword itself) for C.multiwieldDmg of your damage, then fades away.
// mwQueue() creates them when an attack starts; mwStep(dt) runs them. The player does not attack again, and repeats do not trigger Swirl, MultiWield or the attack cooldown. They are drawn by ghostDraw() in draw.js.
const GH_FADE = .3;      // seconds an afterimage takes to fade away after its attack

function mwQueue() {
  const n = S.nmw || 0;
  if (!n)
    return;
  const sw = S.wp === 'sword';
  const t = nearest(S.x, S.y, sw ? C.swordR * (1 + C.swordRangePerLvl * S.sr) + 30 : C.atkR);
  const a = t ? Math.atan2(t.y - S.y, t.x - S.x) : (S.sa || 0);
  for (let i = 1; i <= n; i++) {
    if (S.gh.length > 60)
      S.gh.shift();
    S.gh.push({ x: S.x, y: S.y, w: C.multiwieldDelay * i, age: 0, a, st: 0, fade: 0, sfade: 0, sw: 0, sdur: 0, sa: a, sd: S.sd || 1, sh2: null, st0: undefined, tg: null, nt: 0 });
  }
}

// One afterimage's sword swing: the same arc test as the player's swingStep(), but around the afterimage's own spot.
function ghostSwing(gh, dt) {
  const R = C.swordR * (1 + C.swordRangePerLvl * S.sr);
  const rr = p => C.arc * (2 * p * p * (3 - 2 * p) - 1);
  const p0 = 1 - gh.sw / gh.sdur;
  gh.sw -= dt;
  const p1 = 1 - Math.max(gh.sw, 0) / gh.sdur;
  const a0 = gh.sa + gh.sd * rr(p0);
  const a1 = gh.sa + gh.sd * rr(p1);
  const mid = (a0 + a1) / 2;
  const half = Math.abs(a1 - a0) / 2 + .2;
  trSlash(gh.x, gh.y, R, mid, half);
  for (const e of S.en) {
    if (e.hp <= 0 || gh.sh2.has(e))
      continue;
    const dx = e.x - gh.x;
    const dy = e.y - gh.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > R + (e.hr || C.eHitR))
      continue;
    let da = Math.atan2(dy, dx) - mid;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) > half && d > C.eHitR + C.pHitR + 12)
      continue;
    gh.sh2.add(e);
    const dd = dmg() * C.multiwieldDmg;
    hit(e, dd);
    bloodHit(e);
    onHit(e, dd);
  }
  if (gh.sw <= 0) {
    gh.sw = 0;
    gh.st = 2;
    gh.fade = GH_FADE;
    gh.sfade = .14;
  }
}

function mwStep(dt) {
  if (!S.gh || !S.gh.length)
    return;
  const sw = S.wp === 'sword';
  const R = sw ? C.swordR * (1 + C.swordRangePerLvl * S.sr) + 30 : C.atkR;
  for (const gh of S.gh) {
    gh.age += dt;
    if (gh.st === 0) {
      gh.w -= dt;
      // performance: a waiting afterimage looks for its target 8 times a second (not every frame), but always freshly at the moment it attacks
      if (gh.w <= 0 || (gh.nt -= dt) <= 0 || !gh.tg || gh.tg.hp <= 0) {
        gh.tg = nearest(gh.x, gh.y, R);
        gh.nt = .12;
      }
      const t = gh.tg;
      if (t)
        gh.a = Math.atan2(t.y - gh.y, t.x - gh.x);      // while it waits, the afterimage turns towards the nearest enemy
      if (gh.w > 0)
        continue;
      if (!t) {      // nothing to attack any more: it just fades
        gh.st = 2;
        gh.fade = GH_FADE;
      }
      else if (sw) {
        gh.sdur = Math.max(.07, .22 * C.fireRate / rate());
        gh.sw = gh.sdur;
        gh.sa = gh.a;
        gh.sd = S.sd || 1;
        gh.st0 = S.t;      // the afterimage's own attack animation
        gh.sh2 = new Set();
        gh.st = 1;
        sfx('swing');
      }
      else {
        fireVolley(t, gh.a, C.multiwieldDmg, gh.x, gh.y);      // the whole volley (every Multi Knife) from the afterimage's spot
        gh.st0 = S.t;      // its cast animation
        gh.st = 2;
        gh.fade = GH_FADE;
        sfx(S.wp === 'gun' ? 'bow' : 'shoot');
      }
    }
    else if (gh.st === 1)
      ghostSwing(gh, dt);
    else {
      gh.fade -= dt;
      if (gh.sfade > 0)
        gh.sfade -= dt;
    }
  }
  S.gh = S.gh.filter(g => g.st !== 2 || g.fade > 0);
}

// Dash (shared special augment, works with every weapon): auto-dashes in the moving direction every cdOf(S.nds) seconds, hitting every enemy it passes through.
function dashStep(dt) {
  if (S.ds) {
    const d = S.ds;
    const st = Math.min(dt, .22 - d.t);
    const x0 = S.x;
    const y0 = S.y;
    const sp = C.dashDist / .22 * st;
    S.x += d.ux * sp;
    S.y += d.uy * sp;
    d.t += dt;
    S.dtr.push({ x0, y0, x1: S.x, y1: S.y, t: .4 });
    for (const e of S.en)
      if (e.hp > 0 && !d.seen.has(e) && (e.x - S.x) ** 2 + (e.y - S.y) ** 2 < (34 + (e.hr || C.eHitR)) ** 2) {
        d.seen.add(e);
        hit(e, dmg());
      }
    if (d.t >= .22)
      S.ds = null;
  }
  if (S.nds) {
    S.dc -= dt;
    const [ix, iy] = inputVec();
    if (S.dc <= 0 && (ix || iy)) {
      S.dc = cdOf(S.nds);
      const l = Math.hypot(ix, iy);
      sfx('dash');
      S.ds = { ux: ix / l, uy: iy / l, t: 0, seen: new Set() };
    }
  }
}

// Swirl (shared special augment, every weapon): every 3rd attack throws a spinning sword at enemy t. It flies out a distance that depends on the weapon's range, hovers for S.swl seconds (1s + 1s per level), then returns.
function launchSwirl(t) {
  const a = Math.atan2(t.y - S.y, t.x - S.x);
  S.sws.push({
    x: S.x,
    y: S.y,
    ux: Math.cos(a),
    uy: Math.sin(a),
    ph: 0,
    t: 0,
    D: S.wp === 'sword' ? weaponRange() * C.swirlDist : C.atkR * C.swirlDistRanged,      // depends on the weapon's range (weaponRange(), above)
    stay: S.swl * C.swirlStayPerLvl,
    h: new Map()
  });
  sfx('dash');
}

// Moves every Swirl sword and damages enemies inside its radius every C.swirlTick seconds.
function swirlStep(dt) {
  if (!S.sws.length)
    return;
  const R = C.swordR * (1 + C.swordRangePerLvl * S.sr);
  const rad = R * C.swirlRad;
  for (const w of S.sws) {
    w.t += dt;
    w.a = (w.a || 0) + dt * (w.ph === 1 ? 20 : 14);
    if (w.ph === 0) {
      const sp = w.D / C.swirlOut;
      w.x += w.ux * sp * dt;
      w.y += w.uy * sp * dt;
      if (w.t >= C.swirlOut) {
        w.ph = 1;
        w.t = 0;
      }
    }
    else if (w.ph === 1) {
      if (w.t >= w.stay) {
        w.ph = 2;
        w.t = 0;
      }
    }
    else {
      const dx = S.x - w.x;
      const dy = S.y - w.y;
      const d = Math.hypot(dx, dy) || 1;
      const sp = Math.max(w.D / C.swirlOut * 1.3, 320);
      const st = Math.min(d, sp * dt);
      w.x += dx / d * st;
      w.y += dy / d * st;
      if (d < 24)
        w.dead = 1;
    }
    S.tr.push({ x: w.x, y: w.y, t: .25, m: .25, r: 5, c: RAR[PD.eq.r].rgb });
    trSlashCircle(w.x, w.y, rad);        // the Swirl also cuts down trees (trees.js)
    for (const e of S.en) {
      if (e.hp <= 0)
        continue;
      const q = rad + (e.hr || C.eHitR);
      if ((e.x - w.x) ** 2 + (e.y - w.y) ** 2 < q * q) {
        const lh = w.h.get(e);
        if (lh === undefined || S.t - lh >= C.swirlTick) {
          w.h.set(e, S.t);
          hit(e, dmg());
          if (S.nbl && e.hp > 0)
            e.bl = { d: dmg() * C.bleedPerLvl * S.nbl, c: e.bl ? e.bl.c : 0 };
        }
      }
    }
  }
  cull(S.sws, w => !w.dead);
}
