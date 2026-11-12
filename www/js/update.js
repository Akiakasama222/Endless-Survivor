// ======================================================================
// GAME UPDATE (one simulation step)
// Moves the player, enemies and projectiles forward by dt seconds.
// ======================================================================

// ----------------------------------------------------------------------
// UNSTUCK: an enemy that is OFF SCREEN and has hardly moved for a while (wedged between tree trunks) is hopped a short
// way towards the player onto a free spot that is still off screen, so nobody ever sees it pop in.
// ----------------------------------------------------------------------
const UNSTUCK = {
  time: 1.5,       // seconds without real progress (while off screen) before an enemy counts as stuck
  moved: 20,       // moving further than this (world units) from the anchor point counts as progress
  margin: 120,     // how far past the screen edge (px) an enemy must be to count as off screen (trees / sprites are tall)
  hopMin: 80,      // shortest hop towards the player (world units)
  hopMax: 260,     // longest hop
  tries: 10        // spots tried per hop
};

// Is world point (x, y) outside the visible screen (plus a margin)? Uses the same iso projection as draw().
function offScreen(x, y, m) {
  const dx = x - S.x;
  const dy = y - S.y;
  return Math.abs(dx - dy) > W / 2 + m || Math.abs((dx + dy) * .5) > H / 2 + m;
}

// Called once per enemy per step (after it has moved). Does nothing for bosses, stunned enemies or enemies on screen.
function unstick(e, dt) {
  if (e.boss || e.stun > 0 || !offScreen(e.x, e.y, UNSTUCK.margin)) {
    e.sk = 0;
    e.ax = e.x;
    e.ay = e.y;
    return;
  }
  if (e.ax === undefined || (e.x - e.ax) ** 2 + (e.y - e.ay) ** 2 > UNSTUCK.moved ** 2) {
    e.ax = e.x;       // it is making progress: move the anchor here and start counting again
    e.ay = e.y;
    e.sk = 0;
    return;
  }
  const dx = S.x - e.x;
  const dy = S.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  if (e.rg && d < 300) {   // a ranger holding its firing distance is meant to stand still
    e.sk = 0;
    return;
  }
  e.sk = (e.sk || 0) + dt;
  if (e.sk < UNSTUCK.time)
    return;
  const ux = dx / d;
  const uy = dy / d;
  for (let i = 0; i < UNSTUCK.tries; i++) {
    const hop = UNSTUCK.hopMin + Math.random() * (UNSTUCK.hopMax - UNSTUCK.hopMin);
    const side = (Math.random() - .5) * 2 * hop * .6;
    const nx = e.x + ux * hop - uy * side;
    const ny = e.y + uy * hop + ux * side;
    if (trHit(nx, ny, 16) || !offScreen(nx, ny, UNSTUCK.margin * .5))
      continue;
    e.x = nx;
    e.y = ny;
    e.ax = nx;
    e.ay = ny;
    e.sk = 0;
    return;
  }
  e.sk = UNSTUCK.time * .5;   // no good spot this time (e.g. it would land on screen): look again in a moment
}

// Retro 8-way movement for enemies: turns a ground direction (ux, uy) into the nearest of the 8 SCREEN directions
// (horizontal, vertical, diagonal) with the same screen speed in every direction, same as the player.
function snapDir8(ux, uy) {
  const sx = ux - uy;
  const sy = (ux + uy) * .5;
  if (!sx && !sy)
    return [0, 0];
  const a = Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
  const cx = Math.cos(a);
  const cy = Math.sin(a);
  return [.5 * cx + cy, cy - .5 * cx];
}

// ----------------------------------------------------------------------
// RESTLESS ATTACKS
// Restless no longer hurt you by touching you. They stop and play an attack move instead, and cannot move until it is over (e.at is the attack in progress, null = free to move):
//   melee  (Blue Restless close to you)       : arms swing, hurts you at the hit moment only if you are still within C.eAtkReach
//   cast   (Purple Restless within range)     : the bolt leaves at the hit moment, aimed at where you are then
//   jump   (Blue Restless at NIGHT, mid range): crouch, leap to where you stood, shockwave on landing, get up. Closes the gap quickly
// A stun / freeze interrupts the attack.
// ----------------------------------------------------------------------

