// ======================================================================
// LIVE 3D MAGE
// The real 3D Mixamo mage (assets/models/mage3d.json, made from your five FBX files) is posed and drawn every frame, with no 3D library:
// the skeleton is animated, the skin is applied to the ~5,300 vertices and the ~10,500 triangles are filled by a tiny software rasterizer into a small
// buffer that has the same pixels as the game canvas (C.pixelScale), so the character is as chunky as everything around it.
//
// Two layers turn independently, like the sprite mage did:
//   upper body (spine, arms, head) = the cast animation: its first frame is the aiming pose, and it plays from `castFrom` after every shot;
//   lower body (hips and legs)     = Run Forward / Back / Left / Right, picked from the movement direction relative to the aim; standing still uses the legs of the cast pose.
// The whole body faces the aim (the enemy being shot at, or the walking direction when nothing is in range) and turns smoothly toward it.
//
// If the model file is missing or fails to load, live3dReady() stays false and the game draws the 16-direction sprite mage as before.
// ======================================================================

// on = false puts the sprite mage back.
// height = how tall the mage is on screen (px); tilt = how tall things look on screen compared with the ground (1.2247 matches the game's own camera, which looks down at 30 degrees;
// lower = flatter / more top-down looking).
// animFps = the animation steps this many times a second (30 = retro, 0 = as smooth as the screen); runSpeed = leg animation speed (1 = as authored).
// turn = how fast the body turns toward its aim (radians per second, 0 = instantly); castFrom = second of the cast animation where each shot starts (the wind-up before it is skipped);
// castMax = longest a cast may take (seconds; shortened so it ends before the next shot); strafeSwap = flip Run Left / Run Right if the legs look mirrored.
// outline = dark 1-pixel outline around the character; light = direction the light comes from (x, y, z; y is up); ambient / diffuse = brightness of the shading.
// colors = base color of each material of the model (r, g, b): the FBX has no texture image, only these material colors.
const LIVE3D = {
  on: true,
  file: 'assets/models/mage3d.json',
  height: 54,
  tilt: 1.2247,
  animFps: 30,
  runSpeed: 1,
  turn: 18,
  castFrom: .28,
  castMax: .9,
  strafeSwap: false,
  handMax: 1.4,      // Sword: the most the upper body may twist away from the legs to bring the hand to the hilt (radians)
  outline: true,
  outlineColor: [18, 10, 34],
  light: [-.45, .8, .25],
  ambient: .43,
  diffuse: .53,
  colors: {
    'Character Texture': [82, 66, 138],
    'Eyes': [190, 255, 215],
    'Material': [122, 96, 236],
    'Material.001': [156, 112, 90]
  },
  d: null,      // the decoded model (set when the file has loaded)
  // two separate render states (pixel buffer, cache and current turn): the player, and the afterimages drawn by ghostDraw()
  mn: { yaw: null, lastT: -1, key: '', cv: null, bw: 0, bh: 0 },
  gh: { yaw: null, lastT: -1, key: '', cv: null, bw: 0, bh: 0 }
};

// Reads a base64 string into a typed array of the given type (Float32Array, Uint8Array, ...).
function l3Decode(b64, Type) {
  const s = atob(b64);
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++)
    u[i] = s.charCodeAt(i);
  return new Type(u.buffer);
}

