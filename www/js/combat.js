// ======================================================================
// COMBAT: TARGETING, SWORD & SWIRL
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

// Deals d damage to enemy e (q = quiet: no sound / number). Handles lifesteal, kills, drops, Bleed explosions and Death Explosions.
function hit(e, d, q) {
  if (e.hp <= 0)
    return;
  const a = Math.min(d, e.hp);
  e.hp -= d;
  if (!q) {
    sfx('hit');
    e.fl = .1;
    S.tx.push({ x: e.x, y: e.y - 20, t: .6, s: d < 1 ? +d.toFixed(1) : Math.round(d) });
  }
  if (S.ls && !S.nols)
    healP(a * .1 * S.ls);
  if (e.hp <= 0) {
    if (e.boss)
      bossDown(e);
    S.gm.push({ x: e.x, y: e.y });
    S.kills++;
    sfx('kill');
    if (S.ns && ++S.kc >= 10) {
      S.kc = 0;
      S.sh = Math.min(S.ns, S.sh + 1);
    }
    if (S.nd && Math.random() < .1 * S.nd)
      deathBoom(e.x, e.y, dmg() * (2 + .5 * (S.nd - 1)), 80, e);
    if (S.nbl && e.bl)
      deathBoom(e.x, e.y, dmg() * (1 + .1 * (S.nbl - 1)), 80, e);
  }
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

// Cooldown in seconds for a level-n timed ability.
function cdOf(n) {
  return Math.max(.5, 15 / (1 + .5 * (n - 1)));
}

// Advances the current sword swing and damages enemies the blade passes through.
function swingStep(dt) {
  if (!(S.sw > 0))
    return;
  const R = C.swordR * (1 + .5 * S.sr);
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
  for (const e of S.en) {
    if (e.hp <= 0 || S.sh2.has(e))
      continue;
    const dx = e.x - S.x;
    const dy = e.y - S.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > R + (e.hr || 16))
      continue;
    let da = Math.atan2(dy, dx) - mid;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) > half)
      continue;
    S.sh2.add(e);
    hit(e, dmg());
    if (S.nps && !e.boss) {
      const q = C.pushBase * .1 * S.nps;
      e.x += dx / d * q;
      e.y += dy / d * q;
    }
    if (S.nbl && e.hp > 0)
      e.bl = { d: dmg() * .01 * S.nbl, c: e.bl ? e.bl.c : 0 };
  }
}

// Sword weapon logic each frame: aims at the nearest enemy and starts a swing (every 3rd swing also throws a Swirl if owned).
function sword(dt) {
  const R = C.swordR * (1 + .5 * S.sr);
  if (!(S.sw > 0) && S.t - (S.la === undefined ? -9 : S.la) > 1.2) {
    const tn = nearest(S.x, S.y, C.atkR);
    if (tn) {
      const b = S.ba || 0;
      let df = Math.atan2(tn.y - S.y, tn.x - S.x) - b;
      df = Math.atan2(Math.sin(df), Math.cos(df));
      S.ba = b + df * Math.min(1, dt * 12);
    }
  }
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
      if (e.hp > 0 && !d.seen.has(e) && (e.x - S.x) ** 2 + (e.y - S.y) ** 2 < (34 + (e.hr || 16)) ** 2) {
        d.seen.add(e);
        hit(e, dmg());
      }
    if (d.t >= .22)
      S.ds = null;
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
      S.sd = -(S.sd || 1);
      S.sh2 = new Set();
      sfx('swing');
      S.sc = (S.sc || 0) + 1;
      if (S.swl && S.sc % 3 === 0)
        launchSwirl(t);
    }
    else
      S.cd = 0;
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

// Swirl (sword special): every 3rd attack throws a spinning sword at enemy t. It flies out a fixed distance, hovers for S.swl seconds (1s + 1s per level), then returns.
function launchSwirl(t) {
  const a = Math.atan2(t.y - S.y, t.x - S.x);
  S.sws.push({
    x: S.x,
    y: S.y,
    ux: Math.cos(a),
    uy: Math.sin(a),
    ph: 0,
    t: 0,
    D: C.swordR * C.swirlDist,
    stay: S.swl,
    h: new Map()
  });
  sfx('dash');
}

// Moves every Swirl sword and damages enemies inside its radius every C.swirlTick seconds.
function swirlStep(dt) {
  if (!S.sws.length)
    return;
  const R = C.swordR * (1 + .5 * S.sr);
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
    for (const e of S.en) {
      if (e.hp <= 0)
        continue;
      const q = rad + (e.hr || 16);
      if ((e.x - w.x) ** 2 + (e.y - w.y) ** 2 < q * q) {
        const lh = w.h.get(e);
        if (lh === undefined || S.t - lh >= C.swirlTick) {
          w.h.set(e, S.t);
          hit(e, dmg());
          if (S.nbl && e.hp > 0)
            e.bl = { d: dmg() * .01 * S.nbl, c: e.bl ? e.bl.c : 0 };
        }
      }
    }
  }
  cull(S.sws, w => !w.dead);
}
