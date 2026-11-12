// ======================================================================
// DAY / NIGHT CYCLE
// A full day is C.dayLen seconds of play time (the clock is S.t, so it pauses with the game and restarts with every run).
// The world is tinted by multiplying the finished picture with a colour that depends on the time of day:
// white at noon (no change), orange at sunrise / sunset, dark blue at night. At night a soft circle of light follows
// the player, so the area around you stays readable. Every projectile and special effect (arrows, Grimoire bolts, Swirl swords,
// turret shots, fire / ice / death explosions, Thunder Strike, lightning zaps, boss stomp, enemy bullets...) is also a
// light source: it cuts a hole in the darkness and adds a soft coloured glow, so the trees, ground and enemies around it light up.
// The sprites themselves are drawn after the tint (see draw.js) and keep their full brightness.
// Loaded after atmosphere.js; dnDraw() is called from draw(), dnIcon() from the HUD.
// ======================================================================

// Colour keyframes over one day. p = 0..1 (0 = end of night, .14 = full day, .8 = night). The last key repeats the first so the day wraps smoothly.
const DN_KEYS = [
  [0,   [70, 80, 140]],     // late night
  [.06, [255, 190, 150]],   // sunrise
  [.14, [255, 255, 255]],   // day
  [.55, [255, 255, 255]],   // day
  [.65, [255, 150, 100]],   // sunset
  [.74, [90, 90, 170]],     // dusk
  [.80, [60, 70, 130]],     // night
  [1,   [70, 80, 140]]      // late night (= key 0)
];

// Time of day for the current run: 0..1. The run starts at C.dayStart (default .14 = bright morning).
const dnPhase = () => (((S.t || 0) / Math.max(10, C.dayLen) + C.dayStart) % 1 + 1) % 1;

// Tint colour for a phase [r, g, b], blended between the two nearest keyframes.
const dnTint = p => {
  for (let i = 1; i < DN_KEYS.length; i++) {
    const a = DN_KEYS[i - 1];
    const b = DN_KEYS[i];
    if (p <= b[0]) {
      const f = (p - a[0]) / (b[0] - a[0] || 1);
      const s = f * f * (3 - 2 * f);      // smoothstep so the changes ease in and out
      return [0, 1, 2].map(k => a[1][k] + (b[1][k] - a[1][k]) * s);
    }
  }
  return [255, 255, 255];
};

// 0 = full daylight, 1 = darkest night (how far the tint is from white, scaled by C.nightDark).
const dnDarkRaw = p => {
  const t = dnTint(p);
  const lum = .3 * t[0] + .59 * t[1] + .11 * t[2];
  return Math.min(1, Math.max(0, (255 - lum) / 165));
};
const dnDark = p => dnDarkRaw(p) * C.nightDark;

// ---- what the time of day does to the enemies ------------------------------------------------------------------------
// "Night" = the dark part of the cycle (a little after sunset until a little before sunrise, about 40% of a day), "day" = the rest.
// It does not depend on C.nightDark, so turning the tint down does not change the game rules. With C.dayNight = 0 or C.dayNightFx = 0 nothing changes.
const dnFx = () => C.dayNight && C.dayNightFx;
const dnNight = () => dnFx() && dnDarkRaw(dnPhase()) >= .5;
const dnEnemySpd = () => dnNight() ? 1 + C.nightSpeed : 1;               // multiplier on enemy movement speed
const dnEnemyDmg = () => dnNight() ? 1 + C.nightDmg : 1;                 // multiplier on the damage enemies deal to the player
const dnVuln = () => dnFx() && !dnNight() ? 1 + C.dayVuln : 1;           // multiplier on the damage enemies take

// Emoji shown next to the clock in the HUD.
const dnIcon = () => {
  const p = dnPhase();
  return p < .06 || p >= .74 ? '🌙' : p < .14 ? '🌅' : p < .6 ? '☀️' : '🌇';
};

// ---- light sources -------------------------------------------------------------------------------------------------
// Every frame the lights are collected from the run state S. A light is { x, y (screen px), r (radius px), a (0..1 strength), c ('r,g,b'), f (1 = round, .5 = flat on the ground) }.
const dnLights = [];
const DN_ISO = .5;      // the ground is drawn squashed 2:1 in this isometric view, so every light is an ellipse half as tall as it is wide
const DN_WIDE = 1.3;    // lights are made a bit wider so that flattening them does not shrink the lit area too much

// Performance: lights of the same colour that sit close together (tails, zaps, trails) are merged into one, and the number of lights is capped,
// so a late run with hundreds of effects costs about the same as an early one.
const DN_MAX = 48;      // most lights drawn per frame (the strongest ones win)
const DN_CELL = 56;     // lights of one colour inside the same cell of this size are merged
const dnCell = new Map();

