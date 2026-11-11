// ======================================================================
// GRIMOIRE & SPECIAL EFFECTS
// Grimoire weapon, its turrets, the shared explosion / homing-heal effects and the Grimoire augment list.
// ======================================================================

// GT = Grimoire turret table (name, colour, offset from the player). GL = turret key -> state counter (f/l/i = fire / lightning / ice level).
const GT = {
  f: { n: 'Fire', c: '255,122,47', off: [-24, 24], ph: 0 },
  l: { n: 'Lightning', c: '255,233,74', off: [24, -24], ph: 2 },
  i: { n: 'Ice', c: '127,216,255', off: [-28, -28], ph: 4 }
};

const GL = { f: 'nf', l: 'nl', i: 'ni' };

// Effect sheets: SMI fireball smoke, ICI ice burst, BSI boss stomp, DEI death explosion, FXI fireball explosion (all loaded from assets/images).
const SMI = new Image();

SMI.src = IMAGE_FILES.fireballSmoke;

const ICI = new Image();

ICI.src = IMAGE_FILES.iceBurst;

// THI = the Thunder Strike lightning (fx-thunder-strike.png, 768 x 384: 8 columns x 2 rows, every frame 96 x 128, 16 frames, played left to right, top row first).
// Frames 0-1 = the bolt comes down, frame 2 = it hits the ground (this is when the damage lands), the rest = the flash, sparks and scorch marks fading out.
// The ground point under the strike is the same pixel in every frame: (TS_AX, TS_AY).
const THI = new Image();

THI.src = IMAGE_FILES.thunderFx;

const TS_FRAMES = 16;
const TS_DUR = .8;                    // seconds the whole strike animation lasts
const TS_IMPACT = .1;                 // seconds after the strike starts when it hits the ground and deals its damage (frame 2)
const TS_SCALE = 3;                   // size of the lightning (1 = pixel size in the picture)
const TS_AX = 37;
const TS_AY = 116;
// 0..1 brightness of the flash at the strike's spot (used for the light on the ground at night): rises while the bolt comes down, peaks at the impact, fades.
const tsGlow = z => {
  const a = TS_DUR - z.t;
  return a < TS_IMPACT ? .3 + .7 * a / TS_IMPACT : Math.max(0, 1 - (a - TS_IMPACT) / .35);
};

// FZI = the ice block that appears around a frozen enemy.
const FZI = new Image();

FZI.src = IMAGE_FILES.frozenBlock;

// Frozen-block sheet (fx-frozen.png): 448 x 192, 8 columns x 3 rows, every frame 56 x 64 (play left to right, top row first; 19 frames in use).
// Frames 0-5 = the block growing around the enemy, frame 6 = the solid block (held while frozen), frames 9-18 = it cracking and shattering just before the enemy thaws.
const FZ_W = 56, FZ_H = 64;
const FZ_AX = 28, FZ_AY = 57;   // point of the frame that sits on the enemy's feet (middle of the block's base)
const FZ_FORM = .3;             // seconds the block takes to grow
const FZ_FORM_N = 6;            // frames used for growing (0 .. 5)
const FZ_HOLD = 6;              // frame shown while the enemy is frozen solid
const FZ_SHATTER = .5;          // seconds before the thaw when the block starts to crack and shatter
const FZ_SHAT_FROM = 9, FZ_SHAT_N = 10;   // first shatter frame and how many there are
const FZ_SCALE = 1;             // size of the block (1 = pixel size in the picture)

// ABI = the Grimoire's arcane bolt (flying + hit) sheet.
const ABI = new Image();

ABI.src = IMAGE_FILES.arcaneBolt;

// Arcane bolt sheet (fx-arcane-bolt.png): 1024 x 156, 8 columns x 3 rows, every frame 128 x 52 (play left to right, top row first; 22 frames).
// Frames 0-8 = the bolt appearing and stretching out (the head flies to the right, the tail streams behind it), frame 8 = the full flying bolt (held while it flies),
// frames 9-21 = the burst when it hits something.
// AB_HEAD_X = the x of the glowing head in each flying frame (frames 0-8); the head is drawn exactly on the bullet's spot, so the tail trails behind it.
// ABF = the Grimoire bolt's flying loop (fx-arcane-fly.png, 768 x 52, 6 frames of 128 x 52). It repeats for as long as the bolt is in the air, until it hits.
// AB_FLY_HEAD_X / _Y = the glowing head of each frame; the head is drawn exactly on the bullet's spot, so the tail trails behind it.
// If this picture fails to load, the older stretch-out frames of the sheet above are used instead.
const ABF = new Image();
ABF.src = IMAGE_FILES.arcaneFly;
const AB_FLY_N = 6;
const AB_FLY_FPS = 40;                // loop speed (frames per second)
const AB_FLY_HEAD_X = [23, 38, 53, 70, 84, 96];
const AB_FLY_HEAD_Y = [24, 22, 22, 24, 26, 26];
const AB_W = 128, AB_H = 52;
const AB_HEAD_X = [18, 16, 14, 23, 39, 56, 73, 88, 98];
const AB_HEAD_Y = 25;
const AB_INTRO = .3;                  // seconds the bolt takes to stretch out (frames 0-8), then it holds frame 8
const AB_HIT_FROM = 9, AB_HIT_N = 13; // first hit-burst frame and how many there are
const AB_HIT_X = 103, AB_HIT_Y = 25;  // centre of the hit burst in its frames
const AB_HIT_T = .4;                  // seconds the hit burst lasts
const AB_SCALE = 1.5;                   // size of the bolt and the burst (1 = pixel size in the picture)
const AB_LIFT = 18;                   // how high above the ground the bolt flies (pixels on screen)

