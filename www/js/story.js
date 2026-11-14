// ======================================================================
// STORY MODE (base mechanics)
// A different way to play: two sticks (left = move, right = aim and attack) and three skill buttons.
// Whatever weapon you pick is always Common with C.storyBaseDmg (15) base damage. The world, enemies, XP and
// augments are still the normal ones for now - the story itself comes later and will build on this file.
//
// How it plugs into the game:
//   MODE / STORY_WEAPON   which mode the next run uses (init() in player-data.js reads them, S.story = 1 during a Story run)
//   storyMenu()           the weapon pick screen opened by the Story button on the main menu
//   storyAimAngle()       where you are aiming (ground angle) or null when you are not aiming; combat uses it instead of auto-targeting
//   STORY_SKILLS          the three skill buttons (blank for now)
//   storyGround()         the small empty arena that is the Story world
//   storyStep(dt)         cooldowns, called every frame by update()
//   storyDraw()           aim line, called by draw()
// ======================================================================

// MODE = 'survival' (the normal game) or 'story'. STORY_WEAPON = the weapon type chosen on the Story screen ('gun' = Rogue, 'sword', 'grimoire').
let MODE = 'survival';

let STORY_WEAPON = 'gun';

// Screen direction (sx, sy) -> ground direction (the game logic is on a flat ground, only the drawing is isometric: see inputVec in input.js).
const scr2gnd = (sx, sy) => [.5 * sx + sy, sy - .5 * sx];

// SJ = the state of the two sticks and the mouse: x / y = how far the stick is pushed (-1 ... 1 on screen), on = it is being held, id = the pointer that holds it.
const SJ = {
  move: { on: 0, id: null, x: 0, y: 0 },
  aim: { on: 0, id: null, x: 0, y: 0 },
  mouse: { on: 0, x: 0, y: 0 }
};

// STORY_SKILLS = the three skill buttons, left to right. They are BLANK for now: the buttons are on screen but do nothing.
// To give a slot a skill, fill in its fields (the cooldown ring, the seconds counter and the keyboard key already work):
//   { n: 'Name', ic: '»', key: '1', cd: () => seconds, use() { ...do it...; return true; } }
// use() returns true when the skill fired (then the cooldown starts) or false when it could not be used right now.
const STORY_SKILLS = [
  { key: '1' },
  { key: '2' },
  { key: '3' }
];

// Uses skill i if it has a skill and is ready. Returns true when it fired.
function storyUse(i) {
  const k = STORY_SKILLS[i];
  if (!k.use || !S || !S.story || S.state !== 'play' || S.tp > 0 || S.skcd[i] > 0)
    return false;
  if (!k.use())
    return false;
  S.skcd[i] = k.cd();
  return true;
}

// ---------------------------------------------------------------------
// AIMING
// ---------------------------------------------------------------------

// The aim as a screen vector { x, y } (length 0-1), from the aim stick, the mouse (hold the button) or the arrow keys. Returns null when there is none.
function storyAimVec() {
  if (SJ.aim.on)
    return { x: SJ.aim.x, y: SJ.aim.y };
  if (SJ.mouse.on) {
    const x = SJ.mouse.x - W / 2;
    const y = SJ.mouse.y - H / 2;
    const l = Math.hypot(x, y);
    return l > 12 ? { x: x / l, y: y / l } : null;
  }
  const x = (keys.arrowright ? 1 : 0) - (keys.arrowleft ? 1 : 0);
  const y = (keys.arrowdown ? 1 : 0) - (keys.arrowup ? 1 : 0);
  const l = Math.hypot(x, y);
  return l ? { x: x / l, y: y / l } : null;
}

// Where the player is aiming, as a ground angle (what the weapons use), or null when not aiming (stick centred / not held).
function storyAimAngle() {
  if (!S || !S.story)
    return null;
  const v = storyAimVec();
  if (!v || Math.hypot(v.x, v.y) < C.storyAimDead)
    return null;
  const [gx, gy] = scr2gnd(v.x, v.y);
  return Math.atan2(gy, gx);
}

