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

// One simulation step: moves everything forward by dt seconds (player, weapons, enemies, spawning, gems, level-ups).
function update(dt) {
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
  if (S.wp === 'sword')
    sword(dt);
  else if (S.cd <= 0) {
    const t = nearest(S.x, S.y, C.atkR);
    if (t) {
      S.aimTg = t;      // the model keeps facing the enemy it just shot at
      S.aimT = S.t;
      const a = Math.atan2(t.y - S.y, t.x - S.x);
      const n = shots();
      // The Bow and the Grimoire fire different shots: own speed, lifetime and look (the Grimoire's is a purple orb).
      const orb = S.wp === 'grimoire';
      const speed = orb ? C.gmShotSpeed : C.bulletSpeed;
      for (let i = 0; i < n; i++) {
        const o = a + (i - (n - 1) / 2) * 0.2;
        S.bl.push({
          x: S.x + (orb ? 0 : Math.cos(o) * C.arrowStart),      // arrows start at the bow, a little in front of the archer
          y: S.y + (orb ? 0 : Math.sin(o) * C.arrowStart),
          vx: Math.cos(o) * speed,
          vy: Math.sin(o) * speed,
          life: orb ? C.gmShotLife : C.bulletLife,
          b: S.nb,
          h: new Set(),
          spd: speed,
          orb,
          intro: orb ? Math.max(.05, Math.min(AB_INTRO, (Math.hypot(t.x - S.x, t.y - S.y) - (t.hr || C.eHitR)) / speed * .9)) : 0,     // the bolt's stretch-out time, shortened for close targets so it always finishes before the bolt arrives
          turn: orb ? C.gmShotTurn : 0,     // homing strength (Grimoire orbs home in on enemies, Bow arrows fly straight)
          seek: orb ? C.gmShotSeek : 450
        });
      }
      S.cd = 1 / rate();
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
        hit(e, dmg());
        if (b.orb)
          arcaneHit(b.x, b.y);
        proc(e);
        if (S.nmi && Math.random() < C.missileChance * S.nmi && S.ms.length < 12)
          launchMissile(e);
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
  dotStep(dt);
  if (S.wp === 'sword' && S.ls && S.hp > 0)      // Sword 'Lifesteal' = Regeneration: heals a share of max health every second
    S.hp = Math.min(maxHp(), S.hp + maxHp() * C.regenPct * S.ls * dt);
  xhStep(dt);
  sfStep(dt);
  for (const z of S.fe)
    z.t -= dt;
  cull(S.fe, z => z.t > 0);
  for (const z of S.ah)
    z.t -= dt;
  cull(S.ah, z => z.t > 0);
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
  // enemies
  const sm = 1 + C.eSpeedStep * Math.floor((S.lvl - 1) / C.eSpeedEvery);
  for (const e of S.en) {
    if (e.boss) {
      bossAI(e, dt, sm);
      continue;
    }
    if (e.stun > 0) {
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
    let k = sm * sl * C.eSpeed * dt;
    if (e.rg) {
      if (d < 200)
        k = -k * .8;
      else if (d < 300)
        k = 0;
      e.sh -= dt;
      if (e.sh <= 0 && d < C.rangerRange) {
        e.sh = C.rangerCd;
        sfx('eshot');
        S.eb.push({ x: e.x, y: e.y, vx: dx / d * C.eBulletSpeed, vy: dy / d * C.eBulletSpeed, life: 2.5, d: e.d });
      }
    }
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
    if (d < C.eHitR + C.pHitR && e.cd <= 0 && S.inv <= 0) {
      hurt(e.d);
      e.cd = 1;
      S.inv = .15;
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
      hurt(b.d);
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
  for (const t of S.tx)
    t.t -= dt;
  for (const f of S.fx)
    f.t -= dt;
  S.fx = S.fx.filter(f => f.t > 0);
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
        if (S.nps) {
          const p = C.pushBase * C.pushPerLvl * S.nps;
          e.x += dx / d * p;
          e.y += dy / d * p;
        }
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
  if (S.xp >= need()) {
    levelUp();
  }
  hud();
}
