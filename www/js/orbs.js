// ======================================================================
// ORBS (procedural)
// Glowing orbs are scattered around the map. Like the trees and chests they are generated per chunk from the run's forest seed, so within one
// run every orb stays where it is and every new run places them somewhere else. An orb is drawn entirely in code (no image files).
//
// There are three kinds of orb (ORBT below), each with its own colour. Every weapon (Knife, Sword, Grimoire) shares the same special augment pool (ORB_POOL in levelup.js)
// and each kind only offers augments of its own type:
//   Orb of Power        (red)   augments that increase your damage
//   Orb of Perseverance (blue)  augments that increase your defenses
//   Orb of Practice     (green) utility augments: chance-based triggers, move speed, pickup range ...
//
// To use an orb you need at least orbPrice() Essence (C.orbCost = 10 for the first orb, +C.orbCostStep = 5 more after every orb opened). Stand close to it for C.orbTime seconds (or press E): the orb takes C.orbCost coins and the game
// pauses on a screen that offers C.orbChoices (3) SPECIAL augments of that orb's kind. You must pick one; the orb then bursts and is gone.
// Special augments are no longer given at every 10th level - the orbs are now the only way to get them.
//
// Numbers (C.orbCost, C.orbChance, C.orbTime, C.orbRadius) are in config.js. The look and placement rules are in ORB below.
// ======================================================================

const ORB = {
  margin: 170,         // orbs keep this far from the chunk edge (so two orbs are never closer than 2 x margin)
  spawnClear: 380,     // no orb this close to where the run starts
  trunkClear: 46,      // free space around a tree trunk (world units, plus the trunk radius)
  cover: true,         // true = an orb is never placed where a tree in front would hide it
  tries: 36,           // spots tried per chunk
  dieT: .7,            // seconds of the burst animation after an orb is used
  decay: 2,            // progress lost per second while the player is away or cannot pay (x dt)
  labelDist: 300,      // within this distance (world units) the "needs coins" label shows
  arrowDist: 3000      // the edge-of-screen arrow points to the nearest orb (only while you can pay)
};

// The three orb kinds: n = name, hue = colour (0-360), sub = what its augments are about (shown on the offer screen).
const ORBT = {
  power: { n: 'Orb of Power', hue: 8, sub: 'damage' },
  perseverance: { n: 'Orb of Perseverance', hue: 205, sub: 'defense' },
  practice: { n: 'Orb of Practice', hue: 145, sub: 'utility' }
};

const ORB_KINDS = Object.keys(ORBT);

const orbCache = new Map();
let orbRunS = null;      // the run (S) the cached orbs belong to

// hsl (h 0-360, s / l 0-100) -> [r, g, b]
const orbRgb = (h, s, l) => {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
};

// Is (x, y) a good open spot: not on a trunk and (if ORB.cover) not hidden behind a tree's canopy?
const orbClear = (x, y) => {
  const ci = Math.floor(x / TR.cell);
  const cj = Math.floor(y / TR.cell);
  for (let i = ci - 1; i <= ci + 1; i++)
    for (let j = cj - 1; j <= cj + 1; j++)
      for (const t of trChunk(i, j)) {
        const dx = t.x - x;
        const dy = t.y - y;
        if (Math.hypot(dx, dy) < TR.trunkR * t.s + ORB.trunkClear)
          return false;
        if (ORB.cover) {
          // same test the chests use: a tree whose foot is a little below the spot on screen and not far to the side would hide it
          const sx = Math.abs(dx - dy);
          const sy = (dx + dy) / 2;
          if (sy > -20 && sy < 130 * t.s && sx < 90 * t.s)
            return false;
        }
      }
  return true;
};

