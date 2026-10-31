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
// Basic Zombie: 3D walking model (Walking_1_.fbx) pre-rendered to sprites: 8 facing directions (rows) x 8 walk frames (columns), drawn at half size
// IMG holds the loaded image files: z = zombie sheet, m = giant zombie sheet, r = player mage sheet, b/h = sword blade and hilt.
const IMG = { b: new Image(), h: new Image(), r: new Image(), z: new Image(), m: new Image() };

// ZOM = zombie sheet layout; ZV / ZP / BPX = tinted or pixelated copies of the zombie and boss sheets (built once the images load).
const ZOM = { cw: 79, ch: 108, ox: 39.67, oy: 88.67, pw: 20, ph: 27 };

const ZV = {};

const ZP = {};

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

IMG.z.onload = () => {
  ZV.r = tintAtlas(IMG.z, 'source-atop', 'rgba(150,60,235,.4)');
  ZV.w = tintAtlas(IMG.z, 'source-in', '#fff');
  try {
    ZP.z = pixAtlas(IMG.z, ZOM.cw, ZOM.ch, ZOM.pw, ZOM.ph);
    ZP.r = tintAtlas(ZP.z, 'source-atop', 'rgba(150,60,235,.4)');
    ZP.w = tintAtlas(ZP.z, 'source-in', '#fff');
  }
  catch (e) { }
};

IMG.z.src = 'assets/images/zombie-sheet.png';

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

IMG.m.src = 'assets/images/giant-zombie-sheet.webp';

// ROBO = player mage sheet layout (cell size and draw scale).
const ROBO = { cw: 88, ch: 126, sc: .5 };

IMG.r.src = 'assets/images/player-mage-sheet.png';

IMG.b.src = 'assets/images/sword-blade.png';

IMG.h.src = 'assets/images/sword-hilt.png';
