// ======================================================================
// AUGMENTS, LEVEL UP & GAME OVER
// Special augment tables for Rogue / Sword, picking augments, level-up screen and game over.
// ======================================================================

// SP = Rogue special augments (every 10th level): [key, name, text-function, oneTimeOnly].
const SP = [
  [
    'nmi', 'Homing Explosive Knives',
    () => 'Rogue hits have a chance to launch 1 homing explosive knife (explodes for ' + pc(C.missileDmg) + '% damage) · chance ' + pcl(C.missileChance, S.nmi) + '% → ' + pcl(C.missileChance, S.nmi + 1) + '%'
  ],
  [
    'ls', 'Lifesteal +' + pc(C.killHeal) + '% on kill',
    () => 'Killing an enemy heals ' + pcn(C.killHeal, S.ls) + '% → ' + pcn(C.killHeal, S.ls + 1) + '% of its max health · every instance of excess healing becomes a homing knife (damage = the excess)'
  ],
  ['ns', 'Shield +1', () => 'Blocks 1 hit, +1 charge per ' + C.shieldKills + ' kills · max ' + S.ns + ' → ' + (S.ns + 1)],
  ['nsp', 'Move Speed +' + pc(C.moveSpeedPerLvl) + '%', () => '+' + pcn(C.moveSpeedPerLvl, S.nsp) + '% → +' + pcn(C.moveSpeedPerLvl, S.nsp + 1) + '%'],
  ['nd', 'Death Explosion', () => pcl(C.deathBoomChance, S.nd + 1) + '% chance enemies explode for ' + pc(C.deathBoomDmg + C.deathBoomDmgPerLvl * S.nd) + '% damage'],
  ['nxp', 'Magnet', () => 'EXP pickup range +' + pcn(C.magnetPerLvl, S.nxp) + '% → +' + pcn(C.magnetPerLvl, S.nxp + 1) + '%']
];

// SW = Sword special augments.
const SW = [
  [
    'ndd', 'Dance with Death',
    () => 'Damage you take becomes damage over time, split into ' + (S.ndd ? C.ddTicksPerLvl * S.ndd + ' → ' : '') + C.ddTicksPerLvl * (S.ndd + 1) + ' ticks (every ' + C.dwdTick + 's)'
  ],
  [
    'nds', 'Slash Dash',
    () => 'Auto-dash while moving: every ' + (S.nds ? cdOf(S.nds).toFixed(1) + 's → ' : '') + cdOf(S.nds + 1).toFixed(1) + 's'
  ],
  [
    'swl', 'Swirl',
    () => S.swl ? 'Hover duration +' + C.swirlStayPerLvl + 's (' + S.swl * C.swirlStayPerLvl + 's → ' + (S.swl + 1) * C.swirlStayPerLvl + 's) · every ' + C.swirlEvery + 'th attack throws a spinning sword that flies out a fixed distance, hovers, then returns · radius: ' + pc(C.swirlRad) + '% of Sword Range (' + Math.round(C.swirlRad * C.swordR * (1 + C.swordRangePerLvl * S.sr)) + ')' : 'Every ' + C.swirlEvery + 'th attack throws a spinning sword that flies out a fixed distance, hovers for ' + C.swirlStayPerLvl + 's, then returns · radius: ' + pc(C.swirlRad) + '% of Sword Range (' + Math.round(C.swirlRad * C.swordR * (1 + C.swordRangePerLvl * S.sr)) + ')'
  ],
  [
    'nbl', 'Bleed',
    () => 'Slashes cause bleed until death: ' + pcn(C.bleedPerLvl, S.nbl + 1) + '% of damage dealt every ' + C.bleedTick + 's · bleeding enemies also explode on death for ' + (S.nbl ? pc(C.bleedBoomDmg + C.bleedBoomPerLvl * (S.nbl - 1)) + '% → ' + pc(C.bleedBoomDmg + C.bleedBoomPerLvl * S.nbl) : pc(C.bleedBoomDmg)) + '% damage (+' + pc(C.bleedBoomPerLvl) + '% per level)'
  ],
  ['nxp', 'Magnet', () => 'EXP pickup range +' + pcn(C.magnetPerLvl, S.nxp) + '% → +' + pcn(C.magnetPerLvl, S.nxp + 1) + '%'],
  [
    'ls', 'Regeneration +' + pc(C.regenPct) + '%',
    () => 'Regenerate ' + pcn(C.regenPct, S.ls) + '% → ' + pcn(C.regenPct, S.ls + 1) + '% of your max health per second'
  ],
  ['nps', 'Slash Push', () => 'Push ' + pcn(C.pushPerLvl, S.nps) + '% → ' + pcn(C.pushPerLvl, S.nps + 1) + '%'],
  ['ns', 'Shield +1', () => 'Blocks 1 hit, +1 charge per ' + C.shieldKills + ' kills · max ' + S.ns + ' → ' + (S.ns + 1)]
];

