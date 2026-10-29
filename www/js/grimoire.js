// ======================================================================
// GRIMOIRE & SPECIAL EFFECTS
// Grimoire weapon, its turrets, the shared explosion / homing-heal effects and the Grimoire augment list.
// ======================================================================

// GT = Grimoire turret table (name, colour, offset from the player). GL = turret key -> state counter (f/l/i = fire / lightning / ice level).
const GT = {
  f: { n: 'Fire', c: '255,122,47', off: [-24, 24], ph: 0 },
  l: { n: 'Lightning', c: '255,233,74', off: [24, -24], ph: 2 },
  i: { n: 'Ice', c: '127,216,255', off: [-28, -28], ph: 4 }
};

const GL = { f: 'nf', l: 'nl', i: 'ni' };

// Effect sheets: SMI fireball smoke, ICI ice burst, BSI boss stomp, DEI death explosion, FXI fireball explosion (all loaded from assets/images).
const SMI = new Image();

SMI.src = 'assets/images/fx-fireball-smoke.png';

const ICI = new Image();

ICI.src = 'assets/images/fx-ice-burst.png';

const BSI = new Image();

BSI.src = 'assets/images/fx-boss-stomp.webp';

const DEI = new Image();

DEI.src = 'assets/images/fx-death-explosion.png';

const FXI = new Image();

FXI.src = 'assets/images/fx-fireball-explosion.png';

SPR.tf = spr(36, 36, (x, u, v) => {
  x.font = '24px ' + EF;
  x.fillText('🔥', u, v);
});

SPR.tl = spr(36, 36, (x, u, v) => {
  x.font = '24px ' + EF;
  x.fillText('⚡', u, v);
});

SPR.ti = spr(36, 36, (x, u, v) => {
  x.font = '24px ' + EF;
  x.fillText('❄️', u, v);
});

SPR.gm = spr(32, 32, (x, u, v) => {
  x.shadowColor = '#b266ff';
  x.shadowBlur = 8;
  x.font = '22px ' + EF;
  x.fillText('📖', u, v);
});

// Grimoire stat helpers: damage / radius / chain / stun / slow values for each turret and Health Siphon at the current augment levels.
const gFire = n => C.gmFireR * (1 + .01 * Math.max(0, (n === undefined ? S.nf : n) - 1));

const gFireD = n => 1 + .05 * Math.max(0, (n === undefined ? S.nf : n) - 1);

const gChain = n => Math.max(0, (n === undefined ? S.nl : n) - 1);

const gStun = n => .5 * (n === undefined ? S.nl : n);

const gIce = n => C.gmIceR * (1 + .01 * Math.max(0, (n === undefined ? S.ni : n) - 1));

const gSlowP = n => {
  n = n === undefined ? S.ni : n;
  return n / (n + 1);
};

const gSip = n => 1 + .5 * Math.max(0, (n === undefined ? S.nhs : n) - 1);

// Area damage: hits every living enemy within radius r of (x, y) for d damage, except enemy s. If `pr` is set, each hit enemy may also trigger Thunder Strike.
function aoe(x, y, d, r, s, pr) {
  for (const o of S.en)
    if (o !== s && o.hp > 0 && (o.x - x) ** 2 + (o.y - y) ** 2 < (r + (o.hr || 16) - 16) ** 2) {
      hit(o, d);
      if (pr)
        proc(o);
    }
}

// Death Explosion / Bleed explosion visual + area damage at (x, y).
function deathBoom(x, y, d, r, s) {
  aoe(x, y, d, r, s);
  if (S.de.length > 24)
    S.de.shift();
  S.de.push({ x, y, r, t: .5 });
  sfx('dexp');
}

// Excess healing (healing past max HP) from Lifesteal / Health Siphon: EVERY heal instance that overflows spawns its own homing projectile
// carrying exactly the overflow as damage (1:1). Overflow under 1 is carried over (S.xh) so it is never lost. At the 80-projectile cap the damage is merged into the newest one.
// Spawns a homing projectile carrying d damage (overflow healing becomes damage).
function homing(d) {
  if (S.hs.length >= 80) {
    S.hs[S.hs.length - 1].d += d;
    return;
  }
  const a = Math.random() * 6.283;
  S.hs.push({ x: S.x, y: S.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 4, d, tg: null });
}

// Heals the player by x; any healing past max HP is stored and turned into a homing projectile.
function healP(x) {
  const u = Math.min(x, Math.max(0, maxHp() - S.hp));
  S.hp += u;
  const ex = x - u;
  if (ex > 0) {
    S.xh += ex;
    if (S.xh >= 1) {
      homing(S.xh);
      S.xh = 0;
    }
  }
}