// The orb (0 or 1) of chunk (ci, cj). Built once per run.
const orbChunk = (ci, cj) => {
  trChunk(ci, cj);                 // trees.js: makes sure a new run has picked its forest seed (trSeed) first
  if (orbRunS !== S) {
    orbCache.clear();
    orbRunS = S;
  }
  const key = ci + ',' + cj;
  let c = orbCache.get(key);
  if (c)
    return c;
  c = [];
  const rnd = trRng(Math.imul(ci, 2246822519) ^ Math.imul(cj, 3266489917) ^ trSeed ^ 0x5bd1e995);
  if (rnd() < C.orbChance) {
    const kind = ORB_KINDS[Math.floor(rnd() * ORB_KINDS.length)];
    const hue = ORBT[kind].hue;
    const sz = .9 + rnd() * .3;
    const ph = rnd() * 6.2832;
    for (let k = 0; k < ORB.tries; k++) {
      const x = ci * TR.cell + ORB.margin + rnd() * (TR.cell - 2 * ORB.margin);
      const y = cj * TR.cell + ORB.margin + rnd() * (TR.cell - 2 * ORB.margin);
      if (Math.hypot(x, y) < ORB.spawnClear || !orbClear(x, y))
        continue;
      c.push({ x, y, id: key + ',orb', orbk: 1, kind, prog: 0, got: false, die: 0, hue, sz, ph, rgb: orbRgb(hue, 90, 60).join(',') });
      break;
    }
  }
  orbCache.set(key, c);
  return c;
};

// The orbs in the chunk around (x, y) and its 8 neighbours. Orbs that were used are only included while their burst animation plays.
const orbNear = (x, y, all) => {
  const out = [];
  const ci = Math.floor(x / TR.cell);
  const cj = Math.floor(y / TR.cell);
  for (let i = ci - 1; i <= ci + 1; i++)
    for (let j = cj - 1; j <= cj + 1; j++)
      for (const h of orbChunk(i, j))
        if (!h.got || (all && h.die > 0))
          out.push(h);
  return out;
};

// Essence the next orb costs: C.orbCost, plus C.orbCostStep more for every orb already opened in this run (10, 15, 20, ...).
const orbPrice = () => C.orbCost + C.orbCostStep * (S.orbsUsed || 0);

// Opens the offer screen: takes the coins, shows the special augments of this orb's kind and waits for a pick. Returns false (nothing is taken) if that kind has nothing left to offer.
const orbOpen = h => {
  const opts = specialHtml(h.kind);       // levelup.js: 3 random special augments of this orb's kind
  if (!opts) {
    S.tx.push({ x: h.x, y: h.y - 30, t: 1, s: 'Nothing left to offer', c: '#ffc94a' });
    h.prog = 0;
    return false;
  }
  const price = orbPrice();
  S.coins -= price;
  S.orbsUsed = (S.orbsUsed || 0) + 1;
  h.got = true;
  h.die = ORB.dieT;
  h.prog = 0;
  S.state = 'pick';
  joy = null;
  sfx('level');
  hud(1);
  const o = $('ov');
  o.style.display = 'flex';
  o.innerHTML = '<h1 style="color:rgb(' + h.rgb + ')">' + ORBT[h.kind].n + '</h1><p>Took ' + price + ' ' + ESS + ' · choose a ' + ORBT[h.kind].sub + ' augment</p>' + opts;
  o.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    sfx('click');
    pickAug(b.dataset.k);          // levelup.js: applies the augment
    o.style.display = 'none';
    S.state = 'play';
    S.lu.push({ t: LU_T });        // the level-up effect plays around the player
    joy = null;
    last = performance.now();
    hud(1);
  });
  return true;
};

// Each game step: standing close to an orb while holding enough coins fills its ring; when full (or E is pressed) it opens.
const orbStep = dt => {
  if (S.state !== 'play' || S.tp > 0)
    return;
  for (const h of orbNear(S.x, S.y, true)) {
    if (h.got) {
      h.die -= dt;
      continue;
    }
    const near = Math.hypot(h.x - S.x, h.y - S.y) <= C.orbRadius;
    const pay = S.coins >= orbPrice() && S.xp < need();       // (a pending level-up screen goes first)
    if (near && pay) {
      h.prog += dt;
      if (keys.e)
        h.prog = C.orbTime;
      if (h.prog >= C.orbTime) {
        orbOpen(h);
        return;
      }
    }
    else if (h.prog > 0)
      h.prog = Math.max(0, h.prog - dt * ORB.decay);
  }
};

// Pushes the orbs that are on screen into the depth-sorted draw list `out`.
const orbCollect = (SX, SY, W, H, out) => {
  for (const h of orbNear(S.x, S.y, true)) {
    const x = SX(h.x, h.y);
    const y = SY(h.x, h.y);
    if (x < -120 || x > W + 120 || y < -40 || y > H + 200)
      continue;
    out.push(h);
  }
};

