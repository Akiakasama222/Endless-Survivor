// ======================================================================
// SPRITE SHEETS & IMAGES
// Loads the character / sword art from assets/images and builds the tinted + pixelated copies used for drawing.
// ======================================================================

// Detects which way this device's emoji font draws the dagger so the blade always faces the enemy
function emojiTip(ch) {
  try {
    const N = 96;
    const c = document.createElement('canvas');
    c.width = c.height = N;
    const x = c.getContext('2d');
    x.font = '64px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(ch, N / 2, N / 2);
    const d = x.getImageData(0, 0, N, N).data;
    const P = [];
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++)
        if (d[(j * N + i) * 4 + 3] > 80)
          P.push(i, j);
    const n = P.length / 2;
    if (n < 20)
      return null;
    let mx = 0;
    let my = 0;
    for (let k = 0; k < P.length; k += 2) {
      mx += P[k];
      my += P[k + 1];
    }
    mx /= n;
    my /= n;
    let a = 0;
    let b = 0;
    let s = 0;
    for (let k = 0; k < P.length; k += 2) {
      const u = P[k] - mx;
      const v = P[k + 1] - my;
      a += u * u;
      b += v * v;
      s += u * v;
    }
    const th = .5 * Math.atan2(2 * s, a - b);
    const ux = Math.cos(th);
    const uy = Math.sin(th);
    let gs = 0;
    let gn = 0;
    for (let k = 0; k < P.length; k += 2) {
      const o = (P[k + 1] * N + P[k]) * 4;
      const r = d[o];
      const g2 = d[o + 1];
      const b2 = d[o + 2];
      if (r - b2 > 70 && r > g2 - 10 && g2 > b2) {
        gs += (P[k] - mx) * ux + (P[k + 1] - my) * uy;
        gn++;
      }
    }
    if (gn > n * .04)
      return gs > 0 ? th + Math.PI : th;
    let lo = 0;
    let hi = 0;
    for (let k = 0; k < P.length; k += 2) {
      const t = (P[k] - mx) * ux + (P[k + 1] - my) * uy;
      if (t < lo)
        lo = t;
      if (t > hi)
        hi = t;
    }
    return hi < -lo ? th : th + Math.PI;
  }
  catch (err) {
    return null;
  }
}

{
  const t = emojiTip('🗡️');
  if (t !== null)
    C.swordRot = -t;
}

// Removes (in place) every element of array a for which f(element) is false - i.e. keeps only the elements where f returns true.
function cull(a, f) {
  let j = 0;
  for (let i = 0; i < a.length; i++)
    if (f(a[i]))
      a[j++] = a[i];
  a.length = j;
}

// Sword art: handle and blade are separate images so Sword Range can stretch only the blade
// Player art: Hooded Mage, 8 facing directions (S, SW, W, NW, N, NE, E, SE)
// Restless (the basic enemy): 3D models pre-rendered to sprite sheets, 16 directions (rows) x 8 frames (columns), 79 x 108 per frame, drawn at half size.
// IMG holds the loaded image files: m = giant zombie sheet, r = player mage sheet, b/h = sword blade and hilt.
const IMG = { b: new Image(), h: new Image(), r: new Image(), m: new Image() };

// ZOM = Restless sheet layout (frame size, centre column of the feet, tallest anchor used for the health bar, pixelated frame size).
// Rows are the 16 screen directions in steps of 22.5 degrees, starting at "facing the viewer" (S) and turning towards the left (S, SSW, SW, WSW, W ... N ... E ... SSE). restRow(angle) turns a screen angle (atan2(screenY, screenX), the way the Restless should face) into a row.
const ZOM = { cw: 79, ch: 108, ox: 39.5, oy: 90, pw: 20, ph: 27 };

const restRow = th => ((Math.round((th - Math.PI / 2) / (Math.PI / 8)) % 16) + 16) % 16;      // the sheets turn towards the LEFT after row 0 (row 4 = left, 12 = right)

// RS = the Restless sheets (30 frames per row, 2370 x 1728). The new sheets were rendered with the character's ground point at row 95 in every animation, so oy is the same (96) for all of them. oy = the row inside a frame where the feet touch the ground (differs a little per animation, so every animation is lined up on the same ground point).
// img = the loaded image, px = pixelated copy, w = white copy for the hit flash (px and w are built once the image has loaded).
const RS = {};

