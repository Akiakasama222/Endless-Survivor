// ======================================================================
// GAME UPDATE (one simulation step)
// Moves the player, enemies and projectiles forward by dt seconds.
// ======================================================================

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
  const ps = C.pSpeed * (1 + .5 * S.nsp);
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
      const a = Math.atan2(t.y - S.y, t.x - S.x);
      const n = shots();
      for (let i = 0; i < n; i++) {
        const o = a + (i - (n - 1) / 2) * 0.2;
        S.bl.push({
          x: S.x,
          y: S.y,
          vx: Math.cos(o) * C.bulletSpeed,
          vy: Math.sin(o) * C.bulletSpeed,
          life: 1.3,
          b: S.nb,
          h: new Set()
        });
      }
      S.cd = 1 / rate();
      sfx('shoot');
    }
    else
      S.cd = 0;
  }
  // bullets
  for (const b of S.bl) {
    if (S.hm) {
      const t = nearest(b.x, b.y, 450, b.h);
      if (t) {
        const dx = t.x - b.x;
        const dy = t.y - b.y;
        const l = Math.hypot(dx, dy) || 1;
        const v = Math.hypot(b.vx, b.vy);
        b.vx += dx / l * v * 8 * dt;
        b.vy += dy / l * v * 8 * dt;
        const n = Math.hypot(b.vx, b.vy);
        b.vx = b.vx / n * v;
        b.vy = b.vy / n * v;
      }
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (bdHit(b.x, b.y)) {
      b.life = 0;
      S.tr.push({ x: b.x, y: b.y, t: .3, m: .3, r: 10, c: '255,255,255' });
    }
    else
      S.tr.push({ x: b.x, y: b.y, t: .25, m: .25, r: 5, c: RAR[PD.eq.r].rgb });
    for (const e of S.en) {
      if (e.hp <= 0 || b.h.has(e) || b.life <= 0)
        continue;
      if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 < (2 + (e.hr || 16)) ** 2) {
        hit(e, dmg());
        proc(e);
        if (S.nmi && Math.random() < .1 * S.nmi && S.ms.length < 12)
          launchMissile(e);
        if (S.ex)
          boom(b.x, b.y, dmg(), 60, e);
        b.h.add(e);
        if (b.b > 0) {
          const n = nearest(b.x, b.y, C.bounceRange, b.h);
          if (n) {
            const a = Math.atan2(n.y - b.y, n.x - b.x);
            b.vx = Math.cos(a) * C.bulletSpeed;
            b.vy = Math.sin(a) * C.bulletSpeed;
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
  cull(S.bl, b => b.life > 0);
  if (S.wp === 'grimoire')
    grimoireStep(dt);
  dotStep(dt);
  xhStep(dt);
  sfStep(dt);
  for (const z of S.fe)
    z.t -= dt;
  cull(S.fe, z => z.t > 0);
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
      fireBoom(m.x, m.y, dmg(), 70);
      m.life = 0;
      continue;
    }
    for (const e of S.en)
      if (e.hp > 0 && (e.x - m.x) ** 2 + (e.y - m.y) ** 2 < (6 + (e.hr || 16)) ** 2) {
        fireBoom(m.x, m.y, dmg(), 70);
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
      if (w) {
        k = sm * sl * C.eSpeed * dt * 1.7;
        ux = w[0];
        uy = w[1];
      }
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
    if (d < 26 && e.cd <= 0 && S.inv <= 0) {
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
        bdPush(e, (e.hr || 50) * .8, C.eSpeed * dt, S.x, S.y);
    }
    else
      bdPush(e, 12, C.eSpeed * dt * .7, S.x, S.y);
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
    if ((b.x - S.x) ** 2 + (b.y - S.y) ** 2 < 256) {
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
    if (d < 100 * (1 + S.nxp)) {
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
          const p = C.pushBase * .1 * S.nps;
          e.x += dx / d * p;
          e.y += dy / d * p;
        }
        if (S.nbl && e.hp > 0)
          e.bl = { d: f.dd * .01 * S.nbl, c: e.bl ? e.bl.c : 0 };
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
