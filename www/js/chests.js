// ======================================================================
// HIDDEN CHESTS
// Some tree groves hide a chest (decided together with the trees, so within one run the chests stay put; every run grows a new forest, see TR.random in trees.js).
// A chest is placed where trees in front of it cover it on screen. Stand close to it for CH.time seconds to take it:
// it adds one chest to your inventory (open it there, like the level chests). Leaving the ring slowly undoes the progress.
// Cutting or blowing up the trees in front of it reveals it. Taken chests are remembered for the run (S.chGot).
// ======================================================================

const CH = {
  src: 'assets/images/Chest.png',
  chance: .22,         // chance that a chunk with a big enough grove hides a chest
  minTrees: 7,         // a grove needs at least this many trees to hide a chest
  radius: 80,          // how close the player must stand (world units)
  time: 3,             // seconds of standing close to open it
  decay: 1.5,          // progress lost per second while the player is away (x dt)
  w: 46,               // on-screen width of the chest (px); the height follows the image
  hint: 650,           // within this distance (world units) a small twinkle shows where a hidden chest is (0 = no hint)
  cover: 2             // at least this many trees must stand in front of the chest to hide it
};

const chImg = new Image();
chImg.src = CH.src;

// Called while a chunk is generated (see trChunk): maybe hides a chest in one of its groves. c = the chunk's trees,
// groves = [{ gx, gy, r, trees }], key = chunk id, rnd = the chunk's seeded random generator.
const chPlace = (c, groves, key, rnd) => {
  c.chests = [];
  const roll = rnd();
  const big = groves.filter(g => g.trees.length >= CH.minTrees);
  if (roll >= CH.chance || !big.length)
    return;
  const gr = big[Math.floor(rnd() * big.length)];
  let best = null;
  let bs = -1;
  for (let k = 0; k < 24; k++) {
    const a = rnd() * 6.2832;
    const d = gr.r * .65 * Math.sqrt(rnd());
    const x = gr.gx + Math.cos(a) * d;
    const y = gr.gy + Math.sin(a) * d;
    let ok = true;
    let cov = 0;
    for (const t of gr.trees) {
      const dx = t.x - x;
      const dy = t.y - y;
      if (Math.hypot(dx, dy) < TR.trunkR * t.s + 26) {
        ok = false;
        break;
      }
      // a tree in front covers the chest when its foot is a little below it on screen and not far to the side
      const sx = Math.abs(dx - dy);
      const sy = (dx + dy) / 2;
      if (sy > 6 && sy < 120 * t.s && sx < 80 * t.s)
        cov += t.s;
    }
    if (ok && cov > bs) {
      bs = cov;
      best = { x, y };
    }
  }
  if (best && bs >= CH.cover * .6)
    c.chests.push({ x: best.x, y: best.y, id: key + ',chest', prog: 0, got: !!(S.chGot && S.chGot[key + ',chest']), chk: 1 });
};

// The chests (not yet taken) in the chunk around (x, y) and its 8 neighbours.
const chNear = (x, y) => {
  const out = [];
  const ci = Math.floor(x / TR.cell);
  const cj = Math.floor(y / TR.cell);
  for (let i = ci - 1; i <= ci + 1; i++)
    for (let j = cj - 1; j <= cj + 1; j++) {
      const c = trChunk(i, j);
      if (c.chests)
        for (const h of c.chests)
          if (!h.got)
            out.push(h);
    }
  return out;
};

// Each game step: standing near a chest fills its progress; when full it is taken.
const chestStep = dt => {
  for (const h of chNear(S.x, S.y)) {
    if (Math.hypot(h.x - S.x, h.y - S.y) <= CH.radius)
      h.prog += dt;
    else if (h.prog > 0)
      h.prog = Math.max(0, h.prog - dt * CH.decay);
    if (h.prog >= CH.time) {
      h.got = true;
      if (!S.chGot)
        S.chGot = {};
      S.chGot[h.id] = 1;
      if (!S.dev) {
        PD.chests++;
        savePD();
        S.chestGot = (S.chestGot || 0) + 1;
      }
      S.tx.push({ x: h.x, y: h.y, t: .9, s: S.dev ? 'Chest (dev mode: not saved)' : '🎁 Chest found!', c: '#ffc94a' });
      sfx('level');
    }
  }
};

// Pushes the chests that are on screen into the depth-sorted draw list `out`.
const chCollect = (SX, SY, W, H, out) => {
  for (const h of chNear(S.x, S.y)) {
    const x = SX(h.x, h.y);
    const y = SY(h.x, h.y);
    if (x < -60 || x > W + 60 || y < -20 || y > H + 60)
      continue;
    out.push(h);
  }
};

// Draws one chest at its depth (trees in front of it cover it).
const chDraw = (g, h, SX, SY) => {
  const x = SX(h.x, h.y);
  const y = SY(h.x, h.y);
  g.fillStyle = '#0003';
  g.beginPath();
  g.ellipse(x, y - 1, CH.w * .5, CH.w * .17, 0, 0, 6.3);
  g.fill();
  if (!chImg.naturalWidth)
    return;
  const w = CH.w;
  const hh = w * chImg.naturalHeight / chImg.naturalWidth;
  g.save();
  g.imageSmoothingEnabled = false;
  g.drawImage(chImg, Math.round(x - w / 2), Math.round(y - hh + 4), Math.round(w), Math.round(hh));
  g.restore();
};

// Drawn over everything: the progress ring while the player is taking a chest, and a faint twinkle that hints at a hidden chest nearby.
const chOverlay = (g, SX, SY) => {
  for (const h of chNear(S.x, S.y)) {
    const x = SX(h.x, h.y);
    const y = SY(h.x, h.y) - 18;
    const d = Math.hypot(h.x - S.x, h.y - S.y);
    if (h.prog > 0) {
      const p = Math.min(1, h.prog / CH.time);
      g.save();
      g.lineWidth = 6;
      g.strokeStyle = '#000a';
      g.beginPath();
      g.arc(x, y - 22, 15, 0, 6.3);
      g.stroke();
      g.strokeStyle = '#ffc94a';
      g.lineCap = 'round';
      g.beginPath();
      g.arc(x, y - 22, 15, -Math.PI / 2, -Math.PI / 2 + p * 6.2832);
      g.stroke();
      g.restore();
    }
    else if (CH.hint > 0 && d < CH.hint) {
      const tw = .5 + .5 * Math.sin((S.t || 0) * 4 + h.x * .01);
      const s = 3 + 4 * tw;
      g.save();
      g.globalAlpha = (.25 + .5 * tw) * Math.min(1, (CH.hint - d) / 200);
      g.fillStyle = '#fff3a0';
      g.beginPath();
      g.moveTo(x, y - 6 - s * 2);
      g.lineTo(x + s * .5, y - 6 - s * .5);
      g.lineTo(x + s * 2, y - 6);
      g.lineTo(x + s * .5, y - 6 + s * .5);
      g.lineTo(x, y - 6 + s * 2);
      g.lineTo(x - s * .5, y - 6 + s * .5);
      g.lineTo(x - s * 2, y - 6);
      g.lineTo(x - s * .5, y - 6 - s * .5);
      g.closePath();
      g.fill();
      g.restore();
    }
  }
};