// Download and decode the model once.
fetch(LIVE3D.file).then(r => r.json()).then(j => {
  const nb = j.nb;
  const d = {
    nb, nv: j.nv, nt: j.nt, parent: Int16Array.from(j.parent), names: j.names, mats: j.mats,
    K: l3Decode(j.K, Float32Array), rest: l3Decode(j.rest, Float32Array),
    V: l3Decode(j.V, Float32Array), J: l3Decode(j.J, Uint8Array), W: l3Decode(j.W, Uint8Array),
    T: l3Decode(j.T, Uint16Array), M: l3Decode(j.M, Uint8Array),
    anims: {}
  };
  for (const k in j.anims) {
    const a = j.anims[k];
    d.anims[k] = { n: a.n, dur: a.dur, loop: a.loop, d: l3Decode(a.d, Float32Array), hy: l3Decode(a.hy, Float32Array), cy: l3Decode(a.cy, Float32Array), hd: l3Decode(a.hd, Float32Array) };
  }
  // lower body = hips and everything below the two upper-leg bones; everything else (spine, arms, head) is upper body
  d.lower = new Uint8Array(nb);
  for (let b = 0; b < nb; b++) {
    let a = b;
    while (a >= 0) {
      if (d.names[a] === 'Hips' && a === b || d.names[a] === 'LeftUpLeg' || d.names[a] === 'RightUpLeg') {
        d.lower[b] = 1;
        break;
      }
      a = d.parent[a];
    }
  }
  // working buffers (reused every frame)
  d.world = new Float32Array(nb * 12);      // world matrix of every bone (3 x 4, row by row)
  d.skin = new Float32Array(nb * 12);       // bone world x bind pose x the global turn / scale
  d.pose = new Float32Array(nb * 7);        // translation + rotation of every bone for this frame
  d.PX = new Float32Array(d.nv); d.PY = new Float32Array(d.nv); d.PZ = new Float32Array(d.nv);
  d.SX = new Float32Array(d.nv); d.SY = new Float32Array(d.nv); d.SD = new Float32Array(d.nv);
  d.palette = d.mats.map(n => LIVE3D.colors[n] || [200, 200, 200]);
  d.hipsRest = [d.rest[0], d.rest[1], d.rest[2]];
  d.iHips = d.names.indexOf('Hips');
  d.iSpine = d.names.indexOf('Spine');
  // the bones from the hips up to the head, and the head's rotation in the bind pose (needed to measure where the head is looking)
  d.chain = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head'].map(n => d.names.indexOf(n));
  d.bindHeadQ = [0, 0, 0, 1];
  for (const b of d.chain)
    d.bindHeadQ = l3Qmul(d.bindHeadQ, [d.rest[b * 7 + 3], d.rest[b * 7 + 4], d.rest[b * 7 + 5], d.rest[b * 7 + 6]]);
  LIVE3D.d = d;
}).catch(() => { });

// True when the live 3D character should be drawn for the current weapon (Rogue / Sword / Grimoire) and the model has loaded.
function live3dReady() {
  return LIVE3D.on && !!LIVE3D.d && (S.wp === 'gun' || S.wp === 'sword' || S.wp === 'grimoire');
}

// Writes the bone transforms of animation `a` at frame position `fp` (can be fractional) into `out` for every bone where only(b) is true.
function l3Sample(d, a, fp, out, pick) {
  const n = a.n;
  let f0;
  let f1;
  let t;
  if (a.loop) {
    fp = ((fp % n) + n) % n;
    f0 = Math.floor(fp);
    f1 = (f0 + 1) % n;
    t = fp - f0;
  }
  else {
    fp = Math.max(0, Math.min(n - 1, fp));
    f0 = Math.floor(fp);
    f1 = Math.min(n - 1, f0 + 1);
    t = fp - f0;
  }
  const nb = d.nb;
  const A = a.d;
  for (let b = 0; b < nb; b++) {
    if (pick(b) === 0)
      continue;
    const i0 = (f0 * nb + b) * 7;
    const i1 = (f1 * nb + b) * 7;
    const o = b * 7;
    for (let k = 0; k < 3; k++)
      out[o + k] = A[i0 + k] + (A[i1 + k] - A[i0 + k]) * t;
    // quaternion: shortest-path blend, then normalized
    let dot = A[i0 + 3] * A[i1 + 3] + A[i0 + 4] * A[i1 + 4] + A[i0 + 5] * A[i1 + 5] + A[i0 + 6] * A[i1 + 6];
    const sg = dot < 0 ? -1 : 1;
    let x = A[i0 + 3] + (A[i1 + 3] * sg - A[i0 + 3]) * t;
    let y = A[i0 + 4] + (A[i1 + 4] * sg - A[i0 + 4]) * t;
    let z = A[i0 + 5] + (A[i1 + 5] * sg - A[i0 + 5]) * t;
    let w = A[i0 + 6] + (A[i1 + 6] * sg - A[i0 + 6]) * t;
    const l = Math.hypot(x, y, z, w) || 1;
    out[o + 3] = x / l;
    out[o + 4] = y / l;
    out[o + 5] = z / l;
    out[o + 6] = w / l;
  }
}

