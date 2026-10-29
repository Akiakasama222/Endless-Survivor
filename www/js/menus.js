// ======================================================================
// MENUS: PAUSE, WEAPON GUIDE, MAIN MENU, INVENTORY, CHESTS
// All menu screens (they are drawn into the #ov overlay).
// ======================================================================

// Opens the pause menu.
function pause() {
  if (S.state !== 'play')
    return;
  S.state = 'paused';
  joy = null;
  duckMusic(1);
  const o = $('ov');
  o.style.display = 'flex';
  o.innerHTML = '<h1>Paused</h1><button class="opt" id="rsm"><b>Resume</b><span>Back to the run</span></button><button class="opt" id="qt" style="border-color:#ff5d63"><b style="color:#ff5d63">Quit run</b><span>Records are saved · go to main menu</span></button><button class="opt" id="wgp" style="border-color:#fff8"><b style="color:#fff">Weapon Guide</b><span>Weapons, basic and special augments</span></button><button class="opt" id="stp" style="border-color:#fff8"><b style="color:#fff">Settings</b></button>';
  $('wgp').onclick = () => weaponGuide('pause');
  $('stp').onclick = () => settings('pause');
  $('rsm').onclick = resume;
  $('qt').onclick = () => {
    saveBest();
    endRun();
    menu();
  };
}

// Closes the pause menu and continues the run.
function resume() {
  duckMusic(0);
  S.state = 'play';
  $('ov').style.display = 'none';
  joy = null;
  last = performance.now();
}

$('pb').onclick = pause;

addEventListener('keydown', e => {
  if (e.key === 'Escape' || e.key === 'p')
    S.state === 'paused' ? resume() : pause();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden)
    pause();
});

// WG = text for the Weapon Guide screen: for each weapon its description (d), basic augments (b) and special augments (s). Edit here when an augment changes.
const WG = [
  {
    t: 'gun',
    d: 'Auto-fires projectiles at the nearest enemy in range.',
    b: [
      ['Fire Rate +50%', 'Shoots 50% faster.'],
      ['+1 Multishot', '+1 projectile per shot, up to level 5. The next pick is Multishot Overload: projectiles reset to 1 and your current damage is multiplied (x5, then x10, then x15).'],
      ['+1 Projectile Bounce', 'Projectiles bounce to +1 more enemy on hit.']
    ],
    s: [
      ['Arcane Missile', 'Hits have a +10% chance per level (max 10 levels) to launch a homing arcane missile that explodes for 100% damage.'],
      ['Lifesteal +10%', 'Heal 10% of damage dealt per level. Excess healing becomes a homing projectile (damage = the excess).'],
      ['Shield +1', 'Blocks 1 hit. +1 charge regained per 10 kills. Max charges +1 per level.'],
      ['Move Speed +50%', '+50% movement speed per level.'],
      ['Death Explosion', '10% chance per level for enemies to explode on death for 200% damage (+50% per level).'],
      ['Magnet', 'EXP pickup range +100% per level.']
    ]
  },
  {
    t: 'sword',
    d: 'Auto-slashes an arc at the nearest enemy in range.',
    b: [
      ['Attack Speed +50%', 'Slash 50% faster, up to level 5. The next pick is Attack Speed Overload: speed resets and your current damage is multiplied (x5, then x10, then x15).'],
      ['+50% Health Points', 'Max HP +50% per level.'],
      ['Sword Range +50%', 'Slash range +50% per level (also widens Swirl\'s radius).']
    ],
    s: [
      ['Dance with Death', 'Damage you take becomes damage over time, split into 2 ticks per level (one tick every 0.5s).'],
      ['Swirl', 'Every 3rd attack throws a spinning sword that flies out a fixed distance, hovers, then returns, hitting enemies in its radius every 0.3s. Hovers 1s, +1s per level. Radius is 50% of Sword Range.'],
      ['Bleed', 'Slashes cause bleed until death: 1% of damage dealt per level, every 0.25s. Bleeding enemies also explode on death for 100% damage (+10% per level).'],
      ['Magnet', 'EXP pickup range +100% per level.'],
      ['Lifesteal +10%', 'Heal 10% of damage dealt per level. Excess healing becomes a homing projectile (damage = the excess).'],
      ['Slash Push', 'Slashes push enemies back 10% per level.'],
      ['Shield +1', 'Blocks 1 hit. +1 charge regained per 10 kills. Max charges +1 per level.']
    ]
  },
  {
    t: 'grimoire',
    d: 'Fires a base arcane shot and can summon auto-firing turrets that follow you.',
    b: [
      ['Fire Turret', 'A turret that auto-fires Fireballs: 100% damage plus 50% damage in an AOE. Each level: +5% damage and +1% AOE radius.'],
      ['Lightning Turret', 'A turret that zaps enemies in range for 100% damage and stuns them for 0.5s. Each level: +1 chain and +0.5s stun.'],
      ['Ice Turret', 'A turret that shoots Ice: 75% damage in an AOE and slows enemies by 50%. Each level: stronger slow (stacks, never reaches 100%) and +1% AOE radius.']
    ],
    s: [
      ['Spellcaster', 'Attack speed +100% for your shots and turrets.'],
      ['Lightning Step', 'Move speed +50% per level.'],
      ['Enlightenment', 'Multiplies your current damage by 5.'],
      ['Ice Shield', '+1 damage-instance shield, +1 charge per 10 kills. Max charges +1 per level.'],
      ['Thunder Strike', '+10% chance per level (max 10 levels) on hit to call lightning from above (AOE, 100% damage).'],
      ['Health Siphon', 'Drains the nearest enemies in attack range at your attack speed, one more target per level. Red orbs carry the drained HP back to you. Drain damage +50% per level. Excess healing becomes a homing projectile.'],
      ['Magnet', 'EXP pickup range +100% per level.']
    ]
  }
];