for (const [k, file, oy] of [
  ['idle', IMAGE_FILES.restlessIdle, 96],
  ['walk', IMAGE_FILES.restlessWalk, 96],
  ['atk', IMAGE_FILES.restlessAttack, 96],
  ['jump', IMAGE_FILES.restlessJump, 96],
  ['pwalk', IMAGE_FILES.restlessPurpleWalk, 96],
  ['pcast', IMAGE_FILES.restlessPurpleCast, 96],
  ['death', IMAGE_FILES.restlessDeath, 96],
  ['pdeath', IMAGE_FILES.restlessPurpleDeath, 96]
])
  RS[k] = { img: new Image(), oy, px: null, w: null, wp: null };

const BPX = {};

// Returns a copy of a sprite sheet painted with the colour `fill` using canvas composite mode `op` (e.g. "source-atop" tints only the visible pixels).
function tintAtlas(img, op, fill) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = op;
  x.fillStyle = fill;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

// Pixelated copy of a sprite atlas: every cell is shrunk to fw x fh, edges are hard (no anti-aliasing) and colours are posterised
function pixAtlas(img, cw, ch, fw, fh) {
  const nw = img.naturalWidth || img.width;
  const nh = img.naturalHeight || img.height;
  const cols = Math.round(nw / cw);
  const rows = Math.round(nh / ch);
  const c = document.createElement('canvas');
  c.width = cols * fw;
  c.height = rows * fh;
  const x = c.getContext('2d', { willReadFrequently: true });
  const t = document.createElement('canvas');
  const tx = t.getContext('2d');
  t.width = Math.ceil(cw / 2);
  t.height = Math.ceil(ch / 2);
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = 'high';
  tx.imageSmoothingEnabled = true;
  tx.imageSmoothingQuality = 'high';
  for (let r = 0; r < rows; r++)
    for (let k = 0; k < cols; k++) {
      tx.clearRect(0, 0, t.width, t.height);
      tx.drawImage(img, k * cw, r * ch, cw, ch, 0, 0, t.width, t.height);
      x.drawImage(t, 0, 0, t.width, t.height, k * fw, r * fh, fw, fh);
    }
  const d = x.getImageData(0, 0, c.width, c.height);
  const p = d.data;
  const q = v => Math.min(255, Math.round(v / 20) * 20);
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] < 120) {
      p[i] = p[i + 1] = p[i + 2] = p[i + 3] = 0;
    }
    else {
      p[i] = q(p[i]);
      p[i + 1] = q(p[i + 1]);
      p[i + 2] = q(p[i + 2]);
      p[i + 3] = 255;
    }
  }
  x.putImageData(d, 0, 0);
  return c;
}

for (const k in RS) {
  const R = RS[k];
  R.img.onload = () => {
    R.w = tintAtlas(R.img, 'source-in', '#fff');
    try {
      R.px = pixAtlas(R.img, ZOM.cw, ZOM.ch, ZOM.pw, ZOM.ph);
      R.wp = tintAtlas(R.px, 'source-in', '#fff');
    }
    catch (e) { }
  };
}

RS.idle.img.src = IMAGE_FILES.restlessIdle;
RS.walk.img.src = IMAGE_FILES.restlessWalk;
RS.atk.img.src = IMAGE_FILES.restlessAttack;
RS.jump.img.src = IMAGE_FILES.restlessJump;
RS.pwalk.img.src = IMAGE_FILES.restlessPurpleWalk;
RS.pcast.img.src = IMAGE_FILES.restlessPurpleCast;
RS.death.img.src = IMAGE_FILES.restlessDeath;
RS.pdeath.img.src = IMAGE_FILES.restlessPurpleDeath;

// Giant Zombie boss: Mutant_Run.fbx pre-rendered to sprites (5 directions x 8 run frames; the 3 right-facing directions are mirrored)
// BSP = giant zombie sheet layout (cell size, anchor, output size); MV = movement-direction lookup used for the boss.
const BSP = { cw: 369, ch: 276, ox: 184.8, oy: 229.35, dsc: 1.2, pw: 77, ph: 58 };

const MV = {};

IMG.m.onload = () => {
  try {
    BPX.z = pixAtlas(IMG.m, BSP.cw, BSP.ch, BSP.pw, BSP.ph);
    BPX.w = tintAtlas(BPX.z, 'source-in', '#fff');
  }
  catch (e) { }
};

IMG.m.src = IMAGE_FILES.giantZombie;

// ROBO = player mage sheet layout (cell size and draw scale).
const ROBO = { cw: 88, ch: 126, sc: .5 };

IMG.r.src = IMAGE_FILES.mage;

