// ======================================================================
// INPUT
// Touch joystick and keyboard movement.
// ======================================================================

// joy = touch joystick state, keys = pressed keyboard keys.
let joy = null;

let keys = {};

cv.addEventListener('pointerdown', e => {
  joy = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY };
  cv.setPointerCapture(e.pointerId);
});

cv.addEventListener('pointermove', e => {
  if (joy) {
    joy.x = e.clientX;
    joy.y = e.clientY;
  }
});

['pointerup', 'pointercancel'].forEach(n => cv.addEventListener(n, () => joy = null));

// True while the player is typing in a text box (e.g. the feedback form) - game keys are ignored then.
function isTyping(e) {
  const t = e.target;
  return !!(t && t.matches && t.matches('input, textarea, select'));
}

addEventListener('keydown', e => {
  if (!isTyping(e))
    keys[e.key.toLowerCase()] = 1;
});

addEventListener('keyup', e => keys[e.key.toLowerCase()] = 0);

// Returns the movement direction (x, y) from the touch joystick and/or WASD / arrow keys.
function inputVec() {
  let x = 0;
  let y = 0;
  if (joy) {
    x = joy.x - joy.x0;
    y = joy.y - joy.y0;
    const l = Math.hypot(x, y);
    const m = 50;
    if (l > 0) {
      const k = Math.min(l, m) / m;
      x = x / l * k;
      y = y / l * k;
    }
    if (C.snap8) {
      // Retro 8-way movement: the stick snaps to horizontal, vertical or diagonal (on screen) at full speed, with a small dead zone
      if (l < C.stickDead) {
        x = 0;
        y = 0;
      }
      else {
        const a = Math.round(Math.atan2(y, x) / (Math.PI / 4)) * (Math.PI / 4);
        x = Math.round(Math.cos(a) * 1e6) / 1e6;
        y = Math.round(Math.sin(a) * 1e6) / 1e6;
      }
    }
  }
  x += (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  y += (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  const l = Math.hypot(x, y);
  if (l < 1e-6)
    return [0, 0];
  const m = Math.min(1, l);
  // Same speed in every direction ON SCREEN (horizontal, vertical and diagonal now feel equal), then converted to the isometric ground
  const sx = x / l * m;
  const sy = y / l * m;
  return [.5 * sx + sy, sy - .5 * sx];
}