// BHI = the blood splash that plays when a Rogue knife or the Sword hits an enemy (fx-blood-hit.png, 1024 x 240: 8 columns x 2 rows of 128 x 120 frames, 15 in use).
// The splash flies to the right in the picture; it is mirrored so it always sprays away from the player.
const BHI = new Image();
BHI.src = IMAGE_FILES.bloodHit;
const BH_W = 128, BH_H = 120, BH_N = 15;
const BH_AX = 48, BH_AY = 112;   // point of a frame that sits on the enemy's feet (the splash centre then lands at chest height)
const BH_T = .45;                // seconds the splash lasts
const BH_SCALE = .6;             // size of the splash (1 = pixel size in the picture)

// CFI = the coin pickup sparkle (fx-coin-pickup.png, 256 x 64: 8 frames of 32 x 64 in one row). The burst is centred at (CF_AX, CF_AY) of a frame; that point is put on the coin.
const CFI = new Image();
CFI.src = IMAGE_FILES.coinFx;
const CF_W = 32, CF_H = 64, CF_N = 8, CF_AX = 16, CF_AY = 16, CF_T = .45, CF_SCALE = 1.2;

// LUI = the level-up effect (fx-level-up.png, 512 x 288: 8 columns x 3 rows of 64 x 96 frames, 19 in use). A ring of light on the ground with a pillar rising out of it and sparkles.
// (LU_AX, LU_AY) is the middle of the ring on the ground; it is put on the player's feet.
const LUI = new Image();
LUI.src = IMAGE_FILES.levelUpFx;
const LU_W = 64, LU_H = 96, LU_COLS = 8, LU_N = 19, LU_AX = 32, LU_AY = 87, LU_T = .95, LU_SCALE = 1.1;

// SHI = the shield bubble around the player while a Shield / Ice Shield charge is up (fx-shield.png, 576 x 176: 8 columns x 2 rows of 72 x 88 frames, 16 frames that loop).
// If the picture fails to load, the old drawn bubble is used instead.
const SHI = new Image();
SHI.src = IMAGE_FILES.shieldFx;
const SH_W = 72, SH_H = 88, SH_COLS = 8, SH_N = 16, SH_FPS = 10, SH_CX = 36, SH_CY = 43, SH_SCALE = 1;      // (SH_CX, SH_CY) = middle of the bubble inside a frame; it is put on the player's chest

// HLI = the Heal sprite sheet: the green aura around the player's feet that plays EVERY time the player heals (Bow Lifesteal, Sword Regeneration, Health Siphon, level-up heal, Health Points augment).
// fx-heal.png, 384 x 128: 8 columns x 2 rows of 48 x 64 frames, 16 frames. (HL_AX, HL_AY) is the middle of the ground ring inside a frame; it is put on the player's feet.
// healFx() starts the animation (S.hfx = seconds left); if it is already playing it just keeps going, so constant healing (Regeneration) loops it without a restart.
const HLI = new Image();
HLI.src = IMAGE_FILES.healFx;
const HL_W = 48, HL_H = 64, HL_COLS = 8, HL_N = 16, HL_FPS = 12, HL_AX = 24, HL_AY = 59, HL_SCALE = 1.4, HL_T = HL_N / HL_FPS;

// Call whenever the player actually gains health.
function healFx() {
  if (!(S.hfx > 0))
    S.hfx = HL_T;
}

// Starts a blood splash on enemy e.
function bloodHit(e) {
  if (S.bh.length > 40)
    S.bh.shift();
  S.bh.push({ x: e.x, y: e.y, t: BH_T, fl: (S.x - S.y) - (e.x - e.y) > 0 ? 1 : 0 });
}

// Starts the arcane hit burst at (x, y).
function arcaneHit(x, y) {
  if (S.ah.length > 40)
    S.ah.shift();
  S.ah.push({ x, y, t: AB_HIT_T });
}

const BSI = new Image();

BSI.src = IMAGE_FILES.bossStomp;

const DEI = new Image();