// Moves the homing overflow-heal projectiles and damages what they hit.
function xhStep(dt) {
  for (const p of S.hs) {
    if (!p.tg || p.tg.hp <= 0)
      p.tg = nearest(p.x, p.y, 800);
    if (p.tg) {
      const dx = p.tg.x - p.x;
      const dy = p.tg.y - p.y;
      const l = Math.hypot(dx, dy) || 1;
      p.vx += dx / l * 1800 * dt;
      p.vy += dy / l * 1800 * dt;
      const n = Math.hypot(p.vx, p.vy) || 1;
      p.vx = p.vx / n * 320;
      p.vy = p.vy / n * 320;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    S.tr.push({ x: p.x, y: p.y, t: .3, m: .3, r: 5, c: '110,255,140' });
    for (const e of S.en) {
      if (e.hp <= 0)
        continue;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (6 + (e.hr || 16)) ** 2) {
        S.nols = 1;
        hit(e, p.d);
        S.nols = 0;
        p.life = 0;
        for (let i = 0; i < 6; i++)
          S.tr.push({ x: p.x + (Math.random() - .5) * 14, y: p.y + (Math.random() - .5) * 14, t: .35, m: .35, r: 4, c: '160,255,170' });
        break;
      }
    }
  }
  cull(S.hs, p => p.life > 0);
}

// Health Siphon drain orb: a red projectile that leaves a drained enemy, homes to the player and heals on arrival (heal overflow still becomes a green homing projectile via healP)
// Health Siphon: spawns a red orb at (x, y) that flies to the player and heals h on arrival.
function drain(x, y, h) {
  if (S.sf.length >= 120) {
    S.sf[S.sf.length - 1].h += h;
    return;
  }
  const a = Math.random() * 6.283;
  S.sf.push({ x, y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 6, h });
}

// Moves the Health Siphon orbs towards the player and heals on arrival.
function sfStep(dt) {
  for (const p of S.sf) {
    const dx = S.x - p.x;
    const dy = S.y - p.y;
    const l = Math.hypot(dx, dy) || 1;
    p.vx += dx / l * 1800 * dt;
    p.vy += dy / l * 1800 * dt;
    const n = Math.hypot(p.vx, p.vy) || 1;
    p.vx = p.vx / n * 320;
    p.vy = p.vy / n * 320;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (S.tr.length < 200)
      S.tr.push({ x: p.x, y: p.y, t: .3, m: .3, r: 5, c: '255,90,90' });
    if (l < 18 || p.life <= 0) {
      p.life = 0;
      S.sfa += p.h;
      healP(p.h);
      for (let i = 0; i < 4; i++)
        S.tr.push({ x: S.x + (Math.random() - .5) * 14, y: S.y + (Math.random() - .5) * 14, t: .35, m: .35, r: 4, c: '255,150,150' });
    }
  }
  cull(S.sf, p => p.life > 0);
  S.sft -= dt;
  if (S.sft <= 0) {
    S.sft = .5;
    if (S.sfa >= 1)
      S.tx.push({ x: S.x, y: S.y - 36, t: .6, s: '+' + Math.round(S.sfa), c: '#7bff8a' });
    S.sfa = 0;
  }
}

// Fireball explosion visual + area damage at (x, y).
function fireBoom(x, y, d, r) {
  aoe(x, y, d, r);
  if (S.fe.length > 24)
    S.fe.shift();
  S.fe.push({ x, y, r, t: .7 });
  sfx('fexp');
}

// Thunder Strike: lightning bolt at (x, y) dealing 100% damage in an area.
function thunder(x, y) {
  S.bolt.push({ x, y, t: .28 });
  sfx('tstrike');
  aoe(x, y, dmg(), C.gmThR);
}

// Thunder Strike chance (10% per level, max 100%) when enemy e is hit.
function proc(e) {
  if (S.nts && Math.random() < Math.min(1, .1 * S.nts))
    thunder(e.x, e.y);
}