// M3D = the 3D mage: a Mixamo model (Standing_Run_Forward + Standing_1H_Magic_Attack_01) pre-rendered to small sprite sheets at 20 fps, so the game never runs any 3D.
// Both sheets have 8 rows = the way the mage faces (S, SW, W, NW, N, NE, E, SE, the same order as the old player-mage-sheet) and one column per animation frame.
//   cw / ch = size of one cell in the sheet, sc = draw scale (1 = sheet pixels; lower = smaller on screen), feet = row of the ground point under the character (drawn on the player's position)
//   fps = animation speed, runN / castN = frames in the run / cast sheet, castFrom = first cast frame played (the frames before it are the wind-up: skipping them makes the hand thrust line up with the shot leaving)
//   castMax = longest the cast plays (seconds); it is shortened so it always ends before the next shot. Cast column 0 is the idle pose.
const M3D = { cw: 96, ch: 80, sc: .87, feet: 68, fps: 20, runN: 15, castN: 24, castFrom: 6, castMax: .9, run: new Image(), cast: new Image() };

M3D.run.src = IMAGE_FILES.mageRun;
M3D.cast.src = IMAGE_FILES.mageCast;

// Draws the 3D mage standing at (px, py), facing sheet row fi: running while the player moves, casting right after each Grimoire shot, otherwise idle.
// Returns false while the sheets are not loaded, so the caller can fall back to the old single-pose sprite.
function drawMage3D(g, px, py, fi) {
  if (!M3D.run.naturalWidth || !M3D.cast.naturalWidth)
    return false;
  let img = M3D.cast;
  let col = 0;
  if (S.mv) {
    img = M3D.run;
    col = Math.floor(S.t * M3D.fps * (1 + C.moveSpeedPerLvl * S.nsp)) % M3D.runN;      // runs faster with Move Speed, like the archer's walk
  }
  else if (S.wp === 'grimoire' && S.st0 !== undefined) {
    const since = S.t - S.st0;
    const n = M3D.castN - M3D.castFrom;
    const dur = Math.max(.2, Math.min(M3D.castMax, .9 / rate()));      // never slower than normal, and over before the next shot
    if (since >= 0 && since < dur)
      col = M3D.castFrom + Math.min(n - 1, Math.floor(since / dur * n));
  }
  const dw = M3D.cw * M3D.sc;
  const dh = M3D.ch * M3D.sc;
  g.drawImage(img, col * M3D.cw, fi * M3D.ch, M3D.cw, M3D.ch, px - dw / 2, py - 3 - M3D.feet * M3D.sc, dw, dh);
  return true;
}

// M16 = the 16-direction mage used for the Rogue (knife) and the Grimoire. Like the archer it is drawn in two layers that turn independently:
//   Upper body (mage16-cast.png): 24 animation frames x 16 rows = the way the mage AIMS. Column 0 is the aiming / idle pose, columns castFrom..23 play after each shot.
//   Lower body (mage16-run-*.png): one sheet per running style (forward / right / back / left); the sheet is chosen by the movement direction relative to the aim.
// All five sheets were rendered with the same camera and pelvis position, so the layers fit without any offset: every cell is 96 x 80 and the feet are on row `feet`.
// Rows are the 16 screen directions in steps of 22.5 degrees, starting at "facing the viewer" (S) and turning towards the right (S, SSE, SE, ESE, E, ... N ... W ... SSW).
//   sc = draw scale (raise it for a bigger mage), idle = lower-body frame (of the forward sheet) used when standing still, runFps = leg animation speed,
//   castFrom = first cast frame played (the frames before it are the wind-up: skipping them makes the hand thrust line up with the shot leaving),
//   castMax = longest the cast plays (seconds); it is shortened so it always ends before the next shot, strafeSwap = flip left / right if the legs look mirrored,
//   on = false puts the old Rogue archer / Grimoire mage back.
const M16 = { on: true, cw: 96, ch: 80, sc: .94, feet: 66, castN: 24, castFrom: 6, castMax: .9, runFps: 15, idle: 0, strafeSwap: false,
  n: { f: 11, r: 12, b: 10, l: 12 }, up: new Image(), f: new Image(), r: new Image(), b: new Image(), l: new Image() };

M16.up.src = IMAGE_FILES.mage16Cast;
M16.f.src = IMAGE_FILES.mage16RunForward;
M16.r.src = IMAGE_FILES.mage16RunRight;
M16.b.src = IMAGE_FILES.mage16RunBack;
M16.l.src = IMAGE_FILES.mage16RunLeft;