DEI.src = IMAGE_FILES.deathExplosion;

// FRI = the fire ring that spreads over the ground (8 columns x 3 rows of 96 x 64 frames, 18 frames in use). It replaces the flat orange ring of the fireball blast.
const FRI = new Image();
FRI.src = IMAGE_FILES.fireRing;
// Size of the ground ring inside a fire ring frame at its biggest (pixels) and the point of the frame where the blast's centre is. Used to fit the ring to the blast radius.
const FR_W = 90, FR_H = 30, FR_AX = 48, FR_AY = 45;

// XSI = the explosion sheet used by the Fire turret fireballs and the Magic Arrows (fx-explosion-smoke.png, 512 x 128, 64 x 64 frames, 8 columns).
// 13 frames play left to right, top row first: flash, fireball, burning smoke, then the grey smoke thinning out. The last 3 slots of the second row are empty.
// If this picture fails to load, the older fire ring / fireball sheets below are used instead.
const XSI = new Image();
XSI.src = IMAGE_FILES.explosionSmoke;
const XS_W = 64, XS_H = 64, XS_COLS = 8, XS_N = 13;
const XS_AX = 32, XS_AY = 56;   // point of a frame that sits on the blast's centre on the ground (middle of the base)
const XS_FOOT = 56;             // width of the blast on the ground in the picture: the game scales it so this covers the damage area (bigger number = smaller explosion; C.gmFx still scales it)
const FX_LIFE = .8;             // seconds the whole explosion animation lasts

const FXI = new Image();

FXI.src = IMAGE_FILES.fireballExplosion;

// ---- Frames of the fireball-explosion sheet (FXI) and the ice-burst sheet (ICI) ----
// Fireball sheet (fx-fireball-explosion.png): 1000 x 720, 15 frames on an exact grid, 5 columns x 3 rows, every frame 200 x 240.
// Ice sheet (fx-ice-burst.png): 960 x 228, 8 columns x 3 rows, every frame 120 x 76 (play left to right, top row first). Slot 5 of the top row is empty and skipped, so there are 16 frames: charge sparks, ice spikes erupting, spikes shattering, ground ring fading out.
// Every frame has its own entry:
//   [x, y, width, height, anchorX, anchorY]
// = the part of the picture to cut out, and the point inside that part which is drawn exactly on the spot where the effect happens.
// Fireball: the anchor is the middle of the base of the blast (the blast grows upward from it; a bigger anchor Y lifts it higher off the ground). Ice: the anchor is the ground point under the burst.
// The anchors are the same for every frame on purpose, so the animation stays where the artist drew it. If you swap the pictures, re-measure these numbers.
const FX_FRAMES = [
  [   0,    0, 200, 240, 100, 240],
  [ 200,    0, 200, 240, 100, 240],
  [ 400,    0, 200, 240, 100, 240],
  [ 600,    0, 200, 240, 100, 240],
  [ 800,    0, 200, 240, 100, 240],
  [   0,  240, 200, 240, 100, 240],
  [ 200,  240, 200, 240, 100, 240],
  [ 400,  240, 200, 240, 100, 240],
  [ 600,  240, 200, 240, 100, 240],
  [ 800,  240, 200, 240, 100, 240],
  [   0,  480, 200, 240, 100, 240],
  [ 200,  480, 200, 240, 100, 240],
  [ 400,  480, 200, 240, 100, 240],
  [ 600,  480, 200, 240, 100, 240],
  [ 800,  480, 200, 240, 100, 240]
];

const ICE_FRAMES = [
  [   0,    0, 120,  76,  60,  47],
  [ 120,    0, 120,  76,  60,  47],
  [ 240,    0, 120,  76,  60,  47],
  [ 360,    0, 120,  76,  60,  47],
  [ 600,    0, 120,  76,  60,  47],
  [ 720,    0, 120,  76,  60,  47],
  [ 840,    0, 120,  76,  60,  47],
  [   0,   76, 120,  76,  60,  47],
  [ 120,   76, 120,  76,  60,  47],
  [ 240,   76, 120,  76,  60,  47],
  [ 360,   76, 120,  76,  60,  47],
  [ 480,   76, 120,  76,  60,  47],
  [ 600,   76, 120,  76,  60,  47],
  [ 720,   76, 120,  76,  60,  47],
  [ 840,   76, 120,  76,  60,  47],
  [   0,  152, 120,  76,  60,  47]
];

// How wide the explosion is in the picture (in picture pixels). The game scales the picture so this width covers the real damage area
// (radius r). For the fireball, C.gmFx = 1.5 means "exactly the damage area"; a bigger / smaller gmFx draws it bigger / smaller.
const FX_FOOT = 190;     // bigger number = smaller explosion

const ICE_FOOT = 88;      // width of the ice ring on the ground in the picture: the game scales it so the ring is exactly the damage area (bigger number = smaller burst)

