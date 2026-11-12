// ======================================================================
// MENUS: PAUSE, WEAPON GUIDE, ENEMY GUIDE, MAIN MENU, INVENTORY, CHESTS
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
  o.innerHTML = '<h1>Paused</h1><button class="opt" id="rsm"><b>Resume</b><span>Back to the run</span></button><button class="opt" id="qt" style="border-color:#ff5d63"><b style="color:#ff5d63">Quit run</b><span>Records are saved · go to main menu</span></button><button class="opt" id="wgp" style="border-color:#fff8"><b style="color:#fff">Weapon Guide</b><span>Weapons, basic and special augments</span></button><button class="opt" id="egp" style="border-color:#fff8"><b style="color:#fff">Enemy Guide</b><span>Restless, the boss and day / night</span></button><button class="opt" id="fbp" style="border-color:#fff8"><b style="color:#fff">Feedback</b><span>Tell us what you think of the game</span></button><button class="opt" id="stp" style="border-color:#fff8"><b style="color:#fff">Settings</b></button>';
  $('wgp').onclick = () => weaponGuide('pause');
  $('egp').onclick = () => enemyGuide('pause');
  $('fbp').onclick = () => feedbackScreen('pause');
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
  // typing in the feedback form must not pause / resume the game
  if (isTyping(e))
    return;
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
    d: 'Auto-throws knives at the nearest enemy in range.',
    b: [
      ['Fire Rate +' + pc(C.rateAug) + '%', 'Throws ' + pc(C.rateAug) + '% faster.', IMAGE_FILES.augRogueRate],
      ['+1 Multi Knives', '+1 knife per throw, with no level cap.', IMAGE_FILES.augRogueMulti],
      ['+1 Knife Bounce', 'Knives bounce to +1 more enemy on hit.', IMAGE_FILES.augRogueBounce]
    ]
  },
  {
    t: 'sword',
    d: 'Auto-slashes an arc at the nearest enemy in range.',
    b: [
      ['Attack Speed +' + pc(C.rateAug) + '%', 'Slash ' + pc(C.rateAug) + '% faster per level.', IMAGE_FILES.augSwordSpeed],
      ['+' + pc(C.hpAug) + '% Health Points', 'Max HP +' + pc(C.hpAug) + '% per level.', IMAGE_FILES.augSwordHealth],
      ['Armor +' + C.armorPerLvl, 'Blocks ' + C.armorPerLvl + ' damage from every hit you take, per level (a hit always deals at least 1). You start with 0 armor.', IMAGE_FILES.augSwordArmor]
    ]
  },
  {
    t: 'grimoire',
    d: 'Fires purple homing arcane orbs and can summon auto-firing turrets that follow you.',
    b: [
      ['Fire Turret', 'A turret that auto-fires Fireballs: 100% damage plus ' + Math.round(100 * C.gmFireSplash) + '% damage in an AOE, with a ' + pc(C.burnChance) + '% chance to Burn (' + pc(C.burnDmg) + '% of its damage over ' + C.burnT + 's). Each level: +' + Math.round(100 * C.gmFireD) + '% damage and +' + pc(C.gmTurAS) + '% turret attack speed.', IMAGE_FILES.augGrimoireFire],
      ['Lightning Turret', 'A turret that zaps enemies in range for 100% damage and stuns them for ' + C.gmStun + 's, with a ' + pc(C.teslaChance) + '% chance to inflict Tesla (electrocutes the ' + C.teslaTargets + ' nearest enemies, separate from the chain; the arcs can spread Tesla too). Each level: +' + C.gmChainPerLvl + ' chain and +' + pc(C.gmTurAS) + '% turret attack speed.', IMAGE_FILES.augGrimoireLightning],
      ['Ice Turret', 'A turret that shoots Ice: ' + pc(C.gmIceDmg) + '% damage in an AOE and slows enemies by ' + pc(C.gmSlow) + '%. Hitting an already slowed enemy freezes it (stun) for ' + C.freezeT + 's, then its slow restarts. Each level: stronger slow (stacks, never reaches 100%), +' + pc(C.gmIceRPerLvl) + '% AOE radius and +' + pc(C.gmTurAS) + '% turret attack speed.', IMAGE_FILES.augGrimoireIce]
    ]
  }
];

