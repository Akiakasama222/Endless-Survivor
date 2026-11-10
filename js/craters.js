// ======================================================================
// EXPLOSION CRATERS
// Every Fireball explosion scorches the ground: a crater decal is left where it landed, sized to the blast,
// and it fades away after a while. Craters are flat ground decals, drawn under everything that stands on them.
// They belong to the current run (stored in S.cr, so a new run starts clean).
// ======================================================================

const CRT = {
  src: 'assets/images/Explosion crater.png',
  size: .9,          // crater width relative to the blast's on-screen width (blast radius R -> ellipse 2.83 R wide)
  life: 22,          // seconds a crater stays (game time, pauses with the game)
  fade: 6,           // the last `fade` seconds it fades out
  max: 40,           // most craters on the ground at once (oldest is removed first)
  merge: .5          // a new blast closer than merge x radius to an existing crater replaces it instead of stacking
};

const crtImg = new Image();
crtImg.src = CRT.src;

// Leaves a crater for a blast of radius r at (x, y).
const craterAdd = (x, y, r) => {
  const list = S.cr || (S.cr = []);
  for (let i = 0; i < list.length; i++)
    if (Math.hypot(list[i].x - x, list[i].y - y) < r * CRT.merge) {
      list.splice(i, 1);
      break;
    }
  if (list.length >= CRT.max)
    list.shift();
  list.push({ x, y, r, born: S.t || 0, flip: Math.random() < .5 });
};

// Draws the craters under the characters. Called from draw() right after the ground.
const craterDraw = (g, W, H, SX, SY) => {
  const list = S.cr;
  if (!list || !list.length || !crtImg.naturalWidth)
    return;
  const now = S.t || 0;
  for (let i = list.length - 1; i >= 0; i--)
    if (now - list[i].born > CRT.life)
      list.splice(i, 1);
  g.save();
  g.imageSmoothingEnabled = false;
  for (const c of list) {
    const age = now - c.born;
    const dw = c.r * 2.83 * CRT.size;
    const dh = dw * crtImg.naturalHeight / crtImg.naturalWidth;
    const x = SX(c.x, c.y);
    const y = SY(c.x, c.y);
    if (x < -dw || x > W + dw || y < -dh || y > H + dh)
      continue;
    g.globalAlpha = Math.min(1, age / .15) * Math.min(1, (CRT.life - age) / CRT.fade);
    g.save();
    g.translate(Math.round(x), Math.round(y));
    if (c.flip)
      g.scale(-1, 1);
    g.drawImage(crtImg, Math.round(-dw / 2), Math.round(-dh / 2), Math.round(dw), Math.round(dh));
    g.restore();
  }
  g.restore();
};
