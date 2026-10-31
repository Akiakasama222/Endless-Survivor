// ======================================================================
// BUILDINGS
// Procedural city blocks: where buildings are, how enemies steer around them and how they block walking.
// ======================================================================

// Buildings: the world is cut into square cells (bdCell px). Each cell may hold one building, generated on demand from a hash so it is always the same for a given cell.
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

// Colour palettes for house, apartment, shop and warehouse walls and roofs.
const bdWallH = ['#e9dcc0', '#d8c3a5', '#c7d3dc', '#e3b8a8', '#b9d1b0', '#f0e6d2'];

const bdRoofH = ['#b5473b', '#8a5236', '#4f6f94', '#5d6470', '#7a3b3b'];

const bdWallA = ['#a8a39c', '#b7b0a6', '#8f9aa6', '#c4b49a', '#9aa7a0'];

const bdWallS = ['#a67c52', '#8d6b4a', '#9aa09a'];

const bdWallW = ['#b9bec6', '#c9c2b0', '#a7b4a7'];

// Creates the building (type, footprint, height, colours) for grid cell (cx, cy), or null if that cell is empty or too close to the spawn point.
function bdGen(cx, cy) {
  const r = k => bdHash(cx, cy, k);
  const K = bdK;
  if (r(1) > .6)
    return null;
  const t = r(2);
  const ox = (cx + .5 + (r(3) - .5) * .3) * bdCell;
  const oy = (cy + .5 + (r(4) - .5) * .3) * bdCell;
  if (Math.abs(ox) < 200 && Math.abs(oy) < 200)
    return null;
  const pk = (a, k) => a[Math.floor(r(k) * a.length) % a.length];
  let kind;
  let w;
  let d;
  let h;
  let rh = 0;
  let wall;
  let roof;
  if (t < .42) {
    kind = 'house';
    w = 84 + r(7) * 28;
    d = 62 + r(8) * 22;
    h = 50 + r(9) * 10;
    rh = 26 + r(10) * 10;
    wall = pk(bdWallH, 5);
    roof = pk(bdRoofH, 6);
  }
  else if (t < .68) {
    kind = 'apt';
    w = 72 + r(7) * 28;
    d = 70 + r(8) * 30;
    h = Math.floor(3 + r(9) * 2) * 30 + 10;
    wall = pk(bdWallA, 5);
    roof = '#6f7580';
  }
  else if (t < .85) {
    kind = 'shed';
    w = 42 + r(7) * 14;
    d = 36 + r(8) * 10;
    h = 30 + r(9) * 6;
    rh = 8;
    wall = pk(bdWallS, 5);
    roof = '#555b63';
  }
  else {
    kind = 'wh';
    w = 150 + r(7) * 50;
    d = 80 + r(8) * 20;
    h = 56 + r(9) * 12;
    rh = 16 + r(10) * 8;
    wall = pk(bdWallW, 5);
    roof = '#6c7a89';
  }
  w *= K;
  d *= K;
  h *= K;
  rh *= K;
  return {
    fa: 1,
    kind,
    rx: ox,
    ry1: (cy + 1) * bdCell,
    x0: ox - w / 2,
    x1: ox + w / 2,
    y0: oy - d / 2,
    y1: oy + d / 2,
    h,
    rh,
    d: ox + oy,
    s: Math.floor(r(11) * 1e6),
    cL: bdShade(wall, .92),
    cR: bdShade(wall, .72),
    cT: bdShade(roof, 1),
    cRf: bdShade(roof, 1),
    cRb: bdShade(roof, .84),
    cRd: bdShade(roof, .7)
  };
}

// Cached lookup of the building in a grid cell.
function bdGet(cx, cy) {
  const k = (cx + 32768) * 65536 + (cy + 32768);
  let p = bdCache.get(k);
  if (p === undefined) {
    p = bdGen(cx, cy);
    if (bdCache.size > 3000)
      bdCache.clear();
    bdCache.set(k, p);
  }
  return p;
}

// path steering: when a building is in the way, head for the best corner of it (expanded by the walker's radius) instead of pushing into the wall
// Does the segment (x0,y0)->(x1,y1) pass through building p grown by margin m? Returns how far along the segment it first hits, or -1.
function bdSegHit(p, m, x0, y0, x1, y1) {
  const rx0 = p.x0 - m;
  const rx1 = p.x1 + m;
  const ry0 = p.y0 - m;
  const ry1 = p.y1 + m;
  const dx = x1 - x0;
  const dy = y1 - y0;
  let t0 = 0;
  let t1 = 1;
  let pp;
  let qq;
  let r;
  for (let i = 0; i < 4; i++) {
    if (i === 0) {
      pp = -dx;
      qq = x0 - rx0;
    }
    else if (i === 1) {
      pp = dx;
      qq = rx1 - x0;
    }
    else if (i === 2) {
      pp = -dy;
      qq = y0 - ry0;
    }
    else {
      pp = dy;
      qq = ry1 - y0;
    }
    if (pp === 0) {
      if (qq < 0)
        return false;
    }
    else {
      r = qq / pp;
      if (pp < 0) {
        if (r > t1)
          return false;
        if (r > t0)
          t0 = r;
      }
      else {
        if (r < t0)
          return false;
        if (r < t1)
          t1 = r;
      }
    }
  }
  return t1 > t0;
}