// Grimoire logic each frame: base arcane shot, Fire / Lightning / Ice turrets, Health Siphon and Thunder Strike.
function grimoireStep(dt) {
  const r = rate();
  for (const k of ['f', 'l', 'i']) {
    const lv = S[GL[k]];
    if (!lv)
      continue;
    const G = GT[k];
    let T = S.tu[k];
    if (!T)
      T = S.tu[k] = { x: S.x + G.off[0], y: S.y + G.off[1], cd: .4, fl: 0 };
    const f = Math.min(1, dt * 8);
    T.x += (S.x + G.off[0] - T.x) * f;
    T.y += (S.y + G.off[1] - T.y) * f;
    T.fl -= dt;
    T.cd -= dt;
    if (T.cd > 0)
      continue;
    const t = nearest(T.x, T.y, k === 'l' ? C.gmZap : C.gmTR);
    if (!t) {
      T.cd = 0;
      continue;
    }
    T.cd = 1 / r;
    T.fl = .12;
    if (k === 'l') {
      const hs = new Set([t]);
      const pts = [[T.x, T.y], [t.x, t.y]];
      const stn = e => {
        if (e.hp > 0 && !e.boss)
          e.stun = Math.max(e.stun || 0, gStun());
      };
      hit(t, dmg());
      stn(t);
      proc(t);
      let cur = t;
      for (let c = gChain(); c > 0; c--) {
        const n = nearest(cur.x, cur.y, C.gmChain, hs);
        if (!n)
          break;
        hs.add(n);
        hit(n, dmg());
        stn(n);
        proc(n);
        pts.push([n.x, n.y]);
        cur = n;
      }
      S.zp.push({ p: pts, t: .18 });
      sfx('zap');
    }
    else {
      const d = Math.hypot(t.x - T.x, t.y - T.y);
      const Tf = Math.min(1.1, .55 + d / 700);
      const sp = C.eSpeed * (1 + C.eSpeedStep * Math.floor((S.lvl - 1) / C.eSpeedEvery)) * (t.slow > 0 ? (t.slowM || C.gmSlow) : 1);
      let lx = t.x;
      let ly = t.y;
      if (!t.boss && !(t.stun > 0)) {
        const dx = S.x - t.x;
        const dy = S.y - t.y;
        const l = Math.hypot(dx, dy) || 1;
        lx += dx / l * sp * Tf;
        ly += dy / l * sp * Tf;
      }
      S.tb.push({ sx: T.x, sy: T.y, x: T.x, y: T.y, tx: lx, ty: ly, u: 0, T: Tf, H: 70 + d * .35, z: 0, k });
      sfx('shoot');
    }
  }
  for (const b of S.tb) {
    b.u += dt / b.T;
    if (b.u < 1) {
      b.x = b.sx + (b.tx - b.sx) * b.u;
      b.y = b.sy + (b.ty - b.sy) * b.u;
      b.z = 4 * b.H * b.u * (1 - b.u);
      S.tr.push({ x: b.x, y: b.y, z: b.z, t: .3, m: .3, r: 5, c: GT[b.k].c });
      continue;
    }
    const lx = b.tx;
    const ly = b.ty;
    b.u = 9;
    if (b.k === 'f') {
      let n = null;
      let bd = 1e9;
      for (const e of S.en) {
        if (e.hp <= 0)
          continue;
        const d2 = (e.x - lx) ** 2 + (e.y - ly) ** 2;
        const rr = 30 + (e.hr || 16);
        if (d2 < rr * rr && d2 < bd) {
          bd = d2;
          n = e;
        }
      }
      const fd = dmg() * gFireD();
      if (n) {
        hit(n, fd);
        proc(n);
      }
      aoe(lx, ly, fd * .5, gFire(), n, 1);
      if (S.fe.length > 24)
        S.fe.shift();
      S.fe.push({ x: lx, y: ly, r: gFire(), t: .7 });
      sfx('fexp');
    }
    else {
      const r = gIce();
      const d = dmg() * .75;
      for (const o of S.en) {
        if (o.hp <= 0)
          continue;
        if ((o.x - lx) ** 2 + (o.y - ly) ** 2 < (r + (o.hr || 16) - 16) ** 2) {
          hit(o, d);
          if (o.hp > 0 && !o.boss)
            o.slow = Math.max(o.slow || 0, C.gmSlowT);
          o.slowM = 1 - gSlowP();
          proc(o);
        }
      }
      if (S.ie.length > 24)
        S.ie.shift();
      S.ie.push({ x: lx, y: ly, r, t: .5 });
      if (S.ic.length > 24)
        S.ic.shift();
      S.ic.push({ x: lx, y: ly, r, a: 0 });
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * 6.283;
        const q = Math.sqrt(Math.random()) * r;
        S.tr.push({ x: lx + Math.cos(a) * q, y: ly + Math.sin(a) * q, t: .5, m: .5, r: 4, c: '190,235,255' });
      }
      sfx('ice');
    }
  }
  cull(S.tb, b => b.u < 1);
  // Health Siphon: ticks at your attack speed; drains the nearest N enemies within attack range (N = augment level); each drained enemy sends a red projectile that carries the drained HP to you
  if (S.nhs) {
    S.sip -= dt;
    if (S.sip <= 0) {
      const hs = new Set();
      let any = false;
      for (let k = 0; k < S.nhs; k++) {
        const e = nearest(S.x, S.y, C.atkR, hs);
        if (!e)
          break;
        hs.add(e);
        any = true;
        const d = dmg() * gSip();
        const dd = Math.min(d, e.hp);
        e.fl = .1;
        hit(e, d, 1);
        drain(e.x, e.y, dd);
      }
      S.sip = any ? 1 / rate() : 0;
    }
  }
  for (const z of S.zp)
    z.t -= dt;
  cull(S.zp, z => z.t > 0);
  for (const z of S.ie)
    z.t -= dt;
  cull(S.ie, z => z.t > 0);
  for (const z of S.ic)
    z.a += dt;
  cull(S.ic, z => z.a < .9);
  for (const z of S.bolt)
    z.t -= dt;
  cull(S.bolt, z => z.t > 0);
}