// Builds the three basic augment buttons offered to a Sword player.
function swordOpts() {
  return [
    S.nr >= C.overloadLvl ? ['nr', 'Attack Speed Overload', 'Resets to 1.0 slashes per second · current damage ×' + nextDm() + ' (' + dmg() + ' → ' + nat() * nextDm() + ')', IMAGE_FILES.augSwordSpeed] : ['nr', 'Attack Speed +' + pc(C.rateAug) + '%', 'Level ' + (S.nr + 1) + '/' + C.overloadLvl + ' · ' + rate().toFixed(1) + ' → ' + (rate() + C.fireRate * C.rateAug).toFixed(1) + ' slashes per second', IMAGE_FILES.augSwordSpeed],
    ['hpb', '+' + 100 * C.hpAug + '% Health Points', 'Max HP +' + 100 * C.hpAug * S.hpb + '% → +' + 100 * C.hpAug * (S.hpb + 1) + '% (' + maxHp() + ' → ' + Math.round((C.baseHp + C.hpLvl * (S.lvl - 1)) * (1 + C.hpAug * (S.hpb + 1))) + ')', IMAGE_FILES.augSwordHealth],
    ['sr', 'Sword Range +' + pc(C.swordRangePerLvl) + '%', 'Range +' + pcn(C.swordRangePerLvl, S.sr) + '% → +' + pcn(C.swordRangePerLvl, S.sr + 1) + '%', IMAGE_FILES.augSwordRange]
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

// Picks 3 random special augments for this weapon (skipping capped / one-time ones already owned) and returns their buttons.
function specialHtml() {
  return shuf((S.wp === 'sword' ? SW : S.wp === 'grimoire' ? SG : SP).filter(a => !(a[3] && S[a[0]]) && !(a[0] === 'nmi' && S.nmi >= C.missileMaxLvl) && !(a[0] === 'nts' && S.nts >= C.thunderMaxLvl) && !(a[0] === 'nds' && !C.dashOn))).slice(0, 3).map(a => '<button class="opt" data-k="' + a[0] + '"><b>' + a[1] + '</b><span>' + a[2]() + '</span></button>').join('');
}

// Level 5 is the cap for Multi Knives (Rogue) and Attack Speed (sword): the next pick resets it and makes your CURRENT damage x5, then x10, then x15 (additive steps, not compounding). It is a one-time bonus. Player damage no longer scales with level (dmgLvl = 0).
function overload() {
  S.dk = (S.dk || 0) + 1;
  S.db = nat() * (C.overloadStep * S.dk - 1);
}

// Applies the chosen augment key k to the run state S.
function pickAug(k) {
  if (k === 'nm' && S.nm >= C.overloadLvl) {
    S.nm = 0;
    overload();
  }
  else if (k === 'nr' && S.wp === 'sword' && S.nr >= C.overloadLvl) {
    S.nr = 0;
    overload();
  }
  else if (k === 'ne') {
    S.ne++;
    S.db = dmg() * C.gmEnlight - nat();      // C.gmEnlight (config.js) = the damage multiplier of Enlightenment
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
      ['nr', 'Fire Rate +' + pc(C.rateAug) + '%', r.toFixed(1) + ' → ' + (r + C.fireRate * C.rateAug).toFixed(1) + ' shots per second', IMAGE_FILES.augRogueRate],
      S.nm >= C.overloadLvl ? ['nm', 'Multi Knives Overload', 'Resets to 1 knife · current damage ×' + nextDm() + ' (' + dmg() + ' → ' + nat() * nextDm() + ')', IMAGE_FILES.augRogueMulti] : ['nm', '+1 Multi Knives', 'Level ' + (S.nm + 1) + '/' + C.overloadLvl + ' · ' + shots() + ' → ' + (shots() + 1) + ' knives per throw', IMAGE_FILES.augRogueMulti],
      ['nb', '+1 Knife Bounce', S.nb + ' → ' + (S.nb + 1) + ' bounces on hit', IMAGE_FILES.augRogueBounce]
    ].map(a => '<button class="opt aug" data-k="' + a[0] + '"><img class="aicon" src="' + a[3] + '" alt=""><div><b>' + a[1] + '</b><span>' + a[2] + '</span></div></button>').join('');
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
