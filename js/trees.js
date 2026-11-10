// ======================================================================
// TREES (procedural)
// The world is split into square chunks. Each chunk deterministically (same seed = same forest) rolls
// a few groves; each grove gets a random number of trees, and every tree gets its own random size and flip.
// Trees never block walking. A tree only turns see-through while the player is standing behind it
// and the player's sprite actually overlaps that tree's canopy or trunk.
// ======================================================================

const TR = {
  src: 'assets/images/Tree.png',     // path to the tree sprite (298x320)
  cell: 1000,          // chunk size in world units
  baseH: 190,          // on-screen height of a size-1.0 tree (px)
  sMin: 1,            // smallest tree size multiplier
  sMax: 2,           // largest tree size multiplier
  grovesMax: 6,        // 0..grovesMax groves per chunk (weighted towards fewer)
  perMin: 5,           // fewest trees in a grove
  perMax: 22,          // most trees in a grove
  rMin: 110,           // grove radius range (world units)
  rMax: 330,
  fadeTo: .3,          // opacity of a tree that is hiding the player
  trunkR: 11,          // trunk collision radius (world units) of a size-1.0 tree; scales with tree size
  blockShots: true,    // bullets / rockets / enemy shots stop at trunks (set false to let them fly over)
  debug: false,        // true = draw the trunk collision circles
  fadeSpeed: 10,       // how fast the opacity eases (higher = snappier)
  sway: .05,           // wind sway: how far the treetop leans (0 = trees stand still; .05 = about 9 px at size 1)
  fallTime: 2,        // seconds a slashed tree takes to fall over before only the stump is left
  boomFade: .25,       // seconds a tree caught in an explosion takes to vanish
  stumpW: 56,          // on-screen width (px) of a size-1.0 stump (the stump sprite is auto-cropped to its visible part)
  stumpSink: .1,       // how far the stump sinks into the ground (fraction of its height)
  random: true,        // true = every new run grows a different forest (and hides its chests somewhere else); false = always the same forest from `seed`
  seed: 1337,          // forest seed (used as is when `random` is false)
  // sprite geometry (in sprite pixels): foot anchor, canopy ellipse, trunk box
  W: 298, H: 320, ax: 150, ay: 305,
  cx: 148, cy: 95, rx: 130, ry: 92,
  tw: 28, tTop: 150
};

const trImg = new Image();
trImg.src = TR.src;

// Stump sprites left behind by slashed trees: normal trees leave 'Tree Trunk', dead / gray trees leave 'DeadTree Trunk'.
const trTrunk = { normal: new Image(), dead: new Image() };
trTrunk.normal.src = 'assets/images/Tree Trunk.png';
trTrunk.dead.src = 'assets/images/DeadTree Trunk.png';
const trCrop = {};
let trRunS = null;      // the run (S) the cached chunks belong to
let trSeed = 1337;      // the forest seed of the current run (a new random one for every run while TR.random is true)
let trTime = 0;
let trWindPush = 0;
let trGust = 0;

const trCache = new Map();
let trLast = 0;
let trDt = .016;

