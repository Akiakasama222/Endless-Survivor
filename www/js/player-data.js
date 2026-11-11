// ======================================================================
// PLAYER DATA, RARITIES & STAT FORMULAS
// Saved inventory / chests, weapon rarities, damage-rate-HP formulas and starting a new run (init).
// ======================================================================

// RAR = weapon rarities: n name, c colour, d damage, w chest drop weight. Mythical tiers are added on demand (see ensureRar).
const RAR = [
  { n: 'Common', c: '#9aa3b2', rgb: '154,163,178', d: 15, w: 50 },
  { n: 'Uncommon', c: '#4ade80', rgb: '74,222,128', d: 20, w: 28 },
  { n: 'Rare', c: '#4da3ff', rgb: '77,163,255', d: 30, w: 13 },
  { n: 'Epic', c: '#b266ff', rgb: '178,102,255', d: 45, w: 6 },
  { n: 'Legendary', c: '#ff4d4d', rgb: '255,77,77', d: 65, w: 2.5 },
  { n: 'Mythical 1', c: '#ffd23f', rgb: '255,210,63', d: 90, w: .5 }
];

// The damage / drop weight of every tier before any Editor change (the Editor shows them as "default"), then the Editor's saved changes are applied (see tuning.js).
const RAR_DEFAULTS = RAR.map(t => ({ d: t.d, w: t.w }));

applyRarityEdits();

// Mythical tiers have no cap: index 5 = Mythical 1, index 6 = Mythical 2, ... damage grows by 5 more per tier than the previous step (15, 20, 30, 45, 65, 90, 120, ...). Created on demand (chests never drop above Mythical 1).
const MYTH_STEP = 5;

// Adds Mythical tiers up to index n.
function ensureRar(n) {
  while (RAR.length <= n) {
    const k = RAR.length - 4;
    RAR.push({ n: 'Mythical ' + k, c: '#ffd23f', rgb: '255,210,63', d: 15 + 2.5 * RAR.length * (RAR.length + 1), w: 0 });
    RAR_DEFAULTS.push({ d: RAR[RAR.length - 1].d, w: RAR[RAR.length - 1].w });
    applyRarityEdits();
    try {
      if (SPR.br)
        SPR.br.push(SPR.br[5]);
    }
    catch (e) { }
  }
}

// Makes sure every weapon type has a slot for every rarity in the inventory.
function padInv() {
  for (const t of ['gun', 'sword', 'grimoire']) {
    if (!Array.isArray(PD.inv[t]))
      PD.inv[t] = RAR.map((_, i) => +(i === 0 && t === 'grimoire'));
    while (PD.inv[t].length < RAR.length)
      PD.inv[t].push(0);
  }
}

// TY = weapon types: display name and icon for the Rogue (internal key 'gun', it used to be the Bow), sword and grimoire.
// n = name, i = the weapon icon as a small inline picture (HTML), used by the inventory, chest and guide screens.
const wIcon = (f, smooth) => '<img class="wi' + (smooth ? ' sm' : '') + '" src="' + f + '" alt="">';

const TY = {
  grimoire: { n: 'Grimoire', i: wIcon(IMAGE_FILES.iconGrimoire, 1) },
  gun: {
    n: 'Rogue',
    i: wIcon(IMAGE_FILES.iconRogue)
  },
  sword: { n: 'Sword', i: wIcon(IMAGE_FILES.iconSword) }
};

// Creates a fresh player profile: one Common weapon of each type, equipped weapon, no chests.
function newPD(t) {
  return {
    v: 1,
    inv: {
      gun: RAR.map((_, i) => +(i === 0)),
      sword: RAR.map((_, i) => +(i === 0)),
      grimoire: RAR.map((_, i) => +(i === 0))
    },
    eq: { t: t || 'gun', r: 0 },
    chests: 0,
    coins: 0,
    runs: 0,
    kills: 0
  };
}

// PD = saved player profile: inv (how many of each weapon per rarity), eq (equipped weapon), chests, runs, kills.
let PD = null;

try {
  const raw = JSON.parse(localStorage.getItem('esPD'));
  if (raw && raw.inv && raw.eq && Array.isArray(raw.inv.gun) && Array.isArray(raw.inv.sword))
    PD = Object.assign(newPD(), raw);
}
catch (e) { }