const dnAdd = (x, y, r, a, c) => {
  if (a <= .01)
    return;
  r *= C.fxLightR * DN_WIDE;
  a = Math.min(1, a * C.fxLight);
  const key = c + '|' + Math.round(x / DN_CELL) + '|' + Math.round(y / DN_CELL);
  const o = dnCell.get(key);
  if (o) {      // merge: keep the stronger / larger one, add a little strength
    o.a = Math.min(1, Math.max(o.a, a) + Math.min(o.a, a) * .25);
    if (r > o.r)
      o.r = r;
    return;
  }
  const L = { x, y, r, a, c, f: DN_ISO };
  dnCell.set(key, L);
  dnLights.push(L);
};

const dnCollect = (SX, SY, W, H) => {
  dnLights.length = 0;
  dnCell.clear();
  const P = (o, lift) => [SX(o.x, o.y), SY(o.x, o.y) - (lift || 0)];
  const on = (x, y, r) => x > -r * 1.5 && x < W + r * 1.5 && y > -r * 1.5 && y < H + r * 1.5;
  const add = (x, y, r, a, c) => on(x, y, r) && dnAdd(x, y, r, a, c);
  const arrowC = RAR[PD.eq.r] ? RAR[PD.eq.r].rgb : '255,226,122';
  orbLights(SX, SY, add);      // orbs glow at night (orbs.js)
  // main shots: Bow arrows (colour of the weapon rarity) and Grimoire orbs (purple)
  for (const b of S.bl) {
    const q = P(b, b.orb ? 18 : C.arrowHeight);
    add(q[0], q[1], b.orb ? 130 : 105, .95, b.orb ? '170,100,255' : arrowC);
  }
  for (const m of S.ms) {
    const q = P(m, C.arrowHeight);
    add(q[0], q[1], 100, .9, '255,170,80');
  }
  for (const w of S.sws) {
    const q = P(w, 18);
    add(q[0], q[1], 120, .85, '170,225,255');
  }
  for (const b of S.eb) {
    const q = P(b, 18);
    add(q[0], q[1], 85, .85, '255,77,240');
  }
  for (const z of S.st) {      // Health Siphon tethers: a small red light at the enemy end (one light, not a trail)
    const q = P(z.e, 18);
    add(q[0], q[1], 60, .6 * z.t / z.m, '255,90,90');
  }
  for (const z of S.lz) {      // overflow-heal lasers: a green light where the beam lands
    const q = P({ x: z.x2, y: z.y2 }, 18);
    add(q[0], q[1], 85, .85 * z.t / z.m, '110,255,140');
  }
  // Grimoire turret shots in the air, and the turrets next to the player
  for (const b of S.tb) {
    const q = P(b, 18 + b.z);
    add(q[0], q[1], 95, .9, GT[b.k].c);
  }
  for (const k in GT) {
    const T = S.tu && S.tu[k];
    if (!T || !S[GL[k]])
      continue;
    const q = P(T, 24);
    add(q[0], q[1], 80, .6, GT[k].c);
  }
  // explosions and ground effects: they fade out over their life
  for (const z of S.fe) {
    const q = P(z);
    add(q[0], q[1], z.r * 2.4, Math.min(1, z.t / FX_LIFE * 1.6), '255,140,50');
  }
  for (const z of S.de) {
    const q = P(z);
    add(q[0], q[1], z.r * 2, Math.min(1, z.t / .5 * 1.3), '255,70,80');
  }
  for (const z of S.ie) {
    const q = P(z);
    add(q[0], q[1], z.r * 2, Math.min(1, z.t / .5 * 1.3), '140,220,255');
  }
  for (const z of S.ic) {
    const q = P(z);
    add(q[0], q[1], z.r * 2, Math.max(0, 1 - z.a / .85), '140,220,255');
  }
  for (const z of S.bolt) {
    const q = P(z);
    const gl = tsGlow(z);
    add(q[0], q[1], C.gmThR * 3, Math.min(1, gl * 1.4), '255,240,130');
    add(q[0], q[1] - 120, 150, gl, '255,250,200');      // the bolt itself coming down
  }
  for (const z of S.zp) {
    const a = Math.min(1, z.t / .18);
    for (const p of z.p) {
      const q = P({ x: p[0], y: p[1] }, 18);
      add(q[0], q[1], 110, a * .9, '255,235,90');
    }
  }
  if (S.vt > 0) {      // Soul Vortex swirl
    const q = P(S, 0);
    add(q[0], q[1], 160, Math.min(1, S.vt / C.vortexT * 1.5), '170,100,255');
  }
  for (const z of S.bs) {
    const q = P(z);
    add(q[0], q[1], z.r * 2.2, Math.min(1, z.t / 1.44 * 1.2), '255,170,90');
  }
  for (const z of S.ah) {
    const q = P(z, 18);
    add(q[0], q[1], 110, Math.min(1, z.t / AB_HIT_T * 1.5), '180,110,255');
  }
  for (const z of S.at) {      // fading tail of a Grimoire bolt
    const a = Math.max(0, z.t / z.m);
    for (let i = 0; i < z.pts.length; i += 6) {
      const q = P(z.pts[i], 18);
      add(q[0], q[1], 70, a * (1 - i / z.pts.length) * .8, '170,100,255');
    }
  }
  for (const z of S.fx) {
    const q = P(z, 10);
    add(q[0], q[1], z.r * 3 + 40, Math.min(1, z.t / .15), '255,200,110');
  }
};