// Body yaw (radians, 0 = facing straight ahead) of animation a at frame position fp, from its baked hips (arr = 'hy') or chest (arr = 'cy') yaw per frame.
function l3Yaw(a, fp, arr) {
  const n = a.n;
  let f0;
  let f1;
  let t;
  if (a.loop) {
    fp = ((fp % n) + n) % n;
    f0 = Math.floor(fp);
    f1 = (f0 + 1) % n;
    t = fp - f0;
  }
  else {
    fp = Math.max(0, Math.min(n - 1, fp));
    f0 = Math.floor(fp);
    f1 = Math.min(n - 1, f0 + 1);
    t = fp - f0;
  }
  return a[arr][f0] + (a[arr][f1] - a[arr][f0]) * t;
}

// Quaternion helpers (x, y, z, w) for the twist below.
const l3Qmul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
];

const l3Yq = a => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];      // a turn about the vertical axis

// The animations do not face straight ahead (the cast swings the whole body round by about 140 degrees, the idle stance is turned sideways), so the pose is straightened:
// dh turns the hips (and with them the legs) and ds twists the spine, both about the vertical axis, so that hips and chest end up facing the aim.
function l3Twist(d, dh, ds) {
  const P = d.pose;
  const h = d.iHips * 7;
  const s = d.iSpine * 7;
  let qh = [P[h + 3], P[h + 4], P[h + 5], P[h + 6]];
  qh = l3Qmul(l3Yq(dh), qh);
  P[h + 3] = qh[0]; P[h + 4] = qh[1]; P[h + 5] = qh[2]; P[h + 6] = qh[3];
  const qs = [P[s + 3], P[s + 4], P[s + 5], P[s + 6]];
  const hc = [-qh[0], -qh[1], -qh[2], qh[3]];      // inverse of the hips rotation
  const r = l3Qmul(l3Qmul(l3Qmul(hc, l3Yq(ds)), qh), qs);
  P[s + 3] = r[0]; P[s + 4] = r[1]; P[s + 5] = r[2]; P[s + 6] = r[3];
}

// In the cast animation the head keeps looking straight ahead while the body twists around it, so after the body has been straightened the head must not be dragged along:
// the neck is turned (about the vertical axis) until the head looks the way the animation has it (headTarget, radians).
function l3FixHead(d, headTarget) {
  const P = d.pose;
  const c = d.chain;
  const ql = i => [P[c[i] * 7 + 3], P[c[i] * 7 + 4], P[c[i] * 7 + 5], P[c[i] * 7 + 6]];
  let qw = ql(0);
  for (let i = 1; i <= 3; i++)
    qw = l3Qmul(qw, ql(i));      // world rotation of the chest (Spine2)
  const qn = ql(4);
  let qh = l3Qmul(l3Qmul(qw, qn), ql(5));      // world rotation of the head
  const bc = d.bindHeadQ;
  const rel = l3Qmul(qh, [-bc[0], -bc[1], -bc[2], bc[3]]);      // head rotation compared with the bind pose
  const vx = 2 * (rel[0] * rel[2] + rel[3] * rel[1]);
  const vz = 1 - 2 * (rel[0] * rel[0] + rel[1] * rel[1]);
  const now = Math.atan2(vx, vz);
  const turn = Math.atan2(Math.sin(headTarget - now), Math.cos(headTarget - now));
  const qc = [-qw[0], -qw[1], -qw[2], qw[3]];
  const r = l3Qmul(l3Qmul(l3Qmul(qc, l3Yq(turn)), qw), qn);
  const o = c[4] * 7;
  P[o + 3] = r[0]; P[o + 4] = r[1]; P[o + 5] = r[2]; P[o + 6] = r[3];
}

