// ======================================================================
// AUGMENTS, LEVEL UP & GAME OVER
// Special augment tables for Rogue / Sword, picking augments, level-up screen and game over.
// ======================================================================

// ORB_POOL = the special augments offered by Orbs (orbs.js). Knife, Sword and Grimoire all share this one pool.
// There are three kinds of Orb and each one only offers augments of its own kind:
//   power        (Orb of Power)        augments that increase your damage
//   perseverance (Orb of Perseverance) augments that increase your defenses
//   practice     (Orb of Practice)     utility: augments that trigger by chance, move speed, pickup range ...
// An entry is [key, name, text-function, oneTimeOnly].
const ORB_POOL = {
  power: [
    ['nsh', 'Sharpen', () => 'Multiply your current damage by ' + C.sharpenMult + ' (' + dmg() + ' → ' + dmg() * C.sharpenMult + ')'],
    [
      'nmw', 'MultiWield',
      () => '+1 afterimage that repeats each attack from where you stood, ' + C.multiwieldDelay + 's later, for ' + pc(C.multiwieldDmg) + '% of your damage · afterimages ' + S.nmw + ' → ' + (S.nmw + 1)
    ],
    [
      'nsc', 'Haste',
      () => 'Attack speed +' + pc(C.spellcaster) + '% (shots, slashes and turrets) · ' + rate().toFixed(1) + ' → ' + (rate() + C.fireRate * C.spellcaster).toFixed(1) + ' per second'
    ],
    [
      'swl', 'Swirl',
      () => (S.swl ? 'Hover duration +' + C.swirlStayPerLvl + 's (' + S.swl * C.swirlStayPerLvl + 's → ' + (S.swl + 1) * C.swirlStayPerLvl + 's) · ' : '') + 'Every ' + C.swirlEvery + 'th attack throws a spinning sword that flies out a distance based on your weapon\'s range, hovers' + (S.swl ? '' : ' for ' + C.swirlStayPerLvl + 's') + ', then returns · radius ' + Math.round(C.swirlRad * C.swordR * (1 + C.swordRangePerLvl * S.sr))
    ],
    [
      'nbl', 'Bleed',
      () => 'Hits cause bleed until death: ' + pcn(C.bleedPerLvl, S.nbl + 1) + '% of damage dealt every ' + C.bleedTick + 's · bleeding enemies also explode on death for ' + (S.nbl ? pc(C.bleedBoomDmg + C.bleedBoomPerLvl * (S.nbl - 1)) + '% → ' + pc(C.bleedBoomDmg + C.bleedBoomPerLvl * S.nbl) : pc(C.bleedBoomDmg)) + '% damage (+' + pc(C.bleedBoomPerLvl) + '% per level)'
    ]
  ],
  perseverance: [
    [
      'nhd', 'Harden',
      () => 'Gain +' + C.hardenArmor + ' armor, then increase your total armor by ' + pc(C.hardenPerLvl) + '% per level, added together (+' + pcn(C.hardenPerLvl, S.nhd) + '% → +' + pcn(C.hardenPerLvl, S.nhd + 1) + '%) · armor ' + armor() + ' → ' + armorAt(S.na, S.nhd + 1)
    ],
    ['ns', 'Shield +1', () => 'Blocks 1 hit, +1 charge per ' + C.shieldKills + ' kills · max ' + S.ns + ' → ' + (S.ns + 1)],
    [
      'ndd', 'Dance with Death',
      () => 'Damage you take becomes damage over time, split into ' + (S.ndd ? C.ddTicksPerLvl * S.ndd + ' → ' : '') + C.ddTicksPerLvl * (S.ndd + 1) + ' ticks (every ' + C.dwdTick + 's)'
    ],
    [
      'ls', 'Lifesteal +' + pc(C.killHeal) + '% on kill',
      () => 'Killing an enemy heals ' + pcn(C.killHeal, S.ls) + '% → ' + pcn(C.killHeal, S.ls + 1) + '% of its max health · every instance of excess healing becomes a burst laser (damage = the excess)'
    ],
    [
      'nrg', 'Regeneration +' + pc(C.regenPct) + '%',
      () => 'Regenerate ' + pcn(C.regenPct, S.nrg) + '% → ' + pcn(C.regenPct, S.nrg + 1) + '% of your max health per second'
    ],
    [
      'nhs', 'Health Siphon',
      () => S.nhs ? 'Drain damage +' + pc(C.siphonPerLvl) + '% per level (' + Math.round(100 * C.siphonDmg * gSip()) + '% → ' + Math.round(100 * C.siphonDmg * gSip(S.nhs + 1)) + '% of your damage) · drains enemies in your weapon\'s range ' + rate().toFixed(1) + 'x per second (attack speed) · excess healing becomes a burst laser' : 'Drains EVERY enemy in your weapon\'s range for ' + pc(C.siphonDmg) + '% of your damage at your attack speed · excess healing becomes a burst laser (damage = the excess)'
    ]
  ],
  practice: [
    ['nsp', 'Move Speed +' + pc(C.moveSpeedPerLvl) + '%', () => '+' + pcn(C.moveSpeedPerLvl, S.nsp) + '% → +' + pcn(C.moveSpeedPerLvl, S.nsp + 1) + '%'],
    ['nxp', 'Magnet', () => 'EXP pickup range +' + pcn(C.magnetPerLvl, S.nxp) + '% → +' + pcn(C.magnetPerLvl, S.nxp + 1) + '%'],
    [
      'nmi', 'Homing Explosive Knives',
      () => 'Hits have a chance to launch 1 homing explosive knife (explodes for ' + pc(C.missileDmg) + '% damage) · chance ' + pcl(C.missileChance, S.nmi) + '% → ' + pcl(C.missileChance, S.nmi + 1) + '%'
    ],
    ['nd', 'Death Explosion', () => pcl(C.deathBoomChance, S.nd + 1) + '% chance enemies explode for ' + pc(C.deathBoomDmg + C.deathBoomDmgPerLvl * S.nd) + '% damage'],
    [
      'nts', 'Thunder Strike',
      () => pcl(C.thunderChance, S.nts) + '% → ' + pcl(C.thunderChance, S.nts + 1) + '% chance on hit to call lightning from above (AOE, ' + pc(C.thunderDmg) + '% damage)'
    ],
    ['nsv', 'Soul Vortex', () => 'Killing an enemy has a ' + pcl(C.vortexChance, S.nsv + 1) + '% chance' + (S.nsv ? ' (' + pcl(C.vortexChance, S.nsv) + '% → ' + pcl(C.vortexChance, S.nsv + 1) + '%)' : '') + ' to pull ALL enemies towards you'],
    [
      'nds', 'Dash',
      () => 'Auto-dash while moving, damaging enemies you pass through: every ' + (S.nds ? cdOf(S.nds).toFixed(1) + 's → ' : '') + cdOf(S.nds + 1).toFixed(1) + 's'
    ]
  ]
};

