// ======================================================================
// ROADS (random dirt roads)
// Winding roads that cross the world in both directions. They are painted with the "moreYellowGrass" texture (the same
// image the yellow biome uses), with soft edges, a faint brown tint so they still read as a path on yellow ground, and a
// darker rim. The layout is random: every new run gets its own roads (set ROAD.seed to a number to always get the same ones).
// Trees (trees.js) are never planted on a road. Loaded after biome.js; rdDraw() is called from draw().
// ======================================================================

const ROAD = {
  seed: 0,            // 0 = a new random layout every run; any other number = always the same layout
  texture: 4,         // which BIO.grass image paints the road (4 = moreYellowGrass)
  spacing: 2400,      // distance between neighbouring road lanes (world units); bigger = fewer roads
  chance: .55,        // chance that a lane really has a road (0 = no roads at all, 1 = every lane)
  width: 84,          // road width (world units); every road is a little wider or narrower than this
  edge: 26,           // width of the soft fading edge on each side
  wobble: 420,        // how far a road swings sideways in big curves
  wobbleLen: 1100,    // how long one big curve is
  fine: 60,           // small wiggle on top of the curves
  fineLen: 260,       // length of the small wiggle
  tint: .22,          // faint brown dirt colour over the road (0 = pure texture)
  rim: .16,           // darkness of the rim around the road (0 = none)
  treeGap: 14,        // trees keep at least this far away from the road edge
  step: 48            // how finely the curve is drawn (world units per segment)
};

let rdRunS = null;    // the run (S) the current layout belongs to
let rdSeed = 1;
let rdPat = null;
let rdPatImg = null;
let rdCache = null;   // the road paths currently built (see rdDraw)

// New run -> new random layout.
const rdSync = () => {
  if (rdRunS !== S) {
    rdRunS = S;
    rdSeed = ROAD.seed ? Math.floor(ROAD.seed) : 1 + Math.floor(Math.random() * 1e6);
  }
};

// Lane k of axis ax (0 = runs along x, 1 = runs along y): does it have a road, how wide, and where is its centre line at position t?
const rdExists = (ax, k) => bioHash(k + ax * 131, rdSeed + ax * 7) < ROAD.chance;

const rdWidth = (ax, k) => ROAD.width * (.8 + .4 * bioHash(k + ax * 131, rdSeed + 999));

const rdCenter = (ax, k, t) => {
  const o = rdSeed % 997 * .731 + ax * 57.3;
  return k * ROAD.spacing + (bioHash(k + ax * 131, rdSeed + 5) - .5) * ROAD.spacing * .3
    + (bioNoise(t / ROAD.wobbleLen + o + k * 7.7, k * 3.1 + o) - .5) * 2 * ROAD.wobble
    + (bioNoise(t / ROAD.fineLen + o + 50, k * 5.3 + o) - .5) * ROAD.fine;
};

// Greatest sideways distance a centre line can be from its lane's nominal position.
const rdReach = () => ROAD.spacing * .15 + ROAD.wobble + ROAD.fine;

// How far past the edge of the nearest road's flat part is (x, y)? Negative / zero = on the road. Used to keep trees off the roads.
const rdDist = (x, y) => {
  rdSync();
  let best = 1e9;
  for (let ax = 0; ax < 2; ax++) {
    const across = ax ? x : y;
    const along = ax ? y : x;
    const k0 = Math.round(across / ROAD.spacing);
    for (let k = k0 - 1; k <= k0 + 1; k++) {
      if (!rdExists(ax, k))
        continue;
      const d = Math.abs(across - rdCenter(ax, k, along)) - rdWidth(ax, k) / 2;
      if (d < best)
        best = d;
    }
  }
  return best;
};

// Paints every road that can be on screen (called from draw() right after the grass, before everything that stands on it).
function rdDraw(g, W, H) {
  rdSync();
  const img = bioGrassImg[ROAD.texture];
  if (!img || !img.naturalWidth)
    return;
  if (!rdPat || rdPatImg !== img) {
    rdPat = g.createPattern(img, 'repeat');
    rdPatImg = img;
    if (rdPat && rdPat.setTransform)
      rdPat.setTransform(new DOMMatrix().scale(BIO.tile / img.naturalWidth, BIO.tile / img.naturalHeight));   // same scale as a ground tile
  }
  if (!rdPat)
    return;
  const R = W / 4 + H / 2 + ROAD.width + ROAD.edge * 2 + 80;      // how far from the player a road can still touch the screen
  // the road paths are built for a bit more than the screen and reused until the player has walked ~400 units, not rebuilt every frame
  const slack = 400;
  const c = rdCache;
  if (!c || c.s !== S || c.R !== R || Math.abs(S.x - c.bx) > slack || Math.abs(S.y - c.by) > slack) {
    const A = rdReach();
    const Rb = R + slack;
    const roads = [];
    for (let ax = 0; ax < 2; ax++) {
      const across = ax ? S.x : S.y;
      const along = ax ? S.y : S.x;
      for (let k = Math.floor((across - Rb - A) / ROAD.spacing); k <= Math.ceil((across + Rb + A) / ROAD.spacing); k++) {
        if (!rdExists(ax, k))
          continue;
        const p = new Path2D();
        let first = true;
        for (let t = Math.floor((along - Rb) / ROAD.step) * ROAD.step; t <= along + Rb + ROAD.step; t += ROAD.step) {
          const cc = rdCenter(ax, k, t);
          const x = ax ? cc : t;
          const y = ax ? t : cc;
          if (first)
            p.moveTo(x, y);
          else
            p.lineTo(x, y);
          first = false;
        }
        roads.push({ p, w: rdWidth(ax, k) });
      }
    }
    rdCache = { s: S, R, bx: S.x, by: S.y, roads };
  }
  const roads = rdCache.roads;
  if (!roads.length)
    return;
  g.save();
  // draw in world coordinates: the same isometric projection the ground uses, so a round pen becomes a flat ellipse and the texture lies on the ground
  g.transform(1, .5, -1, .5, W / 2 - S.x + S.y, H / 2 - (S.x + S.y) * .5);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.imageSmoothingEnabled = false;
  // all roads get each layer before the next layer starts, so where two roads cross nothing is drawn over the other road's middle
  if (ROAD.rim > 0) {
    g.strokeStyle = 'rgba(55,38,15,' + ROAD.rim + ')';
    for (const r of roads) {
      g.lineWidth = r.w + ROAD.edge * 1.2;
      g.stroke(r.p);
    }
  }
  g.strokeStyle = rdPat;
  for (const [grow, alpha] of [[ROAD.edge * 1.5, .45], [0, 1]]) {   // soft edge + solid middle
    g.globalAlpha = alpha;
    for (const r of roads) {
      g.lineWidth = r.w + grow;
      g.stroke(r.p);
    }
  }
  g.globalAlpha = 1;
  if (ROAD.tint > 0) {
    g.strokeStyle = 'rgba(176,132,74,' + ROAD.tint + ')';
    for (const r of roads) {
      g.lineWidth = r.w;
      g.stroke(r.p);
    }
  }
  g.restore();
}
