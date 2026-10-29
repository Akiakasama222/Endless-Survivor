// ======================================================================
// GIANT ZOMBIE BOSS
// The boss that appears every 50 levels: warning, spawning, behaviour and defeat.
// ======================================================================

// Fires one homing arcane missile at enemy t.
function launchMissile(t) {
  const a = Math.atan2(t.y - S.y, t.x - S.x);
  S.ms.push({ x: S.x, y: S.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, life: 5, tg: t });
  sfx('missile');
}

// Shows the big warning banner (title t, subtitle sub, colour col) and hides it after ms milliseconds if given.
function showWarn(t, sub, col, ms) {
  const w = $('warn');
  $('wb').textContent = t;
  $('wb').style.color = col;
  $('wt').textContent = sub;
  w.style.display = 'flex';
  if (ms)
    setTimeout(() => {
      if (!(S.bw > 0))
        w.style.display = 'none';
    }, ms);
}

// Clears the field and starts the boss warning countdown.
function startBoss() {
  S.en.length = 0;
  S.eb.length = 0;
  S.bw = C.bossWarn;
  S.bwn = -1;
  S.sp = 0;
  showWarn('⚠ WARNING ⚠', 'Giant Zombie arrives in ' + C.bossWarn + '…', '#ff5d5d');
  sfx('wind');
}

// Spawns the Giant Zombie; its health doubles every 50 levels.
function spawnBoss() {
  const M = 2 ** Math.floor(S.lvl / 50);
  const hp0 = (C.eHp + C.eHpLvl * (S.lvl - 1)) * M * C.bossHp;
  const off = -H / 2 - 170;
  const b = {
    boss: 1,
    hr: C.bossR,
    x: S.x + off,
    y: S.y + off,
    hp: hp0,
    mx: hp0,
    d: (C.eDmg + C.eDmgLvl * (S.lvl - 1)) * M * C.bossDmg,
    cd: 0,
    fl: 0,
    lv: S.lvl,
    st: 'walk',
    t: 1.5,
    z: 0
  };
  S.en.push(b);
  S.boss = b;
  S.sp = 0;
  sfx('boom');
}

// Boss defeated: drops a shower of gems and shows the victory banner.
function bossDown(e) {
  S.boss = null;
  for (let i = 0; i < 30; i++)
    S.gm.push({ x: e.x + (Math.random() - .5) * 180, y: e.y + (Math.random() - .5) * 180 });
  showWarn('BOSS DEFEATED!', 'Giant Zombie is down', '#9be15d', 2500);
}

// Boss behaviour each frame: walk towards the player, then wind up and dash or jump-stomp, then rest.
function bossAI(e, dt, sm) {
  e.fl -= dt;
  e.cd -= dt;
  const dx = S.x - e.x;
  const dy = S.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  if (e.st === 'walk') {
    {
      let ux = dx / d;
      let uy = dy / d;
      const w = bdSteer(e, S.x, S.y, dt, (e.hr || 50) * .8);
      if (w) {
        ux = w[0];
        uy = w[1];
      }
      e.x += ux * C.eSpeed * sm * .6 * dt;
      e.y += uy * C.eSpeed * sm * .6 * dt;
    }
    e.t -= dt;
    if (e.t <= 0) {
      if (Math.random() < .5) {
        e.st = 'cw';
        e.t = C.bossWind;
        e.ux = dx / d;
        e.uy = dy / d;
      }
      else {
        e.st = 'jw';
        e.t = C.bossWind;
        e.tx = S.x;
        e.ty = S.y;
      }
      sfx('wind');
    }
  }
  else if (e.st === 'cw') {
    e.t -= dt;
    if (e.t <= 0) {
      e.st = 'dash';
      e.t = C.bossDashT;
      e.hitp = 0;
      sfx('missile');
    }
  }
  else if (e.st === 'dash') {
    const sp = C.bossDashLen / C.bossDashT;
    e.x += e.ux * sp * dt;
    e.y += e.uy * sp * dt;
    e.t -= dt;
    if (!e.hitp && (S.x - e.x) ** 2 + (S.y - e.y) ** 2 < (e.hr + 14) ** 2) {
      e.hitp = 1;
      if (S.inv <= 0) {
        hurt(e.d);
        S.inv = .3;
      }
    }
    if (e.t <= 0) {
      e.st = 'rest';
      e.t = C.bossRest;
    }
  }
  else if (e.st === 'jw') {
    e.t -= dt;
    if (e.t <= 0) {
      e.st = 'jump';
      e.t = C.bossJumpT;
      e.jx = e.x;
      e.jy = e.y;
    }
  }
  else if (e.st === 'jump') {
    e.t -= dt;
    const u = 1 - Math.max(e.t, 0) / C.bossJumpT;
    e.x = e.jx + (e.tx - e.jx) * u;
    e.y = e.jy + (e.ty - e.jy) * u;
    e.z = Math.sin(Math.PI * u) * C.bossJumpH;
    if (e.t <= 0) {
      e.z = 0;
      e.st = 'rest';
      e.t = C.bossRest;
      S.bs.push({ x: e.x, y: e.y, r: C.bossJumpR, t: 1.44 });
      sfx('stomp');
      if ((S.x - e.x) ** 2 + (S.y - e.y) ** 2 < C.bossJumpR ** 2 && S.inv <= 0) {
        hurt(e.d);
        S.inv = .3;
      }
    }
  }
  else if (e.st === 'rest') {
    e.t -= dt;
    if (e.t <= 0) {
      e.st = 'walk';
      e.t = C.bossGap;
    }
  }
  if ((e.st === 'walk' || e.st === 'rest') && d < e.hr + 10 && e.cd <= 0 && S.inv <= 0) {
    hurt(e.d);
    e.cd = 1;
    S.inv = .15;
  }
}