const ICE_Y = 2;        // extra stretch of the picture's height so the flat ring matches the game's 2:1 ground circle (1 = no stretch)

// The Grimoire's main bullet: a glowing purple orb (drawn once here, stamped every frame in draw.js).
SPR.orb = spr(40, 40, (x, u, v) => {
  const glow = x.createRadialGradient(u, v, 2, u, v, 19);
  glow.addColorStop(0, 'rgba(190,120,255,.55)');
  glow.addColorStop(1, 'rgba(120,40,220,0)');
  x.fillStyle = glow;
  x.beginPath();
  x.arc(u, v, 19, 0, Math.PI * 2);
  x.fill();
  const body = x.createRadialGradient(u - 2, v - 2, 1, u, v, 9);
  body.addColorStop(0, '#f1dcff');
  body.addColorStop(.45, '#b06aff');
  body.addColorStop(1, '#5b21b6');
  x.fillStyle = body;
  x.beginPath();
  x.arc(u, v, 9, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = 'rgba(255,255,255,.7)';
  x.lineWidth = 1.5;
  x.stroke();
  x.fillStyle = 'rgba(255,255,255,.85)';
  x.beginPath();
  x.arc(u - 3, v - 3, 2.2, 0, Math.PI * 2);
  x.fill();
});

SPR.tf = spr(36, 36, (x, u, v) => {
  x.font = '24px ' + EF;
  x.fillText('🔥', u, v);
});

SPR.tl = spr(36, 36, (x, u, v) => {
  x.font = '24px ' + EF;
  x.fillText('⚡', u, v);
});

SPR.ti = spr(36, 36, (x, u, v) => {
  x.font = '24px ' + EF;
  x.fillText('❄️', u, v);
});

SPR.gm = spr(32, 32, (x, u, v) => {
  x.shadowColor = '#b266ff';
  x.shadowBlur = 8;
  x.font = '22px ' + EF;
  x.fillText('📖', u, v);
});

// Grimoire stat helpers: damage / radius / chain / stun / slow values for each turret and Health Siphon at the current augment levels.
const gFire = () => C.gmFireR;      // the Fire turret's explosion radius no longer grows with levels

const gFireD = n => 1 + C.gmFireD * Math.max(0, (n === undefined ? S.nf : n) - 1);

const gChain = n => Math.floor(C.gmChainPerLvl * Math.max(0, (n === undefined ? S.nl : n) - 1));

const gStun = () => C.gmStun;      // the Lightning turret's stun is a fixed C.gmStun seconds (no scaling with levels)

// Turret attack speed: every level after the first adds C.gmTurAS (+50%) to the turret's own speed (on top of the player's attack speed / Haste). n = turret level.
const gTurAS = n => 1 + C.gmTurAS * Math.max(0, n - 1);

const gIce = n => C.gmIceR * (1 + C.gmIceRPerLvl * Math.max(0, (n === undefined ? S.ni : n) - 1));

const gSlowP = n => {
  n = n === undefined ? S.ni : n;
  const s = Math.min(.95, Math.max(0, C.gmSlow));     // slow of ONE level of the Ice turret (C.gmSlow in config.js)
  const k = s / (1 - s);                               // levels stack so the enemy speed becomes 1 / (1 + k x level): never 100%
  return n * k / (n * k + 1);                          // (with gmSlow = .5 this is the old n / (n + 1))
};

const gSip = n => 1 + C.siphonPerLvl * Math.max(0, (n === undefined ? S.nhs : n) - 1);

// Area damage: hits every living enemy within radius r of (x, y) for d damage, except enemy s. If `pr` is set, each hit enemy may also trigger Thunder Strike.
function aoe(x, y, d, r, s, pr) {
  for (const o of S.en)
    if (o !== s && o.hp > 0 && (o.x - x) ** 2 + (o.y - y) ** 2 < (r + (o.hr || C.eHitR) - 16) ** 2) {
      hit(o, d);
      if (pr)
        proc(o);
    }
}

// Death Explosion / Bleed explosion visual + area damage at (x, y).
function deathBoom(x, y, d, r, s) {
  aoe(x, y, d, r, s);
  if (S.de.length > 24)
    S.de.shift();
  S.de.push({ x, y, r, t: .5 });
  sfx('dexp');
}

// Excess healing (healing past max HP) from Lifesteal / Health Siphon: EVERY heal instance that overflows spawns its own homing projectile
// carrying exactly the overflow as damage (1:1). Overflow under 1 is carried over (S.xh) so it is never lost. At the 80-projectile cap the damage is merged into the newest one.
// Spawns a homing projectile carrying d damage (overflow healing becomes damage).
function homing(d) {
  if (S.hs.length >= 80) {
    S.hs[S.hs.length - 1].d += d;
    return;
  }
  const a = Math.random() * 6.283;
  S.hs.push({ x: S.x, y: S.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 4, d, tg: null });
}

// Heals the player by x; any healing past max HP is stored and turned into a homing projectile.
function healP(x) {
  const u = Math.min(x, Math.max(0, maxHp() - S.hp));
  S.hp += u;
  if (u > 0)
    healFx();
  const ex = x - u;
  if (ex > 0) {
    S.xh += ex;
    if (S.xh >= 1) {
      homing(S.xh);
      S.xh = 0;
    }
  }
}

// Moves the homing overflow-heal projectiles and damages what they hit.
function xhStep(dt) {
  for (const p of S.hs) {
    if (!p.tg || p.tg.hp <= 0)
      p.tg = nearest(p.x, p.y, 800);
    if (p.tg) {
      const dx = p.tg.x - p.x;
      const dy = p.tg.y - p.y;
      const l = Math.hypot(dx, dy) || 1;
      p.vx += dx / l * 1800 * dt;
      p.vy += dy / l * 1800 * dt;
      const n = Math.hypot(p.vx, p.vy) || 1;
      p.vx = p.vx / n * 320;
      p.vy = p.vy / n * 320;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    S.tr.push({ x: p.x, y: p.y, t: .3, m: .3, r: 5, c: '110,255,140' });
    for (const e of S.en) {
      if (e.hp <= 0)
        continue;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (6 + (e.hr || C.eHitR)) ** 2) {
        S.nols = 1;
        hit(e, p.d);
        S.nols = 0;
        p.life = 0;
        for (let i = 0; i < 6; i++)
          S.tr.push({ x: p.x + (Math.random() - .5) * 14, y: p.y + (Math.random() - .5) * 14, t: .35, m: .35, r: 4, c: '160,255,170' });
        break;
      }
    }
  }
  cull(S.hs, p => p.life > 0);
}

// Health Siphon drain orb: a red projectile that leaves a drained enemy, homes to the player and heals on arrival (heal overflow still becomes a green homing projectile via healP)
// Health Siphon: spawns a red orb at (x, y) that flies to the player and heals h on arrival.
function drain(x, y, h) {
  if (S.sf.length >= 120) {
    S.sf[S.sf.length - 1].h += h;
    return;
  }
  const a = Math.random() * 6.283;
  S.sf.push({ x, y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 6, h });
}

// Moves the Health Siphon orbs towards the player and heals on arrival.
function sfStep(dt) {
  for (const p of S.sf) {
    const dx = S.x - p.x;
    const dy = S.y - p.y;
    const l = Math.hypot(dx, dy) || 1;
    p.vx += dx / l * 1800 * dt;
    p.vy += dy / l * 1800 * dt;
    const n = Math.hypot(p.vx, p.vy) || 1;
    p.vx = p.vx / n * 320;
    p.vy = p.vy / n * 320;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (S.tr.length < 200)
      S.tr.push({ x: p.x, y: p.y, t: .3, m: .3, r: 5, c: '255,90,90' });
    if (l < 18 || p.life <= 0) {
      p.life = 0;
      S.sfa += p.h;
      healP(p.h);
      for (let i = 0; i < 4; i++)
        S.tr.push({ x: S.x + (Math.random() - .5) * 14, y: S.y + (Math.random() - .5) * 14, t: .35, m: .35, r: 4, c: '255,150,150' });
    }
  }
  cull(S.sf, p => p.life > 0);
  S.sft -= dt;
  if (S.sft <= 0) {
    S.sft = .5;
    if (S.sfa >= 1)
      S.tx.push({ x: S.x, y: S.y - 36, t: .6, s: '+' + Math.round(S.sfa), c: '#7bff8a' });
    S.sfa = 0;
  }
}

// Fireball explosion visual + area damage at (x, y).
function fireBoom(x, y, d, r) {
  aoe(x, y, d, r);
  if (S.fe.length > 24)
    S.fe.shift();
  S.fe.push({ x, y, r, t: FX_LIFE });
  bioScorchAdd(x, y, r);      // the ground inside the blast turns to dead grass
  trBlast(x, y, r);
  sfx('fexp');
}

// Thunder Strike: lightning bolt at (x, y) dealing 100% damage in an area.
// The lightning animation plays first; the damage lands at the moment it hits the ground (TS_IMPACT, handled in update.js).
function thunder(x, y) {
  if (S.bolt.length > 24)
    S.bolt.shift();
  S.bolt.push({ x, y, t: TS_DUR, d: dmg() * C.thunderDmg, hit: 0 });
  sfx('tstrike');
}

// Thunder Strike chance (10% per level, max 100%) when enemy e is hit.
function proc(e) {
  if (S.nts && Math.random() < Math.min(1, C.thunderChance * S.nts))
    thunder(e.x, e.y);
}

// ---- Elemental status effects (STATUS-BEGIN) ----
// Burn (Fire turret): each enemy hit by a fireball has a C.burnChance chance to burn. Burn deals C.burnDmg (50%) of the fireball's total damage,
// spread over C.burnT seconds in ticks of C.burnTick seconds. Burning again refreshes the time and keeps the stronger burn.
function ignite(e, total) {
  if (e.hp <= 0 || Math.random() >= C.burnChance)
    return;
  const per = total / Math.max(1, Math.round(C.burnT / C.burnTick));
  e.burn = { t: C.burnT, d: Math.max(per, e.burn ? e.burn.d : 0), k: C.burnTick };
}

// Freeze (Ice turret): an enemy that is ALREADY slowed when the ice burst hits it is frozen (stunned) for C.freezeT seconds.
// When it thaws (see update.js) its slow is reset to full duration. Bosses cannot be frozen, same as slow and stun.
function freeze(o) {
  o.frz = 1;
  o.frz0 = S.t;      // when the freeze began (the block's grow animation is timed from this)
  o.stun = Math.max(o.stun || 0, C.freezeT);
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * 6.283;
    S.tr.push({ x: o.x + Math.cos(a) * 10, y: o.y + Math.sin(a) * 10, t: .5, m: .5, r: 4, c: '210,240,255' });
  }
}

