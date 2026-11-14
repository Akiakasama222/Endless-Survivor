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
    ['nsh', 'Sharpen', () => 'Damage x' + C.sharpenMult + ' (' + dmg() + ' → ' + dmg() * C.sharpenMult + ')'],
    ['nmw', 'MultiWield', () => '+1 afterimage that repeats your attacks · ' + S.nmw + ' → ' + (S.nmw + 1)],
    ['nm', 'Multi-Shot', () => '+1 extra projectile · ' + shots() + ' → ' + (shots() + 1) + ' per attack'],
    ['nsc', 'Haste', () => 'Attack speed +' + pc(C.spellcaster) + '% · ' + rate().toFixed(1) + ' → ' + (rate() + C.fireRate * C.spellcaster).toFixed(1) + ' per second'],
    [
      'swl', 'Swirl',
      () => S.swl ? 'Spinning sword hovers longer · ' + S.swl * C.swirlStayPerLvl + 's → ' + (S.swl + 1) * C.swirlStayPerLvl + 's' : 'Every ' + C.swirlEvery + 'th attack throws a spinning sword that hits enemies around it'
    ],
    ['nbl', 'Bleed', () => 'Hits make enemies bleed · ' + pcn(C.bleedPerLvl, S.nbl) + '% → ' + pcn(C.bleedPerLvl, S.nbl + 1) + '% damage per tick']
  ],
  perseverance: [
    ['nhd', 'Harden', () => 'Boosts your armor · ' + armor() + ' → ' + armorAt(S.na, S.nhd + 1)],
    ['ns', 'Shield +1', () => 'Blocks 1 hit, recharges on kills · max ' + S.ns + ' → ' + (S.ns + 1)],
    ['ndd', 'Dance with Death', () => 'Damage you take is spread over time · ' + C.ddTicksPerLvl * S.ndd + ' → ' + C.ddTicksPerLvl * (S.ndd + 1) + ' ticks'],
    ['ls', 'Lifesteal +' + pc(C.killHeal) + '% on kill', () => 'Heal on kill · ' + pcn(C.killHeal, S.ls) + '% → ' + pcn(C.killHeal, S.ls + 1) + '% of enemy max health'],
    ['nrg', 'Regeneration +' + pc(C.regenPct) + '%', () => 'Heal over time · ' + pcn(C.regenPct, S.nrg) + '% → ' + pcn(C.regenPct, S.nrg + 1) + '% max health per second'],
    [
      'nhs', 'Health Siphon',
      () => S.nhs ? 'Drain damage ' + Math.round(100 * C.siphonDmg * gSip()) + '% → ' + Math.round(100 * C.siphonDmg * gSip(S.nhs + 1)) + '% of your damage' : 'Drains every enemy in range and heals you'
    ]
  ],
  practice: [
    ['nsp', 'Move Speed +' + pc(C.moveSpeedPerLvl) + '%', () => '+' + pcn(C.moveSpeedPerLvl, S.nsp) + '% → +' + pcn(C.moveSpeedPerLvl, S.nsp + 1) + '%'],
    ['nxp', 'Magnet', () => 'EXP pickup range +' + pcn(C.magnetPerLvl, S.nxp) + '% → +' + pcn(C.magnetPerLvl, S.nxp + 1) + '%'],
    ['nmi', 'Homing Explosive Knives', () => 'Hits may launch an explosive knife · chance ' + pcl(C.missileChance, S.nmi) + '% → ' + pcl(C.missileChance, S.nmi + 1) + '%'],
    ['nd', 'Death Explosion', () => 'Enemies may explode on death · chance ' + pcl(C.deathBoomChance, S.nd) + '% → ' + pcl(C.deathBoomChance, S.nd + 1) + '%'],
    ['nts', 'Thunder Strike', () => 'Hits may call lightning · chance ' + pcl(C.thunderChance, S.nts) + '% → ' + pcl(C.thunderChance, S.nts + 1) + '%'],
    ['nsv', 'Soul Vortex', () => 'Kills may pull all enemies to you · chance ' + pcl(C.vortexChance, S.nsv) + '% → ' + pcl(C.vortexChance, S.nsv + 1) + '%'],
    ['nds', 'Dash', () => 'Auto-dash while moving, hitting enemies · every ' + (S.nds ? cdOf(S.nds).toFixed(1) + 's → ' : '') + cdOf(S.nds + 1).toFixed(1) + 's']
  ]
};