if (!PD) {
  let t = 'gun';
  try {
    if (localStorage.getItem('esWp') === 'sword')
      t = 'sword';
  }
  catch (e) { }
  PD = newPD(t);
}

ensureRar(Math.max(5, PD.eq.r | 0, PD.inv.gun.length - 1, PD.inv.sword.length - 1));

padInv();

if (!PD.inv[PD.eq.t] || !(PD.inv[PD.eq.t][PD.eq.r] > 0)) {
  PD.eq = { t: 'gun', r: 0 };
  if (!(PD.inv.gun[0] > 0))
    PD.inv.gun[0] = 1;
}

// weapon = type of the equipped weapon for the current run.
let weapon = PD.eq.t;

SPR.br = RAR.map(r => spr(40, 40, (x, u, v) => {
  x.fillStyle = r.c;
  x.shadowColor = r.c;
  x.shadowBlur = 10;
  x.font = 'bold 24px Arial,sans-serif';
  x.fillText('\u25b8', u, v);
}));

// BUL = bow arrow image; once loaded, arrow sprites are built for every rarity colour.
const BUL = new Image();

BUL.onload = () => {
  SPR.br = RAR.map(r => {
    // Recolour the knife to the rarity colour: the 'color' blend keeps the knife's light/dark shading but takes the rarity's hue,
    // then the original transparency is put back. (Without this the knife kept its own orange/blue colours and only the glow was tinted.)
    const t = document.createElement('canvas');
    t.width = 44;
    t.height = 22;
    const tx = t.getContext('2d');
    tx.drawImage(BUL, 0, 0, 44, 22);
    tx.globalCompositeOperation = 'color';
    tx.fillStyle = r.c;
    tx.fillRect(0, 0, 44, 22);
    tx.globalCompositeOperation = 'destination-in';
    tx.drawImage(BUL, 0, 0, 44, 22);
    return spr(40, 40, (x, u, v) => {
      x.shadowColor = r.c;
      x.shadowBlur = 6;
      x.drawImage(t, u - 11, v - 5.5, 22, 11);
    });
  });
};

BUL.src = IMAGE_FILES.arrow;

// Saves the player profile.
function savePD() {
  try {
    localStorage.setItem('esPD', JSON.stringify(PD));
  }
  catch (e) { }
}

// Counts a finished run (runs and kills) once, unless it was a developer test run.
function endRun() {
  if (!S || S.counted || S.dev)
    return;
  S.counted = 1;
  PD.runs++;
  PD.kills += S.kills;
  PD.coins = (PD.coins | 0) + (S.coins | 0);
  savePD();
}

// Rolls a random weapon type and rarity for a chest, using the rarity weights.
function rollChest() {
  const t = ['gun', 'sword', 'grimoire'][Math.floor(Math.random() * 3)];
  let x = Math.random() * RAR.reduce((a, r) => a + r.w, 0);
  let r = 0;
  for (; r < 5; r++) {
    x -= RAR[r].w;
    if (x < 0)
      break;
  }
  return { t, r };
}

// Updates and saves the personal records.
function saveBest() {
  if (!S || S.dev)
    return;
  best.lvl = Math.max(best.lvl, S.lvl);
  best.kills = Math.max(best.kills, S.kills);
  try {
    localStorage.setItem('esBest', JSON.stringify(best));
  }
  catch (e) { }
}

addEventListener('pagehide', saveBest);

document.addEventListener('visibilitychange', () => {
  if (document.hidden)
    saveBest();
});

// Stat formulas: maxHp = max health, nat = base damage, dmg = current damage, rate = attack rate, shots = arrows per shot, need = XP needed for the next level.
const maxHp = () => Math.round((C.baseHp + C.hpLvl * (S.lvl - 1)) * (1 + C.hpAug * S.hpb));

const nat = () => C.baseDmg + C.dmgLvl * (S.lvl - 1);

const dmg = () => nat() + (S.db || 0);

const rate = () => C.fireRate * (1 + C.rateAug * S.nr + C.spellcaster * (S.nsc || 0));

