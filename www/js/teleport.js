// ======================================================================
// TELEPORT-IN (spawn animation)
// Plays when a run starts: a purple portal ring opens on the ground, a beam of light shoots up, the mage fades in inside it and the beam dissolves.
// Sheet: assets/images/fx-teleport-in.png, 320 x 192, 8 columns x 3 rows, every frame 40 x 64 (play left to right, top row first; 18 frames in use, the last slots are empty).
//   Frames 0-7  = the ring and arches charge up, the beam rises
//   Frames 8-11 = the full pillar of light (the mage is hidden inside it)
//   Frames 12-17 = the pillar breaks apart and fades out
// ======================================================================

const TPI = new Image();

TPI.src = IMAGE_FILES.teleportIn;

const TP_W = 40, TP_H = 64;       // size of one frame in the sheet
const TP_COLS = 8, TP_N = 18;     // frames per row, frames in use
const TP_AX = 20, TP_AY = 59;     // point of a frame that sits on the ground under the mage's feet (centre of the ring)
const TP_FPS = 15;                // animation speed (frames per second)
const TP_TIME = TP_N / TP_FPS;    // seconds the whole animation lasts
const TP_SCALE = 2;               // size on screen (1 = pixel size in the picture, whole numbers keep the pixels sharp)
const TP_SHOW = 9;                // frame at which the mage starts to fade in...
const TP_SHOW_N = 3;              // ...over this many frames
const TP_FREE = .25;              // seconds before the end when the player may already move and enemies start to spawn
const TP_SAFE = .6;               // seconds of invulnerability once control is handed over

// Called by init(): starts the animation (skipped when the picture failed to load, so the run just starts normally).
function teleportStart() {
  S.tp = TPI.naturalWidth ? TP_TIME : 0;
  if (S.tp > 0)
    sfx('teleport');
}

// Frame number (0 .. TP_N - 1) the animation is on right now.
function teleportFrame() {
  return Math.min(TP_N - 1, Math.floor((1 - S.tp / TP_TIME) * TP_N));
}

// How visible the mage is while the animation plays (0 = hidden inside the beam, 1 = fully there).
function teleportMageAlpha() {
  if (!(S.tp > 0))
    return 1;
  const p = (1 - S.tp / TP_TIME) * TP_N;
  return Math.max(0, Math.min(1, (p - TP_SHOW) / TP_SHOW_N));
}

// Draws the current frame with its ground ring centred on (px, py).
function teleportDraw(g, px, py) {
  if (!(S.tp > 0) || !TPI.naturalWidth)
    return;
  const f = teleportFrame();
  const k = TP_SCALE;
  g.save();
  g.imageSmoothingEnabled = false;
  g.drawImage(TPI, (f % TP_COLS) * TP_W, Math.floor(f / TP_COLS) * TP_H, TP_W, TP_H, Math.round(px - TP_AX * k), Math.round(py - 2 - TP_AY * k), TP_W * k, TP_H * k);
  g.restore();
}