// Icon of every special augment, by key (Red = Orb of Power, Blue = Orb of Perseverance, Green = Orb of Practice). Shown on the Orb offer screen.
const ORB_ICON = {
  nsh: IMAGE_FILES.orbSharpen,
  nmw: IMAGE_FILES.orbMultiWield,
  nm: IMAGE_FILES.orbMultiShot,
  nsc: IMAGE_FILES.orbHaste,
  swl: IMAGE_FILES.orbSwirl,
  nbl: IMAGE_FILES.orbBleed,
  nhd: IMAGE_FILES.orbHarden,
  ns: IMAGE_FILES.orbShield,
  ndd: IMAGE_FILES.orbDance,
  ls: IMAGE_FILES.orbLifesteal,
  nrg: IMAGE_FILES.orbRegen,
  nhs: IMAGE_FILES.orbSiphon,
  nsp: IMAGE_FILES.orbMoveSpeed,
  nxp: IMAGE_FILES.orbMagnet,
  nmi: IMAGE_FILES.orbHoming,
  nd: IMAGE_FILES.orbDeathBoom,
  nts: IMAGE_FILES.orbThunder,
  nsv: IMAGE_FILES.orbVortex,
  nds: IMAGE_FILES.orbDash
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
  return shuf((ORB_POOL[kind] || []).filter(a => !(a[3] && S[a[0]]) && !(a[0] === 'nmi' && S.nmi >= C.missileMaxLvl) && !(a[0] === 'nts' && S.nts >= C.thunderMaxLvl) && !(a[0] === 'nds' && !C.dashOn) && !(a[0] === 'nm' && S.wp === 'sword' && !S.swl && !S.nmi))).slice(0, C.orbChoices || 3).map(a => '<button class="opt aug" data-k="' + a[0] + '">' + (ORB_ICON[a[0]] ? '<img class="aicon" src="' + ORB_ICON[a[0]] + '" alt="">' : '') + '<div><b>' + a[1] + '</b><span>' + a[2]() + '</span></div></button>').join('');
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

// ---- AUTO UPGRADE ----
// Lock a BASIC augment (the 3 you are offered on every level-up) and the game picks it for you on each level-up, without opening the selection screen.
// You can lock several (up to all three) basic augments, but every level-up upgrades only ONE of them: the locked ones are taken in turns. It never touches Orb (special) augments. Kept only for the current run, separately for each weapon: AUTO = { sword: ['na'], gun: [], grimoire: [] }.
let AUTO = {};

// Locks only last for one run: every new run starts with nothing locked (init() calls this). Also deletes the lock list an older version saved on the device.
function autoReset() {
  AUTO = {};
  try {
    localStorage.removeItem('esAuto');
  }
  catch (e) { }
}
autoReset();

// The basic augment keys of each weapon, in the order they are offered ('gun' = the Rogue).
const BASIC_KEYS = { sword: ['nr', 'hpb', 'na'], gun: ['nr', 'ncr', 'nb'], grimoire: ['nf', 'nl', 'ni'] };

// The key of the weapon used for the lock lists.
const autoWp = () => S.wp === 'sword' || S.wp === 'grimoire' ? S.wp : 'gun';

// [name, icon] of a basic augment (for the Auto Upgrade screen and the floating text).
function basicInfo(k) {
  const m = {
    nr: S.wp === 'gun' || autoWp() === 'gun' ? ['Fire Rate', IMAGE_FILES.augRogueRate] : ['Attack Speed', IMAGE_FILES.augSwordSpeed],
    hpb: ['Health Points', IMAGE_FILES.augSwordHealth],
    na: ['Armor', IMAGE_FILES.augSwordArmor],
    ncr: ['Precision', IMAGE_FILES.augRoguePrecision],
    nb: ['Knife Bounce', IMAGE_FILES.augRogueBounce],
    nf: ['Fire Turret', IMAGE_FILES.augGrimoireFire],
    nl: ['Lightning Turret', IMAGE_FILES.augGrimoireLightning],
    ni: ['Ice Turret', IMAGE_FILES.augGrimoireIce]
  };
  return m[k] || [k, ''];
}

// The locked basic augments of the current weapon (in offer order).
const autoKeys = () => BASIC_KEYS[autoWp()].filter(k => (AUTO[autoWp()] || []).includes(k));

// Locks basic augment k for the current weapon, or unlocks it if it was locked (the other locks stay). Updates the HUD lock button.
function toggleAuto(k) {
  const w = autoWp();
  AUTO[w] = autoKeys().includes(k) ? autoKeys().filter(x => x !== k) : autoKeys().concat(k);
  autoBtn();
}

// Shows the state of the HUD lock button (🔒 gold = locked, 🔓 = off). Call it whenever the weapon or the lock changes.
function autoBtn() {
  const b = $('al');
  if (!b || !S)
    return;
  const on = autoKeys().length > 0;
  b.textContent = on ? '🔒' : '🔓';
  b.className = on ? 'on' : '';
}

// Picks basic augment k (shared by the level-up screen and Auto Upgrade). More max HP also heals you by the same amount.
function applyAug(k) {
  const m0 = maxHp();
  pickAug(k);
  if (k === 'hpb') {
    S.hp += maxHp() - m0;
    healFx();
  }
}

// Level-up: gives chests / starts bosses on milestone levels, restores health and shows the augment choice screen.
function levelUp() {
  S.lvl++;
  if (S.lvl % C.chestLvl === 0 && !rewOff()) {
    PD.chests++;
    savePD();
    S.chestGot = (S.chestGot || 0) + 1;
  }
  if (S.lvl % C.bossEvery === 0 && !(S.cu && S.lvl < S.cu) && !S.story)
    startBoss();
  S.xp -= need() - C.xpLvl;
  if (S.hp < maxHp())
    healFx();
  S.hp = maxHp();
  const ak = autoKeys();
  if (ak.length) {      // Auto Upgrade: pick the next locked augment without opening the selection screen
    const k = ak[(S.aui || 0) % ak.length];      // one augment per level-up: the locked ones in turns
    S.aui = (S.aui || 0) + 1;
    sfx('level');
    applyAug(k);
    S.tx.push({ x: S.x, y: S.y - 54, t: 1, s: 'Auto: ' + basicInfo(k)[0], c: '#9be15d' });
    if (S.lvl % C.chestLvl === 0 && !rewOff())
      S.tx.push({ x: S.x, y: S.y - 78, t: 1.2, s: '🎁 Chest earned!', c: '#ffc94a' });
    S.lu.push({ t: LU_T });
    hud(1);
    return;
  }
  S.state = 'pick';
  sfx('level');
  const r = rate();
  const o = $('ov');
  o.style.display = 'flex';
  const opts = S.wp === 'sword' ? swordOpts() : S.wp === 'grimoire' ? grimoireOpts() :
    [
      ['nr', 'Fire Rate +' + pc(C.rateAug) + '%', r.toFixed(1) + ' → ' + (r + C.fireRate * C.rateAug).toFixed(1) + ' shots per second', IMAGE_FILES.augRogueRate],
      ['ncr', 'Precision', '+' + pc(C.critPerLvl) + '% Critical Strike Chance · ' + pc(C.critPerLvl * S.ncr) + '% → ' + pc(C.critPerLvl * (S.ncr + 1)) + '%. Crits deal +' + pc(C.critDmg) + '% damage' + (C.critPerLvl * (S.ncr + 1) > 1 ? ', and chance above 100% adds even more' : ''), IMAGE_FILES.augRoguePrecision],
      ['nb', '+1 Knife Bounce', S.nb + ' → ' + (S.nb + 1) + ' bounces on hit', IMAGE_FILES.augRogueBounce]
    ].map(a => '<button class="opt aug" data-k="' + a[0] + '"><img class="aicon" src="' + a[3] + '" alt=""><div><b>' + a[1] + '</b><span>' + a[2] + '</span></div></button>').join('');
  o.innerHTML = '<h1>Level ' + S.lvl + '</h1><p>Choose an augment</p><p style=\"font-size:calc(14px * var(--fs,1));opacity:.75;margin-top:-6px\">Tap 🔓 to Auto Upgrade: locked augments are picked for you, one per level-up, in turns</p>' + (S.lvl % C.chestLvl === 0 && !rewOff() ? '<p style="color:#ffc94a">🎁 You earned a chest! Open it from the Inventory.</p>' : '') + opts;
  o.querySelectorAll('.opt').forEach(b => {
    const lk = document.createElement('div');      // Auto Upgrade lock (basic augments only)
    const show = () => {
      const on = autoKeys().includes(b.dataset.k);
      lk.className = 'alock' + (on ? ' on' : '');
      lk.textContent = on ? '🔒' : '🔓';
    };
    lk.onclick = e => {
      e.stopPropagation();
      sfx('click');
      toggleAuto(b.dataset.k);
      o.querySelectorAll('.opt').forEach(x => x._show && x._show());
    };
    b._show = show;
    show();
    b.appendChild(lk);
  });
  o.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    sfx('click');
    applyAug(b.dataset.k);
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
  const nl = !rewOff() && S.lvl > best.lvl;
  const nk = !rewOff() && S.kills > best.kills;
  saveBest();
  const o = $('ov');
  o.style.display = 'flex';
  o.innerHTML = '<h1>You fell</h1><p>Survived ' + mmss(S.t) + '</p>' + (S.chestGot ? '<p style="color:#ffc94a">🎁 ' + S.chestGot + (S.chestGot > 1 ? ' chests' : ' chest') + ' earned this run!</p>' : '') + '<p>Level ' + S.lvl + (nl ? ' · New best!' : '') + '</p><p>' + S.kills + ' kills' + (nk ? ' · New best!' : '') + '</p><p style="color:#ffd23f">' + ESS + ' ' + S.coins + ' Essence collected · ' + PD.coins + ' total</p><p style="opacity:.75">Highest level ' + best.lvl + ' · Highest kills ' + best.kills + '</p><button class="opt" id="rs"><b>Play again</b><span>Start a new run</span></button><button class="opt" id="mm" style="border-color:#fff8"><b style="color:#fff">Main menu</b></button>';
  $('rs').onclick = init;
  $('mm').onclick = menu;
}
