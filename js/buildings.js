// ======================================================================
// BUILDINGS (removed) - bdHit / bdPush now forward to the tree collision in trees.js (load trees.js first)
// The procedural city blocks and roads are gone. This file only keeps empty versions of the old functions,
// so any other file that still calls them keeps working: nothing is ever a building, nothing blocks walking.
// Once nothing calls bdGet / bdBlock / bdSteer / bdHit / bdPush any more, you can delete this file and its <script> tag.
// ======================================================================

let bdLastT = 0;

const bdCell = 800;

const bdK = 2;

const bdRW = 110;

const bdSW = 72;

const bdCache = new Map();

// Deterministic pseudo-random number (0-1) for grid cell (a, b) and channel c.
const bdHash = (a, b, c) => {
  let h = Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

// Darkens / lightens a "#rrggbb" colour by factor f and returns an rgb() string.
const bdShade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const c = v => Math.min(255, Math.round(v * f));
  return 'rgb(' + c(n >> 16 & 255) + ',' + c(n >> 8 & 255) + ',' + c(n & 255) + ')';
};

// There are no buildings: every grid cell is empty.
const bdGen = (cx, cy) => null;

const bdGet = (cx, cy) => null;

// Segment-vs-building test: nothing to hit.
const bdSegHit = (p, m, x0, y0, x1, y1) => false;

// No building ever blocks a straight line.
const bdBlock = (x0, y0, x1, y1, m) => null;

// No building in the way, so no detour waypoint (null = walk straight).
const bdSteer = (e, tx, ty, dt, r) => trSteer(e, tx, ty, r);   // trees.js: detour around trunks

// No point is inside a building.
const bdHit = (x, y) => TR.blockShots && trHit(x, y, 0);   // trees.js: true inside a tree trunk

// No building pushes anyone back.
const bdPush = (e, r, sl, tx, ty) => { trPush(e, r, sl, tx, ty); };   // trees.js: slide out of tree trunks