// Turns the bone transforms in d.pose into skin matrices (d.skin) that include the global turn (yaw) and scale.
function l3Skin(d, yaw, sc) {
  const nb = d.nb;
  const P = d.pose;
  const Wd = d.world;
  for (let b = 0; b < nb; b++) {
    const o = b * 7;
    const x = P[o + 3];
    const y = P[o + 4];
    const z = P[o + 5];
    const w = P[o + 6];
    // local 3 x 3 rotation from the quaternion
    const r00 = 1 - 2 * (y * y + z * z);
    const r01 = 2 * (x * y - z * w);
    const r02 = 2 * (x * z + y * w);
    const r10 = 2 * (x * y + z * w);
    const r11 = 1 - 2 * (x * x + z * z);
    const r12 = 2 * (y * z - x * w);
    const r20 = 2 * (x * z - y * w);
    const r21 = 2 * (y * z + x * w);
    const r22 = 1 - 2 * (x * x + y * y);
    const tx = P[o];
    const ty = P[o + 1];
    const tz = P[o + 2];
    const p = d.parent[b];
    const m = b * 12;
    if (p < 0) {
      Wd[m] = r00; Wd[m + 1] = r01; Wd[m + 2] = r02; Wd[m + 3] = tx;
      Wd[m + 4] = r10; Wd[m + 5] = r11; Wd[m + 6] = r12; Wd[m + 7] = ty;
      Wd[m + 8] = r20; Wd[m + 9] = r21; Wd[m + 10] = r22; Wd[m + 11] = tz;
    }
    else {
      const q = p * 12;
      const a00 = Wd[q]; const a01 = Wd[q + 1]; const a02 = Wd[q + 2]; const a03 = Wd[q + 3];
      const a10 = Wd[q + 4]; const a11 = Wd[q + 5]; const a12 = Wd[q + 6]; const a13 = Wd[q + 7];
      const a20 = Wd[q + 8]; const a21 = Wd[q + 9]; const a22 = Wd[q + 10]; const a23 = Wd[q + 11];
      Wd[m] = a00 * r00 + a01 * r10 + a02 * r20; Wd[m + 1] = a00 * r01 + a01 * r11 + a02 * r21; Wd[m + 2] = a00 * r02 + a01 * r12 + a02 * r22;
      Wd[m + 3] = a00 * tx + a01 * ty + a02 * tz + a03;
      Wd[m + 4] = a10 * r00 + a11 * r10 + a12 * r20; Wd[m + 5] = a10 * r01 + a11 * r11 + a12 * r21; Wd[m + 6] = a10 * r02 + a11 * r12 + a12 * r22;
      Wd[m + 7] = a10 * tx + a11 * ty + a12 * tz + a13;
      Wd[m + 8] = a20 * r00 + a21 * r10 + a22 * r20; Wd[m + 9] = a20 * r01 + a21 * r11 + a22 * r21; Wd[m + 10] = a20 * r02 + a21 * r12 + a22 * r22;
      Wd[m + 11] = a20 * tx + a21 * ty + a22 * tz + a23;
    }
  }
  // global matrix G = turn around the vertical axis by yaw, then scale; the model is shifted so its hips stay over the feet and its feet touch the ground
  const cy = Math.cos(yaw) * sc;
  const sy = Math.sin(yaw) * sc;
  const K = d.K;
  const Sk = d.skin;
  const gx = -d.hipsRest[0];
  const gz = -d.hipsRest[2];
  const gy = -8.3;      // lowest point of the model in its bind pose
  for (let b = 0; b < nb; b++) {
    const m = b * 12;
    const k = b * 16;
    // M = world(bone) x K(bone)   (3 x 4)
    const w00 = Wd[m]; const w01 = Wd[m + 1]; const w02 = Wd[m + 2]; const w03 = Wd[m + 3];
    const w10 = Wd[m + 4]; const w11 = Wd[m + 5]; const w12 = Wd[m + 6]; const w13 = Wd[m + 7];
    const w20 = Wd[m + 8]; const w21 = Wd[m + 9]; const w22 = Wd[m + 10]; const w23 = Wd[m + 11];
    const k00 = K[k]; const k01 = K[k + 1]; const k02 = K[k + 2]; const k03 = K[k + 3];
    const k10 = K[k + 4]; const k11 = K[k + 5]; const k12 = K[k + 6]; const k13 = K[k + 7];
    const k20 = K[k + 8]; const k21 = K[k + 9]; const k22 = K[k + 10]; const k23 = K[k + 11];
    const m00 = w00 * k00 + w01 * k10 + w02 * k20; const m01 = w00 * k01 + w01 * k11 + w02 * k21; const m02 = w00 * k02 + w01 * k12 + w02 * k22;
    const m03 = w00 * k03 + w01 * k13 + w02 * k23 + w03 + gx;
    const m10 = w10 * k00 + w11 * k10 + w12 * k20; const m11 = w10 * k01 + w11 * k11 + w12 * k21; const m12 = w10 * k02 + w11 * k12 + w12 * k22;
    const m13 = w10 * k03 + w11 * k13 + w12 * k23 + w13 + gy;
    const m20 = w20 * k00 + w21 * k10 + w22 * k20; const m21 = w20 * k01 + w21 * k11 + w22 * k21; const m22 = w20 * k02 + w21 * k12 + w22 * k22;
    const m23 = w20 * k03 + w21 * k13 + w22 * k23 + w23 + gz;
    // G x M with G = [[cy, 0, sy], [0, sc, 0], [-sy, 0, cy]]  (turn about Y, model facing +Z turns to (sin yaw, cos yaw))
    Sk[m] = cy * m00 + sy * m20; Sk[m + 1] = cy * m01 + sy * m21; Sk[m + 2] = cy * m02 + sy * m22; Sk[m + 3] = cy * m03 + sy * m23;
    Sk[m + 4] = sc * m10; Sk[m + 5] = sc * m11; Sk[m + 6] = sc * m12; Sk[m + 7] = sc * m13;
    Sk[m + 8] = -sy * m00 + cy * m20; Sk[m + 9] = -sy * m01 + cy * m21; Sk[m + 10] = -sy * m02 + cy * m22; Sk[m + 11] = -sy * m03 + cy * m23;
  }
}

