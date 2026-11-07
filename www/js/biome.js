// ======================================================================
// BIOMES (procedural ground colour)
// The world is painted with grass that slowly changes colour as you walk:
//   GreenGrass -> lessGreenGrass -> YellowGreenGrass -> YellowGrass -> moreYellowGrass -> DeadGrass
// A smooth noise field decides the stage at every point, so you always pass through the in-between shades.
// Trees ask bioTree(x, y) which sprite to use for the grass they stand on (see trees.js).
// To add an image: put it in assets/images and list it in BIO.grass / BIO.trees below (and in loader.js).
// ======================================================================

const BIO = {
  cell: 2500,        // size of one noise cell in world units (bigger = larger regions of one colour)
  clear: 2500,       // everything this close to the world origin (the start) stays green
  seed: 4242,
  warp: 700,         // how far borders are bent sideways (world units); bigger = more winding
  jag: .12,          // roughness of the borders: 0 = smooth, higher = more jagged and speckled
  tile: 100,          // size of one ground tile in world units (was 80; smaller = smaller grass tiles on screen)
  fade: .35,         // soft transition between two grass colours: share of each colour band that blends into its neighbour (0 = hard edges, .5 = blend everywhere)
  zoom: 1,           // grass images per ground tile edge (tile = BIO.tile units): 1 = one image per tile, 2 = images half as big, 3 = a third ...
  grass: ['GreenGrass', 'lessGreenGrass', 'YellowGreenGrass', 'YellowGrass', 'moreYellowGrass', 'DeadGrass'],
  // tree sprite used on each grass stage (same order as `grass`); keys of BIO.trees
  treeOn: ['tree', 'tree', 'yellowGreen', 'yellow', 'yellow', ['dead', 'gray']],   // a list = a random pick per tree
  trees: {
    tree: 'Tree',
    yellowGreen: 'YellowGreenTree',
    yellow: 'YellowTree',
    dead: 'DeadTree',
    gray: 'GrayTree'
  },
  // flying leaf sprite used on each grass stage (same order as `grass`); keys of BIO.leaves
  leafOn: ['green', 'green', 'yellowGreen', 'yellowGreen', 'yellowGreen', 'gray'],
  leaves: {
    green: 'GreenLeaf',
    yellowGreen: 'YellowGreenLeaf',
    gray: 'GrayLeaf'
  }
};

const bioLoad = name => {
  const img = new Image();
  img.src = 'assets/images/' + name + '.png';
  return img;
};
const bioGrassImg = BIO.grass.map(bioLoad);
const bioTreeImg = {};
for (const k in BIO.trees)
  bioTreeImg[k] = bioLoad(BIO.trees[k]);
const bioLeafImg = {};
for (const k in BIO.leaves)
  bioLeafImg[k] = bioLoad(BIO.leaves[k]);

// Deterministic random value in [0, 1) for a noise lattice point.
const bioHash = (i, j) => {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(BIO.seed, 2246822519);
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
};

// Smooth value noise in [0, 1].
const bioNoise = (x, y) => {
  const i = Math.floor(x);
  const j = Math.floor(y);
  let u = x - i;
  let v = y - j;
  u = u * u * (3 - 2 * u);
  v = v * v * (3 - 2 * v);
  const a = bioHash(i, j) + (bioHash(i + 1, j) - bioHash(i, j)) * u;
  const b = bioHash(i, j + 1) + (bioHash(i + 1, j + 1) - bioHash(i, j + 1)) * u;
  return a + (b - a) * v;
};

// Grass "position" along the colour scale at world point (x, y): 0 ... 6 (whole part = stage, 0 = GreenGrass ... 5 = DeadGrass;
// the fraction says how far across that stage's band we are, which the ground drawing uses to fade into the next colour).
// The big noise sets the broad regions; a warp plus finer noise and a little per-tile randomness make the borders ragged.
const bioField = (x, y) => {
  const wx = x + (bioNoise(x / BIO.warp + 11, y / BIO.warp + 29) - .5) * BIO.warp * 1.8;     // domain warp: bends the borders
  const wy = y + (bioNoise(x / BIO.warp + 53, y / BIO.warp + 7) - .5) * BIO.warp * 1.8;
  const n = bioNoise(wx / BIO.cell, wy / BIO.cell) * .75 + bioNoise(wx / BIO.cell * 2.3 + 91, wy / BIO.cell * 2.3 + 47) * .25;
  let v = Math.max(0, Math.min(1, (n - .25) / .5));                 // value noise clusters near .5: stretch it over 0..1
  v += (bioNoise(x / 350 + 17, y / 350 + 88) - .5) * BIO.jag * 1.6       // mid-size bumps
    + (bioNoise(x / 120 + 300, y / 120 + 301) - .5) * BIO.jag          // small bumps
    + (bioHash(Math.floor(x / 80), Math.floor(y / 80)) - .5) * BIO.jag * .5;   // single-tile speckle along the edge
  v = Math.max(0, Math.min(.999, v));
  v *= Math.min(1, Math.hypot(x, y) / BIO.clear);                   // the start area stays green
  return Math.min(BIO.grass.length - .001, v * BIO.grass.length);
};

