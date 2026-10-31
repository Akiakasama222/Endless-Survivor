// ======================================================================
// RENDERING
// Draws one frame: isometric ground, buildings, characters, projectiles and effects.
// ======================================================================

// Draws one frame of the game.
function draw() {
  // Isometric view: the game logic stays on a flat ground plane; only the drawing is projected (2:1 diamond tiles, upright sprites)
  const SX = (x, y) => W / 2 + ((x - S.x) - (y - S.y));
  const SY = (x, y) => H / 2 + ((x - S.x) + (y - S.y)) * .5;
  g.fillStyle = '#8a8da3';
  g.fillRect(0, 0, W, H);
  const T = 80;
  const B = W / 4 + H / 2 + T;
  const i0 = Math.floor((S.x - B) / T);
  const i1 = Math.ceil((S.x + B) / T);
  const j0 = Math.floor((S.y - B) / T);
  const j1 = Math.ceil((S.y + B) / T);
  g.fillStyle = '#9496ab';
  for (let i = i0; i < i1; i++)
    for (let j = j0; j < j1; j++) {
      const ax = SX(i * T, j * T);
      const ay = SY(i * T, j * T);
      if (ax < -T || ax > W + T || ay < -T || ay > H)
        continue;
      if ((i + j) & 1) {
        g.beginPath();
        g.moveTo(ax, ay);
        g.lineTo(ax + T, ay + T / 2);
        g.lineTo(ax, ay + T);
        g.lineTo(ax - T, ay + T / 2);
        g.fill();
      }
    }
  g.strokeStyle = '#ffffff30';
  g.lineWidth = 1.5;
  g.beginPath();
  for (let i = i0; i < i1; i++)
    for (let j = j0; j < j1; j++) {
      const ax = SX(i * T, j * T);
      const ay = SY(i * T, j * T);
      if (ax < -T || ax > W + T || ay < -T || ay > H)
        continue;
      g.moveTo(ax - T, ay + T / 2);
      g.lineTo(ax, ay);
      g.lineTo(ax + T, ay + T / 2);
    }
  g.stroke();
  const bdPoly = (c, pts, st) => {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++)
      g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
    g.fill();
    if (st) {
      g.strokeStyle = 'rgba(15,15,35,.35)';
      g.lineWidth = 1;
      g.stroke();
    }
  };
  const bdDraw = (p, al, sh) => {
    const P = (x, y, z) => [SX(x, y), SY(x, y) - z];
    const { x0, x1, y0, y1, h, rh } = p;
    const ym = (y0 + y1) / 2;
    const w = x1 - x0;
    const dd = y1 - y0;
    const cxm = (x0 + x1) / 2;
    const K = bdK;
    const fl = (c, a, b, z0, z1, st) => bdPoly(c, [P(a, y1, z0), P(b, y1, z0), P(b, y1, z1), P(a, y1, z1)], st);
    const fr = (c, a, b, z0, z1, st) => bdPoly(c, [P(x1, a, z0), P(x1, b, z0), P(x1, b, z1), P(x1, a, z1)], st);
    const wc = k => bdHash(p.s, k, 7) < .25 ? '#ffd57a' : '#6c9bc4';
    const bx = (xa, ya, xb, yb, z0, z1) => {
      bdPoly('#9aa0a8', [P(xa, yb, z0), P(xb, yb, z0), P(xb, yb, z1), P(xa, yb, z1)], 1);
      bdPoly('#7b818a', [P(xb, yb, z0), P(xb, ya, z0), P(xb, ya, z1), P(xb, yb, z1)], 1);
      bdPoly('#b4bac2', [P(xa, ya, z1), P(xb, ya, z1), P(xb, yb, z1), P(xa, yb, z1)], 1);
    };
    g.globalAlpha = al;
    if (sh) {
      const o = Math.min(50 * K, h * .35);
      const m = 4 * K;
      bdPoly('rgba(0,0,0,.2)', [P(x0 - m, y0 - m, 0), P(x1 + m + o, y0 - m, 0), P(x1 + m + o, y1 + m, 0), P(x0 - m, y1 + m, 0)]);
    }
    bdPoly(p.cL, [P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, h), P(x0, y1, h)], 1);
    bdPoly(p.cR, [P(x1, y1, 0), P(x1, y0, 0), P(x1, y0, h), P(x1, y1, h)], 1);
    if (p.kind === 'house') {
      fl('#5a3a24', cxm - 8 * K, cxm + 8 * K, 0, 32 * K, 1);
      fl(wc(1), x0 + w * .14, x0 + w * .14 + 14 * K, 24 * K, 42 * K, 1);
      fl(wc(2), x1 - w * .14 - 14 * K, x1 - w * .14, 24 * K, 42 * K, 1);
      fr(wc(3), ym - 8 * K, ym + 8 * K, 24 * K, 42 * K, 1);
    }
    else if (p.kind === 'apt') {
      const n = Math.floor((h - 10 * K) / (30 * K));
      const cols = Math.max(2, Math.floor(w / (24 * K)));
      const rc = Math.max(2, Math.floor(dd / (24 * K)));
      for (let i = 0; i < n; i++) {
        const z0 = 14 * K + i * 30 * K;
        for (let j = 0; j < cols; j++) {
          const a = x0 + (j + .5) * w / cols - 6 * K;
          if (i === 0 && j === Math.floor(cols / 2))
            fl('#4a3322', a, a + 12 * K, 0, 22 * K, 1);
          else
            fl(wc(i * 10 + j), a, a + 12 * K, z0, z0 + 16 * K, 1);
        }
        for (let j = 0; j < rc; j++) {
          const a = y0 + (j + .5) * dd / rc - 6 * K;
          fr(wc(100 + i * 10 + j), a, a + 12 * K, z0, z0 + 16 * K, 1);
        }
      }
    }
    else if (p.kind === 'shed') {
      fl('#4a3322', cxm - 7 * K, cxm + 7 * K, 0, 24 * K, 1);
    }
    else {
      fl('#5c6670', cxm - 20 * K, cxm + 20 * K, 0, 40 * K, 1);
      for (let j = 0; j < 5; j++) {
        const a = x0 + 14 * K + j * (w - 42 * K) / 4;
        fl(wc(20 + j), a, a + 14 * K, h - 20 * K, h - 10 * K, 1);
      }
      fr(wc(30), ym - 22 * K, ym - 8 * K, h - 20 * K, h - 10 * K, 1);
      fr(wc(31), ym + 8 * K, ym + 22 * K, h - 20 * K, h - 10 * K, 1);
    }
    if (rh > 0) {
      if (dd / 2 > rh)
        bdPoly(p.cRb, [P(x0, y0, h), P(x1, y0, h), P(x1, ym, h + rh), P(x0, ym, h + rh)], 1);
      bdPoly(p.cR, [P(x1, y0, h), P(x1, y1, h), P(x1, ym, h + rh)], 1);
      bdPoly(p.cRf, [P(x0, y1, h), P(x1, y1, h), P(x1, ym, h + rh), P(x0, ym, h + rh)], 1);
      g.strokeStyle = 'rgba(0,0,0,.14)';
      g.lineWidth = 1;
      g.beginPath();
      for (let q = 1; q < 4; q++) {
        const yy = y1 + (ym - y1) * q / 4;
        const zz = h + rh * q / 4;
        const a = P(x0, yy, zz);
        const b = P(x1, yy, zz);
        g.moveTo(a[0], a[1]);
        g.lineTo(b[0], b[1]);
      }
      if (dd / 2 > rh)
        for (let q = 1; q < 4; q++) {
          const yy = y0 + (ym - y0) * q / 4;
          const zz = h + rh * q / 4;
          const a = P(x0, yy, zz);
          const b = P(x1, yy, zz);
          g.moveTo(a[0], a[1]);
          g.lineTo(b[0], b[1]);
        }
      g.stroke();
      g.strokeStyle = p.cRd;
      g.lineWidth = 3;
      g.beginPath();
      let a = P(x0, y1, h);
      let b = P(x1, y1, h);
      g.moveTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.25)';
      g.lineWidth = 2;
      g.beginPath();
      a = P(x0, ym, h + rh);
      b = P(x1, ym, h + rh);
      g.moveTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
      g.stroke();
      if (p.kind === 'house')
        bx(x0 + w * .22, ym - 4 * K, x0 + w * .22 + 9 * K, ym + 5 * K, h + rh - 3 * K, h + rh + 12 * K);
    }
    else {
      bdPoly(p.cT, [P(x0, y0, h), P(x1, y0, h), P(x1, y1, h), P(x0, y1, h)], 1);
      g.strokeStyle = 'rgba(255,255,255,.28)';
      g.lineWidth = 3;
      g.beginPath();
      let a = P(x0, y1, h);
      let b = P(x1, y1, h);
      let c = P(x1, y0, h);
      g.moveTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
      g.lineTo(c[0], c[1]);
      g.stroke();
      bx(x0 + w * .3, y0 + dd * .25, x0 + w * .3 + 16 * K, y0 + dd * .25 + 16 * K, h, h + 10 * K);
    }
    g.globalAlpha = 1;
  };
  const ball = [];
  for (let a = Math.floor((S.x - B - 320) / bdCell), a1 = Math.floor((S.x + B + 320) / bdCell); a <= a1; a++)
    for (let b = Math.floor((S.y - B - 320) / bdCell), b1 = Math.floor((S.y + B + 320) / bdCell); b <= b1; b++) {
      const p = bdGet(a, b);
      if (p)
        ball.push(p);
    }
  {
    const xa = S.x - B;
    const xb = S.x + B;
    const ya = S.y - B;
    const yb = S.y + B;
    const c = bdCell;
    const RW = bdRW;
    const SW = bdSW;
    const k0 = Math.floor(ya / c);
    const k1 = Math.ceil(yb / c);
    const m0 = Math.floor(xa / c);
    const m1 = Math.ceil(xb / c);
    const Q = (col, x0, y0, x1, y1) => bdPoly(col, [[SX(x0, y0), SY(x0, y0)], [SX(x1, y0), SY(x1, y0)], [SX(x1, y1), SY(x1, y1)], [SX(x0, y1), SY(x0, y1)]]);
    const sp = ball.filter(p => p.rx + SW > xa && p.rx - SW < xb && p.ry1 > ya && p.y1 < yb);
    for (let k = k0; k <= k1; k++)
      Q('#a9abbe', xa, k * c - RW / 2 - 12, xb, k * c + RW / 2 + 12);
    for (let m = m0; m <= m1; m++)
      Q('#a9abbe', m * c - RW / 2 - 12, ya, m * c + RW / 2 + 12, yb);
    for (const p of sp)
      Q('#a9abbe', p.rx - SW / 2 - 10, p.y1, p.rx + SW / 2 + 10, p.ry1);
    for (let k = k0; k <= k1; k++)
      Q('#575a6e', xa, k * c - RW / 2, xb, k * c + RW / 2);
    for (let m = m0; m <= m1; m++)
      Q('#575a6e', m * c - RW / 2, ya, m * c + RW / 2, yb);
    for (const p of sp)
      Q('#575a6e', p.rx - SW / 2, p.y1, p.rx + SW / 2, p.ry1);
    g.strokeStyle = '#e6c84f';
    g.lineWidth = 3;
    g.beginPath();
    for (let k = k0; k <= k1; k++)
      for (let x = Math.floor(xa / 70) * 70; x < xb; x += 70) {
        if (Math.abs(x + 16 - Math.round((x + 16) / c) * c) < RW / 2 + 24)
          continue;
        g.moveTo(SX(x, k * c), SY(x, k * c));
        g.lineTo(SX(x + 32, k * c), SY(x + 32, k * c));
      }
    for (let m = m0; m <= m1; m++)
      for (let y = Math.floor(ya / 70) * 70; y < yb; y += 70) {
        if (Math.abs(y + 16 - Math.round((y + 16) / c) * c) < RW / 2 + 24)
          continue;
        g.moveTo(SX(m * c, y), SY(m * c, y));
        g.lineTo(SX(m * c, y + 32), SY(m * c, y + 32));
      }
    g.stroke();
  }
  const bvp = ball.filter(p => {
    const l = SX(p.x0, p.y1);
    const r = SX(p.x1, p.y0);
    const t = SY(p.x0, p.y0) - p.h - p.rh - 14;
    const bt = SY(p.x1, p.y1);
    return !(r < -20 || l > W + 20 || bt < -20 || t > H + 20);
  });
  bvp.sort((a, b) => a.d - b.d);
  const bh = bvp.map(p => {
    const H = p.h + (p.rh > 0 ? p.rh * .6 : 0);
    const d0 = [SX(p.x0, p.y1), SY(p.x0, p.y1)];
    const c0 = [SX(p.x1, p.y1), SY(p.x1, p.y1)];
    const b0 = [SX(p.x1, p.y0), SY(p.x1, p.y0)];
    const a0 = [SX(p.x0, p.y0), SY(p.x0, p.y0)];
    const hx = [d0, c0, b0, [b0[0], b0[1] - H], [a0[0], a0[1] - H], [d0[0], d0[1] - H]];
    return { p, hx, l: d0[0], r: b0[0], t: a0[1] - H, b: c0[1] };
  });
  const hexHit = (q, sx, sy) => {
    if (sx < q.l || sx > q.r || sy < q.t || sy > q.b)
      return false;
    let sg = 0;
    for (let i = 0; i < 6; i++) {
      const a = q.hx[i];
      const b = q.hx[(i + 1) % 6];
      const c = (b[0] - a[0]) * (sy - a[1]) - (b[1] - a[1]) * (sx - a[0]);
      if (c !== 0) {
        const v = c > 0 ? 1 : -1;
        if (sg === 0)
          sg = v;
        else if (v !== sg)
          return false;
      }
    }
    return true;
  };
  // the building the player is standing behind fades out so the player (and anything behind it) can be seen
  const fdt = Math.min(.1, Math.max(0, S.t - bdLastT));
  bdLastT = S.t;
  for (const q of bh) {
    const p = q.p;
    const occ = (S.x < p.x0 || S.y < p.y0) && (hexHit(q, W / 2, H / 2 - 2) || hexHit(q, W / 2, H / 2 - 28) || hexHit(q, W / 2, H / 2 - 54));
    p.fa += ((occ ? .3 : 1) - p.fa) * Math.min(1, fdt * 10);
  }
  // true when a point (with height z) is hidden behind a (non-faded) building
  const hid = (x, y, z) => {
    if (!bh.length)
      return false;
    const sx = SX(x, y);
    const sy = SY(x, y) - z;
    for (const q of bh) {
      const p = q.p;
      if (p.fa < .6 || !(x < p.x0 || y < p.y0))
        continue;
      if (hexHit(q, sx, sy))
        return true;
    }
    return false;
  };
  for (const m of S.gm) {
    const x = SX(m.x, m.y);
    const y = SY(m.x, m.y);
    if (x < -10 || x > W + 10 || y < -10 || y > H + 10)
      continue;
    g.fillStyle = '#7be04a';
    g.beginPath();
    g.moveTo(x, y - 11);
    g.lineTo(x + 5, y - 5);
    g.lineTo(x, y + 1);
    g.lineTo(x - 5, y - 5);
    g.fill();
  }
  if (S.boss) {
    const e = S.boss;
    if (e.st === 'cw') {
      const pr = 1 - Math.max(e.t, 0) / C.bossWind;
      const hw = e.hr + 14;
      const L = C.bossDashLen + e.hr;
      const vx = -e.uy;
      const vy = e.ux;
      const P = (a, b) => [SX(e.x + e.ux * a + vx * b, e.y + e.uy * a + vy * b), SY(e.x + e.ux * a + vx * b, e.y + e.uy * a + vy * b)];
      const lane = (len, al) => {
        const p = [P(0, -hw), P(len, -hw), P(len, hw), P(0, hw)];
        g.fillStyle = 'rgba(255,60,60,' + al + ')';
        g.beginPath();
        g.moveTo(p[0][0], p[0][1]);
        for (let i = 1; i < 4; i++)
          g.lineTo(p[i][0], p[i][1]);
        g.closePath();
        g.fill();
      };
      lane(L, .16 + .08 * Math.sin(S.t * 20));
      lane(L * pr, .3);
      const o = [P(0, -hw), P(L, -hw), P(L, hw), P(0, hw)];
      g.strokeStyle = 'rgba(255,90,90,.9)';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(o[0][0], o[0][1]);
      for (let i = 1; i < 4; i++)
        g.lineTo(o[i][0], o[i][1]);
      g.closePath();
      g.stroke();
    }
    else if (e.st === 'jw' || e.st === 'jump') {
      const pr = e.st === 'jump' ? 1 : 1 - Math.max(e.t, 0) / C.bossWind;
      const tx0 = SX(e.tx, e.ty);
      const ty0 = SY(e.tx, e.ty);
      const R = C.bossJumpR;
      g.fillStyle = 'rgba(255,60,60,' + (.16 + .08 * Math.sin(S.t * 20)) + ')';
      g.beginPath();
      g.ellipse(tx0, ty0, R * 1.414, R * .707, 0, 0, 6.3);
      g.fill();
      g.fillStyle = 'rgba(255,60,60,.3)';
      g.beginPath();
      g.ellipse(tx0, ty0, R * 1.414 * pr, R * .707 * pr, 0, 0, 6.3);
      g.fill();
      g.strokeStyle = 'rgba(255,90,90,.9)';
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(tx0, ty0, R * 1.414, R * .707, 0, 0, 6.3);
      g.stroke();
    }
  }
  const px = W / 2;
  const py = H / 2;
  const by = py - 30;
  const dBoss = e => {
    const x = SX(e.x, e.y);
    const gy = SY(e.x, e.y);
    const yb = gy - (e.z || 0);
    const zf = 1 - (e.z || 0) / 380;
    if (x < -260 || x > W + 260 || yb < -320 || yb > H + 200)
      return;
    g.fillStyle = '#0005';
    g.beginPath();
    g.ellipse(x, gy - 4, 80 * zf, 34 * zf, 0, 0, 6.3);
    g.fill();
    const crouch = e.st === 'cw' || e.st === 'jw' ? 1 - .1 * Math.sin((1 - Math.max(e.t, 0) / C.bossWind) * Math.PI) : 1;
    const hf = e.fl > 0;
    const dh = BSP.ch / BSP.dsc;
    const top = yb - BSP.oy / BSP.dsc;
    if (IMG.m.naturalWidth) {
      let vx = S.x - e.x;
      let vy = S.y - e.y;
      if (e.st === 'cw' || e.st === 'dash') {
        vx = e.ux;
        vy = e.uy;
      }
      else if (e.st === 'jw' || e.st === 'jump') {
        vx = e.tx - e.x;
        vy = e.ty - e.y;
      }
      const th = Math.atan2((vx + vy) * .5, vx - vy);
      const fi = ((Math.round((th - Math.PI / 2) / (Math.PI / 4)) % 8) + 8) % 8;
      const flip = fi > 4;
      const row = flip ? 8 - fi : fi;
      const fr = e.st === 'walk' ? Math.floor(S.t * 7) % 8 : e.st === 'dash' ? Math.floor(S.t * 16) % 8 : e.st === 'jump' ? 4 : e.st === 'rest' ? Math.floor(S.t * 2) % 8 : 1;
      const dw = BSP.cw / BSP.dsc;
      const sx = fr * BSP.cw;
      const sy = row * BSP.ch;
      g.save();
      g.translate(x, yb);
      g.scale(flip ? -1 : 1, crouch);
      if (C.pixEnemies && BPX.z) {
        const bsx = fr * BSP.pw;
        const bsy = row * BSP.ph;
        g.imageSmoothingEnabled = false;
        g.drawImage(BPX.z, bsx, bsy, BSP.pw, BSP.ph, -BSP.ox / BSP.dsc, -BSP.oy / BSP.dsc, dw, dh);
        if (hf && BPX.w) {
          g.globalAlpha = .8;
          g.drawImage(BPX.w, bsx, bsy, BSP.pw, BSP.ph, -BSP.ox / BSP.dsc, -BSP.oy / BSP.dsc, dw, dh);
          g.globalAlpha = 1;
        }
        g.imageSmoothingEnabled = true;
      }
      else {
        g.drawImage(IMG.m, sx, sy, BSP.cw, BSP.ch, -BSP.ox / BSP.dsc, -BSP.oy / BSP.dsc, dw, dh);
        if (hf) {
          if (!MV.w)
            MV.w = tintAtlas(IMG.m, 'source-in', '#fff');
          g.globalAlpha = .8;
          g.drawImage(MV.w, sx, sy, BSP.cw, BSP.ch, -BSP.ox / BSP.dsc, -BSP.oy / BSP.dsc, dw, dh);
          g.globalAlpha = 1;
        }
      }
      g.restore();
    }
    else {
      g.save();
      g.translate(x, yb);
      g.scale(5, 5 * crouch);
      g.fillStyle = hf ? '#fff' : '#5d9c47';
      g.fillRect(-12, -34, 24, 18);
      g.fillStyle = hf ? '#fff' : '#294a8c';
      g.fillRect(-12, -16, 24, 14);
      g.fillStyle = '#ff2a2a';
      g.fillRect(-7, -27, 4, 5);
      g.fillRect(3, -27, 4, 5);
      g.restore();
    }
    if (e.bl) {
      g.strokeStyle = 'rgba(230,30,50,' + (.6 + .3 * Math.sin(S.t * 12)) + ')';
      g.lineWidth = 3;
      g.strokeRect(x - 95, top + dh * .15, 190, dh * .75);
    }
  };
  const dE = e => {
    if (e.boss) {
      dBoss(e);
      return;
    }
    const x = SX(e.x, e.y);
    const yb = SY(e.x, e.y);
    if (x < -40 || x > W + 40 || yb < -60 || yb > H + 70)
      return;
    g.fillStyle = '#0003';
    g.beginPath();
    g.ellipse(x, yb - 2, 14, 6, 0, 0, 6.3);
    g.fill();
    const top = yb - ZOM.oy / 2;
    if (IMG.z.naturalWidth) {
      if (e.ph === undefined)
        e.ph = Math.random() * 8;
      const dx = S.x - e.x;
      const dy = S.y - e.y;
      const th = Math.atan2((dx + dy) * .5, dx - dy);
      const fi = ((Math.round((th - Math.PI / 2) / (Math.PI / 4)) % 8) + 8) % 8;
      const sp = 1 + C.eSpeedStep * Math.floor((S.lvl - 1) / C.eSpeedEvery);
      const fr = Math.floor(S.t * 9 * sp + e.ph) % 8;
      const sx = fr * ZOM.cw;
      const sy = fi * ZOM.ch;
      const dw = ZOM.cw / 2;
      const dh = ZOM.ch / 2;
      const dxp = x - ZOM.ox / 2;
      if (C.pixEnemies && ZP.z) {
        const px0 = Math.round(dxp);
        const py0 = Math.round(top);
        const psx = fr * ZOM.pw;
        const psy = fi * ZOM.ph;
        g.imageSmoothingEnabled = false;
        g.drawImage(e.rg && ZP.r ? ZP.r : ZP.z, psx, psy, ZOM.pw, ZOM.ph, px0, py0, dw, dh);
        if (e.fl > 0 && ZP.w) {
          g.globalAlpha = .85;
          g.drawImage(ZP.w, psx, psy, ZOM.pw, ZOM.ph, px0, py0, dw, dh);
          g.globalAlpha = 1;
        }
        g.imageSmoothingEnabled = true;
      }
      else {
        g.drawImage(e.rg && ZV.r ? ZV.r : IMG.z, sx, sy, ZOM.cw, ZOM.ch, dxp, top, dw, dh);
        if (e.fl > 0 && ZV.w) {
          g.globalAlpha = .85;
          g.drawImage(ZV.w, sx, sy, ZOM.cw, ZOM.ch, dxp, top, dw, dh);
          g.globalAlpha = 1;
        }
      }
    }
    if (e.stun > 0) {
      g.fillStyle = 'rgba(255,233,74,.28)';
      g.strokeStyle = '#fff3a0';
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(x, yb - 2, 17, 8, 0, 0, 6.3);
      g.fill();
      g.stroke();
      g.font = '14px ' + EF;
      g.textAlign = 'center';
      g.fillStyle = '#fff';
      g.fillText('⚡', x, top - 12 + Math.sin(S.t * 8) * 2);
    }
    else if (e.slow > 0) {
      g.fillStyle = 'rgba(127,216,255,.22)';
      g.strokeStyle = 'rgba(160,225,255,.85)';
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(x, yb - 2, 17, 8, 0, 0, 6.3);
      g.fill();
      g.stroke();
    }
    const mh = e.mx;
    if (e.hp < mh) {
      g.fillStyle = '#000a';
      g.fillRect(x - 14, top - 7, 28, 4);
      g.fillStyle = '#ff5d63';
      g.fillRect(x - 14, top - 7, 28 * e.hp / mh, 4);
    }
    if (e.bl) {
      g.strokeStyle = 'rgba(230,30,50,' + (.6 + .3 * Math.sin(S.t * 12)) + ')';
      g.lineWidth = 2;
      g.strokeRect(x - 15, top, 30, ZOM.oy / 2);
      g.drawImage(SPR.d, x - 12, top - 32 + Math.sin(S.t * 8) * 2, 24, 24);
    }
  };
  const dT = k => {
    const T = S.tu[k];
    if (!T || !S[GL[k]] || hid(T.x, T.y, 18))
      return;
    const G = GT[k];
    const x = SX(T.x, T.y);
    const y = SY(T.x, T.y);
    const bob = Math.sin(S.t * 3 + G.ph) * 2;
    const sc = 1 + Math.max(0, T.fl) * 2.5;
    const cy = y - 24 + bob;
    g.fillStyle = '#0004';
    g.beginPath();
    g.ellipse(x, y, 12, 6, 0, 0, 6.3);
    g.fill();
    g.fillStyle = '#2a2f4a';
    g.strokeStyle = 'rgba(' + G.c + ',.95)';
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(x, y - 5, 10, 5, 0, 0, 6.3);
    g.fill();
    g.stroke();
    const gr = g.createRadialGradient(x, cy, 1, x, cy, 20);
    gr.addColorStop(0, 'rgba(' + G.c + ',.55)');
    gr.addColorStop(1, 'rgba(' + G.c + ',0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, cy, 20, 0, 6.3);
    g.fill();
    g.drawImage(SPR['t' + k], x - 18 * sc, cy - 18 * sc, 36 * sc, 36 * sc);
  };
  const dP = () => {
    g.fillStyle = '#4be06a33';
    g.strokeStyle = '#4be06a';
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(px, py, 40, 20, 0, 0, 6.3);
    g.fill();
    g.stroke();
    if (S.nhs) {
      const R = C.atkR;
      const fl = S.sip > 1 / rate() - .12 ? .25 : 0;
      const pu = .5 + .5 * Math.sin(S.t * 3);
      g.strokeStyle = 'rgba(255,90,90,' + (.18 + .08 * pu + fl) + ')';
      g.lineWidth = 2;
      g.setLineDash([10, 8]);
      g.beginPath();
      g.ellipse(px, py, R * 1.414, R * .707, 0, 0, 6.3);
      g.stroke();
      g.setLineDash([]);
    }
    if (S.wp === 'grimoire')
      dT('i');
    {
      const sweep = (a0, a1, al) => {
        const R2 = C.swordR * (1 + .5 * S.sr) + 10;
        const N = 24;
        const pt = (t, r) => [SX(S.x + Math.cos(t) * r, S.y + Math.sin(t) * r), SY(S.x + Math.cos(t) * r, S.y + Math.sin(t) * r) - (py - by)];
        for (let i = 0; i < N; i++) {
          const u0 = a0 + (a1 - a0) * i / N;
          const u1 = a0 + (a1 - a0) * (i + 1) / N + (a1 >= a0 ? .007 : -.007);
          const k = (i + 1) / N;
          const k2 = k * k * al;
          g.fillStyle = 'rgba(' + RAR[PD.eq.r].rgb + ',' + (.3 * k2) + ')';
          g.beginPath();
          g.moveTo(px, by);
          for (let j = 0; j <= 3; j++) {
            const q = pt(u0 + (u1 - u0) * j / 3, R2);
            g.lineTo(q[0], q[1]);
          }
          g.closePath();
          g.fill();
          g.fillStyle = 'rgba(215,245,255,' + (.4 * k2) + ')';
          g.beginPath();
          for (let j = 0; j <= 3; j++) {
            const q = pt(u0 + (u1 - u0) * j / 3, R2);
            j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]);
          }
          for (let j = 3; j >= 0; j--) {
            const q = pt(u0 + (u1 - u0) * j / 3, R2 * .6);
            g.lineTo(q[0], q[1]);
          }
          g.closePath();
          g.fill();
        }
        const e = pt(a1, R2);
        g.strokeStyle = 'rgba(255,255,255,' + (.7 * al) + ')';
        g.lineWidth = 2.5;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(px, by);
        g.lineTo(e[0], e[1]);
        g.stroke();
        g.lineCap = 'butt';
      };
      if (S.wp === 'sword') {
        if (S.sw > 0) {
          const sd = S.sd || 1;
          const p = 1 - S.sw / (S.sdur || .22);
          sweep(S.sa - sd * C.arc, S.sa + sd * C.arc * (2 * p * p * (3 - 2 * p) - 1), 1);
        }
        else if (S.sfade > 0)
          sweep(S.sfa0, S.sfa1, S.sfade / .14);
      }
    }
    const dSpr = () => {
      let th = S.fd === undefined ? Math.PI / 2 : S.fd;
      {
        const t = nearest(S.x, S.y, C.atkR);
        if (t) {
          const a = Math.atan2(t.y - S.y, t.x - S.x);
          th = Math.atan2((Math.cos(a) + Math.sin(a)) * .5, Math.cos(a) - Math.sin(a));
        }
      }
      const fi = ((Math.round((th - Math.PI / 2) / (Math.PI / 4)) % 8) + 8) % 8;
      const dw = ROBO.cw * ROBO.sc;
      const dh = ROBO.ch * ROBO.sc;
      const bob = Math.sin(S.t * 4) * 2;
      if (IMG.r.naturalWidth)
        g.drawImage(IMG.r, fi * ROBO.cw, 0, ROBO.cw, ROBO.ch, px - dw / 2, py - 4 - dh + bob, dw, dh);
    };
    const dSw = () => {
      if (S.wp === 'sword') {
        const p = 1 - S.sw / (S.sdur || .22);
        const a = S.sw > 0 ? S.sa + (S.sd || 1) * C.arc * (2 * p * p * (3 - 2 * p) - 1) : (S.ba || 0);
        const sdx = Math.cos(a) - Math.sin(a);
        const sdy = (Math.cos(a) + Math.sin(a)) * .5;
        const f = Math.hypot(sdx, sdy);
        const Rr = C.swordR * (1 + .5 * S.sr);
        const bl = Math.max(8, (Rr - 24) * f);
        const sw0 = S.sw > 0;
        g.save();
        g.translate(px, by);
        g.rotate(Math.atan2(sdy, sdx) - Math.PI / 2);
        g.translate(0, 8);
        g.lineCap = 'round';
        {
          const rc = RAR[PD.eq.r].rgb;
          g.strokeStyle = 'rgba(' + rc + ',' + (sw0 ? .35 : .22) + ')';
          g.lineWidth = sw0 ? 18 : 14;
          g.beginPath();
          g.moveTo(0, 8);
          g.lineTo(0, 38 + bl);
          g.stroke();
          g.strokeStyle = 'rgba(' + rc + ',' + (sw0 ? .6 : .4) + ')';
          g.lineWidth = 6;
          g.beginPath();
          g.moveTo(0, 8);
          g.lineTo(0, 38 + bl);
          g.stroke();
        }
        g.lineCap = 'butt';
        if (IMG.b.naturalWidth && IMG.h.naturalWidth) {
          g.drawImage(IMG.b, -8.6, 37.5, 17.5, bl + 1);
          g.drawImage(IMG.h, -8.6, 0, 17.5, 38.5);
        }
        g.restore();
      }
    };
    const dGl = () => {
      if (S.wp !== 'sword') {
        const t = nearest(S.x, S.y, C.atkR);
        let th = S.fd === undefined ? Math.PI / 2 : S.fd;
        if (t) {
          const a = Math.atan2(t.y - S.y, t.x - S.x);
          th = Math.atan2((Math.cos(a) + Math.sin(a)) * .5, Math.cos(a) - Math.sin(a));
        }
        const gx = px + Math.cos(th) * 17;
        const gy = by + Math.sin(th) * 9 + 2;
        const rc = RAR[PD.eq.r].rgb;
        const gr = g.createRadialGradient(gx, gy, 1, gx, gy, 16);
        gr.addColorStop(0, 'rgba(' + rc + ',.9)');
        gr.addColorStop(1, 'rgba(' + rc + ',0)');
        g.fillStyle = gr;
        g.beginPath();
        g.arc(gx, gy, 16, 0, 6.3);
        g.fill();
      }
    };
    {
      let behind = false;
      if (S.wp === 'sword') {
        const p = 1 - S.sw / (S.sdur || .22);
        const a = S.sw > 0 ? S.sa + (S.sd || 1) * C.arc * (2 * p * p * (3 - 2 * p) - 1) : (S.ba || 0);
        behind = (Math.cos(a) + Math.sin(a)) * .5 < -.05;
      }
      else {
        const t = nearest(S.x, S.y, C.atkR);
        if (t) {
          const a = Math.atan2(t.y - S.y, t.x - S.x);
          behind = (Math.cos(a) + Math.sin(a)) * .5 < -.05;
        }
      }
      const dW = S.wp === 'sword' ? dSw : dGl;
      if (behind) {
        dW();
        dSpr();
      }
      else {
        dSpr();
        dW();
      }
    }
    if (S.wp === 'grimoire') {
      dT('f');
      dT('l');
    }
    if (S.wp === 'grimoire')
      g.drawImage(SPR.gm, px + 16, by - 14 + Math.sin(S.t * 2.5) * 3, 22, 22);
    if (S.sh > 0) {
      const cx = px;
      const cy = by - 1;
      const R = 36;
      const pu = .5 + .5 * Math.sin(S.t * 3);
      const gr = g.createRadialGradient(cx, cy, R * .3, cx, cy, R);
      gr.addColorStop(0, 'rgba(106,183,255,.04)');
      gr.addColorStop(.7, 'rgba(106,183,255,.12)');
      gr.addColorStop(.92, 'rgba(130,205,255,' + (.3 + .08 * pu) + ')');
      gr.addColorStop(1, 'rgba(180,230,255,.55)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(cx, cy, R, 0, 6.3);
      g.fill();
      g.strokeStyle = 'rgba(160,220,255,' + (.7 + .2 * pu) + ')';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(cx, cy, R, 0, 6.3);
      g.stroke();
      g.save();
      g.translate(cx - R * .38, cy - R * .45);
      g.rotate(-.7);
      g.fillStyle = 'rgba(255,255,255,.45)';
      g.beginPath();
      g.ellipse(0, 0, R * .2, R * .1, 0, 0, 6.3);
      g.fill();
      g.restore();
      const a0 = S.t * 1.6;
      g.strokeStyle = 'rgba(255,255,255,.55)';
      g.lineWidth = 3;
      g.lineCap = 'round';
      g.beginPath();
      g.arc(cx, cy, R - 4, a0, a0 + .6);
      g.stroke();
      g.lineCap = 'butt';
    }
    g.fillStyle = '#000a';
    g.fillRect(px - 20, py + 16, 40, 6);
    g.fillStyle = '#6be06a';
    g.fillRect(px - 20, py + 16, 40 * S.hp / maxHp(), 6);
  };
  // ground layer: flat rings and flashes sit under the characters
  for (const z of S.fe) {
    if (hid(z.x, z.y, 10))
      continue;
    const R = z.r;
    const x = SX(z.x, z.y);
    const y = SY(z.x, z.y);
    const al = Math.min(1, z.t / .35);
    g.fillStyle = 'rgba(255,122,47,' + .22 * al + ')';
    g.strokeStyle = 'rgba(255,190,90,' + .95 * al + ')';
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(x, y, R * 1.414, R * .707, 0, 0, 6.3);
    g.fill();
    g.stroke();
  }
  for (const z of S.de) {
    if (hid(z.x, z.y, 10))
      continue;
    const R = z.r;
    const x = SX(z.x, z.y);
    const y = SY(z.x, z.y);
    const al = Math.min(1, z.t / .25);
    g.fillStyle = 'rgba(255,40,60,' + .18 * al + ')';
    g.strokeStyle = 'rgba(255,90,100,' + .85 * al + ')';
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(x, y, R * 1.414, R * .707, 0, 0, 6.3);
    g.fill();
    g.stroke();
  }
  for (const z of S.ie) {
    if (hid(z.x, z.y, 10))
      continue;
    const R = z.r;
    const x = SX(z.x, z.y);
    const y = SY(z.x, z.y);
    const al = Math.min(1, z.t / .25);
    const p = 1 - z.t / .5;
    const rr = R * (.55 + .45 * Math.min(1, p * 3));
    g.fillStyle = 'rgba(127,216,255,' + .25 * al + ')';
    g.strokeStyle = 'rgba(200,240,255,' + .95 * al + ')';
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(x, y, rr * 1.414, rr * .707, 0, 0, 6.3);
    g.fill();
    g.stroke();
  }
  for (const z of S.bolt) {
    if (hid(z.x, z.y, 10))
      continue;
    const al = Math.min(1, z.t / .28);
    const x = SX(z.x, z.y);
    const y = SY(z.x, z.y);
    const R = C.gmThR;
    g.fillStyle = 'rgba(255,240,120,' + .35 * al + ')';
    g.beginPath();
    g.ellipse(x, y, R * 1.414, R * .707, 0, 0, 6.3);
    g.fill();
  }
  for (const b of S.tb) {
    if (hid(b.tx, b.ty, 10))
      continue;
    const R = b.k === 'f' ? gFire() : gIce();
    const x = SX(b.tx, b.ty);
    const y = SY(b.tx, b.ty);
    const pr = Math.min(1, b.u);
    g.fillStyle = 'rgba(' + GT[b.k].c + ',' + (.05 + .08 * pr) + ')';
    g.strokeStyle = 'rgba(' + GT[b.k].c + ',' + (.25 + .4 * pr) + ')';
    g.lineWidth = 2;
    g.setLineDash([8, 6]);
    g.beginPath();
    g.ellipse(x, y, R * 1.414, R * .707, 0, 0, 6.3);
    g.fill();
    g.stroke();
    g.setLineDash([]);
  }
  // sprite effects are depth-sorted together with the enemies and the player, so whatever stands in front of them is drawn over them
  const dFx = e => {
    const z = e.z;
    if (hid(z.x, z.y, 10))
      return;
    const x = SX(z.x, z.y);
    const y = SY(z.x, z.y);
    if (e.fxk === 0) {
      const ag = 1 - z.t / .7;
      if (SMI.naturalWidth) {
        const sf = Math.min(17, Math.floor(ag * 18));
        const sk = z.r * 2.83 / 85.4;
        g.imageSmoothingEnabled = false;
        g.drawImage(SMI, (sf % 6) * 87, Math.floor(sf / 6) * 54, 87, 54, Math.round(x - 43.4 * sk), Math.round(y - 44.4 * sk), Math.round(87 * sk), Math.round(54 * sk));
        g.imageSmoothingEnabled = true;
      }
      if (!FXI.naturalWidth)
        return;
      const fi = Math.min(14, Math.floor(ag * 15));
      const sc = z.r * C.gmFx / 128;
      g.drawImage(FXI, (fi % 5) * 200, Math.floor(fi / 5) * 240, 200, 240, x - 100 * sc, y - 232 * sc, 200 * sc, 240 * sc);
    }
    else if (e.fxk === 1) {
      if (!DEI.naturalWidth)
        return;
      const p = (1 - z.t / .5) * 440;
      const fi = [20, 70, 150, 200, 260, 340, 420, 440].findIndex(c => c > p);
      const f = fi < 0 ? 7 : fi;
      const sc = z.r * 2.83 / 180;
      g.drawImage(DEI, (f % 4) * 190, Math.floor(f / 4) * 165, 190, 165, x - 90 * sc, y - 141 * sc, 190 * sc, 165 * sc);
    }
    else if (e.fxk === 2) {
      if (!BSI.naturalWidth)
        return;
      const f = Math.min(23, Math.floor((1.44 - z.t) / .06));
      const k = z.r * 2.83 / 230;
      g.drawImage(BSI, (f % 6) * 257, Math.floor(f / 6) * 173, 257, 173, x - 113.8 * k, y - 132.2 * k, 257 * k, 173 * k);
    }
    else {
      if (!ICI.naturalWidth)
        return;
      const f = Math.min(7, Math.floor(z.a / .6 * 8));
      const k = z.r * 2.83 / 120;
      const sx = (f % 4) * 132;
      const sy = Math.floor(f / 4) * 138;
      const p = z.a > .6 ? Math.min(1, (z.a - .6) / .3) : 0;
      g.globalAlpha = (1 - p) * C.gmIceA;
      g.imageSmoothingEnabled = false;
      g.drawImage(ICI, sx, sy, 132, 138, Math.round(x - 65 * k), Math.round(y - 134 * k), Math.round(132 * k), Math.round(138 * k));
      g.imageSmoothingEnabled = true;
      g.globalAlpha = 1;
    }
  };
  const fxs = [];
  for (const z of S.fe)
    fxs.push({ x: z.x, y: z.y, fxk: 0, z });
  for (const z of S.de)
    fxs.push({ x: z.x, y: z.y, fxk: 1, z });
  for (const z of S.bs)
    fxs.push({ x: z.x, y: z.y, fxk: 2, z });
  for (const z of S.ic)
    fxs.push({ x: z.x, y: z.y, fxk: 3, z });
  const EL = S.en.concat(fxs);
  const dX = e => e.fxk >= 0 ? dFx(e) : dE(e);
  // depth order: enemies behind the player first, then the player, then enemies in front
  const ps = S.x + S.y;
  EL.sort((a, b) => (a.x + a.y) - (b.x + b.y));
  // buildings are drawn in depth order; anything standing behind one (the player included) is drawn first so the building covers it
  const dn = new Uint8Array(EL.length);
  let pd = 0;
  for (const b of bvp) {
    let pp = !pd && (S.x < b.x0 || S.y < b.y0);
    for (let i = 0; i < EL.length; i++) {
      const e = EL[i];
      if (dn[i] || !(e.x < b.x0 || e.y < b.y0))
        continue;
      if (pp && e.x + e.y >= ps) {
        dP();
        pd = 1;
        pp = 0;
      }
      dn[i] = 1;
      dX(e);
    }
    if (pp) {
      dP();
      pd = 1;
    }
    bdDraw(b, b.fa, 1);
  }
  for (let i = 0; i < EL.length; i++) {
    if (dn[i])
      continue;
    const e = EL[i];
    if (!pd && e.x + e.y >= ps) {
      dP();
      pd = 1;
    }
    dX(e);
  }
  if (!pd)
    dP();
  for (const p of S.tr) {
    if (hid(p.x, p.y, 18))
      continue;
    g.fillStyle = 'rgba(' + p.c + ',' + p.t / p.m * .6 + ')';
    g.beginPath();
    g.arc(SX(p.x, p.y), SY(p.x, p.y) - 18 - (p.z || 0), p.r * p.t / p.m, 0, 6.3);
    g.fill();
  }
  for (const f of S.fx) {
    if (f.d || hid(f.x, f.y, 10))
      continue;
    const p = 1 - f.t / .3;
    const s = f.r * 2.9 * (.6 + .4 * p);
    g.globalAlpha = Math.min(1, f.t / .15);
    g.drawImage(SPR.x, SX(f.x, f.y) - s / 2, SY(f.x, f.y) - s / 2 - 10, s, s);
    g.globalAlpha = 1;
  }
  for (const m of S.ms) {
    if (hid(m.x, m.y, 18))
      continue;
    g.save();
    g.translate(SX(m.x, m.y), SY(m.x, m.y) - 18);
    g.rotate(Math.atan2((m.vx + m.vy) * .5, m.vx - m.vy) + C.rocketRot);
    g.drawImage(SPR.r, -24, -24, 48, 48);
    g.restore();
  }
  for (const w of S.sws) {
    const x = SX(w.x, w.y);
    const y = SY(w.x, w.y) - 18;
    const rad = C.swordR * (1 + .5 * S.sr) * C.swirlRad;
    const rc = RAR[PD.eq.r].rgb;
    g.strokeStyle = 'rgba(' + rc + ',.6)';
    g.lineWidth = 2;
    g.fillStyle = 'rgba(' + rc + ',.14)';
    g.beginPath();
    g.ellipse(x, y + 18, rad * 1.414, rad * .707, 0, 0, 6.3);
    g.fill();
    g.stroke();
    const ca = Math.cos(w.a || 0);
    const sa = Math.sin(w.a || 0);
    const sdx = ca - sa;
    const sdy = (ca + sa) * .5;
    const f = Math.hypot(sdx, sdy);
    const sc = rad * 2 / 74.5;
    g.save();
    g.translate(x, y);
    g.rotate(Math.atan2(sdy, sdx) - Math.PI / 2);
    g.scale(sc, sc * f);
    g.translate(0, -37);
    if (IMG.b.naturalWidth && IMG.h.naturalWidth) {
      g.drawImage(IMG.b, -8.6, 37.5, 17.5, 36);
      g.drawImage(IMG.h, -8.6, 0, 17.5, 38.5);
    }
    g.restore();
  }
  g.fillStyle = '#ff4df0';
  g.strokeStyle = '#fff';
  g.lineWidth = 3;
  for (const b of S.eb) {
    if (hid(b.x, b.y, 18))
      continue;
    g.beginPath();
    g.arc(SX(b.x, b.y), SY(b.x, b.y) - 18, 7, 0, 6.3);
    g.fill();
    g.stroke();
  }
  for (const b of S.bl) {
    if (hid(b.x, b.y, 18))
      continue;
    const x = SX(b.x, b.y);
    const y = SY(b.x, b.y) - 18;
    if (x < -30 || x > W + 30 || y < -30 || y > H + 30)
      continue;
    g.save();
    g.translate(x, y);
    if (b.orb)
      g.drawImage(SPR.orb, -20, -20, 40, 40);     // Grimoire: purple orb (round, so no rotation)
    else {
      g.rotate(Math.atan2((b.vx + b.vy) * .5, b.vx - b.vy));
      g.drawImage(SPR.br[PD.eq.r], -20, -20, 40, 40);     // Staff: bullet tinted by the weapon's rarity
    }
    g.restore();
  }
  for (const p of S.hs) {
    if (hid(p.x, p.y, 18))
      continue;
    const x = SX(p.x, p.y);
    const y = SY(p.x, p.y) - 18;
    g.fillStyle = 'rgba(110,255,140,.35)';
    g.beginPath();
    g.arc(x, y, 11, 0, 6.3);
    g.fill();
    g.fillStyle = '#b8ffc4';
    g.strokeStyle = '#fff';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(x, y, 5.5, 0, 6.3);
    g.fill();
    g.stroke();
  }
  for (const p of S.sf) {
    if (hid(p.x, p.y, 18))
      continue;
    const x = SX(p.x, p.y);
    const y = SY(p.x, p.y) - 18;
    g.fillStyle = 'rgba(255,90,90,.35)';
    g.beginPath();
    g.arc(x, y, 11, 0, 6.3);
    g.fill();
    g.fillStyle = '#ffc4c4';
    g.strokeStyle = '#fff';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(x, y, 5.5, 0, 6.3);
    g.fill();
    g.stroke();
  }
  if (S.wp === 'grimoire') {
    const zig = (a, b, n, j) => {
      const o = [a];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      for (let i = 1; i < n; i++) {
        const u = i / n;
        const q = (Math.random() - .5) * j;
        o.push([a[0] + dx * u - dy / l * q, a[1] + dy * u + dx / l * q]);
      }
      o.push(b);
      return o;
    };
    const strokeBolt = (pts, al) => {
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(255,233,74,' + .45 * al + ')';
      g.lineWidth = 8;
      g.beginPath();
      pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,' + al + ')';
      g.lineWidth = 2.5;
      g.stroke();
      g.lineCap = 'butt';
    };
    for (const b of S.tb) {
      if (hid(b.x, b.y, 18))
        continue;
      const gx = SX(b.x, b.y);
      const gy = SY(b.x, b.y);
      const x = gx;
      const y = gy - 18 - b.z;
      const sh = Math.max(.35, 1 - b.z / 160);
      g.fillStyle = 'rgba(0,0,0,' + .28 * sh + ')';
      g.beginPath();
      g.ellipse(gx, gy, 9 * sh, 4.5 * sh, 0, 0, 6.3);
      g.fill();
      g.fillStyle = 'rgba(' + GT[b.k].c + ',.4)';
      g.beginPath();
      g.arc(x, y, 15, 0, 6.3);
      g.fill();
      g.drawImage(SPR['t' + b.k], x - 13, y - 13, 26, 26);
    }
    for (const z of S.zp) {
      const al = Math.min(1, z.t / .18);
      const P = z.p.map(q => [SX(q[0], q[1]), SY(q[0], q[1]) - 18]);
      let pts = [P[0]];
      for (let i = 0; i < P.length - 1; i++)
        pts = pts.concat(zig(P[i], P[i + 1], 5, 12).slice(1));
      strokeBolt(pts, al);
    }
    for (const z of S.bolt) {
      const al = Math.min(1, z.t / .28);
      const x = SX(z.x, z.y);
      const y = SY(z.x, z.y);
      strokeBolt(zig([x, y - 460], [x, y], 9, 36), al);
    }
  }
  g.lineCap = 'round';
  for (const p of S.dtr) {
    const k2 = p.t / .4;
    const al = k2 * .9;
    g.strokeStyle = 'rgba(200,235,255,' + al + ')';
    g.lineWidth = 16 * k2 + 2;
    g.beginPath();
    g.moveTo(SX(p.x0, p.y0), SY(p.x0, p.y0) - 10);
    g.lineTo(SX(p.x1, p.y1), SY(p.x1, p.y1) - 10);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,' + al + ')';
    g.lineWidth = 5 * k2 + 1;
    g.beginPath();
    g.moveTo(SX(p.x0, p.y0), SY(p.x0, p.y0) - 10);
    g.lineTo(SX(p.x1, p.y1), SY(p.x1, p.y1) - 10);
    g.stroke();
  }
  g.lineCap = 'butt';
  g.font = '20px "Lilita One",Arial';
  g.textAlign = 'center';
  g.lineWidth = 4;
  g.strokeStyle = '#000';
  for (const t of S.tx) {
    if (Math.hypot(t.x - S.x, t.y - S.y) > 60 && hid(t.x, t.y, 30))
      continue;
    const x = SX(t.x, t.y);
    const y = SY(t.x, t.y) - 30 - (.6 - t.t) * 50;
    g.fillStyle = t.c || (t.p ? '#ff6b6b' : '#fff');
    g.strokeText(t.s, x, y);
    g.fillText(t.s, x, y);
  }
  if (S.hf > 0) {
    const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.hypot(W, H) / 2);
    gr.addColorStop(0, 'rgba(255,0,0,0)');
    gr.addColorStop(1, 'rgba(255,40,40,' + S.hf * 2 + ')');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
  }
  if (joy) {
    g.strokeStyle = '#fff9';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(joy.x0, joy.y0, 50, 0, 6.3);
    g.stroke();
    const dx = joy.x - joy.x0;
    const dy = joy.y - joy.y0;
    const l = Math.min(Math.hypot(dx, dy), 50) || 0;
    const a = Math.atan2(dy, dx);
    g.fillStyle = '#fffb';
    g.beginPath();
    g.arc(joy.x0 + Math.cos(a) * l, joy.y0 + Math.sin(a) * l, 20, 0, 6.3);
    g.fill();
  }
}