// Small seeded random generator (mulberry32).
const trRng = seed => () => {
  seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

// Builds (once) the trees of chunk (ci, cj).
const trChunk = (ci, cj) => {
  if (trRunS !== S) {          // new run: forget cached trees (and so which ones were cut / blown up)
    trCache.clear();
    trRunS = S;
    trSeed = TR.random ? 1 + Math.floor(Math.random() * 1e9) : TR.seed;
  }
  const key = ci + ',' + cj;
  let c = trCache.get(key);
  if (c)
    return c;
  const rnd = trRng(Math.imul(ci, 374761393) ^ Math.imul(cj, 668265263) ^ trSeed);
  c = [];
  const groveList = [];
  const roll = rnd();
  const groves = roll < .06 ? 0 : roll < .2 ? 1 : roll < .4 ? 2 : roll < .6 ? 3 : roll < .8 ? 4 : roll < .93 ? 5 : TR.grovesMax;
  for (let gi = 0; gi < groves; gi++) {
    const r = TR.rMin + rnd() * (TR.rMax - TR.rMin);
    const m = r * .6;
    const gx = ci * TR.cell + m + rnd() * (TR.cell - 2 * m);
    const gy = cj * TR.cell + m + rnd() * (TR.cell - 2 * m);
    const n = TR.perMin + Math.floor(Math.pow(rnd(), 1.4) * (TR.perMax - TR.perMin + 1));
    const grove = [];
    groveList.push({ gx, gy, r, trees: grove });
    for (let i = 0; i < n; i++) {
      const s = TR.sMin + Math.pow(rnd(), 1.3) * (TR.sMax - TR.sMin);
      let x = 0, y = 0;
      // a few tries to avoid trunks stacking exactly on top of each other
      for (let k = 0; k < 8; k++) {
        const a = rnd() * 6.2832;
        const d = r * Math.sqrt(rnd());
        x = gx + Math.cos(a) * d;
        y = gy + Math.sin(a) * d;
        if (grove.every(o => Math.hypot(o.x - x, o.y - y) > 26 * (o.s + s)))
          break;
      }
      const t = { x, y, s, flip: rnd() < .5, a: 1, trk: 1, kind: bioTree(x, y), id: key + ',' + c.length, st: 0, fl: 0, fdir: 1 };   // kind = sprite that suits the grass here (biome.js); st: 0 standing, 1 blown up, 2 cut to a stump
      const was = S.trGone && S.trGone[t.id];
      if (was) {
        t.st = was;
        t.fl = 1;
      }
      grove.push(t);
      c.push(t);
    }
  }
  if (typeof chPlace === 'function')
    chPlace(c, groveList, key, rnd);          // chests.js: maybe hide a chest in one of the groves
  trCache.set(key, c);
  return c;
};

// Pushes every tree that could be on screen into `out` (the draw list that gets depth-sorted).
// SX / SY are the iso projection helpers from draw(); W / H the canvas size; (camX, camY) the camera in world units.
const trCollect = (SX, SY, W, H, camX, camY, out) => {
  const now = performance.now();
  trDt = Math.min(.1, (now - trLast) / 1000);
  trLast = now;
  if (typeof atmWind === 'function') {
    const wd = atmWind(atmT);
    trTime = atmT;
    trWindPush = (Math.cos(wd.dir) - Math.sin(wd.dir)) * wd.speed / ATM.windBase;
    trGust = wd.gust;
  }
  // world rectangle around the camera that can reach the screen (generous: trees are tall)
  const reach = W / 2 + H + 400;
  const x0 = Math.floor((camX - reach) / TR.cell);
  const x1 = Math.floor((camX + reach) / TR.cell);
  const y0 = Math.floor((camY - reach) / TR.cell);
  const y1 = Math.floor((camY + reach) / TR.cell);
  for (let i = x0; i <= x1; i++)
    for (let j = y0; j <= y1; j++)
      for (const t of trChunk(i, j)) {
        if (t.st === 1 && t.fl >= 1)
          continue;
        const dh = TR.baseH * t.s;
        const dw = dh * TR.W / TR.H;
        const x = SX(t.x, t.y);
        const y = SY(t.x, t.y);
        if (x < -dw || x > W + dw || y < -20 || y > H + dh)
          continue;
        out.push(t);
      }
  // forget chunks that are far away
  if (trCache.size > 48) {
    const ci = Math.floor(camX / TR.cell);
    const cj = Math.floor(camY / TR.cell);
    for (const k of [...trCache.keys()]) {
      const [a, b] = k.split(',').map(Number);
      if (Math.abs(a - ci) > 3 || Math.abs(b - cj) > 3)
        trCache.delete(k);
    }
  }
};

// Bounding box of the visible (non-transparent) pixels of a stump sprite, so it can be drawn from its real bottom centre
// whatever empty margin the PNG has. Falls back to the whole image if the browser blocks reading the pixels.
const trCropOf = (key, img) => {
  let c = trCrop[key];
  if (c)
    return c;
  c = { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
  try {
    const cv = document.createElement('canvas');
    cv.width = c.w;
    cv.height = c.h;
    const cx = cv.getContext('2d');
    cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, c.w, c.h).data;
    let x0 = c.w, y0 = c.h, x1 = -1, y1 = -1;
    for (let y = 0; y < c.h; y++)
      for (let x = 0; x < c.w; x++)
        if (d[(y * c.w + x) * 4 + 3] > 40) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
    if (x1 >= x0 && y1 >= y0)
      c = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  catch (e) { }
  trCrop[key] = c;
  return c;
};

// On-screen height (px) of the stump of tree t. Every kind of tree uses the SAME stump height (taken from the normal 'Tree Trunk'
// sprite), so the cut is at the same place on the body of normal, dead and gray trees alike.
const trStumpH = t => {
  const img = trTrunk.normal.naturalWidth ? trTrunk.normal : trTrunk.dead;
  if (!img.naturalWidth)
    return 30 * t.s;
  const c = trCropOf(img === trTrunk.normal ? 'normal' : 'dead', img);
  return TR.stumpW * t.s * c.h / c.w;
};

// Draws the stump of a cut tree at its foot (x, y), stretched to the common stump height.
const trStump = (g, t, x, y) => {
  const key = t.kind === 'dead' || t.kind === 'gray' ? 'dead' : 'normal';
  const img = trTrunk[key];
  if (!img.naturalWidth)
    return;
  const c = trCropOf(key, img);
  const w = TR.stumpW * t.s;
  const h = trStumpH(t);
  g.save();
  g.imageSmoothingEnabled = false;
  if (t.flip) {
    g.translate(x, 0);
    g.scale(-1, 1);
    g.translate(-x, 0);
  }
  g.drawImage(img, c.x, c.y, c.w, c.h, Math.round(x - w / 2), Math.round(y - h * (1 - TR.stumpSink)), Math.round(w), Math.round(h));
  g.restore();
};

// Draws one tree. PL = the player's on-screen box and depth: { ps, l, r, t, b }.
const trDraw = (g, t, SX, SY, PL) => {
  const dh = TR.baseH * t.s;
  const dw = dh * TR.W / TR.H;
  const k = dh / TR.H;
  const x = SX(t.x, t.y);
  const y = SY(t.x, t.y);

  // progress of the vanishing / falling animation of a blown-up (1) or cut (2) tree
  if (t.st && t.fl < 1)
    t.fl = Math.min(1, t.fl + trDt / (t.st === 1 ? TR.boomFade : TR.fallTime));
  if (t.st === 2)
    trStump(g, t, x, y);
  const treeGone = t.st && t.fl >= 1;
  if (treeGone)
    return;

  // Does this tree hide the player? (player stands behind it AND the sprites overlap)
  let hides = false;
  if (!t.st && t.x + t.y >= PL.ps) {
    const ex = x + (TR.cx - TR.ax) * (t.flip ? -1 : 1) * k;
    const ey = y - (TR.ay - TR.cy) * k;
    const nx = Math.max(PL.l, Math.min(ex, PL.r));
    const ny = Math.max(PL.t, Math.min(ey, PL.b));
    const u = (nx - ex) / (TR.rx * k);
    const v = (ny - ey) / (TR.ry * k);
    const canopy = u * u + v * v < 1;
    const trunk = PL.r > x - TR.tw * k && PL.l < x + TR.tw * k && PL.b > y - (TR.ay - TR.tTop) * k && PL.t < y;
    hides = canopy || trunk;
  }
  const target = hides ? TR.fadeTo : 1;
  t.a += (target - t.a) * Math.min(1, trDt * TR.fadeSpeed);
  if (Math.abs(target - t.a) < .01)
    t.a = target;
  // a tree that is vanishing fades out (explosion) or topples over and fades at the end (slash)
  const alpha = t.a * (t.st === 1 ? 1 - t.fl : t.st === 2 ? 1 - Math.max(0, (t.fl - .55) / .45) : 1);

  // soft ground shadow (not faded)
  g.fillStyle = '#0003';
  g.globalAlpha = t.st ? 1 - t.fl : 1;
  g.beginPath();
  g.ellipse(x, y - 2, dw * .26, dw * .1, 0, 0, 6.3);
  g.fill();
  g.globalAlpha = 1;

  if (TR.debug && !t.st) {
    const R = TR.trunkR * t.s;
    g.strokeStyle = '#f00';
    g.beginPath();
    g.ellipse(x, y, R * 1.414, R * .707, 0, 0, 6.3);
    g.stroke();
  }
  let img = bioTreeImg[t.kind];
  if (!img || !img.naturalWidth)
    img = trImg;
  if (!img.naturalWidth)
    return;
  g.save();
  g.imageSmoothingEnabled = false;
  g.globalAlpha = alpha;
  if (t.st === 2) {
    // cut: only the part above the stump falls. The cut line is the top of the stump; the piece pivots around it.
    const sh = trStumpH(t) * (1 - TR.stumpSink);
    // measure where this sprite's trunk really ends (last visible row), so the cut is above its true foot whatever the PNG's margins
    const foot = trCropOf('tree:' + t.kind, img);
    const fy = img.naturalHeight / TR.H;               // the sprite may not be exactly 298x320: work in that size
    const footRow = (foot.y + foot.h) / fy;
    const pivotY = y - (TR.ay - footRow) * k - sh;
    const cutS = footRow - sh / k;                     // sprite row where the cut is
    g.translate(x, pivotY);
    g.rotate(t.fdir * 1.45 * t.fl * t.fl);             // topples away from the player
    if (t.flip)
      g.scale(-1, 1);
    g.drawImage(img, 0, 0, img.naturalWidth, cutS * fy, Math.round(-TR.ax * k), Math.round(-cutS * k), Math.round(dw), Math.round(cutS * k));
    g.restore();
    return;
  }
  if (TR.sway) {
    // wind sway: the treetop leans with the wind (skew around the foot), with a slow gust wave and a small flutter, different for every tree
    g.translate(x, y);
    const ph = t.x * .013 + t.y * .017;
    const sk = TR.sway * (trWindPush * .8 + Math.sin(trTime * 1.7 + ph) * .3 * (.3 + trGust) + Math.sin(trTime * 3.3 + ph * 2.1) * .07);
    g.transform(1, 0, -sk, 1, 0, 0);
    g.translate(-x, -y);
  }
  if (t.flip) {
    g.translate(x, 0);
    g.scale(-1, 1);
    g.translate(-x, 0);
  }
  g.drawImage(img, Math.round(x - TR.ax * k), Math.round(y - TR.ay * k), Math.round(dw), Math.round(dh));
  g.restore();
};

// ----------------------------------------------------------------------
// COLLISION: only the trunk is solid (a circle at the tree's foot); canopies are walk-under.
// ----------------------------------------------------------------------

// Calls fn(tree) for every tree in the chunk around (x, y) and its 8 neighbours (groves can spill over chunk edges).
const trEach = (x, y, fn) => {
  const ci = Math.floor(x / TR.cell);
  const cj = Math.floor(y / TR.cell);
  for (let i = ci - 1; i <= ci + 1; i++)
    for (let j = cj - 1; j <= cj + 1; j++)
      for (const t of trChunk(i, j))
        if (t.st !== 1)         // stumps (2) stay solid; only blown-up trees (1) are gone
          fn(t);
};

// Is the point (x, y) inside a trunk (grown by radius r)?
const trHit = (x, y, r) => {
  let hit = false;
  trEach(x, y, t => {
    const m = (r || 0) + TR.trunkR * t.s;
    if (!hit && (t.x - x) * (t.x - x) + (t.y - y) * (t.y - y) < m * m)
      hit = true;
  });
  return hit;
};

// Pushes entity e (needs .x, .y; radius r) out of every trunk it overlaps.
// If sl > 0 and a target (tx, ty) is given and the trunk is between e and the target, e also slides sideways
// around the trunk (towards whichever side is closer to the target) by sl, so chasing enemies walk around trees.
const trPush = (e, r, sl, tx, ty) => {
  for (let it = 0; it < 2; it++)
    trEach(e.x, e.y, t => {
      const m = (r || 0) + TR.trunkR * t.s;
      let dx = e.x - t.x;
      let dy = e.y - t.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= m * m)
        return;
      const d = Math.sqrt(d2);
      if (d < 1e-6) {
        dx = 1;
        dy = 0;
      }
      else {
        dx /= d;
        dy /= d;
      }
      e.x = t.x + dx * m;
      e.y = t.y + dy * m;
      if (sl > 0 && tx !== undefined && (tx - e.x) * dx + (ty - e.y) * dy < 0) {
        let px = -dy;
        let py = dx;
        if ((tx - e.x) * px + (ty - e.y) * py < 0) {
          px = -px;
          py = -py;
        }
        let nx = e.x + px * sl - t.x;
        let ny = e.y + py * sl - t.y;
        const l = Math.hypot(nx, ny) || 1;
        e.x = t.x + nx / l * m;
        e.y = t.y + ny / l * m;
      }
    });
};

// Path steering for chasing enemies: if a trunk is in the way of the straight line from e to (tx, ty),
// returns a unit direction [ux, uy] that goes around it; otherwise null (walk straight).
const trSteer = (e, tx, ty, r) => {
  const sx = tx - e.x;
  const sy = ty - e.y;
  const L = Math.hypot(sx, sy) || 1;
  const ux = sx / L;
  const uy = sy / L;
  let best = null;
  let bd = 1e9;
  trEach(e.x, e.y, t => {
    const rx = t.x - e.x;
    const ry = t.y - e.y;
    const along = rx * ux + ry * uy;              // distance along the path to the point closest to the trunk
    if (along < 0 || along > Math.min(L, 140))
      return;
    const side = rx * -uy + ry * ux;              // sideways offset of the trunk from the path (+ = left)
    const m = (r || 0) + TR.trunkR * t.s + 4;
    if (Math.abs(side) >= m || along >= bd)
      return;
    bd = along;
    const dir = side > 0 ? -1 : 1;                // go round on the side away from the trunk's centre
    best = [t.x + -uy * dir * (m + 6) - e.x, t.y + ux * dir * (m + 6) - e.y];
  });
  if (!best)
    return null;
  const l = Math.hypot(best[0], best[1]) || 1;
  return [best[0] / l, best[1] / l];
};

// ----------------------------------------------------------------------
// DESTRUCTION: explosions blow trees away, sword slashes cut them down to a stump.
// What was destroyed is remembered in S.trGone for the whole run (chunks are rebuilt from the seed when they scroll back in).
// Stumps stay solid like the trunk they were cut from; blown-up trees leave nothing behind.
// ----------------------------------------------------------------------

// Calls fn(tree) for every tree (standing or not) in the chunk around (x, y) and its 8 neighbours.
const trNear = (x, y, fn) => {
  const ci = Math.floor(x / TR.cell);
  const cj = Math.floor(y / TR.cell);
  for (let i = ci - 1; i <= ci + 1; i++)
    for (let j = cj - 1; j <= cj + 1; j++)
      for (const t of trChunk(i, j))
        fn(t);
};

// mode 1 = blown away, 2 = cut down (topples in direction dir: +1 screen right, -1 screen left)
const trKill = (t, mode, dir) => {
  if (!S.trGone)
    S.trGone = {};
  S.trGone[t.id] = mode;
  t.st = mode;
  t.fl = 0;
  t.fdir = dir;
  if (mode === 2 && typeof sfx === 'function')
    sfx('treefall');         // a cut tree crashes down (audio.js)
};

// An explosion of radius r at (x, y): every standing tree inside it disappears.
const trBlast = (x, y, r) => {
  trNear(x, y, t => {
    if (!t.st && Math.hypot(t.x - x, t.y - y) <= r + TR.trunkR * t.s)
      trKill(t, 1, 1);
  });
};

// A sword swing from (x, y): radius R, sector centred on angle `mid`, half-width `half` (the same sector that hits enemies).
const trSlash = (x, y, R, mid, half) => {
  trNear(x, y, t => {
    if (t.st)
      return;
    const dx = t.x - x;
    const dy = t.y - y;
    if (Math.hypot(dx, dy) > R + TR.trunkR * t.s)
      return;
    let da = Math.atan2(dy, dx) - mid;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) <= half)
      trKill(t, 2, dx - dy >= 0 ? 1 : -1);
  });
};

// A round slash area (the Swirl sword) centred on (x, y); trees fall away from the centre.
const trSlashCircle = (x, y, R) => {
  trNear(x, y, t => {
    if (!t.st && Math.hypot(t.x - x, t.y - y) <= R + TR.trunkR * t.s)
      trKill(t, 2, t.x - x - (t.y - y) >= 0 ? 1 : -1);
  });
};
