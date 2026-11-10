// ======================================================================
// ATMOSPHERE (wind + flying leaves)
// One global wind blows over the whole world. Its direction drifts slowly and its strength comes in gusts.
// Leaves live in the world (they scroll with the camera), float at some height above the ground, tumble while
// they are carried along by the wind, and the sprite depends on the biome they were picked up in (biome.js).
// A few faint streaks show the gusts. Loaded after biome.js; atmDraw() is called from draw().
// ======================================================================

const ATM = {
  leaves: 90,          // how many leaves are in the air around the player (was 46)
  windDir: .35,        // average wind direction in world radians (0 = towards +x = screen right-down, 1.57 = towards +y = screen left-down)
  windSwing: .3,       // how far the direction drifts either way over time (radians)
  windBase: 200,       // average wind speed carrying the leaves (world units per second)
  gust: .8,            // how much stronger/weaker the gusts are than the average (0 = steady)
  sizeMin: 14,         // leaf width on screen (px)
  sizeMax: 26,
  zMin: 8,             // height of a leaf above the ground (px)
  zMax: 150,
  tumble: 5,           // how fast leaves spin / flip while flying
  streaks: 7,          // faint wind streaks drawn during gusts (0 = none)
  streakAlpha: .16
};

const atmLeaves = [];
const atmStreaks = [];
let atmLast = 0;
let atmT = 0;

// Current wind: direction angle, speed and a 0..1 "gustiness" for the streaks.
const atmWind = t => {
  const dir = ATM.windDir + Math.sin(t * .11) * ATM.windSwing * .7 + Math.sin(t * .27 + 1.3) * ATM.windSwing * .3;
  const gust = Math.max(0, .5 + .5 * (Math.sin(t * .37) * .6 + Math.sin(t * .93 + 2) * .4));    // 0..1
  const speed = ATM.windBase * (1 - ATM.gust * .5 + ATM.gust * gust);
  return { dir, speed, gust };
};

// Puts a leaf (or streak) at a random spot on the upwind side of the screen (or anywhere when `anywhere`).
// Returns world coords for screen offset (u, v) from the screen centre and height z.
const atmPlace = (u, v, z) => ({ x: (u + 2 * (v + z)) / 2, y: (2 * (v + z) - u) / 2 });

const atmSpawn = (L, W, H, wsx, wsy, anywhere, S) => {
  const m = 80;
  let sx, sy;
  if (anywhere) {
    sx = Math.random() * (W + 2 * m) - m;
    sy = Math.random() * (H + 2 * m) - m;
  }
  else if (Math.random() < Math.abs(wsx) / (Math.abs(wsx) + Math.abs(wsy) * 2 + 1)) {
    sx = wsx > 0 ? -m : W + m;
    sy = Math.random() * (H + 2 * m) - m;
  }
  else {
    sy = wsy > 0 ? -m : H + m;
    sx = Math.random() * (W + 2 * m) - m;
  }
  L.z = ATM.zMin + Math.pow(Math.random(), 1.5) * (ATM.zMax - ATM.zMin);
  const p = atmPlace(sx - W / 2, sy - H / 2, L.z);
  L.x = S.x + p.x;
  L.y = S.y + p.y;
  L.kind = bioLeaf(L.x, L.y);
  L.size = ATM.sizeMin + Math.random() * (ATM.sizeMax - ATM.sizeMin);
  L.k = .6 + Math.random() * .7;                 // how strongly this leaf follows the wind
  L.rot = Math.random() * 6.3;
  L.spin = (Math.random() - .5) * ATM.tumble;
  L.ph = Math.random() * 6.3;                    // wobble phase
  L.fl = .5 + Math.random();                     // wobble speed
};

const atmDraw = (g, W, H, SX, SY) => {
  const now = performance.now();
  const dt = Math.min(.1, (now - atmLast) / 1000);
  atmLast = now;
  atmT += dt;
  const wd = atmWind(atmT);
  const wx = Math.cos(wd.dir) * wd.speed;           // wind velocity in world units
  const wy = Math.sin(wd.dir) * wd.speed;
  const wsx = wx - wy;                               // ... and on screen
  const wsy = (wx + wy) * .5;
  while (atmLeaves.length < ATM.leaves) {
    const L = {};
    atmSpawn(L, W, H, wsx, wsy, true, S);
    atmLeaves.push(L);
  }
  if (atmLeaves.length > ATM.leaves)
    atmLeaves.length = ATM.leaves;
  const m = 140;
  for (const L of atmLeaves) {
    // ease the leaf's own velocity towards the wind, with a flutter across it
    if (L.vx === undefined) {
      L.vx = wx * L.k;
      L.vy = wy * L.k;
    }
    L.vx += (wx * L.k - L.vx) * Math.min(1, dt * 1.6);
    L.vy += (wy * L.k - L.vy) * Math.min(1, dt * 1.6);
    const fl = Math.sin(atmT * L.fl * 2.2 + L.ph) * 34;
    L.x += (L.vx - Math.sin(wd.dir) * fl) * dt;
    L.y += (L.vy + Math.cos(wd.dir) * fl) * dt;
    L.z += Math.sin(atmT * L.fl * 1.3 + L.ph) * 14 * dt - 3 * dt;
    if (L.z < 2)
      L.z = 2 + Math.random() * 30;
    L.rot += L.spin * dt * (.5 + wd.speed / ATM.windBase);
    const x = SX(L.x, L.y);
    const y = SY(L.x, L.y) - L.z;
    if (x < -m || x > W + m || y < -m || y > H + m) {
      atmSpawn(L, W, H, wsx, wsy, false, S);
      L.vx = L.vy = undefined;
      continue;
    }
    const img = bioLeafImg[L.kind];
    if (!img || !img.naturalWidth)
      continue;
    const w = L.size;
    const h = w * img.naturalHeight / img.naturalWidth;
    const head = Math.atan2(L.vy * .5 + L.vx * .5, L.vx - L.vy);       // leaf points roughly along its travel on screen
    g.save();
    g.globalAlpha = .92;
    g.translate(x, y);
    g.rotate(head + Math.sin(L.rot) * .7);
    g.scale(1, .35 + .65 * Math.abs(Math.cos(L.rot * .8)));            // tumbling: the leaf turns edge-on now and then
    g.drawImage(img, -w / 2, -h / 2, w, h);
    g.restore();
  }
  // faint gust streaks along the wind direction
  if (ATM.streaks > 0) {
    g.save();
    g.lineCap = 'round';
    g.lineWidth = 1.5;
    while (atmStreaks.length < ATM.streaks) {
      atmStreaks.push({ x: Math.random() * W, y: Math.random() * H, len: 60 + Math.random() * 100, life: Math.random(), sp: .6 + Math.random() * .8 });
    }
    const n = Math.hypot(wsx, wsy) || 1;
    for (const s of atmStreaks) {
      s.life += dt * .5 * s.sp;
      s.x += wsx * s.sp * 1.6 * dt;
      s.y += wsy * s.sp * 1.6 * dt;
      if (s.life > 1) {
        s.life = 0;
        s.x = Math.random() * W;
        s.y = Math.random() * H;
        s.len = 60 + Math.random() * 100;
      }
      g.globalAlpha = Math.sin(s.life * Math.PI) * ATM.streakAlpha * wd.gust;
      g.strokeStyle = '#fff';
      g.beginPath();
      g.moveTo(s.x, s.y);
      g.lineTo(s.x + wsx / n * s.len, s.y + wsy / n * s.len);
      g.stroke();
    }
    g.restore();
  }
};