// Applies the skin to every vertex and projects it to the screen (px relative to the feet; sx to the right, sy down).
function l3Vertices(d, tilt) {
  const V = d.V;
  const J = d.J;
  const Wt = d.W;
  const Sk = d.skin;
  const PX = d.PX; const PY = d.PY; const PZ = d.PZ;
  const SX = d.SX; const SY = d.SY; const SD = d.SD;
  const dk = .612;
  const hk = .5;
  for (let i = 0; i < d.nv; i++) {
    const vx = V[i * 3];
    const vy = V[i * 3 + 1];
    const vz = V[i * 3 + 2];
    let X = 0;
    let Y = 0;
    let Z = 0;
    for (let k = 0; k < 4; k++) {
      const w = Wt[i * 4 + k];
      if (w === 0)
        continue;
      const m = J[i * 4 + k] * 12;
      const f = w / 255;
      X += f * (Sk[m] * vx + Sk[m + 1] * vy + Sk[m + 2] * vz + Sk[m + 3]);
      Y += f * (Sk[m + 4] * vx + Sk[m + 5] * vy + Sk[m + 6] * vz + Sk[m + 7]);
      Z += f * (Sk[m + 8] * vx + Sk[m + 9] * vy + Sk[m + 10] * vz + Sk[m + 11]);
    }
    PX[i] = X; PY[i] = Y; PZ[i] = Z;
    SX[i] = X - Z;                          // the game's own ground projection: x - y ...
    SY[i] = (X + Z) * .5 - Y * tilt;        // ... and (x + y) / 2, with height pulling the point up the screen
    SD[i] = (X + Z) * dk + Y * hk;          // how close to the camera (bigger = closer)
  }
}