// Night lights: every orb lights up the ground around it.
const orbLights = (SX, SY, add) => {
  for (const h of orbNear(S.x, S.y))
    add(SX(h.x, h.y), SY(h.x, h.y) - 30, 120, .55, h.rgb);
};

// Draws one orb at its depth (trees in front of it cover it).
const orbDraw = (g, h, SX, SY) => {
  const x = SX(h.x, h.y);
  const y = SY(h.x, h.y);
  const t = performance.now() / 1000;
  const dying = h.die > 0;
  const k = dying ? Math.max(0, h.die / ORB.dieT) : 1;      // 1 = whole, 0 = gone
  const burst = 1 - k;
  const afford = S.coins >= orbPrice();
  const sat = afford ? 90 : 35;
  const r = 13 * h.sz * (dying ? 1 + burst * 1.4 : 1 + (afford ? .07 * Math.sin(t * 5 + h.ph) : 0));
  const oy = y - 38 * h.sz + Math.sin(t * 2 + h.ph) * 4;
  const rgb = orbRgb(h.hue, sat, 60).join(',');
  g.save();
  g.globalAlpha = k;
  // soft shadow on the ground (shrinks with the bob)
  g.fillStyle = '#0003';
  g.beginPath();
  g.ellipse(x, y, 17 * h.sz, 6 * h.sz, 0, 0, 6.3);
  g.fill();
  // rotating rune rings, squashed 2:1 like the ground
  g.save();
  g.translate(x, y);
  g.scale(1, .5);
  g.rotate(t * .6 + h.ph);
  g.lineWidth = 3;
  g.strokeStyle = 'rgba(' + rgb + ',' + (afford ? .85 : .45) + ')';
  g.setLineDash([14, 10]);
  g.beginPath();
  g.arc(0, 0, 36 * h.sz * (1 + burst * .8), 0, 6.2832);
  g.stroke();
  g.rotate(-t * 1.5 - t * .6);
  g.lineWidth = 2;
  g.strokeStyle = 'rgba(' + rgb + ',.5)';
  g.setLineDash([4, 8]);
  g.beginPath();
  g.arc(0, 0, 23 * h.sz, 0, 6.2832);
  g.stroke();
  g.restore();
  g.globalCompositeOperation = 'lighter';
  // faint pillar of light so an orb can be spotted from afar
  const pg = g.createLinearGradient(0, oy - 90, 0, y);
  pg.addColorStop(0, 'rgba(' + rgb + ',0)');
  pg.addColorStop(1, 'rgba(' + rgb + ',' + (afford ? .26 : .12) + ')');
  g.fillStyle = pg;
  g.fillRect(x - 8 * h.sz, oy - 90, 16 * h.sz, y - oy + 90);
  // halo
  const hg = g.createRadialGradient(x, oy, r * .4, x, oy, r * 3.2);
  hg.addColorStop(0, 'rgba(' + rgb + ',' + (afford ? .6 : .35) + ')');
  hg.addColorStop(1, 'rgba(' + rgb + ',0)');
  g.fillStyle = hg;
  g.beginPath();
  g.arc(x, oy, r * 3.2, 0, 6.2832);
  g.fill();
  g.globalCompositeOperation = 'source-over';
  // the orb itself
  const og = g.createRadialGradient(x - r * .35, oy - r * .4, r * .1, x, oy, r);
  og.addColorStop(0, '#fff');
  og.addColorStop(.35, 'rgb(' + orbRgb(h.hue, sat, 72).join(',') + ')');
  og.addColorStop(1, 'rgb(' + orbRgb(h.hue, sat, 34).join(',') + ')');
  g.fillStyle = og;
  g.beginPath();
  g.arc(x, oy, r, 0, 6.2832);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.7)';
  g.beginPath();
  g.ellipse(x - r * .32, oy - r * .38, r * .22, r * .13, -.6, 0, 6.3);
  g.fill();
  // sparkles circling the orb
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const a = t * 1.8 + i * 1.2566 + h.ph;
    const rr = r * (1.9 + burst * 2);
    g.fillStyle = 'rgba(' + rgb + ',' + (.55 + .35 * Math.sin(t * 6 + i)) + ')';
    g.beginPath();
    g.arc(x + Math.cos(a) * rr, oy + Math.sin(a) * rr * .45, 2.2, 0, 6.3);
    g.fill();
  }
  g.restore();
};