// Called by the weapons while the aim is held: remembers the direction and gives the character something to face (a point out in front, same idea as an aimed enemy).
function storyAimTarget(a, dist) {
  S.aimA = a;
  S.aimT = S.t;
  S.aimTg = { x: S.x + Math.cos(a) * dist, y: S.y + Math.sin(a) * dist, hp: 1, hr: 0 };
  return S.aimTg;
}

// Rogue / Grimoire in Story mode: while the aim is held the weapon fires in that direction at its normal attack speed.
function storyShoot(dt) {
  if (S.cd < 0)
    S.cd = 0;      // no stored-up shots: letting go of the stick and pushing it again does not skip the cooldown
  const a = storyAimAngle();
  if (a === null)
    return;
  const t = storyAimTarget(a, C.atkR * .6);
  if (S.cd > 0)
    return;
  fireVolley(t, a, 1);
  mwQueue();      // MultiWield: delayed repeats of this attack (combat.js)
  S.cd = 1 / rate();
  S.sc = (S.sc || 0) + 1;      // Swirl: every Nth attack also throws a spinning sword
  if (S.swl && S.sc % C.swirlEvery === 0)
    launchSwirl(t);
  S.st0 = S.t;      // the shoot animation of the 3D character
  sfx(S.wp === 'gun' ? 'bow' : 'shoot');
}

// Called every frame by update(): skill cooldowns, and keeps the player inside the small Story world.
function storyStep(dt) {
  for (let i = 0; i < 3; i++)
    if (S.skcd[i] > 0)
      S.skcd[i] = Math.max(0, S.skcd[i] - dt);
  const m = C.storyWorldR - 24;      // (a little away from the edge so the character does not stand on the border line)
  S.x = Math.max(-m, Math.min(m, S.x));
  S.y = Math.max(-m, Math.min(m, S.y));
}

// ---------------------------------------------------------------------
// DRAWING (ground effects)
// ---------------------------------------------------------------------

// Aim line on the ground in front of the player (while aiming). SX / SY = world -> screen (draw.js).
function storyDraw(g, SX, SY) {
  if (!S.story)
    return;
  const px = SX(S.x, S.y);
  const py = SY(S.x, S.y);
  const a = storyAimAngle();
  const rc = RAR[0].rgb;
  if (a !== null) {
    const sw = S.wp === 'sword';
    const L = sw ? C.swordR * (1 + C.swordRangePerLvl * S.sr) : C.storyAimLine;
    const ex = SX(S.x + Math.cos(a) * L, S.y + Math.sin(a) * L);
    const ey = SY(S.x + Math.cos(a) * L, S.y + Math.sin(a) * L);
    g.save();
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(' + rc + ',.28)';
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(ex, ey);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.75)';
    g.lineWidth = 2;
    g.setLineDash([8, 8]);
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(ex, ey);
    g.stroke();
    g.setLineDash([]);
    // arrow head at the end of the line
    const sa = Math.atan2(ey - py, ex - px);
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.beginPath();
    g.moveTo(ex + Math.cos(sa) * 9, ey + Math.sin(sa) * 9);
    g.lineTo(ex + Math.cos(sa + 2.5) * 9, ey + Math.sin(sa + 2.5) * 9);
    g.lineTo(ex + Math.cos(sa - 2.5) * 9, ey + Math.sin(sa - 2.5) * 9);
    g.closePath();
    g.fill();
    g.restore();
  }
}

