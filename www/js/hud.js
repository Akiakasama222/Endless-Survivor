// ======================================================================
// DAMAGE TAKEN & HUD
// Explosion helper, the player taking damage (shield / damage-over-time) and the on-screen HUD.
// ======================================================================

// Explosion at (x, y) with radius r dealing d damage to every enemy inside, except enemy s.
function boom(x, y, d, r, s) {
  sfx('boom');
  S.fx.push({ x, y, r, t: .3 });
  for (const o of S.en)
    if (o !== s && o.hp > 0 && (o.x - x) ** 2 + (o.y - y) ** 2 < (r + (o.hr || 16) - 16) ** 2)
      hit(o, d);
}

// The player takes d damage: a shield charge blocks it, otherwise health drops (and Dance with Death turns it into damage over time).
function hurt(d) {
  if (S.sh > 0) {
    S.sh--;
    sfx('block');
    S.tx.push({ x: S.x, y: S.y - 30, t: .6, s: 'Block' });
    return;
  }
  if (d >= S.hp && S.hp > C.aosGuard * maxHp()) {
    d = S.hp - C.aosEnd * maxHp();
    S.tx.push({ x: S.x, y: S.y - 54, t: .9, s: 'Survived!', c: '#ffd24a' });
  }
  if (S.ndd) {
    const n = 2 * S.ndd;
    S.dots.push({ per: d / n, n, t: C.dwdTick });
    S.hf = .3;
    sfx('hurt');
    S.tx.push({ x: S.x, y: S.y - 30, t: .6, s: Math.round(d) + ' DoT', p: 1 });
    return;
  }
  S.hp -= d;
  S.hf = .3;
  sfx('hurt');
  S.tx.push({ x: S.x, y: S.y - 30, t: .6, s: d, p: 1 });
}

// Applies Dance with Death damage-over-time ticks to the player.
function dotStep(dt) {
  if (!S.dots || !S.dots.length)
    return;
  for (const o of S.dots) {
    o.t -= dt;
    while (o.t <= 0 && o.n > 0) {
      o.t += C.dwdTick;
      o.n--;
      S.hp -= o.per;
      S.hf = Math.max(S.hf, .15);
      sfx('hurt');
      S.tx.push({ x: S.x, y: S.y - 30, t: .6, s: o.per < 1 ? +o.per.toFixed(1) : Math.round(o.per), p: 1 });
    }
  }
  cull(S.dots, o => o.n > 0);
}

// Formats seconds as mm:ss.
function mmss(t) {
  t = Math.floor(t);
  return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
}

// hudT = time of the last HUD refresh (the HUD updates at most every 100 ms).
let hudT = 0;

// Updates the on-screen HUD: level, time, kills, XP bar and health bar.
function hud(f) {
  const n = performance.now();
  if (!f && n - hudT < 100)
    return;
  hudT = n;
  $('lv').textContent = 'Lv ' + S.lvl + (S.dev ? ' · DEV' : '');
  $('time').textContent = mmss(S.t);
  $('kl').textContent = S.kills + ' kills';
  $('xpf').style.width = Math.min(100, 100 * S.xp / need()) + '%';
  $('hpf').style.width = 100 * Math.max(0, S.hp) / maxHp() + '%';
  $('hpt').textContent = Math.max(0, Math.ceil(S.hp)) + ' / ' + maxHp() + ' HP  ·  ' + dmg() + ' dmg' + (S.ns ? '  ·  Shield ' + S.sh + '/' + S.ns : '') + (S.dots && S.dots.length ? '  ·  DoT ' + Math.ceil(S.dots.reduce((a, o) => a + o.per * o.n, 0)) : '') + '  ·  Best: Lv ' + Math.max(best.lvl, S.lvl) + ', ' + Math.max(best.kills, S.kills) + ' kills';
  cdUI();
  const bs = S.boss;
  $('bb').style.display = bs ? 'block' : 'none';
  if (bs)
    $('bbf').style.width = Math.max(0, 100 * bs.hp / bs.mx) + '%';
}

// Updates the cooldown badges shown under the health bar.
function cdUI() {
  const f = (id, on, left, max, name) => {
    const e = $(id);
    e.style.display = on ? 'flex' : 'none';
    if (!on)
      return;
    const r = left <= 0;
    e.classList.toggle('rdy', r);
    e.children[0].style.width = (r ? 100 : Math.max(0, 100 * (1 - left / max))) + '%';
    e.children[1].textContent = name + (r ? ' READY' : ' ' + Math.ceil(left) + 's');
  };
  f('cdd', S.wp === 'sword' && S.nds, S.dc, cdOf(S.nds), '🗡 Dash');
  f('cdm', false, 0, 1, '');
}
