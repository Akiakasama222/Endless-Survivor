// ======================================================================
// TUNING: DEFAULTS, SAVED EDITS & TEXT HELPERS
// Loaded right after config.js. It (1) remembers the default value of every number in C, (2) applies the numbers you changed in the
// Editor mode (saved on this device), and (3) has small helpers that write numbers as percents in the augment texts.
// The Editor screen itself is in editor.js.
// ======================================================================

// A copy of C exactly as written in config.js (the Editor uses it for "default" and "Reset").
const C_DEFAULTS = Object.assign({}, C);

// Where the Editor keeps your changes (this browser / device only). Format: { C: { key: value }, RAR: { "tierIndex": { d: damage, w: dropWeight } } }
const EDITOR_KEY = 'limboEditor';

// The numbers you changed in the Editor.
let EDITS = { C: {}, RAR: {} };

// Emergency exit: open the game with ?resetEditor in the address (for example index.html?resetEditor) to delete every Editor change,
// in case a setting made the game unusable.
try {
  if (/[?&]resetEditor\b/.test(location.search))
    localStorage.removeItem(EDITOR_KEY);
}
catch (e) {
}

try {
  const saved = JSON.parse(localStorage.getItem(EDITOR_KEY) || 'null');
  if (saved && typeof saved === 'object') {
    EDITS = { C: saved.C || {}, RAR: saved.RAR || {} };
    // apply to C right away, before the other scripts build their texts and tables (only keys that really exist, only numbers)
    for (const key in EDITS.C)
      if (key in C_DEFAULTS && typeof EDITS.C[key] === 'number' && isFinite(EDITS.C[key]))
        C[key] = EDITS.C[key];
  }
}
catch (e) {
}

// ---- text helpers: write a multiplier as a percent ----
// pc(.05) -> 5   (a number, rounded to 0.1)
const pc = v => Math.round(v * 1000) / 10;

// pcn(.1, 3) -> 30   (value x level, as a percent)
const pcn = (v, n) => pc(v * n);

// pcl(.1, 12) -> 100   (like pcn, but never above 100: chances cannot pass 100%)
const pcl = (v, n) => Math.min(100, pc(v * n));

// Puts the saved weapon-tier edits (damage d, chest drop weight w) onto RAR. player-data.js calls it right after RAR is built and
// whenever a new Mythical tier is created.
function applyRarityEdits() {
  RAR.forEach((tier, i) => {
    const e = EDITS.RAR[i];
    if (!e)
      return;
    if (typeof e.d === 'number' && isFinite(e.d))
      tier.d = e.d;
    if (typeof e.w === 'number' && isFinite(e.w))
      tier.w = e.w;
  });
}

// ---- hitbox display (Editor mode > "Show hitboxes") ----
// Saved on its own key so it takes effect at once, without restarting the run.
const HB_KEY = 'limboHitboxes';

let SHOW_HB = false;
try {
  SHOW_HB = localStorage.getItem(HB_KEY) === '1';
}
catch (e) {
}

// Turns the hitbox overlay on / off and remembers the choice on this device.
function hbSet(on) {
  SHOW_HB = !!on;
  try {
    localStorage.setItem(HB_KEY, SHOW_HB ? '1' : '0');
  }
  catch (e) {
  }
}