// True when the 16-direction mage should be drawn for the current weapon (Rogue / Grimoire) and all of its sheets are loaded.
function mage16Ready() {
  return M16.on && (S.wp === 'gun' || S.wp === 'grimoire') && M16.up.naturalWidth > 0 && M16.f.naturalWidth > 0 && M16.r.naturalWidth > 0 && M16.b.naturalWidth > 0 && M16.l.naturalWidth > 0;
}

// Draws the two-layer mage standing at (px, py). aim = screen angle the upper body faces, mv = the screen angle the player is moving in (or null when standing still).
function drawMage16(g, px, py, aim, mv) {
  const row = ((Math.round((Math.PI / 2 - aim) / (Math.PI / 8)) % 16) + 16) % 16;
  let leg = 'f';
  let lf = M16.idle;
  if (mv !== null) {
    let rel = mv - aim;
    rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    const side = M16.strafeSwap ? -1 : 1;
    if (Math.abs(rel) > Math.PI * .75)
      leg = 'b';
    else if (Math.abs(rel) > Math.PI * .25)
      leg = rel * side > 0 ? 'r' : 'l';
    lf = Math.floor(S.t * M16.runFps * (1 + C.moveSpeedPerLvl * S.nsp)) % M16.n[leg];      // runs faster with Move Speed
  }
  let uf = 0;
  if (S.st0 !== undefined) {
    const since = S.t - S.st0;
    const n = M16.castN - M16.castFrom;
    const dur = Math.max(.2, Math.min(M16.castMax, .9 / rate()));      // never slower than normal, and over before the next shot
    if (since >= 0 && since < dur)
      uf = M16.castFrom + Math.min(n - 1, Math.floor(since / dur * n));
  }
  const dw = M16.cw * M16.sc;
  const dh = M16.ch * M16.sc;
  const x0 = px - dw / 2;
  const y0 = py - 3 - M16.feet * M16.sc;
  g.drawImage(M16[leg], lf * M16.cw, row * M16.ch, M16.cw, M16.ch, x0, y0, dw, dh);
  g.drawImage(M16.up, uf * M16.cw, row * M16.ch, M16.cw, M16.ch, x0, y0, dw, dh);
}

// Bow archer: the body is drawn in two layers that turn independently.
//   Upper body (aim / shoot sheets): 8 columns (animation frames) x 8 rows (direction the archer AIMS: S, SE, E, NE, N, NW, W, SW).
//   Lower body (walk sheets): same 8 x 8 layout; the sheet is chosen by the movement direction relative to the aim (forward / back / left / right).
// Sheets are shrunk to half size once at load (ARC) so they stay sharp when drawn small.
// up / lo = cell size of an upper / lower sheet, loDx / loDy = where the lower cell sits relative to the upper cell,
// ax / ay = the archer's feet inside the upper cell, sc = draw scale (raise it for a bigger archer), idle = lower-body frame used when standing still,
// walkFps / aimFps = animation speeds, shootMax = longest the shoot animation may take (seconds), strafeSwap = flip left / right if the legs look mirrored.
const ARCH = { up: { cw: 216, ch: 224 }, lo: { cw: 224, ch: 192 }, loDx: -4, loDy: 98, ax: 104, ay: 252, sc: .28, k: .5, idle: 0, walkFps: 10, aimFps: 6, shootMax: .4, strafeSwap: false };

const ARC = {};

// Loads one archer sheet and stores a half-size copy in ARC[key].
function loadArcherSheet(key, file) {
  const im = new Image();
  im.onload = () => {
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * ARCH.k);
    c.height = Math.round(im.naturalHeight * ARCH.k);
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';
    x.drawImage(im, 0, 0, c.width, c.height);
    ARC[key] = c;
  };
  im.src = file;
}

loadArcherSheet('aim', IMAGE_FILES.archerAim);
loadArcherSheet('shoot', IMAGE_FILES.archerShoot);
loadArcherSheet('f', IMAGE_FILES.archerWalkForward);
loadArcherSheet('b', IMAGE_FILES.archerWalkBack);
loadArcherSheet('l', IMAGE_FILES.archerWalkLeft);
loadArcherSheet('r', IMAGE_FILES.archerWalkRight);

