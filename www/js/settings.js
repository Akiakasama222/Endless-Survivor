// ======================================================================
// DEV TOOLS, SETTINGS & SAVE CODE
// Developer menu, volume settings, and exporting / importing the save code.
// ======================================================================

// DEV = developer options saved on the device: lvl = starting level for test runs, rew = whether such runs still count for records / rewards.
let DEV = { lvl: 1, rew: 0 };

try {
  const v = JSON.parse(localStorage.getItem('esDev'));
  if (v)
    DEV = { lvl: Math.max(1, Math.min(500, +v.lvl || 1)), rew: v.rew ? 1 : 0 };
}
catch (e) { }

// Saves the developer options.
function saveDev() {
  try {
    localStorage.setItem('esDev', JSON.stringify(DEV));
  }
  catch (e) { }
}

let devMsg = '';

let devChN = 10;

// Developer screen: choose a starting level and whether the test run still counts for records.
function devSettings(from) {
  const o = $('ov');
  o.style.display = 'flex';
  o.innerHTML = '<div class="inv"><h1>Developer</h1><p style="font-size:calc(15px * var(--fs,1));opacity:.8">Testing tools. They take effect on your next run.</p><button class="opt" id="edm" style="border-color:#ffc94a"><b style="color:#ffc94a">Editor mode</b><span>Edit weapon damage, enemies, bosses, multipliers and augments</span></button><div class="opt" style="border-color:#fff8"><b style="color:#fff;display:flex;justify-content:space-between;align-items:center">Starting level <input id="dn" type="number" min="1" max="500" value="' + DEV.lvl + '"></b><input id="ds" type="range" min="1" max="200" value="' + Math.min(200, DEV.lvl) + '"><div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' + [1, 10, 14, 29, 49, 99, 149].map(v => '<button class="chip" data-v="' + v + '">' + v + '</button>').join('') + '</div></div><button class="opt" id="drw" style="border-color:#fff8"><b style="color:#fff">Rewards in dev runs: ' + (DEV.rew ? 'ON' : 'OFF') + '</b><span>When OFF, runs that start above level 1 give no chests and do not change your records or stats</span></button><div class="opt" style="border-color:#fff8"><b style="color:#fff;display:flex;justify-content:space-between;align-items:center">Give chests <input id="dcn" type="number" min="1" max="100000" value="' + devChN + '"></b><span>You have ' + PD.chests + ' chest' + (PD.chests === 1 ? '' : 's') + '. ' + devMsg + '</span><div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="chip" id="dgc">Give chests</button></div></div><button class="opt" id="dpr" style="border-color:#ff6b6b"><b style="color:#ff6b6b">Player reset</b><span>Erase inventory, chests, stats and records</span></button><button class="opt" id="dbk" style="border-color:#fff8"><b style="color:#fff">Back</b></button></div>';
  const set = v => {
    DEV.lvl = Math.max(1, Math.min(500, Math.round(+v) || 1));
    $('dn').value = DEV.lvl;
    $('ds').value = Math.min(200, DEV.lvl);
    saveDev();
  };
  $('edm').onclick = () => editorScreen(from);
  $('ds').oninput = e => set(e.target.value);
  $('dn').onchange = e => set(e.target.value);
  o.querySelectorAll('.chip').forEach(b => b.onclick = () => set(b.dataset.v));
  $('drw').onclick = () => {
    DEV.rew = DEV.rew ? 0 : 1;
    saveDev();
    devSettings(from);
  };
  $('dcn').onchange = e => {
    devChN = Math.max(1, Math.min(100000, Math.round(+e.target.value) || 1));
    e.target.value = devChN;
  };
  $('dgc').onclick = () => {
    const n = Math.max(1, Math.min(100000, Math.round(+$('dcn').value) || 1));
    devChN = n;
    PD.chests += n;
    savePD();
    devMsg = 'Added ' + n + '.';
    devSettings(from);
  };
  let pa = 0;
  let pt = 0;
  $('dpr').onclick = () => {
    const b = $('dpr');
    if (!pa) {
      pa = 1;
      b.innerHTML = '<b style="color:#ff6b6b">Tap again to erase everything</b><span>This cannot be undone. Back up first in Settings → Save data.</span>';
      pt = setTimeout(() => {
        pa = 0;
        b.innerHTML = '<b style="color:#ff6b6b">Player reset</b><span>Erase inventory, chests, stats and records</span>';
      }, 4000);
      return;
    }
    clearTimeout(pt);
    PD = newPD();
    padInv();
    best = { lvl: 1, kills: 0 };
    try {
      localStorage.setItem('esBest', JSON.stringify(best));
    }
    catch (e) { }
    weapon = PD.eq.t;
    invSel = null;
    savePD();
    sfx('click');
    devMsg = 'Player data reset.';
    devSettings(from);
  };
  $('dbk').onclick = () => {
    devMsg = '';
    settings(from);
  };
}

