// ======================================================================
// AUDIO
// Web Audio: synthesized beeps, recorded sound effects, music and the sword swing sound (files live in assets/audio).
// ======================================================================

// AC = Web Audio context, snd = sound on/off, NB = shared white-noise buffer, SB / MB = sound-effect and music volume channels, SWL = swing file requested.
let AC = null;

let snd = 1;

let NB = null;

let SB = null;

let MB = null;

let SWL = 0;

// lastS remembers when each sound last played so very frequent sounds can be rate-limited.
const lastS = {};

// vol = saved volume levels (0-1) for sound effects and music.
let vol = { sfx: 1, mus: 1 };

try {
  const v = JSON.parse(localStorage.getItem('esVol'));
  if (v && isFinite(v.sfx) && isFinite(v.mus))
    vol = { sfx: +v.sfx, mus: +v.mus };
}
catch (e) { }

try {
  snd = localStorage.getItem('esSnd') === '0' ? 0 : 1;
}
catch (e) { }

// Creates the audio context on first use (browsers only allow it after a tap) and returns it, or null if audio is unavailable.
function ac() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      SB = AC.createGain();
      MB = AC.createGain();
      SB.connect(AC.destination);
      MB.connect(AC.destination);
      applyVol();
      loadSwing();
      loadSounds();
    }
    catch (e) { }
  }
  if (AC && AC.state === 'suspended')
    AC.resume();
  return AC;
}

addEventListener('pointerdown', () => {
  if (snd)
    ac();
});

// Plays a synthesized beep: frequency f (Hz) for d seconds with waveform `type`, optionally sliding in pitch to `slide` Hz.
function tone(f, d, type, vol, slide) {
  const a = ac();
  if (!a)
    return;
  const o = a.createOscillator();
  const gn = a.createGain();
  const t = a.currentTime;
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (slide)
    o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + d);
  gn.gain.setValueAtTime(vol, t);
  gn.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(gn);
  gn.connect(SB);
  o.start(t);
  o.stop(t + d);
}

// Plays a burst of filtered white noise for d seconds, sweeping the filter from f0 to f1 Hz.
function noise(d, f0, f1, vol) {
  const a = ac();
  if (!a)
    return;
  if (!NB) {
    NB = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const c = NB.getChannelData(0);
    for (let i = 0; i < c.length; i++)
      c[i] = Math.random() * 2 - 1;
  }
  const s = a.createBufferSource();
  const fl = a.createBiquadFilter();
  const gn = a.createGain();
  const t = a.currentTime;
  s.buffer = NB;
  fl.type = 'bandpass';
  fl.frequency.setValueAtTime(f0, t);
  fl.frequency.exponentialRampToValueAtTime(f1, t + d);
  gn.gain.setValueAtTime(vol, t);
  gn.gain.exponentialRampToValueAtTime(.0001, t + d);
  s.connect(fl);
  fl.connect(gn);
  gn.connect(SB);
  s.start(t);
  s.stop(t + d);
}

// Plays the named sound effect n. Uses the recorded file from assets/audio when it has loaded, otherwise a synthesized fallback. Very frequent sounds are rate-limited.
function sfx(n) {
  if (!snd)
    return;
  const now = performance.now();
  const gap = {
    hit: 80,
    gem: 50,
    kill: 120,
    shoot: 70,
    boom: 60,
    fexp: 60,
    stomp: 200,
    dexp: 80,
    ice: 60,
    tstrike: 100,
    zap: 70,
    eshot: 120,
    hurt: 150,
    missile: 120
  }[n] || 0;
  if (gap && lastS[n] && now - lastS[n] < gap)
    return;
  lastS[n] = now;
  switch (n) {
    case 'shoot':
      if (!playBuf('staffShoot', .5, .95 + Math.random() * .1))
        tone(620, .08, 'square', .035, 300);
      break;
    case 'swing':
      playSwing();
      break;
    case 'hit':
      if (!playBuf('zombieHit', .8, .92 + Math.random() * .16))
        tone(180, .07, 'triangle', .09, 90);
      break;
    case 'kill':
      if (!playBuf('zombieDeath', .6, .95 + Math.random() * .1))
        tone(300, .1, 'sine', .07, 650);
      break;
    case 'stomp':
      if (!playBuf('bossStomp', .7, 1)) {
        noise(.35, 900, 80, .28);
        tone(90, .3, 'sine', .2, 35);
      }
      break;
    case 'dexp':
      if (!playBuf('deathExplosion', .8, .95 + Math.random() * .1))
        noise(.35, 900, 80, .28);
      break;
    case 'ice':
      if (!playBuf('iceBurst', .7, .95 + Math.random() * .1)) {
        tone(1400, .12, 'triangle', .06, 700);
        noise(.15, 5000, 2000, .05);
      }
      break;
    case 'fexp':
      if (!playBuf('fireExplosion', .7, .95 + Math.random() * .1))
        noise(.35, 900, 80, .28);
      break;
    case 'tstrike':
      if (!playBuf('thunderStrike', .8, 1))
        noise(.3, 2400, 200, .25);
      break;
    case 'zap':
      if (!playBuf('lightningZap', .55, .95 + Math.random() * .1))
        tone(900, .1, 'sawtooth', .05, 200);
      break;
    case 'boom':
      noise(.35, 900, 80, .28);
      tone(90, .3, 'sine', .2, 35);
      break;
    case 'gem':
      tone(900 + Math.random() * 200, .05, 'sine', .04, undefined);
      break;
    case 'hurt':
      if (!playBuf('playerHurt', .9, 1))
        tone(140, .2, 'sawtooth', .12, 60);
      break;
    case 'block':
      tone(1200, .15, 'triangle', .1, 600);
      break;
    case 'level':
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, .18, 'triangle', .1), i * 90));
      break;
    case 'over':
      [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, .3, 'sawtooth', .08), i * 180));
      break;
    case 'missile':
      noise(.4, 300, 1500, .12);
      break;
    case 'dash':
      noise(.22, 1000, 300, .14);
      break;
    case 'eshot':
      if (!playBuf('enemyShot', .7, .95 + Math.random() * .1))
        tone(420, .1, 'sawtooth', .04, 200);
      break;
    case 'wind':
      tone(220, .12, 'triangle', .05, 440);
      break;
    case 'click':
      tone(700, .05, 'square', .05);
      break;
  }
}