// Tesla (Lightning turret): each enemy hit by the zap has a C.teslaChance chance to get the Tesla status. For C.teslaT seconds it electrocutes the
// C.teslaTargets nearest other enemies every C.teslaTick seconds, separately from the turret's own chain.
// Tesla arcs can spread Tesla too (spread = true): same chance, but only to enemies that do not have it yet, so a crowd cannot keep it going forever.
function teslaApply(e, spread) {
  if (e.hp <= 0 || Math.random() >= C.teslaChance || (spread && e.tesla))
    return;
  e.tesla = { t: C.teslaT, k: .15 };
}

// Ticks Burn and Tesla on every enemy (called every frame from grimoireStep).
function statusStep(dt) {
  for (const e of S.en) {
    if (e.hp <= 0)
      continue;
    const b = e.burn;
    if (b) {
      b.t -= dt;
      b.k -= dt;
      if (b.k <= 0) {
        b.k += C.burnTick;
        S.tx.push({ x: e.x, y: e.y - 20, t: .6, s: b.d < 1 ? +b.d.toFixed(1) : Math.round(b.d) });
        hit(e, b.d, 1);
      }
      if (b.t <= 0 || e.hp <= 0)
        e.burn = null;
    }
    const z = e.tesla;
    if (z && e.hp > 0) {
      z.t -= dt;
      z.k -= dt;
      z.th = (z.th || 0) - dt;      // cooldown until this Tesla enemy may call another Thunder Strike
      if (z.k <= 0) {
        z.k += C.teslaTick;
        const hs = new Set([e]);
        for (let i = 0; i < C.teslaTargets; i++) {
          const n = nearest(e.x, e.y, C.teslaR, hs);
          if (!n)
            break;
          hs.add(n);
          hit(n, dmg() * C.teslaDmg);
          teslaApply(n, true);
          // Thunder Strike can trigger from Tesla arcs too: a reduced chance, and each Tesla enemy can call at most one strike per cooldown
          if (S.nts && z.th <= 0 && Math.random() < Math.min(1, C.thunderChance * S.nts * C.teslaThunderMult)) {
            thunder(n.x, n.y);
            z.th = C.teslaThunderCd;
          }
          S.zp.push({ p: [[e.x, e.y], [n.x, n.y]], t: .14 });
        }
        if (hs.size > 1)
          sfx('zap');
      }
      if (z.t <= 0)
        e.tesla = null;
    }
  }
}
// ---- (STATUS-END) ----