// Fills the triangles into the pixel buffer (flat shaded, z-buffered), then draws the outline.
function l3Raster(d, R, res, ox, oy) {
  const L = LIVE3D;
  const w = R.bw;
  const h = R.bh;
  const u32 = R.u32;
  const zb = R.zb;
  u32.fill(0);
  zb.fill(-1e9);
  const SX = d.SX; const SY = d.SY; const SD = d.SD;
  const PX = d.PX; const PY = d.PY; const PZ = d.PZ;
  const T = d.T;
  const M = d.M;
  // light direction, normalized; the camera looks from (.612, .5, .612)
  let lx = L.light[0];
  let ly = L.light[1];
  let lz = L.light[2];
  const ll = Math.hypot(lx, ly, lz);
  lx /= ll; ly /= ll; lz /= ll;
  const lit = d.palette;
  const inv = 1 / res;
  for (let t = 0; t < d.nt; t++) {
    const a = T[t * 3];
    const b = T[t * 3 + 1];
    const c = T[t * 3 + 2];
    const x0 = SX[a] * inv + ox; const y0 = SY[a] * inv + oy;
    const x1 = SX[b] * inv + ox; const y1 = SY[b] * inv + oy;
    const x2 = SX[c] * inv + ox; const y2 = SY[c] * inv + oy;
    let minX = Math.floor(Math.min(x0, x1, x2));
    let maxX = Math.ceil(Math.max(x0, x1, x2));
    let minY = Math.floor(Math.min(y0, y1, y2));
    let maxY = Math.ceil(Math.max(y0, y1, y2));
    if (maxX < 0 || maxY < 0 || minX >= w || minY >= h)
      continue;
    if (minX < 0) minX = 0;
    if (minY < 0) minY = 0;
    if (maxX > w - 1) maxX = w - 1;
    if (maxY > h - 1) maxY = h - 1;
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (area === 0)
      continue;
    // flat shading: face normal turned toward the camera
    const ex = PX[b] - PX[a]; const ey = PY[b] - PY[a]; const ez = PZ[b] - PZ[a];
    const fx = PX[c] - PX[a]; const fy = PY[c] - PY[a]; const fz = PZ[c] - PZ[a];
    let nx = ey * fz - ez * fy;
    let ny = ez * fx - ex * fz;
    let nz = ex * fy - ey * fx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;
    if (nx * .612 + ny * .5 + nz * .612 < 0) {
      nx = -nx; ny = -ny; nz = -nz;
    }
    const mat = M[t];
    const base = lit[mat];
    let k = L.ambient + L.diffuse * Math.max(0, nx * lx + ny * ly + nz * lz);
    if (d.mats[mat] === 'Eyes')
      k = 1.2;
    let r = base[0] * k;
    let g = base[1] * k;
    let bl = base[2] * k;
    if (r > 255) r = 255;
    if (g > 255) g = 255;
    if (bl > 255) bl = 255;
    const col = (255 << 24) | (bl << 16) | (g << 8) | (r | 0);
    const z0 = SD[a]; const z1 = SD[b]; const z2 = SD[c];
    const ia = 1 / area;
    for (let y = minY; y <= maxY; y++) {
      const py = y + .5;
      for (let x = minX; x <= maxX; x++) {
        const px = x + .5;
        const w0 = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) * ia;
        const w1 = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) * ia;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0)
          continue;
        const z = w0 * z0 + w1 * z1 + w2 * z2;
        const i = y * w + x;
        if (z > zb[i]) {
          zb[i] = z;
          u32[i] = col;
        }
      }
    }
  }
  if (L.outline) {
    const oc = L.outlineColor;
    const ocol = (255 << 24) | (oc[2] << 16) | (oc[1] << 8) | oc[0];
    const src = R.u32b;
    src.set(u32);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (src[i] !== 0)
          continue;
        if ((x > 0 && src[i - 1] !== 0) || (x < w - 1 && src[i + 1] !== 0) || (y > 0 && src[i - w] !== 0) || (y < h - 1 && src[i + w] !== 0))
          u32[i] = ocol;
      }
  }
}