// Sword swing sound (Sword_Swing.wav, trimmed to its audible 0.2 s)
// Sword swing sound file, and SWB = its decoded audio buffer.
const SWING_FILE = 'assets/audio/sword-swing.wav';

let SWB = null;

// Sound file table: key used by playBuf() -> file in assets/audio.
const SOUND_FILES = {
  music: 'assets/audio/music.mp3',
  bossStomp: 'assets/audio/boss-stomp.mp3',
  playerHurt: 'assets/audio/player-hurt.mp3',
  deathExplosion: 'assets/audio/death-explosion.mp3',
  fireExplosion: 'assets/audio/fireball-explosion.mp3',
  iceBurst: 'assets/audio/ice-burst.mp3',
  thunderStrike: 'assets/audio/thunder-strike.mp3',
  zombieDeath: 'assets/audio/zombie-death.mp3',
  zombieHit: 'assets/audio/zombie-hit.mp3',
  lightningZap: 'assets/audio/lightning-zap.mp3',
  enemyShot: 'assets/audio/enemy-shot.mp3',
  staffShoot: 'assets/audio/staff-shoot.mp3'
};

// BUF = decoded sound buffers by key; MUS / MG = the playing music source and its gain; musicWanted = music should be playing.
const BUF = {};

let MUS = null;

let MG = null;

let musicWanted = 0;

// Download every sound file once and decode it into BUF (runs after the first tap/click, when the browser allows audio)
function loadSounds() {
  if (!AC)
    return;
  for (const k in SOUND_FILES) {
    if (k in BUF)
      continue;
    BUF[k] = null;
    fetch(SOUND_FILES[k]).then(r => r.arrayBuffer()).then(ab => AC.decodeAudioData(ab, x => {
      BUF[k] = x;
      if (k === 'music' && musicWanted)
        startMusic();
    }, () => { })).catch(() => { });
  }
}

// Plays the loaded sound k at volume `vol` and playback speed `rate`. Returns false if it is not loaded yet so the caller can use a synthesized fallback.
function playBuf(k, vol, rate) {
  const a = ac();
  if (!a || !snd || !BUF[k])
    return false;
  const s = a.createBufferSource();
  const gn = a.createGain();
  s.buffer = BUF[k];
  s.playbackRate.value = rate || 1;
  gn.gain.value = vol;
  s.connect(gn);
  gn.connect(SB);
  s.start();
  return true;
}

// Starts the looping background music (does nothing if muted, not loaded yet, or already playing).
function startMusic() {
  musicWanted = 1;
  if (!snd || !AC || MUS || !BUF.music)
    return;
  const s = AC.createBufferSource();
  const gn = AC.createGain();
  s.buffer = BUF.music;
  s.loop = true;
  gn.gain.value = .35;
  s.connect(gn);
  gn.connect(MB);
  s.start();
  MUS = s;
  MG = gn;
}

// Stops the background music.
function stopMusic() {
  musicWanted = 0;
  if (MUS) {
    try {
      MUS.stop();
    }
    catch (e) { }
    MUS = null;
    MG = null;
  }
}

// Lowers the music volume while the game is paused (d = true) and restores it afterwards.
function duckMusic(d) {
  if (MG)
    MG.gain.value = d ? .12 : .35;
}

// Downloads and decodes the sword swing sound once.
function loadSwing() {
  if (SWB || !AC || SWL)
    return;
  SWL = 1;
  fetch(SWING_FILE).then(r => r.arrayBuffer()).then(ab => AC.decodeAudioData(ab, b => {
    SWB = b;
  }, () => { })).catch(() => { });
}

// Plays the sword swing; its speed follows the swing duration. Falls back to a noise burst until the file has loaded.
function playSwing() {
  const a = ac();
  if (!a)
    return;
  loadSwing();
  if (!SWB) {
    noise(.18, 600, 2400, .14);
    return;
  }
  const s = a.createBufferSource();
  const gn = a.createGain();
  s.buffer = SWB;
  s.playbackRate.value = Math.min(2, Math.max(.9, .22 / (S.sdur || .22))) * (.95 + Math.random() * .1);
  gn.gain.value = .9;
  s.connect(gn);
  gn.connect(SB);
  s.start();
}

// Text for the sound on/off button.
function sndLabel() {
  return 'Sound: ' + (snd ? 'ON' : 'OFF');
}

// Turns all sound on/off, saves the choice, and starts or stops the music to match.
function toggleSnd(cb) {
  snd = snd ? 0 : 1;
  try {
    localStorage.setItem('esSnd', snd ? '1' : '0');
  }
  catch (e) { }
  ac();
  if (!snd)
    stopMusic();
  else if (S.state !== 'menu' && S.state !== 'over')
    startMusic();
  if (typeof cb === 'function')
    return cb();
  if (S.state === 'paused') {
    S.state = 'play';
    pause();
  }
  else
    menu();
}