// The Story world: one small, empty square arena (half-size C.storyWorldR in ground units) on a dark void: flat floor, a faint grid, a bright border.
// No trees, buildings, chests, orbs or enemies (trees.js / orbs.js return nothing in Story mode, update.js does not spawn). Drawn by draw() instead of the grass ground.
function storyGround(g, SX, SY, W, H) {
  const R = C.storyWorldR;
  const P = (x, y) => [SX(x, y), SY(x, y)];
  g.fillStyle = '#14161f';
  g.fillRect(0, 0, W, H);
  const c = [P(-R, -R), P(R, -R), P(R, R), P(-R, R)];
  const poly = () => {
    g.beginPath();
    g.moveTo(c[0][0], c[0][1]);
    for (let i = 1; i < 4; i++)
      g.lineTo(c[i][0], c[i][1]);
    g.closePath();
  };
  g.fillStyle = '#8f98ad';
  poly();
  g.fill();
  g.strokeStyle = 'rgba(20,22,31,.18)';
  g.lineWidth = 1.5;
  g.beginPath();
  for (let k = -R + C.storyGrid; k < R; k += C.storyGrid) {
    const a = P(k, -R);
    const b = P(k, R);
    const d = P(-R, k);
    const e = P(R, k);
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.moveTo(d[0], d[1]);
    g.lineTo(e[0], e[1]);
  }
  g.stroke();
  g.strokeStyle = '#e8ecf5';
  g.lineWidth = 4;
  g.lineJoin = 'round';
  poly();
  g.stroke();
}

// ---------------------------------------------------------------------
// ON-SCREEN CONTROLS (the two sticks and the three skill buttons, markup in index.html, styles at the end of style.css)
// ---------------------------------------------------------------------

const sctl = $('sctl');

let sctlShown = false;

// Lets go of both sticks (used when the controls are hidden, the game pauses or the window loses focus, so no direction stays "stuck").
function storyRelease() {
  for (const k of ['move', 'aim']) {
    SJ[k].on = 0;
    SJ[k].id = null;
    SJ[k].x = SJ[k].y = 0;
    setKnob(k);
  }
  SJ.mouse.on = 0;
  joy = null;
}

// Moves the little knob of a stick to match its state.
function setKnob(k) {
  const el = $(k === 'move' ? 'sjm' : 'sja');
  const kn = el.querySelector('.sjk');
  const r = el.clientWidth * (k === 'move' ? .2 : .3);      // how far the knob may travel
  kn.style.transform = 'translate(' + SJ[k].x * r + 'px,' + SJ[k].y * r + 'px)';
}

// Makes a stick work: pointer down starts it, moving the finger pushes it, lifting lets go. Each stick follows its own finger, so both can be used at once.
function bindStick(k) {
  const el = $(k === 'move' ? 'sjm' : 'sja');
  const st = SJ[k];
  const read = e => {
    const b = el.getBoundingClientRect();
    const R = b.width / 2;
    let x = (e.clientX - (b.left + R)) / R;
    let y = (e.clientY - (b.top + b.height / 2)) / R;
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    st.x = x;
    st.y = y;
    if (k === 'move')
      joy = { x0: 0, y0: 0, x: x * 50, y: y * 50 };      // inputVec (input.js) reads the move stick through "joy" (50 = full push)
    setKnob(k);
  };
  el.addEventListener('pointerdown', e => {
    if (st.on)
      return;
    e.preventDefault();
    st.on = 1;
    st.id = e.pointerId;
    el.setPointerCapture(e.pointerId);
    read(e);
  });
  el.addEventListener('pointermove', e => {
    if (st.on && e.pointerId === st.id)
      read(e);
  });
  const up = e => {
    if (!st.on || e.pointerId !== st.id)
      return;
    st.on = 0;
    st.id = null;
    st.x = st.y = 0;
    if (k === 'move')
      joy = null;
    setKnob(k);
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('lostpointercapture', up);
}

bindStick('move');

bindStick('aim');

// Skill buttons.
STORY_SKILLS.forEach((s, i) => {
  const b = $('sk' + i);
  b.querySelector('b').textContent = s.ic || '';
  b.classList.toggle('empty', !s.use);      // a blank slot is drawn dimmed
  b.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (storyUse(i))
      b.classList.add('hit');
    setTimeout(() => b.classList.remove('hit'), 120);
  });
});

// Desktop: hold the mouse button on the game to aim and attack towards the pointer. (Touch on the game screen does nothing in Story mode: the sticks are used.)
cv.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' && S && S.story) {
    SJ.mouse.on = 1;
    SJ.mouse.x = e.clientX;
    SJ.mouse.y = e.clientY;
  }
});