// Grass stage (0 = GreenGrass ... 5 = DeadGrass) at world point (x, y).
const bioStage = (x, y) => Math.floor(bioField(x, y));

// Which tree sprite key grows at (x, y).
const bioTree = (x, y) => {
  const o = BIO.treeOn[bioStage(x, y)];
  return Array.isArray(o) ? o[Math.floor(bioHash(Math.floor(x), Math.floor(y) + 777) * o.length)] : o;
};

// Which leaf sprite key blows over (x, y).
const bioLeaf = (x, y) => BIO.leafOn[bioStage(x, y)];

// Per-tile grass data never changes, so it is worked out once and remembered (the noise maths used to run for every tile every frame).
const bioTileCache = new Map();

// cos / sin of a quarter turn r = 0..3
const bioCos = [1, 0, -1, 0];
const bioSin = [0, 1, 0, -1];

// Stage of tile (i, j) plus the neighbouring colour (and how strongly) that fades in over it: { st, other, al }.
const bioTile = (i, j, T, fw) => {
  const key = i * 4194304 + j;
  let d = bioTileCache.get(key);
  if (d)
    return d;
  const N = BIO.grass.length;
  const f = bioField(i * T + T / 2, j * T + T / 2);
  const st = Math.floor(f);
  const t = f - st;
  // near the border of two colours this tile also gets the neighbouring colour painted over it, up to half strength right on the border
  let other = -1;
  let al = 0;
  if (fw > 0) {
    if (t > 1 - fw && st < N - 1) {
      other = st + 1;
      al = (t - (1 - fw)) / fw * .5;
    }
    else if (t < fw && st > 0) {
      other = st - 1;
      al = (fw - t) / fw * .5;
    }
    if (al <= .01)
      other = -1;
  }
  d = { st, other, al };
  if (bioTileCache.size > 9000)
    bioTileCache.clear();
  bioTileCache.set(key, d);
  return d;
};

// Paints the ground tiles i0..i1 x j0..j1 (tile size T) with the grass images. Returns false if no grass image is loaded
// yet, so the caller can fall back to the plain colour ground.
const bioDrawGround = (g, W, H, SX, SY, T, i0, i1, j0, j1) => {
  if (!bioGrassImg[0].naturalWidth)
    return false;
  const n = Math.max(1, Math.round(BIO.zoom));
  const fw = Math.max(0, Math.min(.5, BIO.fade));
  g.save();
  g.imageSmoothingEnabled = false;
  for (let i = i0; i < i1; i++)
    for (let j = j0; j < j1; j++) {
      const ax = SX(i * T, j * T);
      const ay = SY(i * T, j * T);
      if (ax < -T || ax > W + T || ay < -T || ay > H)
        continue;
      const d = bioTile(i, j, T, fw);
      let img = bioGrassImg[d.st];
      if (!img.naturalWidth)
        img = bioGrassImg[0];
      let img2 = null;
      if (d.other >= 0) {
        img2 = bioGrassImg[d.other];
        if (!img2.naturalWidth)
          img2 = null;
      }
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const k = (T + 1) / (w * n);                                  // +1: tiles overlap a little so no seams show
      const l = (T + 1) / (h * n);
      g.save();
      g.transform(k, k / 2, -l, l / 2, ax, ay);
      for (let a = 0; a < n; a++)
        for (let b = 0; b < n; b++) {
          // every image copy gets its own random turn (0/90/180/270 degrees; only 0/180 if the image is not square)
          const r = Math.floor(bioHash(i * n + a + 5003, j * n + b + 9001) * (w === h ? 4 : 2)) * (w === h ? 1 : 2);
          const c = bioCos[r];
          const s = bioSin[r];
          const cx = (a + .5) * w;
          const cy = (b + .5) * h;
          if (n > 1)
            g.save();
          g.transform(c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy);   // turn around the copy's centre (no save / restore per tile)
          g.drawImage(img, a * w, b * h);
          if (img2) {
            g.globalAlpha = d.al;
            g.drawImage(img2, a * w, b * h);
            g.globalAlpha = 1;
          }
          if (n > 1)
            g.restore();
        }
      g.restore();
    }
  g.restore();
  return true;
};