// Grimoire logic each frame: the Fire / Lightning / Ice turrets and their status effects.
// (The Grimoire's main bullet is not fired here: update() fires it with the same code as the Bow's arrow.)
function grimoireStep(dt) {
  const r = rate();
  statusStep(dt);
  for (const k of ['f', 'l', 'i']) {
    const lv = S[GL[k]];
    if (!lv)
      continue;
    const G = GT[k];
    let T = S.tu[k];
    if (!T)
      T = S.tu[k] = { x: S.x + G.off[0], y: S.y + G.off[1], cd: .4, fl: 0 };
    const f = Math.min(1, dt * 8);
    T.x += (S.x + G.off[0] - T.x) * f;
    T.y += (S.y + G.off[1] - T.y) * f;
    T.fl -= dt;
    T.cd -= dt;
    if (T.cd > 0)
      continue;
    const t = nearest(T.x, T.y, k === 'l' ? C.gmZap : C.gmTR);
    if (!t) {
      T.cd = 0;
      continue;
    }
    T.cd = 1 / (r * gTurAS(lv));      // each turret's own attack speed grows with its level
    T.fl = .12;
    if (k === 'l') {
      const hs = new Set([t]);
      const pts = [[T.x, T.y], [t.x, t.y]];
      const stn = e => {
        if (e.hp > 0 && !e.boss)
          e.stun = Math.max(e.stun || 0, gStun());
      };
      hit(t, dmg());
      stn(t);
      teslaApply(t);
      onHit(t, dmg());
      let cur = t;
      for (let c = gChain(); c > 0; c--) {
        const n = nearest(cur.x, cur.y, C.gmChain, hs);
        if (!n)
          break;
        hs.add(n);
        hit(n, dmg());
        stn(n);
        teslaApply(n);
        onHit(n, dmg());
        pts.push([n.x, n.y]);
        cur = n;
      }
      S.zp.push({ p: pts, t: .18 });
      sfx('zap');
    }
    else {
      const d = Math.hypot(t.x - T.x, t.y - T.y);
      const Tf = Math.min(1.1, .55 + d / 700);
      const sp = C.eSpeed * (1 + C.eSpeedStep * Math.floor((S.lvl - 1) / C.eSpeedEvery)) * (t.slow > 0 ? (t.slowM || C.gmSlow) : 1);
      let lx = t.x;
      let ly = t.y;
      if (!t.boss && !(t.stun > 0)) {
        const dx = S.x - t.x;
        const dy = S.y - t.y;
        const l = Math.hypot(dx, dy) || 1;
        lx += dx / l * sp * Tf;
        ly += dy / l * sp * Tf;
      }
      S.tb.push({ sx: T.x, sy: T.y, x: T.x, y: T.y, tx: lx, ty: ly, u: 0, T: Tf, H: 70 + d * .35, z: 0, k });
      sfx('shoot');
    }
  }
  for (const b of S.tb) {
    b.u += dt / b.T;
    if (b.u < 1) {
      b.x = b.sx + (b.tx - b.sx) * b.u;
      b.y = b.sy + (b.ty - b.sy) * b.u;
      b.z = 4 * b.H * b.u * (1 - b.u);
      S.tr.push({ x: b.x, y: b.y, z: b.z, t: .3, m: .3, r: 5, c: GT[b.k].c });
      continue;
    }
    const lx = b.tx;
    const ly = b.ty;
    b.u = 9;
    if (b.k === 'f') {
      let n = null;
      let bd = 1e9;
      for (const e of S.en) {
        if (e.hp <= 0)
          continue;
        const d2 = (e.x - lx) ** 2 + (e.y - ly) ** 2;
        const rr = 30 + (e.hr || C.eHitR);
        if (d2 < rr * rr && d2 < bd) {
          bd = d2;
          n = e;
        }
      }
      const fd = dmg() * gFireD();
      if (n) {
        hit(n, fd);
        onHit(n, fd);
      }
      aoe(lx, ly, fd * C.gmFireSplash, gFire(), n, 1);     // splash damage to the others in the radius
      for (const e of S.en)       // Burn: every enemy the fireball hit (direct hit or splash) may catch fire
        if (e.hp > 0 && (e === n || (e.x - lx) ** 2 + (e.y - ly) ** 2 < (gFire() + (e.hr || C.eHitR) - 16) ** 2))
          ignite(e, fd * C.burnDmg);
      if (S.fe.length > 24)
        S.fe.shift();
      S.fe.push({ x: lx, y: ly, r: gFire(), t: FX_LIFE });
      bioScorchAdd(lx, ly, gFire());      // the ground inside the blast turns to dead grass
      trBlast(lx, ly, gFire());
      sfx('fexp');
    }
    else {
      const r = gIce();
      const d = dmg() * C.gmIceDmg;
      for (const o of S.en) {
        if (o.hp <= 0)
          continue;
        if ((o.x - lx) ** 2 + (o.y - ly) ** 2 < (r + (o.hr || C.eHitR) - 16) ** 2) {
          const wasSlowed = o.slow > 0 && !o.boss && !o.frz;      // already slowed before this burst = gets frozen
          hit(o, d);
          if (o.hp > 0 && !o.boss) {
            if (wasSlowed)
              freeze(o);
            o.slow = Math.max(o.slow || 0, C.gmSlowT);
          }
          o.slowM = 1 - gSlowP();
          proc(o);
        }
      }
      if (S.ie.length > 24)
        S.ie.shift();
      S.ie.push({ x: lx, y: ly, r, t: .5 });
      if (S.ic.length > 24)
        S.ic.shift();
      S.ic.push({ x: lx, y: ly, r, a: 0 });
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * 6.283;
        const q = Math.sqrt(Math.random()) * r;
        S.tr.push({ x: lx + Math.cos(a) * q, y: ly + Math.sin(a) * q, t: .5, m: .5, r: 4, c: '190,235,255' });
      }
      sfx('ice');
    }
  }
  cull(S.tb, b => b.u < 1);
  for (const z of S.zp)
    z.t -= dt;
  cull(S.zp, z => z.t > 0);
  for (const z of S.ie)
    z.t -= dt;
  cull(S.ie, z => z.t > 0);
  for (const z of S.ic)
    z.a += dt;
  cull(S.ic, z => z.a < .9);
}

