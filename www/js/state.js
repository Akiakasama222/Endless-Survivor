// ======================================================================
// PRE-RENDERED SPRITES, RESIZE & RUN STATE
// Emoji sprites that are drawn once and stamped each frame, canvas resizing, and the main run-state variable S.
// ======================================================================

// Pre-rendered sprites (emoji + glow are drawn once, then just stamped each frame)
// EF = emoji font stack, SE = the sword emoji.
const EF = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

const SE = '🗡️';

// Draws something once onto a small hidden canvas (2x resolution) and returns it, so it can be stamped cheaply every frame.
function spr(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = w * 2;
  c.height = h * 2;
  const x = c.getContext('2d');
  x.scale(2, 2);
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  fn(x, w / 2, h / 2);
  return c;
}

// SPR = library of pre-rendered sprites (bullets, gems, effects, turrets...).
const SPR = {
  b: spr(40, 40, (x, u, v) => {
    x.fillStyle = '#ffe27a';
    x.shadowColor = '#ffd23f';
    x.shadowBlur = 10;
    x.font = 'bold 24px Arial,sans-serif';
    x.fillText('▸', u, v);
  }),
  s0: spr(96, 96, (x, u, v) => {
    x.shadowColor = '#7fd8ff';
    x.shadowBlur = 18;
    x.font = '34px ' + EF;
    x.fillText(SE, u, v);
    x.fillText(SE, u, v);
  }),
  s1: spr(96, 96, (x, u, v) => {
    x.shadowColor = '#bfeaff';
    x.shadowBlur = 32;
    x.font = '34px ' + EF;
    x.fillText(SE, u, v);
    x.fillText(SE, u, v);
  }),
  r: spr(48, 48, (x, u, v) => {
    x.font = '26px ' + EF;
    x.fillText('🚀', u, v);
  }),
  x: spr(128, 128, (x, u, v) => {
    x.font = '96px ' + EF;
    x.fillText('💥', u, v);
  }),
  d: spr(24, 24, (x, u, v) => {
    x.font = '14px ' + EF;
    x.fillText('🩸', u, v);
  })
};

// Resizes the canvas to the window (limits pixel ratio for performance).
function rs() {
  const d = Math.min(devicePixelRatio || 1, 1.75);
  W = innerWidth;
  H = innerHeight;
  cv.width = W * d;
  cv.height = H * d;
  g.setTransform(d, 0, 0, d, 0, 0);
}

addEventListener('resize', rs);

rs();

// S = the state of the current run. Main fields: x/y position, lvl, xp, hp, t (seconds), kills, state (play/paused/pick/over/menu), wp (weapon),
// en (enemies), eb (enemy bullets), bl (player bullets), gm (xp gems), tx (floating damage numbers).
// Augment level counters: nr fire rate, nm multishot, nb bounce, ls lifesteal, ns shield, nsp move speed, nd death explosion, nmi arcane missile, nxp magnet,
// ndd dance with death, nds slash dash, swl swirl, nbl bleed, nps slash push, nsc spellcaster, ne enlightenment, nts thunder strike, nhs health siphon,
// nf / nl / ni fire / lightning / ice turrets. See init() for the full list.
let S;

// best = personal records (highest level and kills), saved on the device.
let best = (() => {
  try {
    return JSON.parse(localStorage.getItem('esBest')) || { lvl: 1, kills: 0 };
  }
  catch (e) {
    return { lvl: 1, kills: 0 };
  }
})();