// Builds the three basic augment buttons offered to a Sword player.
function swordOpts() {
  return [
    ['nr', 'Attack Speed +' + pc(C.rateAug) + '%', rate().toFixed(1) + ' → ' + (rate() + C.fireRate * C.rateAug).toFixed(1) + ' slashes per second', IMAGE_FILES.augSwordSpeed],
    ['hpb', '+' + 100 * C.hpAug + '% Health Points', 'Max HP +' + 100 * C.hpAug * S.hpb + '% → +' + 100 * C.hpAug * (S.hpb + 1) + '% (' + maxHp() + ' → ' + Math.round((C.baseHp + C.hpLvl * (S.lvl - 1)) * (1 + C.hpAug * (S.hpb + 1))) + ')', IMAGE_FILES.augSwordHealth],
    ['na', 'Armor +' + C.armorPerLvl, 'Blocks ' + armor() + ' → ' + armorAt(S.na + 1, S.nhd) + ' damage from every hit you take (a hit always deals at least 1)', IMAGE_FILES.augSwordArmor]
  ].map(a => '<button class="opt aug" data-k="' + a[0] + '"><img class="aicon" src="' + a[3] + '" alt=""><div><b>' + a[1] + '</b><span>' + a[2] + '</span></div></button>').join('');
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

// Picks 3 random special augments of the given Orb kind ('power', 'perseverance' or 'practice'; skipping capped / one-time ones already owned) and returns their buttons. The pool is the same for every weapon. Used by the Orbs (orbs.js).
function specialHtml(kind) {
  return shuf((ORB_POOL[kind] || []).filter(a => !(a[3] && S[a[0]]) && !(a[0] === 'nmi' && S.nmi >= C.missileMaxLvl) && !(a[0] === 'nts' && S.nts >= C.thunderMaxLvl) && !(a[0] === 'nds' && !C.dashOn))).slice(0, C.orbChoices || 3).map(a => '<button class="opt" data-k="' + a[0] + '"><b>' + a[1] + '</b><span>' + a[2]() + '</span></button>').join('');
}

// Applies the chosen augment key k to the run state S.
function pickAug(k) {
  if (k === 'nsh') {
    S.nsh++;
    S.db = dmg() * C.sharpenMult - nat();    // Sharpen (Orb of Power): C.sharpenMult (config.js) = the damage multiplier
  }
  else {
    S[k]++;
    if (k === 'ns')      // a new Shield charge is ready at once (every weapon)
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
  if (S.hp < maxHp())
    healFx();
  S.hp = maxHp();
  S.state = 'pick';
  sfx('level');
  const r = rate();
  const o = $('ov');
  o.style.display = 'flex';
  const opts = S.wp === 'sword' ? swordOpts() : S.wp === 'grimoire' ? grimoireOpts() :
    [
      ['nr', 'Fire Rate +' + pc(C.rateAug) + '%', r.toFixed(1) + ' → ' + (r + C.fireRate * C.rateAug).toFixed(1) + ' shots per second', IMAGE_FILES.augRogueRate],
      ['nm', '+1 Multi Knives', shots() + ' → ' + (shots() + 1) + ' knives per throw', IMAGE_FILES.augRogueMulti],
      ['nb', '+1 Knife Bounce', S.nb + ' → ' + (S.nb + 1) + ' bounces on hit', IMAGE_FILES.augRogueBounce]
    ].map(a => '<button class="opt aug" data-k="' + a[0] + '"><img class="aicon" src="' + a[3] + '" alt=""><div><b>' + a[1] + '</b><span>' + a[2] + '</span></div></button>').join('');
  o.innerHTML = '<h1>Level ' + S.lvl + '</h1><p>Choose an augment</p>' + (S.lvl % C.chestLvl === 0 && !S.dev ? '<p style="color:#ffc94a">🎁 You earned a chest! Open it from the Inventory.</p>' : '') + opts;
  o.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    sfx('click');
    const m0 = maxHp();
    pickAug(b.dataset.k);
    if (b.dataset.k === 'hpb') {
      S.hp += maxHp() - m0;
      healFx();
    }
    o.style.display = 'none';
    S.state = 'play';
    S.lu.push({ t: LU_T });      // level-up effect around the player once the game continues
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
  o.innerHTML = '<h1>You fell</h1><p>Survived ' + mmss(S.t) + '</p>' + (S.chestGot ? '<p style="color:#ffc94a">🎁 ' + S.chestGot + (S.chestGot > 1 ? ' chests' : ' chest') + ' earned this run!</p>' : '') + '<p>Level ' + S.lvl + (nl ? ' · New best!' : '') + '</p><p>' + S.kills + ' kills' + (nk ? ' · New best!' : '') + '</p><p style="color:#ffd23f">' + ESS + ' ' + S.coins + ' Essence collected · ' + PD.coins + ' total</p><p style="opacity:.75">Highest level ' + best.lvl + ' · Highest kills ' + best.kills + '</p><button class="opt" id="rs"><b>Play again</b><span>Start a new run</span></button><button class="opt" id="mm" style="border-color:#fff8"><b style="color:#fff">Main menu</b></button>';
  $('rs').onclick = init;
  $('mm').onclick = menu;
}