// Weapon Guide screen. `from` = "pause" or "menu" decides where Back returns to.
function weaponGuide(from) {
  const o = $('ov');
  o.style.display = 'flex';
  const sec = (h, a) => '<div style="font-size:15px;color:#9be15d;margin:10px 0 4px;letter-spacing:.5px">' + h + '</div>' + a.map(x => '<div class="opt" style="border-color:#fff4;padding:10px 14px;cursor:default;margin-bottom:6px"><b style="color:#fff">' + x[0] + '</b><span style="display:block;font-size:14px;opacity:.85;margin-top:2px">' + x[1] + '</span></div>').join('');
  o.innerHTML = '<h1>Weapon Guide</h1><div style="flex:1;min-height:0;overflow-y:auto;width:100%;max-width:520px;margin:0 auto">' + WG.map(w => '<div style="margin-bottom:18px"><div style="font-size:26px;color:var(--gold)">' + TY[w.t].i + ' ' + TY[w.t].n + '</div><div style="font-size:15px;opacity:.85;margin-bottom:2px">' + w.d + '</div>' + sec('BASIC AUGMENTS (every level)', w.b) + sec('SPECIAL AUGMENTS (every 10 levels)', w.s) + '</div>').join('') + '</div><button class="opt" id="wgb" style="border-color:#fff8;max-width:520px;width:100%;margin:0 auto;text-align:center"><b style="color:#fff">Back</b></button>';
  $('wgb').onclick = () => {
    if (from === 'pause') {
      S.state = 'play';
      pause();
    }
    else
      menu();
  };
}

// Main menu.
function menu() {
  init();
  stopMusic();
  $('pb').style.display = 'none';
  S.state = 'menu';
  const o = $('ov');
  o.style.display = 'flex';
  o.innerHTML = '<h1 style="font-size:52px">Endless<br>Survivor</h1><p>Highest level ' + best.lvl + ' · Highest kills ' + best.kills + '</p><button class="opt" id="pl"><b>Play</b><span>Drag to move · auto-fire · survive</span></button><button class="opt" id="inv"><b>Inventory</b><span>Equipped: ' + RAR[PD.eq.r].n + ' ' + TY[PD.eq.t].n + (PD.chests ? ' · 🎁 ' + PD.chests : '') + '</span></button><button class="opt" id="wg" style="border-color:#fff8"><b style="color:#fff">Weapon Guide</b><span>Weapons, basic and special augments</span></button><button class="opt" id="st" style="border-color:#fff8"><b style="color:#fff">Settings</b></button>';
  $('wg').onclick = () => weaponGuide('menu');
  $('pl').onclick = () => {
    ac();
    init();
  };
  $('inv').onclick = inventory;
  $('st').onclick = () => settings('menu');
}

// Inventory screen state: invMsg = message line, invSel = selected slot.
let invMsg = '';

let invSel = null;