// Frame rate choices shown in Settings: [frames per second (0 = no cap), name, description]. The choice is saved on this device and sets C.fps (used by the main loop).
const FPS_OPTS = [
  [30, '30 FPS', 'Retro look and easier on the battery'],
  [60, '60 FPS', 'Smoother movement'],
  [0, 'Unlimited', 'Follows your screen refresh rate (can use more battery)']
];

try {
  const f = localStorage.getItem('esFps');
  if (f !== null && FPS_OPTS.some(o => o[0] === +f))
    C.fps = +f;
}
catch (e) { }

// Index of the frame rate option that is active right now.
function fpsIdx() {
  const i = FPS_OPTS.findIndex(o => o[0] === C.fps);
  return i < 0 ? 0 : i;
}

// Switches to the next frame rate option and saves it.
function cycleFps() {
  C.fps = FPS_OPTS[(fpsIdx() + 1) % FPS_OPTS.length][0];
  try {
    localStorage.setItem('esFps', String(C.fps));
  }
  catch (e) { }
}

// Pixel scale choices shown in Settings: [C.pixelScale value, label]. 1 = full sharpness; higher = the game is drawn with fewer pixels and stretched with sharp edges (chunkier retro look, and lighter on weak devices).
// The choice is saved on this device and overrides the pixelScale value in config.js / Editor mode.
const PIX_OPTS = [
  [1, '1× (Sharp)'],
  [1.5, '1.5×'],
  [2, '2× (Retro)'],
  [3, '3× (Chunky)'],
  [4, '4× (Very chunky)']
];

try {
  const p = localStorage.getItem('esPix');
  if (p !== null && PIX_OPTS.some(o => o[0] === +p))
    C.pixelScale = +p;
}
catch (e) { }

// Index of the pixel scale option closest to the one that is active right now.
function pixIdx() {
  let b = 0;
  PIX_OPTS.forEach((o, i) => {
    if (Math.abs(o[0] - (C.pixelScale || 1)) < Math.abs(PIX_OPTS[b][0] - (C.pixelScale || 1)))
      b = i;
  });
  return b;
}

// Switches to a pixel scale, saves it and resizes the canvas right away (rs() is in state.js).
function setPix(v) {
  C.pixelScale = v;
  try {
    localStorage.setItem('esPix', String(v));
  }
  catch (e) { }
  rs();
}

// Text size (Settings -> Text size): 1 = normal. It scales every font in the menus and the HUD (css: --fs) and the numbers / labels drawn on the game screen (TXT). Saved on this device.
const TXT_MIN = .8;
const TXT_MAX = 1.3;
let TXT = 1;

try {
  const v = parseFloat(localStorage.getItem('esTxt'));
  if (v >= TXT_MIN && v <= TXT_MAX)
    TXT = v;
}
catch (e) { }

// Hands the current text size to the stylesheet (the top HUD row stops growing at 115% so it still fits on a phone).
function applyTxt() {
  const r = document.documentElement.style;
  r.setProperty('--fs', TXT);
  r.setProperty('--fsh', Math.min(TXT, 1.15));
}

applyTxt();

// Applies the saved volumes to the audio channels (squared so the sliders feel natural).
function applyVol() {
  const q = v => v * v;
  if (SB)
    SB.gain.value = q(vol.sfx);
  if (MB)
    MB.gain.value = q(vol.mus);
  if (AB)
    AB.gain.value = q(vol.amb);
}

// Saves the volume levels.
function saveVol() {
  try {
    localStorage.setItem('esVol', JSON.stringify(vol));
  }
  catch (e) { }
}

