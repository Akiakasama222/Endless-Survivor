// ======================================================================
// AUGMENTS, LEVEL UP & GAME OVER
// Special augment tables for Staff / Sword, picking augments, level-up screen and game over.
// ======================================================================

// SP = Staff special augments (every 10th level): [key, name, text-function, oneTimeOnly].
const SP = [
  [
    'nmi', 'Arcane Missile',
    () => 'Staff hits have a chance to launch 1 arcane missile (explodes for 100% damage) · chance ' + Math.min(100, 10 * S.nmi) + '% → ' + Math.min(100, 10 * (S.nmi + 1)) + '%'
  ],
  [
    'ls', 'Lifesteal +10%',
    () => 'Heal ' + 10 * S.ls + '% → ' + 10 * (S.ls + 1) + '% of damage dealt · every instance of excess healing becomes a homing projectile (damage = the excess)'
  ],
  ['ns', 'Shield +1', () => 'Blocks 1 hit, +1 charge per 10 kills · max ' + S.ns + ' → ' + (S.ns + 1)],
  ['nsp', 'Move Speed +50%', () => '+' + 50 * S.nsp + '% → +' + 50 * (S.nsp + 1) + '%'],
  ['nd', 'Death Explosion', () => 10 * (S.nd + 1) + '% chance enemies explode for ' + (200 + 50 * S.nd) + '% damage'],
  ['nxp', 'Magnet', () => 'EXP pickup range +' + 100 * S.nxp + '% → +' + 100 * (S.nxp + 1) + '%']
];

// SW = Sword special augments.
const SW = [
  [
    'ndd', 'Dance with Death',
    () => 'Damage you take becomes damage over time, split into ' + (S.ndd ? 2 * S.ndd + ' → ' : '') + 2 * (S.ndd + 1) + ' ticks (every ' + C.dwdTick + 's)'
  ],
  [
    'nds', 'Slash Dash',
    () => 'Auto-dash while moving: every ' + (S.nds ? cdOf(S.nds).toFixed(1) + 's → ' : '') + cdOf(S.nds + 1).toFixed(1) + 's'
  ],
  [
    'swl', 'Swirl',
    () => S.swl ? 'Hover duration +1s (' + S.swl + 's → ' + (S.swl + 1) + 's) · every 3rd attack throws a spinning sword that flies out a fixed distance, hovers, then returns · radius: 50% of Sword Range (' + Math.round(.5 * C.swordR * (1 + .5 * S.sr)) + ')' : 'Every 3rd attack throws a spinning sword that flies out a fixed distance, hovers for 1s, then returns · radius: 50% of Sword Range (' + Math.round(.5 * C.swordR * (1 + .5 * S.sr)) + ')'
  ],
  [
    'nbl', 'Bleed',
    () => 'Slashes cause bleed until death: ' + (S.nbl + 1) + '% of damage dealt every ' + C.bleedTick + 's · bleeding enemies also explode on death for ' + (S.nbl ? (100 + 10 * (S.nbl - 1)) + '% → ' + (100 + 10 * S.nbl) : '100') + '% damage (+10% per level)'
  ],
  ['nxp', 'Magnet', () => 'EXP pickup range +' + 100 * S.nxp + '% → +' + 100 * (S.nxp + 1) + '%'],
  [
    'ls', 'Lifesteal +10%',
    () => 'Heal ' + 10 * S.ls + '% → ' + 10 * (S.ls + 1) + '% of damage dealt · every instance of excess healing becomes a homing projectile (damage = the excess)'
  ],
  ['nps', 'Slash Push', () => 'Push ' + 10 * S.nps + '% → ' + 10 * (S.nps + 1) + '%'],
  ['ns', 'Shield +1', () => 'Blocks 1 hit, +1 charge per 10 kills · max ' + S.ns + ' → ' + (S.ns + 1)]
];

// Builds the three basic augment buttons offered to a Sword player.
function swordOpts() {
  return [
    S.nr >= 5 ? ['nr', 'Attack Speed Overload', 'Resets to 1.0 slashes per second · current damage ×' + nextDm() + ' (' + dmg() + ' → ' + nat() * nextDm() + ')'] : ['nr', 'Attack Speed +50%', 'Level ' + (S.nr + 1) + '/5 · ' + rate().toFixed(1) + ' → ' + (rate() + C.fireRate * .5).toFixed(1) + ' slashes per second'],
    ['hpb', '+' + 100 * C.hpAug + '% Health Points', 'Max HP +' + 100 * C.hpAug * S.hpb + '% → +' + 100 * C.hpAug * (S.hpb + 1) + '% (' + maxHp() + ' → ' + Math.round((C.baseHp + C.hpLvl * (S.lvl - 1)) * (1 + C.hpAug * (S.hpb + 1))) + ')'],
    ['sr', 'Sword Range +50%', 'Range +' + 50 * S.sr + '% → +' + 50 * (S.sr + 1) + '%']
  ].map(a => '<button class="opt" data-k="' + a[0] + '"><b>' + a[1] + '</b><span>' + a[2] + '</span></button>').join('');
}

