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

const dnAdd = (x, y, r, a, c) => {
  if (a <= .01)
    return;
  dnLights.push({ x, y, r: r * C.fxLightR * DN_WIDE, a: Math.min(1, a * C.fxLight), c, f: DN_ISO });
};

const dnCollect = (SX, SY, W, H) => {
  dnLights.length = 0;
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
  for (const p of S.hs) {
    const q = P(p, 18);
    add(q[0], q[1], 65, .7, '110,255,140');
  }
  for (const p of S.sf) {
    const q = P(p, 18);
    add(q[0], q[1], 65, .7, '255,90,90');
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
    for (let i = 0; i < z.pts.length; i += 3) {
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
let dnCv = null;
let dnCx = null;

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
  if (dnCv.width !== cv.width || dnCv.height !== cv.height) {
    dnCv.width = cv.width;
    dnCv.height = cv.height;
  }
  const d = cv.width / W;
  const x = dnCx;
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = 'source-over';
  x.clearRect(0, 0, dnCv.width, dnCv.height);
  x.setTransform(d, 0, 0, d, 0, 0);
  x.fillStyle = 'rgb(' + Math.round(r) + ',' + Math.round(gr) + ',' + Math.round(b) + ')';
  x.fillRect(0, 0, W, H);
  // cut light into the darkness: destination-out removes the tint where alpha > 0 (so the picture stays as it is there)
  x.globalCompositeOperation = 'destination-out';
  const hole = (cx, cy, R, a, f) => {
    x.save();
    x.translate(cx, cy);
    x.scale(1, f);
    const gd = x.createRadialGradient(0, 0, R * .1, 0, 0, R);
    gd.addColorStop(0, 'rgba(0,0,0,' + a + ')');
    gd.addColorStop(.5, 'rgba(0,0,0,' + a * .5 + ')');
    gd.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gd;
    x.fillRect(-R, -R, R * 2, R * 2);
    x.restore();
  };
  hole(SX(S.x, S.y), SY(S.x, S.y) - 20, Math.max(120, C.nightLightR) * DN_WIDE, Math.min(1, C.nightLight * dark), DN_ISO);      // the player's own light
  dnCollect(SX, SY, W, H);
  for (const L of dnLights)
    hole(L.x, L.y, L.r, L.a, L.f);
  g.save();
  g.globalCompositeOperation = 'multiply';
  g.drawImage(dnCv, 0, 0, W, H);
  // soft coloured glow on top of the lit area (additive), so fire looks orange, ice blue, lightning yellow...
  g.globalCompositeOperation = 'lighter';
  for (const L of dnLights) {
    g.save();
    g.translate(L.x, L.y);
    g.scale(1, L.f);
    const gd = g.createRadialGradient(0, 0, 0, 0, 0, L.r * .8);
    const a = L.a * dark * .32;
    gd.addColorStop(0, 'rgba(' + L.c + ',' + a + ')');
    gd.addColorStop(1, 'rgba(' + L.c + ',0)');
    g.fillStyle = gd;
    g.fillRect(-L.r, -L.r, L.r * 2, L.r * 2);
    g.restore();
  }
  g.restore();
};