// Settings screen: sound on/off, volume sliders, save code and developer menu. `from` says which screen to return to ("menu" or "pause").
function settings(from) {
  const o = $('ov');
  o.style.display = 'flex';
  const pc = v => Math.round(v * 100);
  const row = (lbl, vid, id, min, max, step, val, txt) => '<label class="sr"><b>' + lbl + '</b><input id="' + id + '" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '"><span id="' + vid + '">' + txt + '</span></label>';
  const pxl = () => PIX_OPTS[pixIdx()][1].split(' ')[0];
  o.innerHTML = '<div class="inv"><h1>Settings</h1><div class="opt st">' +
    row('Effects', 'sv', 'sr1', 0, 100, 1, pc(vol.sfx), pc(vol.sfx) + '%') +
    row('Music', 'mv', 'sr2', 0, 100, 1, pc(vol.mus), pc(vol.mus) + '%') +
    row('Ambience', 'av', 'sr3', 0, 100, 1, pc(vol.amb), pc(vol.amb) + '%') +
    row('Text size', 'tv', 'sr4', TXT_MIN * 100, TXT_MAX * 100, 5, Math.round(TXT * 100), Math.round(TXT * 100) + '%') +
    row('Pixels', 'pxv', 'sr5', 0, PIX_OPTS.length - 1, 1, pixIdx(), pxl()) +
    '</div><div class="stb"><button class="opt" id="snt">' + sndLabel() + '</button><button class="opt" id="fps">FPS: ' + (FPS_OPTS[fpsIdx()][0] || 'Max') + '</button></div><div class="stb"><button class="opt" id="sdv">Save data</button>' + (DEV_TOOLS ? '<button class="opt" id="dvb">Developer</button>' : '') + '</div><button class="opt" id="bk2"><b style="color:#fff;text-align:center">Back</b></button></div>';
  $('sr1').oninput = e => {
    vol.sfx = e.target.value / 100;
    $('sv').textContent = e.target.value + '%';
    applyVol();
  };
  $('sr1').onchange = () => {
    saveVol();
    ac();
    sfx('click');
  };
  $('sr2').oninput = e => {
    vol.mus = e.target.value / 100;
    $('mv').textContent = e.target.value + '%';
    applyVol();
  };
  $('sr2').onchange = saveVol;
  $('sr3').oninput = e => {
    vol.amb = e.target.value / 100;
    $('av').textContent = e.target.value + '%';
    applyVol();
  };
  $('sr3').onchange = saveVol;
  $('sr4').oninput = e => {
    TXT = e.target.value / 100;
    $('tv').textContent = e.target.value + '%';
    applyTxt();
  };
  $('sr4').onchange = () => {
    try {
      localStorage.setItem('esTxt', String(TXT));
    }
    catch (e) { }
  };
  $('sr5').oninput = e => {
    const o = PIX_OPTS[+e.target.value] || PIX_OPTS[0];
    $('pxv').textContent = o[1].split(' ')[0];
    setPix(o[0]);
  };
  $('fps').onclick = () => {
    cycleFps();
    sfx('click');
    settings(from);
  };
  $('snt').onclick = () => toggleSnd(() => settings(from));
  $('sdv').onclick = () => saveData(from);
  if (DEV_TOOLS)
    $('dvb').onclick = () => devSettings(from);
  $('bk2').onclick = () => {
    if (from === 'pause') {
      S.state = 'play';
      pause();
    }
    else
      menu();
  };
}

// Builds the save code (text that starts with "ES1:") from the inventory and records.
function encSave() {
  return 'ES1:' + btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, pd: PD, best: best }))));
}

// Checks and decodes a pasted save code; throws if it is invalid.
function decSave(txt) {
  txt = String(txt || '').replace(/\s+/g, '');
  if (txt.indexOf('ES1:') !== 0)
    throw 0;
  const d = JSON.parse(decodeURIComponent(escape(atob(txt.slice(4)))));
  const p = d && d.pd;
  if (!p || !p.inv || !p.eq || !Array.isArray(p.inv.gun) || !Array.isArray(p.inv.sword))
    throw 0;
  return d;
}