// SG = Grimoire special augments: [key, name, text-function].
const SG = [
  [
    'nsc', 'Spellcaster',
    () => 'Attack speed +100% (shots and turrets) · ' + rate().toFixed(1) + ' → ' + (rate() + C.fireRate).toFixed(1) + ' per second'
  ],
  ['nsp', 'Lightning Step', () => 'Move speed +' + 50 * S.nsp + '% → +' + 50 * (S.nsp + 1) + '%'],
  ['ne', 'Enlightenment', () => 'Multiply your current damage by 5 (' + dmg() + ' → ' + dmg() * 5 + ')'],
  ['ns', 'Ice Shield', () => '+1 damage-instance shield, +1 charge per 10 kills · max ' + S.ns + ' → ' + (S.ns + 1)],
  [
    'nts', 'Thunder Strike',
    () => Math.min(100, 10 * S.nts) + '% → ' + Math.min(100, 10 * (S.nts + 1)) + '% chance on hit to call lightning from above (AOE, 100% damage)'
  ],
  [
    'nhs', 'Health Siphon',
    () => S.nhs ? 'Drain damage +50% (' + Math.round(100 * gSip()) + '% → ' + Math.round(100 * gSip(S.nhs + 1)) + '%) · drains ' + S.nhs + ' → ' + (S.nhs + 1) + ' targets ' + rate().toFixed(1) + 'x per second (attack speed) · every instance of excess healing becomes a homing projectile' : 'Drains your nearest target (within attack range) for 100% damage at your attack speed · a red projectile flies from it to you and heals you for the damage dealt · every instance of excess healing becomes a homing projectile (damage = the excess)'
  ],
  ['nxp', 'Magnet', () => 'EXP pickup range +' + 100 * S.nxp + '% → +' + 100 * (S.nxp + 1) + '%']
];

// Builds the three basic augment buttons offered to a Grimoire player.
function grimoireOpts() {
  return [
    ['nf', S.nf ? '🔥 Fire Turret Lv ' + (S.nf + 1) : '🔥 Fire Turret', S.nf ? 'Fireball damage +5% · ' + Math.round(100 * gFireD()) + '% → ' + Math.round(100 * gFireD(S.nf + 1)) + '% · AOE radius +1% (' + gFire().toFixed(1) + ' → ' + gFire(S.nf + 1).toFixed(1) + ')' : 'Adds a turret that auto-fires Fireballs: 100% damage + 50% damage AOE on hit'],
    ['nl', S.nl ? '⚡ Lightning Turret Lv ' + (S.nl + 1) : '⚡ Lightning Turret', S.nl ? '+1 chain · +0.5s stun (' + gChain() + ' → ' + gChain(S.nl + 1) + ' chains, stun ' + gStun().toFixed(1) + 's → ' + gStun(S.nl + 1).toFixed(1) + 's)' : 'Adds a turret that auto-zaps enemies in range for 100% damage and stuns them for 0.5s'],
    ['ni', S.ni ? '❄️ Ice Turret Lv ' + (S.ni + 1) : '❄️ Ice Turret', S.ni ? 'Slow +50% per level, stacks hyperbolically (never reaches 100%) · ' + Math.round(100 * gSlowP()) + '% → ' + Math.round(100 * gSlowP(S.ni + 1)) + '% slow · AOE radius +1% (' + gIce().toFixed(1) + ' → ' + gIce(S.ni + 1).toFixed(1) + ')' : 'Adds a turret that shoots Ice: 75% damage in an AOE and slows enemies by 50%']
  ].map(a => '<button class="opt" data-k="' + a[0] + '"><b>' + a[1] + '</b><span>' + a[2] + '</span></button>').join('');
}
