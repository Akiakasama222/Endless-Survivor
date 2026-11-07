// ======================================================================
// RENDERING
// Draws one frame: isometric ground, characters, projectiles and effects.
// ======================================================================

// Draws one frame of the game.
function draw() {
  // Isometric view: the game logic stays on a flat ground plane; only the drawing is projected (2:1 diamond tiles, upright sprites)
  const SX = (x, y) => W / 2 + ((x - S.x) - (y - S.y));
  const SY = (x, y) => H / 2 + ((x - S.x) + (y - S.y)) * .5;
  g.fillStyle = 'rgb(125, 172, 119)';
  g.fillRect(0, 0, W, H);
  const T = BIO.tile;   // ground tile size (biome.js)
  const B = W / 4 + H / 2 + T;
  const i0 = Math.floor((S.x - B) / T);
  const i1 = Math.ceil((S.x + B) / T);
  const j0 = Math.floor((S.y - B) / T);
  const j1 = Math.ceil((S.y + B) / T);
  if (!bioDrawGround(g, W, H, SX, SY, T, i0, i1, j0, j1)) {   // biome.js grass images; plain colour ground if they are missing
  g.fillStyle = 'rgb(90, 173, 97)';
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
  g.strokeStyle = '#142c15';
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
  }
  craterDraw(g, W, H, SX, SY);      // scorch marks left by fireball explosions (craters.js)
  const hid = () => false;      // nothing can hide an effect any more (the buildings are gone)
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
        const R2 = C.swordR * (1 + C.swordRangePerLvl * S.sr) + 10;
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
        const Rr = C.swordR * (1 + C.swordRangePerLvl * S.sr);
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
      const fr = FX_FRAMES[fi];                                    // [x, y, w, h, anchorX, anchorY] - see grimoire.js
      const sc = z.r * 2.83 / FX_FOOT * (C.gmFx / 1.5);
      g.imageSmoothingEnabled = false;                             // pixel-art sheet: keep the pixels sharp
      g.drawImage(FXI, fr[0], fr[1], fr[2], fr[3], Math.round(x - fr[4] * sc), Math.round(y - fr[5] * sc), Math.round(fr[2] * sc), Math.round(fr[3] * sc));
      g.imageSmoothingEnabled = true;
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
    else if (e.fxk === 4) {
      // main projectiles (Staff bullet / Grimoire orb): depth-sorted so trees and enemies in front of them cover them
      const by = y - 18;
      if (x < -30 || x > W + 30 || by < -30 || by > H + 30)
        return;
      g.save();
      g.translate(x, by);
      if (z.orb)
        g.drawImage(SPR.orb, -20, -20, 40, 40);     // Grimoire: purple orb (round, so no rotation)
      else {
        g.rotate(Math.atan2((z.vx + z.vy) * .5, z.vx - z.vy));
        g.drawImage(SPR.br[PD.eq.r], -20, -20, 40, 40);     // Staff: bullet tinted by the weapon's rarity
      }
      g.restore();
    }
    else {
      if (!ICI.naturalWidth)
        return;
      const f = Math.min(7, Math.floor(z.a / .6 * 8));           // 8 frames in the ice sheet
      const fr = ICE_FRAMES[f];                                    // [x, y, w, h, anchorX, anchorY] - see grimoire.js
      const k = z.r * 2.83 / ICE_FOOT;
      const p = z.a > .6 ? Math.min(1, (z.a - .6) / .3) : 0;
      g.globalAlpha = (1 - p) * C.gmIceA;
      g.imageSmoothingEnabled = false;                             // pixel-art sheet: keep the pixels sharp
      g.drawImage(ICI, fr[0], fr[1], fr[2], fr[3], Math.round(x - fr[4] * k), Math.round(y - fr[5] * k), Math.round(fr[2] * k), Math.round(fr[3] * k));
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
  for (const z of S.bl)
    fxs.push({ x: z.x, y: z.y, fxk: 4, z });
  // procedural trees join the depth-sorted list, so they hide whatever stands behind them
  trCollect(SX, SY, W, H, S.x, S.y, fxs);
  chCollect(SX, SY, W, H, fxs);       // hidden chests (chests.js)
  const rw = ROBO.cw * ROBO.sc;
  const rh = ROBO.ch * ROBO.sc;
  // player's on-screen box (slightly shrunk) - a tree turns see-through only when it overlaps this
  const PL = { ps: S.x + S.y, l: px - rw * .35, r: px + rw * .35, t: py - 4 - rh * .9, b: py - 4 - rh * .05 };
  const EL = S.en.concat(fxs);
  const dX = e => e.trk ? trDraw(g, e, SX, SY, PL) : e.chk ? chDraw(g, e, SX, SY) : e.fxk >= 0 ? dFx(e) : dE(e);
  // depth order: enemies behind the player first, then the player, then enemies in front
  const ps = S.x + S.y;
  EL.sort((a, b) => (a.x + a.y) - (b.x + b.y));
  let pd = 0;
  for (let i = 0; i < EL.length; i++) {
    const e = EL[i];
    if (!pd && e.x + e.y >= ps) {
      dP();
      pd = 1;
    }
    dX(e);
  }
  if (!pd)
    dP();
  chOverlay(g, SX, SY);             // chest progress ring / twinkle hint (chests.js)
  atmDraw(g, W, H, SX, SY);        // wind streaks and flying leaves (atmosphere.js)
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
    const rad = C.swordR * (1 + C.swordRangePerLvl * S.sr) * C.swirlRad;
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
  if (SHOW_HB)
    hbDraw(g, SX, SY);
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

// Hitbox overlay (Editor mode > Show hitboxes): the real hit circles of the player, enemies and boss.
// A circle on the flat ground becomes a 2:1 ellipse on the isometric screen.
function hbDraw(g, SX, SY) {
  const ring = (wx, wy, r, rgb) => {
    const x = SX(wx, wy);
    const y = SY(wx, wy);
    if (x < -r * 2 || x > W + r * 2 || y < -r * 2 || y > H + r * 2)
      return;
    g.beginPath();
    g.ellipse(x, y, r * 1.414, r * .707, 0, 0, 6.3);
    g.fillStyle = 'rgba(' + rgb + ',.18)';
    g.fill();
    g.strokeStyle = 'rgb(' + rgb + ')';
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = 'rgb(' + rgb + ')';
    g.fillRect(x - 1.5, y - 1.5, 3, 3);
  };
  for (const e of S.en)
    if (e.hp > 0)
      ring(e.x, e.y, e.hr || C.eHitR, e.boss ? '255,160,40' : '255,70,70');
  ring(S.x, S.y, C.pHitR, '60,230,255');
}