cv.addEventListener('pointermove', e => {
  if (SJ.mouse.on) {
    SJ.mouse.x = e.clientX;
    SJ.mouse.y = e.clientY;
  }
});

['pointerup', 'pointercancel'].forEach(n => cv.addEventListener(n, () => SJ.mouse.on = 0));

// Desktop keys: the key of each skill slot uses it (WASD moves, the arrow keys aim; see inputVec in input.js and storyAimVec above).
addEventListener('keydown', e => {
  if (isTyping(e) || e.repeat || !S || !S.story)
    return;
  const i = STORY_SKILLS.findIndex(s => s.key === e.key);
  if (i >= 0)
    storyUse(i);
});

addEventListener('blur', () => {
  if (S && S.story)
    storyRelease();
});

// Called by init() when a run starts: shows the controls in Story mode and hides them otherwise.
function storyInit() {
  storyRelease();
  storyFrame(1);
}

// Called every frame by the main loop: shows / hides the controls (only while a Story run is being played) and refreshes the skill buttons.
const skLast = ['', '', ''];

function storyFrame(force) {
  const on = !!(S && S.story && S.state === 'play');
  if (on !== sctlShown || force) {
    if (!on && sctlShown)
      storyRelease();
    sctlShown = on;
    sctl.style.display = on ? 'block' : 'none';
    skLast.fill('');
  }
  if (!on)
    return;
  STORY_SKILLS.forEach((s, i) => {
    if (!s.use)
      return;      // blank slot
    const left = S.skcd[i];
    const key = left > 0 ? Math.ceil(left) + ':' + Math.round(100 * left / s.cd()) : 'r';
    if (key === skLast[i])
      return;
    skLast[i] = key;
    const b = $('sk' + i);
    b.classList.toggle('rdy', left <= 0);
    b.querySelector('i').style.height = left > 0 ? Math.round(100 * left / s.cd()) + '%' : '0%';
    b.querySelector('span').textContent = left > 0 ? Math.ceil(left) : '';
  });
}

// ---------------------------------------------------------------------
// STORY MENU (opened from the main menu)
// ---------------------------------------------------------------------

// Story screen: pick a weapon (it will be Common here), then the run starts. Only weapon types you own at any rarity are offered.
function storyMenu() {
  const o = $('ov');
  o.style.display = 'flex';
  const types = ['gun', 'sword', 'grimoire'].filter(t => PD.inv[t] && PD.inv[t].some(n => n > 0));
  const sel = types.includes(STORY_WEAPON) ? STORY_WEAPON : (types.includes(PD.eq.t) ? PD.eq.t : types[0]);
  o.innerHTML = '<h1>Story</h1>' +
    '<p style="font-size:calc(15px * var(--fs,1));opacity:.85">Choose your weapon. In Story mode every weapon is <b>Common</b> with <b>' + C.storyBaseDmg + '</b> base damage, whatever rarity you own.</p>' +
    types.map(t => '<button class="opt" data-w="' + t + '" style="border-color:' + (t === sel ? '#9be15d' : '#fff8') + '"><b style="color:#fff;display:flex;align-items:center;gap:8px">' + TY[t].i + TY[t].n + '</b><span>Common · ' + C.storyBaseDmg + ' dmg · ' + STORY_HOW[t] + '</span></button>').join('') +
    '<p style="font-size:calc(14px * var(--fs,1));opacity:.7">Left stick: move · Right stick: aim and attack · 3 skill buttons (empty for now)<br>Keyboard: WASD move · arrow keys or hold the mouse to aim</p>' +
    '<button class="opt" id="sbk" style="border-color:#fff8"><b style="color:#fff">Back</b></button>';
  o.querySelectorAll('[data-w]').forEach(b => b.onclick = () => {
    STORY_WEAPON = b.dataset.w;
    MODE = 'story';
    ac();
    init();
  });
  $('sbk').onclick = menu;
}

// One line about how each weapon attacks in Story mode (shown on the Story screen).
const STORY_HOW = {
  gun: 'throws knives where you aim',
  sword: 'slashes where you aim',
  grimoire: 'fires orbs where you aim'
};