// Weapon Guide: the special augments of the three Orb kinds (the same pool for every weapon): [orb name, what it offers, [[augment, description], ...]]
const ORB_GUIDE = [
  [
    'Orb of Power', 'augments that increase your damage',
    [
      ['Sharpen', 'Multiplies your current damage by ' + C.sharpenMult + '.'],
      ['MultiWield', '+1 afterimage per level. Every attack leaves afterimages of you behind; each one repeats the attack from its own spot ' + C.multiwieldDelay + 's later (each level adds another one) for ' + pc(C.multiwieldDmg) + '% of your damage.'],
      ['Haste', 'Attack speed +' + pc(C.spellcaster) + '% per level for your shots, slashes and turrets.'],
      ['Swirl', 'Every ' + C.swirlEvery + 'th attack throws a spinning sword, hovers, then returns, hitting enemies in its radius every ' + C.swirlTick + 's. Hovers ' + C.swirlStayPerLvl + 's, +' + C.swirlStayPerLvl + 's per level. Radius is ' + pc(C.swirlRad) + '% of the base sword range. It flies out a distance based on your weapon\'s range: ' + C.swirlDist + 'x the Sword\'s range, or ' + pc(C.swirlDistRanged) + '% of the attack range for the Bow and Grimoire.'],
      ['Bleed', 'Hits cause bleed until death: ' + pc(C.bleedPerLvl) + '% of damage dealt per level, every ' + C.bleedTick + 's. Bleeding enemies also explode on death for ' + pc(C.bleedBoomDmg) + '% damage (+' + pc(C.bleedBoomPerLvl) + '% per level).']
    ]
  ],
  [
    'Orb of Perseverance', 'augments that increase your defenses',
    [
      ['Harden', 'Gain +' + C.hardenArmor + ' armor per level, then increase your total armor by ' + pc(C.hardenPerLvl) + '% per level (added together).'],
      ['Shield +1', 'Blocks 1 hit. +1 charge regained per ' + C.shieldKills + ' kills. Max charges +1 per level.'],
      ['Dance with Death', 'Damage you take becomes damage over time, split into ' + C.ddTicksPerLvl + ' ticks per level (one tick every ' + C.dwdTick + 's).'],
      ['Lifesteal +' + pc(C.killHeal) + '% on kill', 'Killing an enemy heals ' + pc(C.killHeal) + '% of its max health per level. Excess healing becomes a burst laser (damage = the excess).'],
      ['Regeneration +' + pc(C.regenPct) + '%', 'Regenerate ' + pc(C.regenPct) + '% of your max health per second, per level.'],
      ['Health Siphon', 'Drains all enemies in your weapon\'s range (the Sword\'s reach, or the Bow / Grimoire attack range) for ' + pc(C.siphonDmg) + '% of your damage at your attack speed. Red tethers link you to every drained enemy and carry the HP back to you. Drain damage +' + pc(C.siphonPerLvl) + '% per level. Excess healing becomes a burst laser.']
    ]
  ],
  [
    'Orb of Practice', 'utility: chance-based triggers, move speed and more',
    [
      ['Move Speed +' + pc(C.moveSpeedPerLvl) + '%', '+' + pc(C.moveSpeedPerLvl) + '% movement speed per level.'],
      ['Magnet', 'EXP pickup range +' + pc(C.magnetPerLvl) + '% per level.'],
      ['Homing Explosive Knives', 'Hits have a +' + pc(C.missileChance) + '% chance per level (max ' + C.missileMaxLvl + ' levels) to launch a homing explosive knife that explodes for ' + pc(C.missileDmg) + '% damage.'],
      ['Death Explosion', pc(C.deathBoomChance) + '% chance per level for enemies to explode on death for ' + pc(C.deathBoomDmg) + '% damage (+' + pc(C.deathBoomDmgPerLvl) + '% per level).'],
      ['Thunder Strike', '+' + pc(C.thunderChance) + '% chance per level (max ' + C.thunderMaxLvl + ' levels) on hit to call lightning from above (AOE, ' + pc(C.thunderDmg) + '% damage).'],
      ['Soul Vortex', 'Killing an enemy has a ' + pc(C.vortexChance) + '% chance per level to pull all enemies towards you.'],
      ['Dash', 'Auto-dash while moving, damaging enemies you pass through. Cooldown shrinks with each level.']
    ]
  ]
];