// Armor: flat damage blocked from every hit the player takes. Armor augment = C.armorPerLvl per level. Harden adds C.hardenArmor flat armor per level, then the whole total
// is increased by C.hardenPerLvl per level (additive: x1.5, x2, x2.5...). armorAt(na, nhd) = the armor at those levels (used by the augment texts to show the next value).
const armorAt = (na, nhd) => Math.round((C.armorPerLvl * (na || 0) + C.hardenArmor * (nhd || 0)) * (1 + C.hardenPerLvl * (nhd || 0)));

const armor = () => armorAt(S.na, S.nhd);

const shots = () => 1 + S.nm;

const need = () => C.xpBase + C.xpLvl * S.lvl;

// Starts a new run: resets every field of the run state S for the equipped weapon and closes the overlay.
function init() {
  $('warn').style.display = 'none';
  $('bb').style.display = 'none';
  weapon = PD.eq.t;
  C.baseDmg = RAR[PD.eq.r].d;
  if (BIO.random) {      // a different world every run: new grass map seed (the roads already pick their own seed)
    BIO.seed = 1 + Math.floor(Math.random() * 1e9);
    bioTileCache.clear();
  }
  startMusic();
  $('pb').style.display = 'block';
  S = {
    x: 0,
    y: 0,
    lvl: 1,
    xp: DEV.lvl > 1 ? (DEV.lvl - 1) * (C.xpBase + C.xpLvl * DEV.lvl / 2) : 0,
    cu: DEV.lvl > 1 ? DEV.lvl : 0,
    hp: C.baseHp,
    t: 0,
    kills: 0,
    nr: 0,
    nm: 0,
    nb: 0,
    db: 0,
    nmw: 0,
    gh: [],      // MultiWield afterimages (combat.js)
    bw: 0,
    boss: null,
    hm: 0,
    ex: 0,
    ls: 0,
    ns: 0,
    sh: 0,
    kc: 0,
    nsp: 0,
    nd: 0,
    fx: [],
    tr: [],
    ms: [],
    dtr: [],
    sws: [],
    sc: 0,
    swl: 0,
    nmi: 0,
    mc: 0,
    sl: [],
    hpb: 0,
    sr: 0,
    nds: 0,
    nbl: 0,
    nxp: 0,
    nsv: 0,
    vt: 0,
    dc: 0,
    wp: weapon,
    fe: [],
    ah: [],
    bh: [],
    cf: [],
    hfx: 0,
    lu: [],
    at: [],
    ie: [],
    ic: [],
    de: [],
    bs: [],
    xh: 0,
    xt: 0,
    hs: [],
    sf: [],
    sfa: 0,
    sft: 0,
    nols: 0,
    ndd: 0,
    dots: [],
    nsc: 0,
    nf: 0,
    nl: 0,
    ni: 0,
    nrg: 0,
    na: 0,
    nhd: 0,
    nsh: 0,
    nts: 0,
    nhs: 0,
    sip: 0,
    tu: {},
    tb: [],
    zp: [],
    bolt: [],
    cd: 0,
    inv: 0,
    en: [],
    eb: [],
    bl: [],
    gm: [],
    cn: [],
    coins: 0,
    tx: [],
    sp: 0,
    state: 'play'
  };
  S.hp = maxHp();
  S.dev = DEV.lvl > 1 && !DEV.rew;
  teleportStart();      // the mage beams in (teleport.js); the run is frozen until the animation is nearly over
  $('ov').style.display = 'none';
  hud(1);
}

// TRL = the Bow arrow's trail (your grey 'Main Projectile Trail.png'). TRL.br[rarity] holds one copy per rarity, tinted with that rarity's colour
// (multiplied over the grey, so the original shading stays). Until the image has loaded (or if it is missing) TRL.br stays null and the old round trail is used.
const TRL = { br: null };
{
  const im = new Image();
  im.onload = () => {
    TRL.br = RAR.map(r => {
      const c = document.createElement('canvas');
      c.width = im.naturalWidth;
      c.height = im.naturalHeight;
      const x = c.getContext('2d');
      x.drawImage(im, 0, 0);
      x.globalCompositeOperation = 'multiply';
      x.fillStyle = 'rgb(' + r.rgb + ')';
      x.fillRect(0, 0, c.width, c.height);
      x.globalCompositeOperation = 'destination-in';      // put the original transparency / fade back
      x.drawImage(im, 0, 0);
      return c;
    });
  };
  im.src = IMAGE_FILES.trail;
}