// Returns the nearest building blocking the straight line between two points (with margin m), or null.
function bdBlock(x0, y0, x1, y1, m) {
  let best = null;
  let bd = 1e18;
  const a0 = Math.floor(Math.min(x0, x1) / bdCell);
  const a1 = Math.floor(Math.max(x0, x1) / bdCell);
  const b0 = Math.floor(Math.min(y0, y1) / bdCell);
  const b1 = Math.floor(Math.max(y0, y1) / bdCell);
  for (let a = a0; a <= a1; a++)
    for (let b = b0; b <= b1; b++) {
      const p = bdGet(a, b);
      if (!p || !bdSegHit(p, m, x0, y0, x1, y1))
        continue;
      const qx = Math.max(p.x0, Math.min(x0, p.x1));
      const qy = Math.max(p.y0, Math.min(y0, p.y1));
      const d = (qx - x0) * (qx - x0) + (qy - y0) * (qy - y0);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
  return best;
}

// Path steering for enemies: returns a waypoint that goes around a blocking building towards (tx, ty), or null if the way is clear.
function bdSteer(e, tx, ty, dt, r) {
  if (e.wp && Math.hypot(e.wp[0] - e.x, e.wp[1] - e.y) < 26) {
    e.wp = null;
    e.wt = 0;
  }
  e.wt = (e.wt || 0) - dt;
  if (e.wt <= 0) {
    e.wt = .12 + Math.random() * .1;
    const p = bdBlock(e.x, e.y, tx, ty, r + 2);
    if (!p)
      e.wp = null;
    else {
      const m = r + 14;
      const cs = [[p.x0 - m, p.y0 - m], [p.x1 + m, p.y0 - m], [p.x1 + m, p.y1 + m], [p.x0 - m, p.y1 + m]];
      let best = null;
      let bl = 1e18;
      let bi = 0;
      for (let i = 0; i < 4; i++) {
        const c = cs[i];
        if (Math.hypot(c[0] - e.x, c[1] - e.y) < 30 || bdSegHit(p, 2, e.x, e.y, c[0], c[1]))
          continue;
        let L = Math.hypot(c[0] - e.x, c[1] - e.y) + Math.hypot(c[0] - tx, c[1] - ty);
        if (e.wk === p && e.wi === i)
          L -= 80;
        if (L < bl) {
          bl = L;
          best = c;
          bi = i;
        }
      }
      if (best) {
        e.wp = best;
        e.wk = p;
        e.wi = bi;
      }
      else
        e.wp = null;
    }
  }
  if (!e.wp)
    return null;
  const dx = e.wp[0] - e.x;
  const dy = e.wp[1] - e.y;
  const d = Math.hypot(dx, dy) || 1;
  return [dx / d, dy / d];
}

// Is the point (x, y) inside a building?
function bdHit(x, y) {
  const p = bdGet(Math.floor(x / bdCell), Math.floor(y / bdCell));
  return !!p && x > p.x0 && x < p.x1 && y > p.y0 && y < p.y1;
}

// collisions: buildings block walking (circle of radius r vs the building footprint); sl = extra sliding speed so chasers go around corners
function bdPush(e, r, sl, tx, ty) {
  const ca = Math.floor((e.x - r) / bdCell);
  const cb = Math.floor((e.x + r) / bdCell);
  const da = Math.floor((e.y - r) / bdCell);
  const db = Math.floor((e.y + r) / bdCell);
  for (let a = ca; a <= cb; a++)
    for (let b = da; b <= db; b++) {
      const p = bdGet(a, b);
      if (!p)
        continue;
      const qx = Math.max(p.x0, Math.min(e.x, p.x1));
      const qy = Math.max(p.y0, Math.min(e.y, p.y1));
      const dx = e.x - qx;
      const dy = e.y - qy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r * r)
        continue;
      let ax;
      if (d2 > 1e-4) {
        const d = Math.sqrt(d2);
        const pu = r - d;
        e.x += dx / d * pu;
        e.y += dy / d * pu;
        ax = Math.abs(dx) > Math.abs(dy) ? 0 : 1;
      }
      else {
        const l = e.x - p.x0;
        const rr = p.x1 - e.x;
        const t = e.y - p.y0;
        const bt = p.y1 - e.y;
        const m = Math.min(l, rr, t, bt);
        if (m === l) {
          e.x = p.x0 - r;
          ax = 0;
        }
        else if (m === rr) {
          e.x = p.x1 + r;
          ax = 0;
        }
        else if (m === t) {
          e.y = p.y0 - r;
          ax = 1;
        }
        else {
          e.y = p.y1 + r;
          ax = 1;
        }
      }
      if (sl > 0) {
        if (ax === 0) {
          const dy2 = ty - e.y;
          e.y += (Math.abs(dy2) > 2 ? Math.sign(dy2) : Math.sign(e.y - (p.y0 + p.y1) / 2) || 1) * sl;
        }
        else {
          const dx2 = tx - e.x;
          e.x += (Math.abs(dx2) > 2 ? Math.sign(dx2) : Math.sign(e.x - (p.x0 + p.x1) / 2) || 1) * sl;
        }
      }
    }
}