// Starts an attack of kind 'melee', 'cast' or 'jump' (the Restless turns to face you and locks that direction).
function restAttackStart(e, kind) {
  const dx = S.x - e.x;
  const dy = S.y - e.y;
  e.at = {
    k: kind,
    t: 0,
    T: kind === 'melee' ? C.eAtkT : kind === 'cast' ? C.eCastT : C.eJumpWind + C.eJumpAir + C.eJumpRec,
    row: restRow(Math.atan2((dx + dy) * .5, dx - dy)),
    hit: false,
    go: false,
    sx: e.x,
    sy: e.y,
    tx: e.x,
    ty: e.y
  };
  if (kind === 'jump') {
    e.jcd = C.eJumpCd;
    sfx('wind');
  }
}

// Advances the attack in progress by dt seconds (the Restless stands still, except for the jump's flight).
function restAttackStep(e, dt) {
  const a = e.at;
  const dx = S.x - e.x;
  const dy = S.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  a.t += dt;
  e.fl -= dt;
  if (a.k === 'melee') {
    if (!a.hit && a.t >= a.T * C.eAtkHit) {
      a.hit = true;
      sfx('dash');
      if (d < C.eAtkReach && S.inv <= 0) {      // you can step out of reach before the arms land
        hurt(e.d * dnEnemyDmg());      // +damage at night (daynight.js)
        S.inv = .15;
      }
    }
  }
  else if (a.k === 'cast') {
    if (!a.hit && a.t >= a.T * C.eCastHit) {
      a.hit = true;
      sfx('eshot');
      S.eb.push({ x: e.x, y: e.y, vx: dx / d * C.eBulletSpeed, vy: dy / d * C.eBulletSpeed, life: 2.5, d: e.d });
    }
  }
  else {
    const tw = C.eJumpWind;
    const ta = tw + C.eJumpAir;
    if (a.t < tw) {      // crouching: keeps turning towards you
      a.row = restRow(Math.atan2((dx + dy) * .5, dx - dy));
    }
    else if (!a.go) {      // take off: the landing spot is where you stand right now (you have the flight time to move away)
      a.go = true;
      const stop = Math.min(d, C.pHitR + 12);
      a.tx = S.x - dx / d * stop;
      a.ty = S.y - dy / d * stop;
      sfx('dash');
    }
    if (a.go && a.t < ta) {
      const p = (a.t - tw) / C.eJumpAir;
      e.x = a.sx + (a.tx - a.sx) * p;
      e.y = a.sy + (a.ty - a.sy) * p;
    }
    else if (a.go && !a.hit) {      // landing
      a.hit = true;
      e.x = a.tx;
      e.y = a.ty;
      sfx('dexp');
      for (let i = 0; i < 8; i++) {
        const an = i / 8 * 6.283;
        S.tr.push({ x: e.x + Math.cos(an) * 14, y: e.y + Math.sin(an) * 14, t: .45, m: .45, r: 9, c: '205,190,160', z: 4 });
      }
      if (Math.hypot(S.x - e.x, S.y - e.y) < C.eJumpR + C.pHitR && S.inv <= 0) {
        hurt(e.d * C.eJumpDmg * dnEnemyDmg());
        S.inv = .15;
      }
    }
  }
  if (a.t >= a.T) {      // finished: free to move again after a short pause
    e.at = null;
    e.cd = C.eAtkCd;
    if (a.k === 'cast')
      e.sh = C.rangerCd;
  }
}