// Inventory screen: view and equip weapons and open chests.
function inventory() {
  const o = $('ov');
  o.style.display = 'flex';
  const owned = [];
  for (const t of ['gun', 'sword', 'grimoire'])
    for (let r = RAR.length - 1; r >= 0; r--)
      if (PD.inv[t][r] > 0)
        owned.push({ t, r });
  if (!invSel || !(PD.inv[invSel.t] && PD.inv[invSel.t][invSel.r] > 0))
    invSel = { t: PD.eq.t, r: PD.eq.r };
  const sel = invSel;
  const R = RAR[sel.r];
  const n = PD.inv[sel.t][sel.r];
  const eq = PD.eq.t === sel.t && PD.eq.r === sel.r;
  let mg;
  if (n >= 3) {
    ensureRar(sel.r + 1);
    mg = '<button data-m="1">Merge ×3 → ' + RAR[sel.r + 1].n + '<br><small>' + RAR[sel.r + 1].d + ' base damage</small></button>';
  }
  else
    mg = '<button disabled>Merge ×3<br><small>need ' + (3 - n) + ' more</small></button>';
  const canAuto = ['gun', 'sword', 'grimoire'].some(t => PD.inv[t].some(c => c >= 3));
  const am = canAuto ? '<button data-am="1">Auto merge<br><small>all tiers</small></button>' : '<button disabled>Auto merge<br><small>nothing to merge</small></button>';
  const tiles = owned.map(w => {
    const c = RAR[w.r];
    const on = w.t === sel.t && w.r === sel.r;
    const e = PD.eq.t === w.t && PD.eq.r === w.r;
    return '<button class="tl' + (on ? ' on' : '') + '" data-s="' + w.t + '_' + w.r + '" style="--c:' + c.c + ';--rgb:' + c.rgb + '"><span class="ti">' + TY[w.t].i + '</span>' + (w.r >= 5 ? '<i class="tm">M' + (w.r - 4) + '</i>' : '') + (e ? '<i class="te">✓</i>' : '') + '<em>×' + PD.inv[w.t][w.r] + '</em></button>';
  }).join('');
  const top = '<div class="ov1" style="--c:' + R.c + ';--rgb:' + R.rgb + '"><div class="ovt"><span class="big">' + TY[sel.t].i + '</span><div class="info"><b>' + R.n + ' ' + TY[sel.t].n + '</b><span>' + R.d + ' base damage · ×' + n + '</span><br><span style="opacity:.6;font-size:13px">Runs ' + PD.runs + ' · Total kills ' + PD.kills + '</span></div></div><div class="acts"><button class="' + (eq ? 'on' : '') + '" data-e="1"' + (eq ? ' disabled' : '') + '>' + (eq ? 'Equipped' : 'Equip') + '</button>' + mg + am + '</div>' + (invMsg ? '<p class="im">' + invMsg + '</p>' : '') + '</div>';
  const bot = '<div class="bot"><button class="back" id="bk">Back</button>' + (PD.chests > 0 ? '<button class="chb" id="oc">🎁 Open chest (' + PD.chests + ')</button>' : '<span class="nochest">🎁 No chests · earn one every ' + C.chestLvl + ' levels</span>') + '</div>';
  const old = $('ig');
  const st = old ? old.scrollTop : 0;
  o.innerHTML = '<div class="inv2">' + top + '<div class="grid" id="ig">' + tiles + '</div>' + bot + '</div>';
  invMsg = '';
  const g = $('ig');
  g.scrollTop = st;
  const cur = g.querySelector('.tl.on');
  if (cur)
    cur.scrollIntoView({ block: 'nearest' });
  o.querySelectorAll('[data-s]').forEach(b => b.onclick = () => {
    const m = b.dataset.s.split('_');
    invSel = { t: m[0], r: +m[1] };
    sfx('click');
    inventory();
  });
  o.querySelectorAll('[data-e]').forEach(b => b.onclick = () => {
    PD.eq = { t: sel.t, r: sel.r };
    weapon = sel.t;
    savePD();
    sfx('click');
    inventory();
  });
  o.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
    const t = sel.t;
    const r = sel.r;
    if (PD.inv[t][r] < 3)
      return;
    ensureRar(r + 1);
    padInv();
    PD.inv[t][r] -= 3;
    PD.inv[t][r + 1]++;
    if (PD.eq.t === t && PD.eq.r === r && PD.inv[t][r] < 1)
      PD.eq = { t, r: r + 1 };
    weapon = PD.eq.t;
    savePD();
    sfx('level');
    invMsg = 'Merged! You got a ' + RAR[r + 1].n + ' ' + TY[t].n + '.';
    inventory();
  });
  o.querySelectorAll('[data-am]').forEach(b => b.onclick = () => {
    let made = 0;
    padInv();
    for (const t of ['gun', 'sword', 'grimoire'])
      for (let r = 0; r < RAR.length; r++) {
        const k = Math.floor(PD.inv[t][r] / 3);
        if (k > 0) {
          ensureRar(r + 1);
          padInv();
          PD.inv[t][r] -= 3 * k;
          PD.inv[t][r + 1] += k;
          made += k;
        }
      }
    if (!made)
      return;
    if (!(PD.inv[PD.eq.t][PD.eq.r] > 0)) {
      let r = PD.inv[PD.eq.t].length - 1;
      while (r > 0 && !(PD.inv[PD.eq.t][r] > 0))
        r--;
      PD.eq = { t: PD.eq.t, r };
    }
    weapon = PD.eq.t;
    savePD();
    sfx('level');
    invMsg = 'Auto merged ' + made + ' time' + (made === 1 ? '' : 's') + '.';
    inventory();
  });
  if ($('oc'))
    $('oc').onclick = () => openChest(1);
  $('bk').onclick = menu;
}