// Weapon Guide screen. `from` = "pause" or "menu" decides where Back returns to.
function weaponGuide(from) {
  const o = $('ov');
  o.style.display = 'flex';
  const sec = (h, a) => '<div style="font-size:15px;color:#9be15d;margin:10px 0 4px;letter-spacing:.5px">' + h + '</div>' + a.map(x => '<div class="opt' + (x[2] ? ' aug' : '') + '" style="border-color:#fff4;padding:10px 14px;cursor:default;margin-bottom:6px">' + (x[2] ? '<img class="aicon" src="' + x[2] + '" alt=""><div>' : '') + '<b style="color:#fff">' + x[0] + '</b><span style="display:block;font-size:14px;opacity:.85;margin-top:2px">' + x[1] + '</span>' + (x[2] ? '</div>' : '') + '</div>').join('');
  o.innerHTML = '<h1>Weapon Guide</h1><div style="flex:1;min-height:0;overflow-y:auto;width:100%;max-width:520px;margin:0 auto">' + WG.map(w => '<div style="margin-bottom:18px"><div style="font-size:26px;color:var(--gold)">' + TY[w.t].i + ' ' + TY[w.t].n + '</div><div style="font-size:15px;opacity:.85;margin-bottom:2px">' + w.d + '</div>' + sec('BASIC AUGMENTS (every level)', w.b) + '</div>').join('') + '<div style="margin-bottom:18px"><div style="font-size:26px;color:var(--gold)">🔮 Orbs</div><div style="font-size:15px;opacity:.85;margin-bottom:2px">Special augments come from Orbs (first one ' + C.orbCost + ' Essence, +' + C.orbCostStep + ' more after every Orb you open). All weapons share the same pool; each kind of Orb only offers its own type of augment.</div>' + ORB_GUIDE.map(k => sec(k[0].toUpperCase() + ' · ' + k[1], k[2])).join('') + '</div>' + '</div><button class="opt" id="wgb" style="border-color:#fff8;max-width:520px;width:100%;margin:0 auto;text-align:center"><b style="color:#fff">Back</b></button>';
  $('wgb').onclick = () => {
    if (from === 'pause') {
      S.state = 'play';
      pause();
    }
    else
      menu();
  };
}