// Replaces the current inventory and records with the data from a decoded save code.
function applySave(d) {
  const p = d.pd;
  const n = v => Math.max(0, Math.floor(+v) || 0);
  const cl = a => a.map(n);
  PD = Object.assign(newPD(), p, {
    inv: {
      gun: cl(p.inv.gun),
      sword: cl(p.inv.sword),
      grimoire: Array.isArray(p.inv.grimoire) ? cl(p.inv.grimoire) : [1]
    },
    eq: { t: ['sword', 'grimoire'].includes(p.eq.t) ? p.eq.t : 'gun', r: n(p.eq.r) },
    chests: n(p.chests),
    runs: n(p.runs),
    kills: n(p.kills)
  });
  ensureRar(Math.max(5, PD.eq.r, PD.inv.gun.length - 1, PD.inv.sword.length - 1));
  padInv();
  if (!(PD.inv[PD.eq.t][PD.eq.r] > 0)) {
    PD.eq = { t: 'gun', r: 0 };
    if (!(PD.inv.gun[0] > 0))
      PD.inv.gun[0] = 1;
  }
  const b = d.best || {};
  best = { lvl: Math.max(best.lvl | 0, n(b.lvl) || 1), kills: Math.max(best.kills | 0, n(b.kills)) };
  weapon = PD.eq.t;
  invSel = null;
  savePD();
  try {
    localStorage.setItem('esBest', JSON.stringify(best));
  }
  catch (e) { }
}

// Save-code screen: shows your code to copy and lets you paste a code to restore progress.
function saveData(from, msg) {
  const o = $('ov');
  o.style.display = 'flex';
  const code = encSave();
  const ta = 'width:100%;box-sizing:border-box;margin-top:10px;font:12px monospace;color:#fff;background:#10121f;border:2px solid #fff8;border-radius:10px;padding:8px;resize:none';
  o.innerHTML = '<h1>Save data</h1><p id="sdm" class="im">' + (msg || '') + '</p><div class="opt" style="border-color:#fff8"><b style="color:#fff">Back up</b><span>Copy this code or download it as a file. Keep it somewhere safe (Notes, email, cloud) before you uninstall.</span><textarea id="sdx" readonly rows="4" style="' + ta + '"></textarea><div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="chip" id="sdc">Copy code</button><button class="chip" id="sdd">Download file</button></div></div><div class="opt" style="border-color:#fff8"><b style="color:#fff">Restore</b><span>Paste a code or load a backup file. This replaces the progress on this device.</span><textarea id="sdi" rows="4" placeholder="Paste save code here" style="' + ta + '"></textarea><div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="chip" id="sdf">Load file</button><button class="chip" id="sdr">Restore</button></div><input type="file" id="sdfi" accept=".txt,.json,text/plain" style="display:none"></div><button class="opt" id="sdb" style="border-color:#fff8"><b style="color:#fff">Back</b></button>';
  const say = (t, bad) => {
    const m = $('sdm');
    m.textContent = t;
    m.style.color = bad ? '#ff6b6b' : '#9be15d';
  };
  $('sdx').value = code;
  let armed = 0;
  $('sdc').onclick = () => {
    const x = $('sdx');
    x.select();
    x.setSelectionRange(0, 99999);
    let ok = 0;
    try {
      ok = document.execCommand('copy');
    }
    catch (e) { }
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(code).then(() => say('Copied!'), () => say(ok ? 'Copied!' : 'Could not copy. Press and hold the code to copy it.', !ok));
    else
      say(ok ? 'Copied!' : 'Could not copy. Press and hold the code to copy it.', !ok);
  };
  $('sdd').onclick = () => {
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
      a.download = 'limbo-save.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      say('Download started. If nothing happens, copy the code instead.');
    }
    catch (e) {
      say('Download not supported here. Copy the code instead.', 1);
    }
  };
  $('sdf').onclick = () => $('sdfi').click();
  $('sdfi').onchange = e => {
    const f = e.target.files && e.target.files[0];
    if (!f)
      return;
    const r = new FileReader();
    r.onload = () => {
      $('sdi').value = String(r.result || '').trim();
      armed = 0;
      $('sdr').textContent = 'Restore';
      say('File loaded. Tap Restore.');
    };
    r.onerror = () => say('Could not read that file.', 1);
    r.readAsText(f);
  };
  $('sdi').oninput = () => {
    armed = 0;
    $('sdr').textContent = 'Restore';
  };
  $('sdr').onclick = () => {
    let d;
    try {
      d = decSave($('sdi').value);
    }
    catch (e) {
      armed = 0;
      $('sdr').textContent = 'Restore';
      return say('That save code is not valid.', 1);
    }
    if (!armed) {
      armed = 1;
      $('sdr').textContent = 'Tap again to replace progress';
      return say('This will replace your current progress on this device.', 1);
    }
    applySave(d);
    sfx('click');
    saveData(from, 'Restored! Your progress is back.');
  };
  $('sdb').onclick = () => settings(from);
}