// One simulation step: moves everything forward by dt seconds (player, weapons, enemies, spawning, gems, level-ups).
// One player shot (Bow arrow / Grimoire orb) aimed at angle o towards enemy t; dm = its damage multiplier (1 = normal, C.multiwieldDmg for a MultiWield repeat).
// The Bow and the Grimoire fire different shots: own speed, lifetime and look (the Grimoire's is a purple orb).
function newShot(t, o, dm, ox, oy) {
  const orb = S.wp === 'grimoire';
  const sx = ox === undefined ? S.x : ox;      // where the shot starts: the player, or a MultiWield afterimage
  const sy = oy === undefined ? S.y : oy;
  const speed = orb ? C.gmShotSpeed : C.bulletSpeed;
  return {
    x: sx + (orb ? 0 : Math.cos(o) * C.arrowStart),      // arrows start at the bow, a little in front of the archer
    y: sy + (orb ? 0 : Math.sin(o) * C.arrowStart),
    vx: Math.cos(o) * speed,
    vy: Math.sin(o) * speed,
    life: orb ? C.gmShotLife : C.bulletLife,
    b: S.nb,
    h: new Set(),
    spd: speed,
    dm,
    orb,
    intro: orb ? Math.max(.05, Math.min(AB_INTRO, (Math.hypot(t.x - sx, t.y - sy) - (t.hr || C.eHitR)) / speed * .9)) : 0,     // the bolt's stretch-out time, shortened for close targets so it always finishes before the bolt arrives
    turn: orb ? C.gmShotTurn : 0,     // homing strength (Grimoire orbs home in on enemies, Bow arrows fly straight)
    seek: orb ? C.gmShotSeek : 450
  };
}

// Fires one whole volley at enemy t (angle a): every knife / orb you own (Multi Knives), each with damage multiplier dm, starting at (ox, oy) (default: the player). Used by the normal attack and by MultiWield afterimages.
function fireVolley(t, a, dm, ox, oy) {
  const n = shots();
  for (let i = 0; i < n; i++) {
    // Rogue: the first knife always flies straight at the target, the rest alternate to either side of it (+1, -1, +2, -2 ...). The Grimoire keeps the even fan.
    const o = S.wp === 'grimoire' ? a + (i - (n - 1) / 2) * 0.2 : a + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.2;
    S.bl.push(newShot(t, o, dm, ox, oy));
  }
}