// chestN = how many chests are being opened in the current animation.
let chestN = 10;

// Chest opening animation: rolls the weapons and adds them to the inventory.
function openChest(n) {
  if (PD.chests < 1)
    return inventory();
  n = Math.max(1, Math.min(PD.chests, Math.floor(+n) || 1));
  const got = {};
  let one = null;
  for (let i = 0; i < n; i++) {
    const d = rollChest();
    PD.chests--;
    PD.inv[d.t][d.r]++;
    const k = d.t + '_' + d.r;
    got[k] = (got[k] || 0) + 1;
    one = d;
  }
  savePD();
  sfx('level');
  const o = $('ov');
  o.style.display = 'flex';
  let res;
  if (n === 1) {
    const R = RAR[one.r];
    res = '<h1>Chest opened!</h1><div class="it" style="border-color:' + R.c + ';box-shadow:0 0 28px ' + R.c + '"><span class="ic">' + TY[one.t].i + '</span><div class="tx"><b style="color:' + R.c + '">' + R.n + ' ' + TY[one.t].n + '</b><span>' + R.d + ' base damage · you now own ×' + PD.inv[one.t][one.r] + '</span></div></div>';
  }
  else {
    const rows = Object.keys(got).map(k => {
      const m = k.split('_');
      return { t: m[0], r: +m[1], c: got[k] };
    }).sort((x, y) => y.r - x.r || (x.t < y.t ? -1 : 1));
    res = '<h1>' + n + ' chests opened!</h1><div style="display:flex;flex-direction:column;gap:8px;max-height:42vh;overflow-y:auto">' + rows.map(w => {
      const R = RAR[w.r];
      return '<div class="it" style="border-color:' + R.c + '"><span class="ic">' + TY[w.t].i + '</span><div class="tx"><b style="color:' + R.c + '">' + R.n + ' ' + TY[w.t].n + '</b><span>you now own ×' + PD.inv[w.t][w.r] + '</span></div><b style="font-weight:400;font-size:24px;color:' + R.c + '">×' + w.c + '</b></div>';
    }).join('') + '</div>';
  }
  let more = '';
  if (PD.chests > 0) {
    chestN = Math.max(1, Math.min(chestN, PD.chests));
    more = '<button class="opt" id="oc2" style="border-color:#ffc94a"><b style="color:#ffc94a">Open another (' + PD.chests + ' left)</b></button>' +
      '<div class="opt" style="border-color:#ffc94a"><b style="color:#ffc94a;display:flex;justify-content:space-between;align-items:center">Open multiple <input id="ocn" type="number" min="1" max="' + PD.chests + '" value="' + chestN + '"></b><div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="chip" data-n="5">5</button><button class="chip" data-n="10">10</button><button class="chip" data-n="25">25</button><button class="chip" data-n="' + PD.chests + '">All (' + PD.chests + ')</button></div><button class="chip" id="ocg" style="margin-top:10px;width:100%;font-size:18px;border-color:#ffc94a;color:#ffc94a">Open chests</button></div>';
  }
  o.innerHTML = '<div class="inv">' + res + more + '<button class="opt" id="bk2b" style="border-color:#fff8"><b style="color:#fff">Inventory</b></button></div>';
  if ($('oc2'))
    $('oc2').onclick = () => openChest(1);
  if ($('ocn')) {
    const inp = $('ocn');
    const cl = () => Math.max(1, Math.min(PD.chests, Math.round(+inp.value) || 1));
    o.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {
      inp.value = Math.min(PD.chests, +b.dataset.n);
      sfx('click');
    });
    inp.onchange = () => {
      inp.value = cl();
    };
    $('ocg').onclick = () => {
      chestN = cl();
      openChest(chestN);
    };
  }
  $('bk2b').onclick = inventory;
}