// Health Siphon (shared special augment, runs for every weapon): ticks at your attack speed; drains every enemy within attack range; the drained HP is carried to you by red projectiles
function siphonStep(dt) {
  if (S.nhs) {
    S.sip -= dt;
    if (S.sip <= 0) {
      // drains EVERY enemy inside the weapon's range (weaponRange(), combat.js) for C.siphonDmg (50%) of your damage (scaled by the augment level)
      const d = dmg() * C.siphonDmg * gSip();
      const R2 = weaponRange() ** 2;
      const orbs = [];
      let n = 0;
      for (const e of S.en) {
        if (e.hp <= 0)
          continue;
        let d2 = (e.x - S.x) ** 2 + (e.y - S.y) ** 2;
        if (e.hr)
          d2 = Math.max(0, Math.sqrt(d2) - (e.hr - 16)) ** 2;
        if (d2 >= R2)
          continue;
        const dd = Math.min(d, e.hp);
        e.fl = .1;
        hit(e, d, 1);
        // at most C.siphonOrbs red orbs per tick (keeps the game fast in crowds): the HP drained from the rest is added to those orbs
        if (orbs.length < C.siphonOrbs)
          orbs.push({ x: e.x, y: e.y, h: dd });
        else
          orbs[n % orbs.length].h += dd;
        n++;
      }
      for (const o of orbs)
        drain(o.x, o.y, o.h);
      S.sip = n ? 1 / rate() : .1;      // with nothing in range, look again 10 times a second instead of every frame
    }
  }
}