// Offscreen layer that holds the darkness (and the holes cut into it by the lights).
// Performance: the darkness is kept at half resolution (it is soft anyway), and every light is a pre-drawn sprite that is just stretched
// onto the layer with drawImage (before, every light built its own gradient and filled a big rectangle every frame).
let dnCv = null;
let dnCx = null;
const DN_RES = .5;      // resolution of the darkness layer compared to the screen

let dnHoleSpr = null;
const dnHole = () => {      // white-to-clear soft circle used to cut the holes (same falloff as the old gradient)
  if (dnHoleSpr)
    return dnHoleSpr;
  const n = 128;
  dnHoleSpr = document.createElement('canvas');
  dnHoleSpr.width = dnHoleSpr.height = n;
  const x = dnHoleSpr.getContext('2d');
  const gd = x.createRadialGradient(n / 2, n / 2, n / 2 * .1, n / 2, n / 2, n / 2);
  gd.addColorStop(0, 'rgba(0,0,0,1)');
  gd.addColorStop(.5, 'rgba(0,0,0,.5)');
  gd.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gd;
  x.fillRect(0, 0, n, n);
  return dnHoleSpr;
};

const dnGlowSprs = {};
const dnGlow = c0 => {      // soft coloured glow, one sprite per colour (colours are rounded to steps of 16 so orbs with random hues cannot fill the cache)
  const c = c0.split(',').map(v => Math.min(255, Math.round(v / 16) * 16)).join(',');
  if (dnGlowSprs[c])
    return dnGlowSprs[c];
  const n = 128;
  const cv2 = document.createElement('canvas');
  cv2.width = cv2.height = n;
  const x = cv2.getContext('2d');
  const gd = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2 * .8);
  gd.addColorStop(0, 'rgba(' + c + ',1)');
  gd.addColorStop(1, 'rgba(' + c + ',0)');
  x.fillStyle = gd;
  x.fillRect(0, 0, n, n);
  return dnGlowSprs[c] = cv2;
};

// Draws the tint, the light around the player and the lights of all effects over the world. Call after the world is drawn, before the bright effect sprites and the HUD.
const dnDraw = (g, W, H, SX, SY) => {
  if (!C.dayNight)
    return;
  const p = dnPhase();
  const t = dnTint(p);
  const k = C.nightDark;      // 0 = no tint at all, 1 = full strength
  const r = 255 + (t[0] - 255) * k;
  const gr = 255 + (t[1] - 255) * k;
  const b = 255 + (t[2] - 255) * k;
  if (r > 250 && gr > 250 && b > 250)
    return;                   // full daylight: nothing to draw
  const dark = dnDark(p);
  if (!dnCv) {
    dnCv = document.createElement('canvas');
    dnCx = dnCv.getContext('2d');
  }
  const lw = Math.max(1, Math.round(cv.width * DN_RES));
  const lh = Math.max(1, Math.round(cv.height * DN_RES));
  if (dnCv.width !== lw || dnCv.height !== lh) {
    dnCv.width = lw;
    dnCv.height = lh;
  }
  const d = lw / W;
  const x = dnCx;
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = 'source-over';
  x.globalAlpha = 1;
  x.clearRect(0, 0, lw, lh);
  x.setTransform(d, 0, 0, d, 0, 0);
  x.fillStyle = 'rgb(' + Math.round(r) + ',' + Math.round(gr) + ',' + Math.round(b) + ')';
  x.fillRect(0, 0, W, H);
  // cut light into the darkness: destination-out removes the tint where alpha > 0 (so the picture stays as it is there)
  x.globalCompositeOperation = 'destination-out';
  const hs = dnHole();
  const hole = (cx, cy, R, a, f) => {
    x.globalAlpha = a;
    x.drawImage(hs, cx - R, cy - R * f, R * 2, R * 2 * f);
  };
  hole(SX(S.x, S.y), SY(S.x, S.y) - 20, Math.max(120, C.nightLightR) * DN_WIDE, Math.min(1, C.nightLight * dark), DN_ISO);      // the player's own light
  dnCollect(SX, SY, W, H);
  if (dnLights.length > DN_MAX) {      // keep the strongest lights (strength x size)
    dnLights.sort((u, v) => v.a * v.r - u.a * u.r);
    dnLights.length = DN_MAX;
  }
  for (const L of dnLights)
    hole(L.x, L.y, L.r, L.a, L.f);
  x.globalAlpha = 1;
  g.save();
  g.globalCompositeOperation = 'multiply';
  g.imageSmoothingEnabled = true;
  g.drawImage(dnCv, 0, 0, W, H);
  // soft coloured glow on top of the lit area (additive), so fire looks orange, ice blue, lightning yellow...
  g.globalCompositeOperation = 'lighter';
  for (const L of dnLights) {
    const R = L.r * .8;
    g.globalAlpha = Math.min(1, L.a * dark * .32);
    g.drawImage(dnGlow(L.c), L.x - R, L.y - R * L.f, R * 2, R * 2 * L.f);
  }
  g.restore();
};