// Drawn over everything: the progress ring while using an orb, a small label when you are close, and the edge arrow that points to the nearest orb.
const orbOverlay = (g, SX, SY) => {
  const near = orbNear(S.x, S.y);
  const afford = S.coins >= orbPrice();
  g.save();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const h of near) {
    const x = SX(h.x, h.y);
    const y = SY(h.x, h.y) - 38 * h.sz - 30;
    const d = Math.hypot(h.x - S.x, h.y - S.y);
    if (h.prog > 0) {
      const p = Math.min(1, h.prog / C.orbTime);
      g.lineWidth = 6;
      g.lineCap = 'round';
      g.strokeStyle = '#000a';
      g.beginPath();
      g.arc(x, y, 15, 0, 6.3);
      g.stroke();
      g.strokeStyle = 'rgb(' + h.rgb + ')';
      g.beginPath();
      g.arc(x, y, 15, -Math.PI / 2, -Math.PI / 2 + p * 6.2832);
      g.stroke();
    }
    else if (d < ORB.labelDist) {
      // The cost is written with the Essence picture (ESI) instead of a coin emoji: '@' marks where the picture goes.
      const s = afford ? (d <= C.orbRadius ? 'Hold still…' : ORBT[h.kind].n + ' · @ ' + orbPrice()) : ORBT[h.kind].n + ' · needs @ ' + orbPrice() + ' (' + S.coins + '/' + orbPrice() + ')';
      g.font = '14px "Pixelify Sans","Courier New",monospace';
      g.lineWidth = 4;
      g.lineJoin = 'round';
      g.strokeStyle = '#000b';
      g.fillStyle = afford ? '#fff' : '#ff8a8a';
      const parts = s.split('@');
      const IC = 18;      // icon size in px
      const hasIc = parts.length > 1 && ESI.naturalWidth;
      const w1 = g.measureText(parts[0]).width;
      const w2 = g.measureText(parts.slice(1).join(hasIc ? '' : '@')).width;
      const tot = hasIc ? w1 + IC + w2 : g.measureText(s.replace('@', '')).width;
      let lx = x - tot / 2;
      g.textAlign = 'left';
      if (hasIc) {
        g.strokeText(parts[0], lx, y);
        g.fillText(parts[0], lx, y);
        g.drawImage(ESI, lx + w1, y - IC / 2 - 1, IC, IC);
        const rest = parts.slice(1).join('');
        g.strokeText(rest, lx + w1 + IC, y);
        g.fillText(rest, lx + w1 + IC, y);
      }
      else {
        const t = s.replace('@', '');
        g.strokeText(t, lx, y);
        g.fillText(t, lx, y);
      }
      g.textAlign = 'center';
    }
  }
  // edge arrow to the nearest orb, only while you can pay for one and it is off screen
  if (afford && near.length) {
    let best = null;
    let bd = ORB.arrowDist;
    for (const h of near) {
      const d = Math.hypot(h.x - S.x, h.y - S.y);
      if (d < bd) {
        bd = d;
        best = h;
      }
    }
    if (best) {
      const sx = SX(best.x, best.y);
      const sy = SY(best.x, best.y) - 38;
      const m = 38;
      const top = 96;
      if (!(sx > m && sx < W - m && sy > top && sy < H - m)) {
        const dx = sx - W / 2;
        const dy = sy - H / 2;
        const f = Math.min((W / 2 - m) / (Math.abs(dx) || 1e-6), (H / 2 - m) / (Math.abs(dy) || 1e-6));
        const ex = W / 2 + dx * f;
        const ey = Math.max(top, H / 2 + dy * f);
        const pulse = .65 + .35 * Math.sin(performance.now() / 260);
        g.translate(ex, ey);
        g.rotate(Math.atan2(dy, dx));
        g.scale(1.5, 1.5);
        g.globalAlpha = pulse;
        g.shadowColor = 'rgb(' + best.rgb + ')';
        g.shadowBlur = 12;
        g.fillStyle = 'rgb(' + best.rgb + ')';
        g.strokeStyle = '#fff';
        g.lineWidth = 2;
        g.lineJoin = 'round';
        g.beginPath();
        g.moveTo(15, 0);
        g.lineTo(-9, -10);
        g.lineTo(-4, 0);
        g.lineTo(-9, 10);
        g.closePath();
        g.fill();
        g.stroke();
      }
    }
  }
  g.restore();
};