// Fisher-Yates: every augment has an equal chance (the old sort(()=>Math.random()-.5) shuffle is biased against later entries)
function shuf(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Picks 3 random special augments for this weapon (skipping capped / one-time ones already owned) and returns their buttons.
function specialHtml() {
  return shuf((S.wp === 'sword' ? SW : S.wp === 'grimoire' ? SG : SP).filter(a => !(a[3] && S[a[0]]) && !(a[0] === 'nmi' && S.nmi >= 10) && !(a[0] === 'nts' && S.nts >= 10) && !(a[0] === 'nds' && !C.dashOn))).slice(0, 3).map(a => '<button class="opt" data-k="' + a[0] + '"><b>' + a[1] + '</b><span>' + a[2]() + '</span></button>').join('');
}

// Level 5 is the cap for Multishot (gun) and Attack Speed (sword): the next pick resets it and makes your CURRENT damage x5, then x10, then x15 (additive steps, not compounding). It is a one-time bonus. Player damage no longer scales with level (dmgLvl = 0).
function overload() {
  S.dk = (S.dk || 0) + 1;
  S.db = nat() * (5 * S.dk - 1);
}

// Applies the chosen augment key k to the run state S.
function pickAug(k) {
  if (k === 'nm' && S.nm >= 5) {
    S.nm = 0;
    overload();
  }
  else if (k === 'nr' && S.wp === 'sword' && S.nr >= 5) {
    S.nr = 0;
    overload();
  }
  else if (k === 'ne') {
    S.ne++;
    S.db = dmg() * 5 - nat();
  }
  else {
    S[k]++;
    if (k === 'ns' && S.wp === 'grimoire')
      S.sh = Math.min(S.ns, S.sh + 1);
  }
}

// Level-up: gives chests / starts bosses on milestone levels, restores health and shows the augment choice screen.
function levelUp() {
  S.lvl++;
  if (S.lvl % C.chestLvl === 0 && !S.dev) {
    PD.chests++;
    savePD();
    S.chestGot = (S.chestGot || 0) + 1;
  }
  if (S.lvl % C.bossEvery === 0 && !(S.cu && S.lvl < S.cu))
    startBoss();
  S.xp -= need() - C.xpLvl;
  S.hp = maxHp();
  S.state = 'pick';
  sfx('level');
  const r = rate();
  const o = $('ov');
  const sp = S.lvl % 10 === 0;
  o.style.display = 'flex';
  const opts = S.wp === 'sword' ? swordOpts() : S.wp === 'grimoire' ? grimoireOpts() :
    [
      ['nr', 'Fire Rate +50%', r.toFixed(1) + ' → ' + (r + C.fireRate * C.rateAug).toFixed(1) + ' shots per second'],
      S.nm >= 5 ? ['nm', 'Multishot Overload', 'Resets to 1 projectile · current damage ×' + nextDm() + ' (' + dmg() + ' → ' + nat() * nextDm() + ')'] : ['nm', '+1 Multishot', 'Level ' + (S.nm + 1) + '/5 · ' + shots() + ' → ' + (shots() + 1) + ' projectiles per shot'],
      ['nb', '+1 Projectile Bounce', S.nb + ' → ' + (S.nb + 1) + ' bounces on hit']
    ].map(a => '<button class="opt" data-k="' + a[0] + '"><b>' + a[1] + '</b><span>' + a[2] + '</span></button>').join('');
  o.innerHTML = '<h1>Level ' + S.lvl + (sp ? ' · Special' : '') + '</h1><p>Choose ' + (sp ? 'a special ' : 'an ') + 'augment</p>' + (S.lvl % C.chestLvl === 0 && !S.dev ? '<p style="color:#ffc94a">🎁 You earned a chest! Open it from the Inventory.</p>' : '') + (sp ? specialHtml() : opts);
  o.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    sfx('click');
    const m0 = maxHp();
    pickAug(b.dataset.k);
    if (b.dataset.k === 'hpb')
      S.hp += maxHp() - m0;
    o.style.display = 'none';
    S.state = 'play';
    joy = null;
    last = performance.now();
    hud(1);
  });
}

// Game over screen: shows the summary and records, with Retry and Main Menu buttons.
function over() {
  endRun();
  $('warn').style.display = 'none';
  $('bb').style.display = 'none';
  stopMusic();
  $('pb').style.display = 'none';
  S.state = 'over';
  sfx('over');
  const nl = !S.dev && S.lvl > best.lvl;
  const nk = !S.dev && S.kills > best.kills;
  saveBest();
  const o = $('ov');
  o.style.display = 'flex';
  o.innerHTML = '<h1>You fell</h1><p>Survived ' + mmss(S.t) + '</p>' + (S.chestGot ? '<p style="color:#ffc94a">🎁 ' + S.chestGot + (S.chestGot > 1 ? ' chests' : ' chest') + ' earned this run!</p>' : '') + '<p>Level ' + S.lvl + (nl ? ' · New best!' : '') + '</p><p>' + S.kills + ' kills' + (nk ? ' · New best!' : '') + '</p><p style="opacity:.75">Highest level ' + best.lvl + ' · Highest kills ' + best.kills + '</p><button class="opt" id="rs"><b>Play again</b><span>Start a new run</span></button><button class="opt" id="mm" style="border-color:#fff8"><b style="color:#fff">Main menu</b></button>';
  $('rs').onclick = init;
  $('mm').onclick = menu;
}
