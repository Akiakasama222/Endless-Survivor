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

// Mythical tiers have no cap: index 5 = Mythical 1, index 6 = Mythical 2, ... damage grows by 5 more per tier than the previous step (15, 20, 30, 45, 65, 90, 120, ...). Created on demand (chests never drop above Mythical 1).
const MYTH_STEP = 5;

// Adds Mythical tiers up to index n.
function ensureRar(n) {
  while (RAR.length <= n) {
    const k = RAR.length - 4;
    RAR.push({ n: 'Mythical ' + k, c: '#ffd23f', rgb: '255,210,63', d: 15 + 2.5 * RAR.length * (RAR.length + 1), w: 0 });
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

// TY = weapon types: display name and icon for the staff (gun), sword and grimoire.
const TY = {
  grimoire: { n: 'Grimoire', i: '📖' },
  gun: {
    n: 'Staff',
    i: '<svg viewBox="0 0 32 32" width="1em" height="1em" style="vertical-align:-.12em;overflow:visible" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="stO" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#7fb4ff"/><stop offset="1" stop-color="#3b3bd8"/></radialGradient></defs><circle cx="23" cy="9" r="8" fill="#6aa0ff" opacity=".28"/><path d="M4.5 28.5 L19 14" stroke="#4a2c14" stroke-width="3.4" stroke-linecap="round"/><path d="M4.5 28.5 L19 14" stroke="#9a6430" stroke-width="1.6" stroke-linecap="round"/><path d="M15.2 17.8 L17.6 20.2" stroke="#ffc94a" stroke-width="1.8" stroke-linecap="round"/><path d="M17 10.5 Q16.5 16 21.5 15.5 M20 7.5 Q14.5 8 15 13" stroke="#ffc94a" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="21.5" cy="10.5" r="4.6" fill="url(#stO)" stroke="#1d1d7a" stroke-width=".8"/><circle cx="20" cy="9" r="1.3" fill="#fff" opacity=".9"/></svg>'
  },
  sword: { n: 'Sword', i: '🗡️' }
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

// BUL = staff bullet image; once loaded, bullet sprites are built for every rarity colour.
const BUL = new Image();

BUL.onload = () => {
  SPR.br = RAR.map(r => spr(40, 40, (x, u, v) => {
    x.shadowColor = r.c;
    x.shadowBlur = 6;
    x.drawImage(BUL, u - 11, v - 5.5, 22, 11);
  }));
};

BUL.src = 'assets/images/staff-bullet.png';

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

// Stat formulas: maxHp = max health, nat = base damage, dmg = current damage, nextDm = next overload multiplier, rate = attack rate, shots = projectiles per shot, need = XP needed for the next level.
const maxHp = () => Math.round((C.baseHp + C.hpLvl * (S.lvl - 1)) * (1 + C.hpAug * S.hpb));

const nat = () => C.baseDmg + C.dmgLvl * (S.lvl - 1);

const dmg = () => nat() + (S.db || 0);

const nextDm = () => 5 * ((S.dk || 0) + 1);

const rate = () => C.fireRate * (1 + C.rateAug * S.nr + (S.nsc || 0));

const shots = () => 1 + S.nm;

const need = () => C.xpBase + C.xpLvl * S.lvl;

// Starts a new run: resets every field of the run state S for the equipped weapon and closes the overlay.
function init() {
  $('warn').style.display = 'none';
  $('bb').style.display = 'none';
  weapon = PD.eq.t;
  C.baseDmg = RAR[PD.eq.r].d;
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
    dk: 0,
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
    nps: 0,
    dc: 0,
    wp: weapon,
    fe: [],
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
    ne: 0,
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
    tx: [],
    sp: 0,
    state: 'play'
  };
  S.hp = maxHp();
  S.dev = DEV.lvl > 1 && !DEV.rew;
  $('ov').style.display = 'none';
  hud(1);
}