// Builds the three basic augment buttons offered to a Grimoire player.
function grimoireOpts() {
  return [
    ['nf', S.nf ? 'Fire Turret Lv ' + (S.nf + 1) : 'Fire Turret', S.nf ? 'Fireball damage +' + Math.round(100 * C.gmFireD) + '% · ' + Math.round(100 * gFireD()) + '% → ' + Math.round(100 * gFireD(S.nf + 1)) + '% · turret attack speed +' + pc(C.gmTurAS) + '% (' + Math.round(100 * gTurAS(S.nf)) + '% → ' + Math.round(100 * gTurAS(S.nf + 1)) + '%)' : 'Adds a turret that auto-fires Fireballs: 100% damage + ' + Math.round(100 * C.gmFireSplash) + '% damage AOE on hit · ' + pc(C.burnChance) + '% chance to Burn (' + pc(C.burnDmg) + '% of its damage over ' + C.burnT + 's)', IMAGE_FILES.augGrimoireFire],
    ['nl', S.nl ? 'Lightning Turret Lv ' + (S.nl + 1) : 'Lightning Turret', S.nl ? '+' + C.gmChainPerLvl + ' chain (' + gChain() + ' → ' + gChain(S.nl + 1) + ' chains) · turret attack speed +' + pc(C.gmTurAS) + '% (' + Math.round(100 * gTurAS(S.nl)) + '% → ' + Math.round(100 * gTurAS(S.nl + 1)) + '%)' : 'Adds a turret that auto-zaps enemies in range for 100% damage and stuns them for ' + C.gmStun + 's · ' + pc(C.teslaChance) + '% chance to inflict Tesla (electrocutes the ' + C.teslaTargets + ' nearest enemies, and its arcs can spread Tesla)', IMAGE_FILES.augGrimoireLightning],
    ['ni', S.ni ? 'Ice Turret Lv ' + (S.ni + 1) : 'Ice Turret', S.ni ? 'Slow +' + pc(C.gmSlow) + '% per level, stacks hyperbolically (never reaches 100%) · ' + Math.round(100 * gSlowP()) + '% → ' + Math.round(100 * gSlowP(S.ni + 1)) + '% slow · AOE radius +' + pc(C.gmIceRPerLvl) + '% (' + gIce().toFixed(1) + ' → ' + gIce(S.ni + 1).toFixed(1) + ') · turret attack speed +' + pc(C.gmTurAS) + '% (' + Math.round(100 * gTurAS(S.ni)) + '% → ' + Math.round(100 * gTurAS(S.ni + 1)) + '%)' : 'Adds a turret that shoots Ice: ' + pc(C.gmIceDmg) + '% damage in an AOE and slows enemies by ' + pc(C.gmSlow) + '% · hitting an already slowed enemy freezes it for ' + C.freezeT + 's', IMAGE_FILES.augGrimoireIce]
  ].map(a => '<button class="opt aug" data-k="' + a[0] + '"><img class="aicon" src="' + a[3] + '" alt=""><div><b>' + a[1] + '</b><span>' + a[2] + '</span></div></button>').join('');
}