// Draws the two-layer archer with its feet at (px, fy). aim = screen angle the upper body faces, mv = the screen angle the player is moving in (or null when standing still).
function drawArcher(g, px, fy, aim, mv) {
  const A = ARCH;
  const row = ((Math.round((Math.PI / 2 - aim) / (Math.PI / 4)) % 8) + 8) % 8;   // sheet rows run S, SE, E, NE, N, NW, W, SW
  let leg = 'f';
  let lf = A.idle;
  if (mv !== null) {
    let rel = mv - aim;
    rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    const side = A.strafeSwap ? -1 : 1;
    if (Math.abs(rel) > Math.PI * .75)
      leg = 'b';
    else if (Math.abs(rel) > Math.PI * .25)
      leg = rel * side > 0 ? 'r' : 'l';
    lf = Math.floor(S.t * A.walkFps * (1 + C.moveSpeedPerLvl * S.nsp)) % 8;
  }
  const since = S.t - (S.st0 === undefined ? -99 : S.st0);
  const dur = Math.min(A.shootMax, 1 / rate());
  const shooting = since >= 0 && since < dur;
  const up = shooting ? 'shoot' : 'aim';
  const uf = shooting ? Math.min(7, Math.floor(since / dur * 8)) : Math.floor(S.t * A.aimFps) % 8;
  const sc = A.sc;
  const x0 = px - A.ax * sc;
  const y0 = fy - A.ay * sc;
  if (ARC[leg])
    g.drawImage(ARC[leg], lf * A.lo.cw * A.k, row * A.lo.ch * A.k, A.lo.cw * A.k, A.lo.ch * A.k, x0 + A.loDx * sc, y0 + A.loDy * sc, A.lo.cw * sc, A.lo.ch * sc);
  if (ARC[up])
    g.drawImage(ARC[up], uf * A.up.cw * A.k, row * A.up.ch * A.k, A.up.cw * A.k, A.up.ch * A.k, x0, y0, A.up.cw * sc, A.up.ch * sc);
}

IMG.b.src = IMAGE_FILES.swordBlade;

IMG.h.src = IMAGE_FILES.swordHilt;

// SLI = the sword slash effect sheet (9 frames of 128 x 128 in a grid of 5 columns: frames 0-4 play while the blade swings, frames 5-8 fade it out afterwards).
// It is drawn flat on the ground in the isometric view (see slashFx in draw.js). cx / cy = the middle of the slash's arc inside a frame (this point is placed on the player),
// r = the outer radius of the arc in sprite pixels (scaled to the sword range), rot = how far (radians) the drawn sweep is turned so it is centred on the swing direction.
// size = makes the whole slash bigger (1 = its outer edge sits at the sword range; bigger pushes it further out, away from the player), dist = moves the slash's middle forward along the swing direction (ground units; 0 = centred on the player).
const SLI = new Image();
SLI.src = IMAGE_FILES.swordSlash;
const SLASH = { cw: 128, cols: 5, cx: 64, cy: 58, r: 47, rot: .0, size: 1.3, dist: 0 };

// The slash sheet is blue; this returns a copy recoloured to the rarity colour `rgb` ("r,g,b"), built once per colour. The shading is kept (white highlights stay white, darker parts stay darker), only the hue and saturation are swapped.
const SLT = {};
function slashTinted(rgb) {
  if (!SLI.naturalWidth)
    return SLI;
  if (SLT[rgb])
    return SLT[rgb];
  const hsl = (r, g, b) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d)
      return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1));
    const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h, s, l];
  };
  const rgbOf = (h, s, l) => {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(h % 2 - 1));
    const m = l - c / 2;
    const p = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
    return [(p[0] + m) * 255, (p[1] + m) * 255, (p[2] + m) * 255];
  };
  try {
    const c = document.createElement('canvas');
    c.width = SLI.naturalWidth;
    c.height = SLI.naturalHeight;
    const x = c.getContext('2d');
    x.drawImage(SLI, 0, 0);
    const im = x.getImageData(0, 0, c.width, c.height);
    const d = im.data;
    const q = rgb.split(',').map(v => v / 255);
    const tg = hsl(q[0], q[1], q[2]);
    const lift = tg[2] - .55;      // brighter rarity colours (Common, Mythical) lift the whole slash a little, darker ones dim it
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3])
        continue;
      const o = hsl(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255);
      const l = Math.max(0, Math.min(1, o[2] + lift * (1 - Math.max(0, (o[2] - .5) * 2))));      // pure white highlights are not lifted
      const n = rgbOf(tg[0], tg[1] * Math.min(1, .3 + o[1]), l);
      d[i] = n[0];
      d[i + 1] = n[1];
      d[i + 2] = n[2];
    }
    x.putImageData(im, 0, 0);
    return SLT[rgb] = c;
  }
  catch (e) {
    return SLT[rgb] = SLI;      // could not read the pixels: keep the original blue slash
  }
}