function update(dt) {
  // Spawn animation (teleport.js): nothing moves or spawns until it is nearly over, then the player gets a moment of invulnerability.
  if (S.tp > 0) {
    S.tp -= dt;
    if (S.tp > TP_FREE)
      return;
    S.inv = Math.max(S.inv, TP_SAFE);
  }
  S.t += dt;
  const [ix, iy] = inputVec();
  if (ix || iy) {
    S.fd = Math.atan2((ix + iy) * .5, ix - iy);
    S.mv = 1;
  }
  else
    S.mv = 0;
  const ps = C.pSpeed * (1 + C.moveSpeedPerLvl * S.nsp);
  S.x += ix * ps * dt;
  S.y += iy * ps * dt;
  S.inv -= dt;
  // fire
  S.cd -= dt;
  dashStep(dt);      // Dash special augment (every weapon, combat.js)
  mwStep(dt);      // MultiWield delayed attacks (combat.js)
  if (S.wp === 'sword')
    sword(dt);
  else if (S.cd <= 0) {
    const t = nearest(S.x, S.y, C.atkR);
    if (t) {
      S.aimTg = t;      // the model keeps facing the enemy it just shot at
      S.aimT = S.t;
      const a = Math.atan2(t.y - S.y, t.x - S.x);
      fireVolley(t, a, 1);
      mwQueue();      // MultiWield: delayed repeats of this attack (combat.js)
      S.cd = 1 / rate();
      S.sc = (S.sc || 0) + 1;      // Swirl (every weapon): every Nth attack also throws a spinning sword
      if (S.swl && S.sc % C.swirlEvery === 0)
        launchSwirl(t);
      S.st0 = S.t;      // the Bow archer plays its shoot animation from this moment
      sfx(S.wp === 'gun' ? 'bow' : 'shoot');
    }
    else
      S.cd = 0;
  }
  // player arrows / orbs
  for (const b of S.bl) {
    const turn = b.turn || (S.hm ? 8 : 0);
    if (turn) {
      // homing: steer towards the nearest enemy this bullet has not hit yet, keeping its speed
      const t = nearest(b.x, b.y, b.seek || 450, b.h);
      if (t) {
        const dx = t.x - b.x;
        const dy = t.y - b.y;
        const l = Math.hypot(dx, dy) || 1;
        const v = Math.hypot(b.vx, b.vy);
        b.vx += dx / l * v * turn * dt;
        b.vy += dy / l * v * turn * dt;
        const n = Math.hypot(b.vx, b.vy);
        b.vx = b.vx / n * v;
        b.vy = b.vy / n * v;
      }
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    b.age = (b.age || 0) + dt;      // the Grimoire bolt's stretch-out animation is timed from this
    if (b.orb && C.gmShotWaveAmp) {
      // Snake path: the real position (hit detection too) swings left and right of the straight / homing line, matching the wiggling animation.
      // The sway fades in over the first moments so the bolt leaves the player cleanly, and it is applied as a change of offset so homing still works.
      const sp = Math.hypot(b.vx, b.vy) || 1;
      const px = -b.vy / sp;      // sideways direction (perpendicular to the flight direction)
      const py = b.vx / sp;
      const ramp = Math.min(1, b.age / .15);
      const wo = -Math.sin(b.age * C.gmShotWaveFreq) * C.gmShotWaveAmp * ramp;      // minus sign = the swing starts on the same side as the animation (flip it if it ever looks reversed)
      const dw = wo - (b.wo || 0);
      b.wo = wo;
      b.x += px * dw;
      b.y += py * dw;
    }
    if (b.orb) {
      // remember where the bolt has just been: the tail is drawn along this real (snaking) path
      const tl = b.tail || (b.tail = []);
      tl.push({ x: b.x, y: b.y, a: b.age });
      while (tl.length > 2 && b.age - tl[0].a > C.gmShotTailT)
        tl.shift();
    }
    if (bdHit(b.x, b.y)) {
      b.life = 0;
      if (b.orb)
        arcaneHit(b.x, b.y);
      S.tr.push({ x: b.x, y: b.y, t: .3, m: .3, r: 10, c: '255,255,255' });
    }
    else if (b.orb ? !ABI.naturalWidth : !TRL.br)      // Bow arrows use the trail image and the Grimoire bolt has its own tail in the sprite, so these round puffs are only the fallback
      S.tr.push({ x: b.x, y: b.y, t: .25, m: .25, r: 5, c: b.orb ? '176,106,255' : RAR[PD.eq.r].rgb, z: b.orb ? 0 : C.arrowHeight - 18 });      // z lifts the Bow's glow trail to the arrow's height
    for (const e of S.en) {
      if (e.hp <= 0 || b.h.has(e) || b.life <= 0)
        continue;
      if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 < (2 + (e.hr || C.eHitR)) ** 2) {
        hit(e, dmg() * b.dm);
        if (!b.orb)
          bloodHit(e);
        if (b.orb)
          arcaneHit(b.x, b.y);
        onHit(e, dmg() * b.dm);      // Bleed, Thunder Strike, Homing Explosive Knives (combat.js)
        if (S.ex)
          boom(b.x, b.y, dmg(), 60, e);
        b.h.add(e);
        if (b.b > 0) {
          const n = nearest(b.x, b.y, C.bounceRange, b.h);
          if (n) {
            const a = Math.atan2(n.y - b.y, n.x - b.x);
            b.vx = Math.cos(a) * b.spd;
            b.vy = Math.sin(a) * b.spd;
            b.b--;
            b.life = Math.max(b.life, .8);
          }
          else
            b.life = 0;
        }
        else
          b.life = 0;
        break;
      }
    }
  }
  if (C.gmShotTailFade > 0)
    for (const b of S.bl)      // a Grimoire bolt that just hit or ran out leaves its tail behind to fade away
      if (b.orb && b.life <= 0 && b.tail && b.tail.length > 1) {
        if (S.at.length > 60)
          S.at.shift();
        S.at.push({ x: b.x, y: b.y, pts: b.tail.slice().reverse(), t: C.gmShotTailFade, m: C.gmShotTailFade });      // pts: newest (the head) first
      }
  cull(S.bl, b => b.life > 0);
  if (S.wp === 'grimoire')
    grimoireStep(dt);
  // Thunder Strike works with every weapon, so its bolt has to fade out here and not inside grimoireStep (which only runs for the Grimoire:
  // with the Knife or the Sword the bolt's light stayed on the ground forever).
  for (const z of S.bolt) {
    z.t -= dt;
    if (!z.hit && TS_DUR - z.t >= TS_IMPACT) {      // the bolt reaches the ground: area damage
      z.hit = 1;
      aoe(z.x, z.y, z.d, C.gmThR);
    }
  }
  cull(S.bolt, z => z.t > 0);
  dotStep(dt);
  siphonStep(dt);      // Health Siphon special augment (every weapon, grimoire.js)
  if (S.nrg && S.hp > 0) {      // Regeneration: heals a share of max health every second
    if (S.hp < maxHp())
      healFx();
    S.hp = Math.min(maxHp(), S.hp + maxHp() * C.regenPct * S.nrg * dt);
  }
  xhStep(dt);
  sfStep(dt);
  for (const z of S.fe)
    z.t -= dt;
  cull(S.fe, z => z.t > 0);
  for (const z of S.ah)
    z.t -= dt;
  cull(S.ah, z => z.t > 0);
  for (const z of S.bh)
    z.t -= dt;
  cull(S.bh, z => z.t > 0);
  for (const z of S.cf)
    z.t -= dt;
  cull(S.cf, z => z.t > 0);
  for (const z of S.lu)
    z.t -= dt;
  cull(S.lu, z => z.t > 0);
  for (const z of S.at)
    z.t -= dt;
  cull(S.at, z => z.t > 0);
  for (const z of S.de)
    z.t -= dt;
  cull(S.de, z => z.t > 0);
  for (const z of S.bs)
    z.t -= dt;
  cull(S.bs, z => z.t > 0);
  for (const m of S.ms) {
    if (!m.tg || m.tg.hp <= 0)
      m.tg = nearest(m.x, m.y, 900);
    if (m.tg) {
      const dx = m.tg.x - m.x;
      const dy = m.tg.y - m.y;
      const l = Math.hypot(dx, dy) || 1;
      m.vx += dx / l * 1440 * dt;
      m.vy += dy / l * 1440 * dt;
      const n = Math.hypot(m.vx, m.vy);
      m.vx = m.vx / n * 260;
      m.vy = m.vy / n * 260;
    }
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.life -= dt;
    S.tr.push({ x: m.x, y: m.y, t: .3, m: .3, r: 6, c: '255,140,40' });
    if (bdHit(m.x, m.y)) {
      fireBoom(m.x, m.y, dmg() * C.missileDmg, 70);
      m.life = 0;
      continue;
    }
    for (const e of S.en)
      if (e.hp > 0 && (e.x - m.x) ** 2 + (e.y - m.y) ** 2 < (6 + (e.hr || C.eHitR)) ** 2) {
        fireBoom(m.x, m.y, dmg() * C.missileDmg, 70);
        m.life = 0;
        break;
      }
  }
  S.ms = S.ms.filter(m => m.life > 0);
  swirlStep(dt);
  // spawn (enemies spawn at the player's current level)
  if (S.bw > 0) {
    S.bw -= dt;
    const n = Math.ceil(Math.max(S.bw, 0));
    if (n !== S.bwn) {
      S.bwn = n;
      $('wt').textContent = 'Giant Zombie arrives in ' + n + '…';
    }
    if (S.bw <= 0) {
      $('warn').style.display = 'none';
      spawnBoss();
    }
  }
  if (!(S.bw > 0) && !S.boss)
    S.sp += dt * (C.spawnBase + S.t * C.spawnGrow);
  while (S.sp >= 1) {
    S.sp--;
    if (S.en.length >= C.capBase + C.capPerLvl * (S.lvl - 1))
      break;
    const q = Math.random() * (W + H) * 2;
    const m = 40;
    let ex;
    let ey;
    if (q < W) {
      ex = q - W / 2;
      ey = -H / 2 - m;
    }
    else if (q < W + H) {
      ex = W / 2 + m;
      ey = q - W - H / 2;
    }
    else if (q < 2 * W + H) {
      ex = q - W - H - W / 2;
      ey = H / 2 + m;
    }
    else {
      ex = -W / 2 - m;
      ey = q - 2 * W - H - H / 2;
    }
    const ox = .5 * ex + ey;
    const oy = ey - .5 * ex;
    const M = 2 ** Math.floor(S.lvl / 50);
    const hp0 = (C.eHp + C.eHpLvl * (S.lvl - 1)) * M;
    S.en.push({
      x: S.x + ox,
      y: S.y + oy,
      hp: hp0,
      mx: hp0,
      d: (C.eDmg + C.eDmgLvl * (S.lvl - 1)) * M,
      cd: 0,
      fl: 0,
      lv: S.lvl,
      rg: S.lvl >= C.rangerFrom && Math.random() < C.rangerChance,
      sh: 1 + Math.random()
    });
  }
  vortexStep(dt);      // Soul Vortex pull (combat.js)
  // enemies
  const sm = 1 + C.eSpeedStep * Math.floor((S.lvl - 1) / C.eSpeedEvery);
  for (const e of S.en) {
    if (e.boss) {
      bossAI(e, dt, sm * dnEnemySpd());
      continue;
    }
    if (e.stun > 0) {
      e.at = null;      // a stun / freeze interrupts an attack
      e.stun -= dt;
      e.fl -= dt;
      e.cd -= dt;
      if (e.stun <= 0 && e.frz) {      // thawed: the slow starts again with its full duration
        e.frz = 0;
        e.slow = C.gmSlowT;
      }
      continue;
    }
    const sl = e.slow > 0 ? (e.slow -= dt, e.slowM || C.gmSlow) : 1;
    const dx = S.x - e.x;
    const dy = S.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    if (e.at) {      // attacking: it cannot move until the attack is finished (slowed enemies attack slower too)
      restAttackStep(e, dt * sl);
      continue;
    }
    let k = sm * sl * C.eSpeed * (e.rg || !C.eJumpOn ? dnEnemySpd() : 1) * dt;      // +speed at night (daynight.js); Blue Restless get the Jump attack instead (unless it is turned off)
    if (e.rg) {
      if (d < 200)
        k = -k * .8;
      else if (d < 300)
        k = 0;
      e.sh -= dt;
    }
    else if (d < C.eAtkRange * .75)
      k = 0;      // right next to you: stands and waits for its attack pause to end
    e.mv = k !== 0;      // drawn walking (otherwise idle)
    e.back = k < 0;      // a Purple Restless backing away is drawn turned away from you (it turns back to face you when it casts)
    {
      let ux = dx / d;
      let uy = dy / d;
      const w = bdSteer(e, S.x, S.y, dt, 12);
      if (w) {          // detour around a trunk at normal speed (no speed-up)
        ux = w[0];
        uy = w[1];
      }
      else if (C.enemySnap8 && d > C.eHitR + C.pHitR + 6)
        [ux, uy] = snapDir8(ux, uy);      // enemies walk in straight horizontal / vertical / diagonal lines
      e.x += ux * k;
      e.y += uy * k;
    }
    e.cd -= dt;
    e.fl -= dt;
    for (const o of S.en) {
      if (o === e)
        continue;
      const ox = e.x - o.x;
      const oy = e.y - o.y;
      const od = ox * ox + oy * oy;
      if (od > 0 && od < 576) {
        const k = Math.sqrt(od);
        e.x += ox / k * 30 * dt;
        e.y += oy / k * 30 * dt;
      }
    }
    e.jcd = (e.jcd === undefined ? Math.random() * C.eJumpCd * .5 : e.jcd) - dt;
    if (e.cd <= 0) {      // no touch damage any more: it starts an attack move instead
      if (e.rg) {
        if (e.sh <= 0 && d < C.rangerRange)
          restAttackStart(e, 'cast');
      }
      else if (d < C.eAtkRange)
        restAttackStart(e, 'melee');
      else if (C.eJumpOn && e.jcd <= 0 && dnNight() && d > C.eJumpMin && d < C.eJumpMax)      // night: leaps over the gap
        restAttackStart(e, 'jump');
    }
  }
  for (const e of S.en)
    if (e.bl && e.hp > 0) {
      e.bl.c += dt;
      while (e.bl.c >= C.bleedTick && e.hp > 0) {
        e.bl.c -= C.bleedTick;
        hit(e, e.bl.d);
      }
      if (Math.random() < .15)
        S.tr.push({ x: e.x + (Math.random() - .5) * 16, y: e.y + Math.random() * 10, t: .4, m: .4, r: 3, c: '210,20,40' });
    }
  cull(S.en, e => e.hp > 0);
  bdPush(S, 14, 0);
  for (const e of S.en) {
    if (e.boss) {
      if (!(e.z > 0))
        bdPush(e, (e.hr || 50) * .8, 0);
    }
    else {
      bdPush(e, 12, 0);
      unstick(e, dt);
    }
  }
  for (const b of S.eb) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (bdHit(b.x, b.y)) {
      b.life = 0;
      S.tr.push({ x: b.x, y: b.y, t: .3, m: .3, r: 10, c: '255,77,240' });
      continue;
    }
    S.tr.push({ x: b.x, y: b.y, t: .35, m: .35, r: 7, c: '255,77,240' });
    if ((b.x - S.x) ** 2 + (b.y - S.y) ** 2 < (C.pHitR + 6) ** 2) {
      hurt(b.d * dnEnemyDmg());
      b.life = 0;
    }
  }
  cull(S.eb, b => b.life > 0);
  // gems
  for (const m of S.gm) {
    const dx = S.x - m.x;
    const dy = S.y - m.y;
    const d = Math.hypot(dx, dy);
    if (d < C.magnetBase * (1 + C.magnetPerLvl * S.nxp)) {
      m.x += dx / d * 260 * dt;
      m.y += dy / d * 260 * dt;
    }
    if (d < 18) {
      m.g = 1;
      S.xp++;
      sfx('gem');
    }
  }
  cull(S.gm, m => !m.g);
  if (S.gm.length > 150) {
    const k = S.gm.length - 150;
    S.xp += k;
    S.gm.splice(0, k);
  }
  // coins (same magnet as XP gems; the total is saved to the profile when the run ends)
  for (const m of S.cn) {
    const dx = S.x - m.x;
    const dy = S.y - m.y;
    const d = Math.hypot(dx, dy);
    if (d < C.magnetBase * (1 + C.magnetPerLvl * S.nxp)) {
      m.x += dx / d * 260 * dt;
      m.y += dy / d * 260 * dt;
    }
    if (d < 18) {
      m.g = 1;
      S.coins += m.v;
      if (S.cf.length > 30)
        S.cf.shift();
      S.cf.push({ x: m.x, y: m.y, t: CF_T, b: m.v > 1 });
      sfx('gem');
    }
  }
  cull(S.cn, m => !m.g);
  if (S.cn.length > 150) {
    for (const m of S.cn.splice(0, S.cn.length - 150))
      S.coins += m.v;
  }
  for (const t of S.tx)
    t.t -= dt;
  for (const f of S.fx)
    f.t -= dt;
  S.fx = S.fx.filter(f => f.t > 0);
  if (S.hfx > 0)
    S.hfx -= dt;
  if (S.hf > 0)
    S.hf -= dt;
  if (S.sfade > 0)
    S.sfade -= dt;
  for (const p of S.dtr)
    p.t -= dt;
  S.dtr = S.dtr.filter(p => p.t > 0);
  for (const p of S.tr)
    p.t -= dt;
  cull(S.tr, p => p.t > 0);
  if (S.tr.length > 260)
    S.tr.splice(0, S.tr.length - 260);
  swingStep(dt);
  chestStep(dt);       // hidden chests (chests.js)
  orbStep(dt);         // orbs: 10 coins for 3 special augments (orbs.js)
  for (const f of S.sl) {
    f.t += dt;
    const fr = f.r * Math.min(1, f.t / .3);
    for (const e of S.en) {
      if (e.hp <= 0 || f.h.has(e))
        continue;
      const dx = e.x - f.x;
      const dy = e.y - f.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > fr + 14)
        continue;
      let da = Math.abs(Math.atan2(dy, dx) - f.a);
      if (da > Math.PI)
        da = 6.283 - da;
      if (da < .88 || d < 30) {
        f.h.add(e);
        hit(e, f.dd);
        if (S.nbl && e.hp > 0)
          e.bl = { d: f.dd * C.bleedPerLvl * S.nbl, c: e.bl ? e.bl.c : 0 };
      }
    }
  }
  S.sl = S.sl.filter(f => f.t < .4);
  cull(S.tx, t => t.t > 0);
  if (S.tx.length > 30)
    S.tx.splice(0, S.tx.length - 30);
  if (S.hp <= 0) {
    S.hp = 0;
    hud(1);
    over();
    return;
  }
  if (S.state === 'play' && S.xp >= need()) {      // (not while an orb's augment screen is open)
    levelUp();
  }
  hud();
}