// Enemy Guide screen: what every enemy does, with its numbers read from config.js (so edited values show up). `from` = "pause" or "menu" decides where Back returns to.
function enemyGuide(from) {
  const o = $('ov');
  o.style.display = 'flex';
  const row = (a, b) => '<div class="opt" style="border-color:#fff4;padding:10px 14px;cursor:default;margin-bottom:6px"><b style="color:#fff">' + a + '</b><span style="display:block;font-size:14px;opacity:.85;margin-top:2px">' + b + '</span></div>';
  const head = (icon, name, text) => '<div style="display:flex;align-items:center;gap:10px;margin:16px 0 8px"><img class="aicon" src="' + icon + '" alt=""><div><div style="font-size:26px;color:var(--gold)">' + name + '</div><div style="font-size:15px;opacity:.85">' + text + '</div></div></div>';
  const sec = h => '<div style="font-size:15px;color:#9be15d;margin:16px 0 4px;letter-spacing:.5px">' + h + '</div>';
  const sp = pc(C.eSpeedStep);
  const html =
    sec('ALL ENEMIES GROW STRONGER') +
    row('Level scaling', 'Every level you gain, enemies get +' + C.eHpLvl + ' HP and +' + C.eDmgLvl + ' damage. Every ' + C.eSpeedEvery + ' levels they also move +' + sp + '% faster. Every 50 levels their HP and damage double.') +
    row('How many', 'Up to ' + C.capBase + ' enemies at once, +' + C.capPerLvl + ' for every level you gain. They walk in from just outside the screen and push each other apart so they do not stack.') +
    head(IMAGE_FILES.guideZombie, 'Restless (Blue)', 'The basic enemy. Walks straight at you, then stops and swings at you.') +
    row('Health', C.eHp + ' (+' + C.eHpLvl + ' per level)') +
    row('Damage', C.eDmg + ' (+' + C.eDmgLvl + ' per level). Touching it is harmless: it only hurts you with its attack, once per swing.') +
    row('Attack', 'Starts within ' + C.eAtkRange + ' px of you and cannot move until the swing is over (' + C.eAtkT + 's). The hit lands ' + pc(C.eAtkHit) + '% of the way in, so you can step away in time. Waits ' + C.eAtkCd + 's before the next one.') +
    row('Speed', C.eSpeed + ' (+' + sp + '% every ' + C.eSpeedEvery + ' levels)') +
    head(IMAGE_FILES.guideRanger, 'Purple Restless', 'Casts bolts from a distance.') +
    row('Appears', 'From level ' + C.rangerFrom + ' on. ' + pc(C.rangerChance) + '% of new Restless are purple.') +
    row('Attack', 'Casts a bolt every ' + C.rangerCd + 's when you are within ' + C.rangerRange + ' px. It stands still while casting (' + C.eCastT + 's). The bolt does the same damage as a Restless swing and flies at ' + C.eBulletSpeed + ' px/s.') +
    row('Behaviour', 'Backs away when you get close and keeps its distance, so you have to chase it down. Same health and speed as a Blue Restless.') +
    head(IMAGE_FILES.guideGiant, 'Giant Zombie (Boss)', 'A boss that arrives every ' + C.bossEvery + ' levels.') +
    row('Arrival', 'All other enemies are cleared, then a ' + C.bossWarn + ' second warning counts down before it arrives.') +
    row('Health and damage', C.bossHp + 'x the health of a Restless at your level and ' + C.bossDmg + 'x its damage. It walks at 60% of Restless speed.') +
    row('Charge', 'Winds up for ' + C.bossWind + 's, then dashes ' + C.bossDashLen + ' px in a straight line. It hits you once if it catches you.') +
    row('Jump Slam', 'Winds up for ' + C.bossWind + 's, then leaps to where you stood. The landing shockwave (radius ' + C.bossJumpR + ' px) hurts everything inside it.') +
    row('After an attack', 'Rests for ' + C.bossRest + 's, and attacks at most every ' + C.bossGap + 's. Bosses cannot be pulled by Soul Vortex. Defeating one drops a shower of XP gems.') +
    (C.dayNight && C.dayNightFx ?
      sec('DAY AND NIGHT') +
      row('🌙 Night', (C.eJumpOn ? 'Purple Restless and the boss move ' : 'Enemies move ') + pc(C.nightSpeed) + '% faster and all enemies deal ' + pc(C.nightDmg) + '% more damage.' + (C.eJumpOn ? ' Blue Restless do not speed up: they leap at you from ' + C.eJumpMin + '-' + C.eJumpMax + ' px away: a red ring shows where they land, and the shockwave (radius ' + C.eJumpR + ' px) hits for ' + C.eJumpDmg + 'x damage.' : '')) +
      row('☀️ Day', 'Enemies take ' + pc(C.dayVuln) + '% more damage from everything you do. A full day lasts ' + C.dayLen + ' seconds.') : '');
  o.innerHTML = '<h1>Enemy Guide</h1><div style="flex:1;min-height:0;overflow-y:auto;width:100%;max-width:520px;margin:0 auto">' + html + '</div><button class="opt" id="egb" style="border-color:#fff8;max-width:520px;width:100%;margin:0 auto;text-align:center"><b style="color:#fff">Back</b></button>';
  $('egb').onclick = () => {
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
  // Full-screen art with the title and buttons on top (styles: .menu-card, .mbtn ... in css/style.css)
  o.innerHTML = '<div class="menu-card">' +
    '<span class="mver">v' + GAME_VERSION + '</span>' +
    '<h1 class="mtitle">Limbo</h1>' +
    '<p class="msub">Oblivion Survivor</p>' +
    '<button class="mbtn play" id="pl">Play</button>' +
    '<button class="mbtn" id="inv">Inventory</button>' +
    '<div class="mrow"><button class="mbtn" id="wg">Weapon Guide</button><button class="mbtn" id="eg">Enemy Guide</button></div>' +
    '<div class="mrow"><button class="mbtn" id="fb">Feedback</button><button class="mbtn" id="st">Settings</button></div>' +
    '<button class="mbtn quit" id="quitBtn">Quit</button>' +
    '<p class="minfo">Best: Lv ' + best.lvl + ' · ' + best.kills + ' kills · ' + RAR[PD.eq.r].n + ' ' + TY[PD.eq.t].n + (PD.chests ? ' · 🎁 ' + PD.chests : '') + (PD.coins ? ' · ' + ESS + ' ' + PD.coins : '') + '</p>' +
    '</div>';
  $('wg').onclick = () => weaponGuide('menu');
  $('eg').onclick = () => enemyGuide('menu');
  $('fb').onclick = () => feedbackScreen('menu');
  $('pl').onclick = () => {
    ac();
    init();
  };
  $('inv').onclick = inventory;
  $('st').onclick = () => settings('menu');
  $('quitBtn').onclick = quitGame;
}

// Quit button. A browser only lets a page close itself when a script opened it, so if the tab is still here
// a moment later we show a goodbye screen instead. (In a packaged app, call the app's exit function here.)
function quitGame() {
  stopMusic();
  window.close();
  setTimeout(() => {
    $('ov').innerHTML = '<h1>Thanks for playing!</h1><p>You can close this tab now.</p><button class="opt" id="quitBack"><b>Back to menu</b></button>';
    $('quitBack').onclick = menu;
  }, 150);
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