// Draws the live 3D mage with its feet at (px, py - 3). aim = screen angle the body faces, mv = the screen angle the player is moving in (or null when standing still).
// hand (optional) = screen angle of the Sword's hilt: the upper body (but not the head) is then twisted so the right hand ends up where the hilt is.
// noDraw = true only renders into the model's own pixel buffer and returns where the feet are in it (used to build the afterimage sprites below).
function drawLive3D(g, px, py, aim, mv, ghost, hand, noDraw) {
  const L = LIVE3D;
  const d = L.d;
  const R = ghost ? L.gh : L.mn;      // an afterimage (ghost = true) has its own buffer and never changes the player's turn
  const res = Math.max(1, C.pixelScale || 1);
  // pixel buffer: 120 x 100 game px around the feet, in canvas pixels
  const bw = Math.ceil(120 / res);
  const bh = Math.ceil(100 / res);
  if (!R.cv || R.bw !== bw || R.bh !== bh) {
    R.cv = document.createElement('canvas');
    R.cv.width = R.bw = bw;
    R.cv.height = R.bh = bh;
    R.ctx = R.cv.getContext('2d');
    R.id = R.ctx.createImageData(bw, bh);
    R.u32 = new Uint32Array(R.id.data.buffer);
    R.u32b = new Uint32Array(bw * bh);
    R.zb = new Float32Array(bw * bh);
    R.key = '';
  }
  const ox = Math.round(60 / res);      // where the feet are inside the buffer
  const oy = Math.round(78 / res);
  // facing: the screen angle is turned into a direction on the ground, then into a rotation of the model
  const sx = Math.cos(aim);
  const sy = Math.sin(aim);
  const wx = sy + sx * .5;
  const wz = sy - sx * .5;
  const target = Math.atan2(wx, wz);
  const dt = R.lastT < 0 ? 0 : Math.max(0, Math.min(.1, S.t - R.lastT));
  R.lastT = S.t;
  if (ghost || R.yaw === null || !(L.turn > 0))
    R.yaw = target;
  let df = Math.atan2(Math.sin(target - R.yaw), Math.cos(target - R.yaw));
  const step = L.turn > 0 ? L.turn * dt : 1e9;
  if (Math.abs(df) <= step)
    R.yaw = target;
  else
    R.yaw += Math.sign(df) * step;
  const yaw = R.yaw;
  let handYaw = null;      // the same screen-angle -> model-rotation conversion as for the aim
  if (hand !== null && hand !== undefined) {
    const hx = Math.cos(hand);
    const hy = Math.sin(hand);
    handYaw = Math.atan2(hy + hx * .5, hy - hx * .5);
  }
  // which leg animation
  let leg = null;
  if (mv !== null) {
    let rel = mv - aim;
    rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    const side = L.strafeSwap ? -1 : 1;
    if (Math.abs(rel) > Math.PI * .75)
      leg = 'runB';
    else if (Math.abs(rel) > Math.PI * .25)
      leg = rel * side > 0 ? 'runR' : 'runL';
    else
      leg = 'runF';
  }
  const q = L.animFps > 0 ? Math.floor(S.t * L.animFps) / L.animFps : S.t;      // animation clock, stepped for the retro look
  const cast = d.anims.cast;
  let upFrame = 0;
  let castOn = false;
  if (S.st0 !== undefined) {
    const since = S.t - S.st0;
    const dur = Math.max(.2, Math.min(L.castMax, .9 / rate()));
    if (since >= 0 && since < dur) {
      castOn = true;
      const sq = L.animFps > 0 ? Math.floor(since * L.animFps) / L.animFps : since;
      const tt = L.castFrom + sq / dur * (cast.dur - L.castFrom);
      upFrame = tt / cast.dur * (cast.n - 1);
    }
  }
  let legFrame = 0;
  if (leg !== null) {
    const a = d.anims[leg];
    legFrame = q * L.runSpeed * (1 + C.moveSpeedPerLvl * S.nsp) / a.dur * a.n;
  }
  const key = [leg, Math.round(legFrame * 4), Math.round(upFrame * 4), Math.round(yaw * 200), handYaw === null ? '' : Math.round(handYaw * 200), res, L.height, L.tilt].join(',');
  if (key !== R.key) {
    R.key = key;
    // pose: lower-body bones from the leg animation (or the cast stance), the others from the cast animation
    const lowerAnim = leg !== null ? d.anims[leg] : cast;
    const lowerFrame = leg !== null ? legFrame : 0;
    l3Sample(d, lowerAnim, lowerFrame, d.pose, b => d.lower[b]);
    l3Sample(d, cast, upFrame, d.pose, b => 1 - d.lower[b]);
    // straighten the pose so hips and chest face the aim:
    //   standing still: the legs of the cast stance are turned back by the stance's own yaw; running: the run animations already face the way they run
    //   chest: whatever yaw the hips have now plus the twist the cast animation puts into the spine (frame by frame) is cancelled
    const hipsNow = leg !== null ? l3Yaw(lowerAnim, lowerFrame, 'hy') : 0;
    const dh = leg !== null ? 0 : -l3Yaw(cast, 0, 'hy');
    const ds = -(hipsNow + l3Yaw(cast, upFrame, 'cy') - l3Yaw(cast, upFrame, 'hy'));
    l3Twist(d, dh, ds);
    l3FixHead(d, l3Yaw(cast, upFrame, 'hd'));
    if (handYaw !== null) {
      // Sword: measure where the right hand points (seen from the hips) with this pose, then twist the spine by the difference so the hand sits on the hilt.
      // The legs keep following the aim, and the head is locked on the aim again afterwards, so only the torso and arms swing round.
      l3Skin(d, 0, 1);
      const iH = d.names.indexOf('RightHand') * 12;
      const iB = d.iHips * 12;
      const ha = Math.atan2(d.world[iH + 3] - d.world[iB + 3], d.world[iH + 11] - d.world[iB + 11]);
      let tw = handYaw - (yaw + ha);
      tw = Math.atan2(Math.sin(tw), Math.cos(tw));
      tw = Math.max(-L.handMax, Math.min(L.handMax, tw));
      l3Twist(d, 0, tw);
      l3FixHead(d, l3Yaw(cast, upFrame, 'hd'));
    }
    const sc = L.height / (868.2 - 8.3) / L.tilt;      // model units (cm) to game px: the model is 860 tall and its height is multiplied by tilt on screen
    l3Skin(d, yaw, sc);
    l3Vertices(d, L.tilt);
    l3Raster(d, R, res, ox, oy);
    R.ctx.putImageData(R.id, 0, 0);
  }
  if (noDraw)
    return { cv: R.cv, bw, bh, res, ox, oy };
  g.save();
  g.imageSmoothingEnabled = false;
  // the buffer's feet position is snapped to the canvas pixel grid so the character never shimmers
  const x0 = Math.round((px - ox * res) / res) * res;
  const y0 = Math.round((py - 3 - oy * res) / res) * res;
  g.drawImage(R.cv, x0, y0, bw * res, bh * res);
  g.restore();
}

