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

addEventListener('keydown', e => keys[e.key.toLowerCase()] = 1);

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
  }
  x += (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  y += (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  const l = Math.hypot(x, y);
  if (l < 1e-6)
    return [0, 0];
  const m = Math.min(1, l);
  const wx = .5 * x + y;
  const wy = y - .5 * x;
  const n = Math.hypot(wx, wy) || 1;
  return [wx / n * m, wy / n * m];
}