// MultiWield afterimages: instead of rendering the 3D model again for every afterimage every frame (10,000+ triangles each), the blue see-through sprites are cached.
// A sprite is made once per (facing in 16 directions, attack-animation step at 12 per second, hilt direction) and shared by every afterimage that needs it.
const GH_SPR = new Map();

function l3GhostSprite(th, st0, hand) {
  const L = LIVE3D;
  const res = Math.max(1, C.pixelScale || 1);
  const q = Math.PI / 8;
  const k16 = Math.round(th / q);
  const hk = hand === null || hand === undefined ? 'n' : ((Math.round(hand / q) % 16) + 16) % 16;
  const dur = Math.max(.2, Math.min(L.castMax, .9 / rate()));
  let qs = -1;      // which step of the attack animation (-1 = standing)
  if (st0 !== undefined) {
    const since = S.t - st0;
    if (since >= 0 && since < dur)
      qs = Math.floor(since * 12);
  }
  const key = [((k16 % 16) + 16) % 16, qs, hk, Math.round(dur * 20), res, L.height, L.tilt, S.wp].join(',');
  let e = GH_SPR.get(key);
  if (e) {
    GH_SPR.delete(key);      // keep the most recently used at the end
    GH_SPR.set(key, e);
    return e;
  }
  const keep = S.st0;
  S.st0 = qs >= 0 ? S.t - Math.min(dur - .001, (qs + .5) / 12) : undefined;
  const r = drawLive3D(null, 0, 0, k16 * q, null, true, hk === 'n' ? null : hk * q, true);
  S.st0 = keep;
  const cv2 = document.createElement('canvas');
  cv2.width = r.bw;
  cv2.height = r.bh;
  const x = cv2.getContext('2d');
  x.drawImage(r.cv, 0, 0);
  x.globalCompositeOperation = 'source-atop';      // the blue tint, baked in
  x.fillStyle = 'rgba(110,190,255,.55)';
  x.fillRect(0, 0, r.bw, r.bh);
  e = { cv: cv2, bw: r.bw, bh: r.bh, res: r.res, ox: r.ox, oy: r.oy };
  GH_SPR.set(key, e);
  if (GH_SPR.size > 160)
    GH_SPR.delete(GH_SPR.keys().next().value);
  return e;
}
