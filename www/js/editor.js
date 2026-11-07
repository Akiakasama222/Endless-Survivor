// ======================================================================
// EDITOR MODE (Settings > Developer > Editor mode)
// Lets you change the game's numbers without touching the code: weapon damage per tier, enemy and boss stats, damage multipliers and
// the per-level values of every augment. Changes are saved on this device (localStorage "limboEditor", see tuning.js) and the game restarts
// to apply them. Every number shows its default; "Reset" puts the default back.
// ======================================================================

// What can be edited. Each group = [title, hint, [ [key in C, label, kind], ... ]]
//   kind 'n' = plain number, 'i' = whole number, '%' = a fraction shown as a percent (0.1 is shown as 10)
// Numbers of C that are not listed here still appear in the group "Other numbers" at the bottom.
const EDITOR_GROUPS = [
  ['Hitboxes', 'The size of the circles that decide who touches whom. Turn on "Show hitboxes" above to see them in the game (player = cyan, enemies = red, boss = orange). Radius in px.', [
    ['pHitR', 'Player hitbox radius (enemies and enemy shots hurt you when they touch it)', 'n'],
    ['eHitR', 'Enemy hitbox radius (your shots, sword and spells hit when they touch it)', 'n'],
    ['bossR', 'Boss hitbox radius (also its body size when it walks and dashes)', 'n']
  ]],
  ['Player', 'Your hero: health, speed, attack rate and levelling.', [
    ['baseHp', 'Starting max HP', 'i'],
    ['hpLvl', 'Max HP gained per level', 'i'],
    ['hpAug', 'Health augment: extra max HP per level', '%'],
    ['pSpeed', 'Movement speed (px per second)', 'n'],
    ['fireRate', 'Base attacks per second', 'n'],
    ['rateAug', 'Fire Rate / Attack Speed augment: extra speed per level', '%'],
    ['atkR', 'Attack range (px)', 'n'],
    ['xpBase', 'XP needed for level 2', 'n'],
    ['xpLvl', 'Extra XP needed per level', 'n'],
    ['aosGuard', 'Death guard: a hit that would kill you above this share of max HP...', '%'],
    ['aosEnd', '...leaves you at this share of max HP', '%'],
    ['chestLvl', 'A chest is earned every N levels', 'i']
  ]],
  ['Enemies', 'Normal zombies: strength, speed and how many appear.', [
    ['eHp', 'Base HP', 'n'],
    ['eHpLvl', 'HP gained per player level', 'n'],
    ['eDmg', 'Base damage', 'n'],
    ['eDmgLvl', 'Damage gained per player level', 'n'],
    ['eSpeed', 'Base speed', 'n'],
    ['eSpeedStep', 'Speed gained every N levels', 'n'],
    ['eSpeedEvery', 'Levels between speed increases', 'i'],
    ['capBase', 'Enemies allowed at once at the start', 'i'],
    ['capPerLvl', 'Extra enemies allowed per level', 'n'],
    ['spawnBase', 'Spawns per second at the start', 'n'],
    ['spawnGrow', 'Spawn rate growth per second', 'n'],
    ['rangerFrom', 'Ranged zombies appear from level', 'i'],
    ['rangerChance', 'Chance a zombie is ranged', '%'],
    ['rangerRange', 'Ranged zombie shooting range (px)', 'n'],
    ['rangerCd', 'Ranged zombie seconds between shots', 'n'],
    ['eBulletSpeed', 'Enemy bullet speed', 'n']
  ]],
  ['Boss (Giant Zombie)', 'The boss that appears every few levels. Its HP and damage are multiples of a normal enemy\'s.', [
    ['bossEvery', 'A boss appears every N levels', 'i'],
    ['bossWarn', 'Warning seconds before it arrives', 'n'],
    ['bossHp', 'HP (x a normal enemy\'s HP)', 'n'],
    ['bossDmg', 'Damage (x a normal enemy\'s damage)', 'n'],
    ['bossWind', 'Wind-up seconds before an attack', 'n'],
    ['bossDashLen', 'Dash distance', 'n'],
    ['bossDashT', 'Dash seconds', 'n'],
    ['bossJumpT', 'Jump seconds', 'n'],
    ['bossJumpH', 'Jump height', 'n'],
    ['bossJumpR', 'Stomp radius', 'n'],
    ['bossRest', 'Rest seconds after an attack', 'n'],
    ['bossGap', 'Minimum seconds between attacks', 'n']
  ]],
  ['Multipliers', 'Overload (the big damage multiplier at max level) and Enlightenment.', [
    ['overloadLvl', 'Multishot / Attack Speed level where the Overload is offered', 'i'],
    ['overloadStep', 'Overload multiplier steps (5 = x5, then x10, then x15...)', 'n'],
    ['gmEnlight', 'Enlightenment: damage multiplier', 'n']
  ]],
  ['Projectiles', 'Speed and reach of the Staff bullet and the Grimoire orb (reach = speed x lifetime).', [
    ['bulletSpeed', 'Staff bullet speed', 'n'],
    ['bulletLife', 'Staff bullet lifetime (seconds)', 'n'],
    ['bounceRange', 'Projectile Bounce: search range for the next enemy', 'n'],
    ['gmShotSpeed', 'Grimoire orb speed', 'n'],
    ['gmShotLife', 'Grimoire orb lifetime (seconds)', 'n'],
    ['gmShotTurn', 'Grimoire orb homing strength (0 = straight)', 'n'],
    ['gmShotSeek', 'Grimoire orb homing range', 'n']
  ]],
  ['Augments: Staff and shared', 'Lifesteal, Shield, Move Speed and Magnet are shared with the other weapons. The ones marked (all) apply to every weapon.', [
    ['missileChance', 'Arcane Missile: chance on hit, per level', '%'],
    ['missileMaxLvl', 'Arcane Missile: highest level', 'i'],
    ['missileDmg', 'Arcane Missile: explosion damage (share of your damage)', '%'],
    ['deathBoomChance', 'Death Explosion: chance per level', '%'],
    ['deathBoomDmg', 'Death Explosion: damage at level 1', '%'],
    ['deathBoomDmgPerLvl', 'Death Explosion: extra damage per level', '%'],
    ['deathBoomR', 'Death Explosion: radius', 'n'],
    ['lifesteal', 'Lifesteal (all): healing per level (share of damage dealt)', '%'],
    ['shieldKills', 'Shield (all): kills to regain a charge', 'i'],
    ['moveSpeedPerLvl', 'Move Speed / Lightning Step (all): extra speed per level', '%'],
    ['magnetBase', 'Magnet (all): pickup range without the augment (px)', 'n'],
    ['magnetPerLvl', 'Magnet (all): extra range per level', '%']
  ]],
  ['Augments: Sword', 'Sword range, Dance with Death, Swirl, Bleed and Slash Push.', [
    ['swordR', 'Base sword range', 'n'],
    ['swordRangePerLvl', 'Sword Range augment: extra range per level', '%'],
    ['arc', 'Sword swing arc (radians)', 'n'],
    ['ddTicksPerLvl', 'Dance with Death: ticks per level', 'i'],
    ['dwdTick', 'Dance with Death: seconds between ticks', 'n'],
    ['swirlEvery', 'Swirl: a sword is thrown every Nth attack', 'i'],
    ['swirlStayPerLvl', 'Swirl: hover seconds per level', 'n'],
    ['swirlDist', 'Swirl: flight distance (x base sword range)', 'n'],
    ['swirlRad', 'Swirl: radius (share of sword range)', '%'],
    ['swirlTick', 'Swirl: seconds between damage ticks', 'n'],
    ['bleedTick', 'Bleed: seconds between ticks', 'n'],
    ['bleedPerLvl', 'Bleed: damage per tick, per level (share of the hit)', '%'],
    ['bleedBoomDmg', 'Bleed: death explosion damage at level 1', '%'],
    ['bleedBoomPerLvl', 'Bleed: death explosion extra damage per level', '%'],
    ['bleedBoomR', 'Bleed: death explosion radius', 'n'],
    ['pushBase', 'Slash Push: base push strength', 'n'],
    ['pushPerLvl', 'Slash Push: push per level (share of base)', '%']
  ]],
  ['Augments: Grimoire and turrets', 'Fire, Lightning and Ice turrets, Spellcaster, Thunder Strike and Health Siphon.', [
    ['gmTR', 'Turret range', 'n'],
    ['gmFireR', 'Fire turret: explosion radius', 'n'],
    ['gmFireRPerLvl', 'Fire turret: extra radius per level', '%'],
    ['gmFireD', 'Fire turret: extra damage per level', '%'],
    ['gmFireSplash', 'Fire turret: damage to others in the explosion (share of the direct hit)', '%'],
    ['gmFx', 'Fire turret: explosion drawing size (1.5 = the real damage area)', 'n'],
    ['gmZap', 'Lightning turret: zap range', 'n'],
    ['gmChain', 'Lightning turret: chain jump distance', 'n'],
    ['gmChainPerLvl', 'Lightning turret: extra chain jumps per level', 'n'],
    ['gmStunPerLvl', 'Lightning turret: extra stun seconds per level', 'n'],
    ['gmIceR', 'Ice turret: burst radius', 'n'],
    ['gmIceRPerLvl', 'Ice turret: extra radius per level', '%'],
    ['gmIceDmg', 'Ice turret: damage (share of your damage)', '%'],
    ['gmSlow', 'Ice turret: slow strength', '%'],
    ['gmSlowT', 'Ice turret: slow seconds', 'n'],
    ['spellcaster', 'Spellcaster: attack speed bonus', '%'],
    ['thunderChance', 'Thunder Strike: chance on hit, per level', '%'],
    ['thunderMaxLvl', 'Thunder Strike: highest level', 'i'],
    ['thunderDmg', 'Thunder Strike: damage (share of your damage)', '%'],
    ['gmThR', 'Thunder Strike: radius', 'n'],
    ['siphonPerLvl', 'Health Siphon: extra drain damage per level', '%']
  ]]
];

// Shows a number the way the editor displays it (percent kinds are multiplied by 100).
function edShow(kind, v) {
  return kind === '%' ? Math.round(v * 100000) / 1000 : Math.round(v * 100000) / 100000;
}

// Turns what was typed back into the stored number. Returns null when it is not a usable number.
function edParse(kind, text) {
  if (String(text).trim() === '')
    return null;
  let v = Number(text);
  if (!isFinite(v))
    return null;
  if (kind === '%')
    v = v / 100;
  if (kind === 'i')
    v = Math.round(v);
  return v;
}

// Numbers of C that are not meant to be edited: unused leftovers, values the game fills in by itself, or auto-detected rotations.
const EDITOR_HIDDEN = new Set(['swirlStay', 'windBack', 'cone', 'baseDmg', 'swordRot', 'rocketRot']);

// All numeric keys of C that are not in a group above (so every number can still be reached).
function edOtherKeys() {
  const listed = new Set();
  EDITOR_GROUPS.forEach(g => g[2].forEach(item => listed.add(item[0])));
  return Object.keys(C_DEFAULTS).filter(k => !listed.has(k) && !EDITOR_HIDDEN.has(k) && typeof C_DEFAULTS[k] === 'number' && isFinite(C_DEFAULTS[k]));
}

// ---------------------------------------------------------------------
// The screen
// ---------------------------------------------------------------------
function editorScreen(from, startDraft) {
  const o = $('ov');
  o.style.display = 'flex';
  // draft = the changes while this screen is open (only values that differ from the defaults are kept)
  const draft = startDraft || { C: Object.assign({}, EDITS.C), RAR: JSON.parse(JSON.stringify(EDITS.RAR)) };

  const row = (id, label, kind, def, cur, attrs) =>
    '<div class="edrow' + (cur !== def ? ' changed' : '') + '"><div class="edlab">' + label + '<small>default ' + edShow(kind, def) + (kind === '%' ? '%' : '') + '</small></div>' +
    '<input class="edin" type="number" step="any" inputmode="decimal" ' + attrs + ' value="' + edShow(kind, cur) + '">' +
    '<button class="edundo" type="button" title="Back to the default" ' + attrs.replace('data-k', 'data-uk').replace('data-r', 'data-ur') + '>↺</button></div>';

  let html = '';
  // 1) weapon damage per tier
  html += '<details class="edgrp" open><summary>Weapons: base damage by tier</summary><p class="edtip">Every weapon of a tier uses this base damage. "Drop weight" is how likely the tier is in a chest (bigger = more common; 0 = never).</p>';
  RAR.forEach((tier, i) => {
    const def = RAR_DEFAULTS[i] || { d: tier.d, w: tier.w };
    const d = (draft.RAR[i] && typeof draft.RAR[i].d === 'number') ? draft.RAR[i].d : def.d;
    const w = (draft.RAR[i] && typeof draft.RAR[i].w === 'number') ? draft.RAR[i].w : def.w;
    html += row('', '<b style="color:' + tier.c + '">' + tier.n + '</b> damage', 'n', def.d, d, 'data-r="' + i + '" data-f="d"');
    html += row('', '<b style="color:' + tier.c + '">' + tier.n + '</b> drop weight', 'n', def.w, w, 'data-r="' + i + '" data-f="w"');
  });
  html += '</details>';
  // 2) the groups
  const groups = EDITOR_GROUPS.map(g => g).concat([['Other numbers', 'Everything else in config.js (advanced).', edOtherKeys().map(k => [k, k, 'n'])]]);
  groups.forEach(g => {
    html += '<details class="edgrp"><summary>' + g[0] + '</summary><p class="edtip">' + g[1] + '</p>';
    g[2].forEach(([key, label, kind]) => {
      if (!(key in C_DEFAULTS))
        return;
      const cur = (key in draft.C) ? draft.C[key] : C_DEFAULTS[key];
      html += row('', label, kind, C_DEFAULTS[key], cur, 'data-k="' + key + '" data-kind="' + kind + '"');
    });
    html += '</details>';
  });

  o.innerHTML = '<h1>Editor mode</h1>' +
    '<p class="edhint">Change the game\'s numbers. <b>Save &amp; restart</b> applies them' + (from === 'pause' ? ' (your current run will end)' : '') + '. Saved on this device only.</p>' +
    '<input class="fbin edsearch" id="edSearch" type="search" placeholder="Search a setting..." autocomplete="off">' +
    '<label class="edtoggle"><input type="checkbox" id="edHb"' + (SHOW_HB ? ' checked' : '') + '><span>Show hitboxes <small>(applies at once)</small></span></label>' +
    '<div class="edwrap" id="edWrap">' + html + '</div>' +
    '<p class="edcount" id="edCount"></p>' +
    '<button class="opt fbbtn" id="edSave"><b>Save &amp; restart</b></button>' +
    '<div class="edbtns"><button class="opt" id="edShare"><b>Export / Import</b></button><button class="opt" id="edReset"><b style="color:#ff5d63">Reset all</b></button><button class="opt" id="edBack"><b>Back</b></button></div>';

  const wrap = $('edWrap');
  $('edHb').onchange = e => hbSet(e.target.checked);
  const count = () => {
    const n = Object.keys(draft.C).length + Object.values(draft.RAR).reduce((t, e) => t + Object.keys(e).length, 0);
    $('edCount').textContent = n ? n + ' change' + (n === 1 ? '' : 's') + ' not saved yet' : 'No changes';
  };
  count();

  // keeps the draft in sync with an input; empty / invalid = default
  wrap.addEventListener('input', e => {
    const input = e.target;
    if (!input.classList.contains('edin'))
      return;
    const rowEl = input.closest('.edrow');
    if (input.dataset.k !== undefined) {
      const key = input.dataset.k;
      const v = edParse(input.dataset.kind, input.value);
      if (v === null || v === C_DEFAULTS[key])
        delete draft.C[key];
      else
        draft.C[key] = v;
      rowEl.classList.toggle('changed', key in draft.C);
    }
    else {
      const i = input.dataset.r;
      const f = input.dataset.f;
      const v = edParse('n', input.value);
      const def = RAR_DEFAULTS[i] ? RAR_DEFAULTS[i][f] : null;
      draft.RAR[i] = draft.RAR[i] || {};
      if (v === null || v === def)
        delete draft.RAR[i][f];
      else
        draft.RAR[i][f] = v;
      if (!Object.keys(draft.RAR[i]).length)
        delete draft.RAR[i];
      rowEl.classList.toggle('changed', !!(draft.RAR[i] && f in draft.RAR[i]));
    }
    count();
  });

  // the small "back to default" button of a row
  wrap.addEventListener('click', e => {
    const b = e.target.closest('.edundo');
    if (!b)
      return;
    const rowEl = b.closest('.edrow');
    const input = rowEl.querySelector('.edin');
    if (b.dataset.uk !== undefined) {
      delete draft.C[b.dataset.uk];
      input.value = edShow(input.dataset.kind, C_DEFAULTS[b.dataset.uk]);
    }
    else {
      const i = b.dataset.ur;
      const f = input.dataset.f;
      if (draft.RAR[i]) {
        delete draft.RAR[i][f];
        if (!Object.keys(draft.RAR[i]).length)
          delete draft.RAR[i];
      }
      input.value = edShow('n', RAR_DEFAULTS[i][f]);
    }
    rowEl.classList.remove('changed');
    count();
  });

  // search: shows only the matching rows (and opens the groups that have a match)
  $('edSearch').oninput = e => {
    const q = e.target.value.trim().toLowerCase();
    wrap.querySelectorAll('.edgrp').forEach(grp => {
      let any = false;
      grp.querySelectorAll('.edrow').forEach(r => {
        const hit = !q || r.textContent.toLowerCase().includes(q) || (r.querySelector('.edin').dataset.k || '').toLowerCase().includes(q);
        r.style.display = hit ? '' : 'none';
        any = any || hit;
      });
      grp.style.display = any ? '' : 'none';
      if (q)
        grp.open = any;
    });
  };

  $('edSave').onclick = () => {
    editorSave(draft);
  };
  $('edReset').onclick = () => {
    if (confirm('Put EVERY number back to its default and restart the game?')) {
      try {
        localStorage.removeItem(EDITOR_KEY);
      }
      catch (err) {
      }
      location.reload();
    }
  };
  $('edBack').onclick = () => devSettings(from);
  $('edShare').onclick = () => editorShare(from, draft);
}

// Writes the draft to this device and restarts the game so everything (texts, tables, formulas) starts fresh with the new numbers.
function editorSave(draft) {
  const clean = { C: {}, RAR: {} };
  for (const key in draft.C)
    if (key in C_DEFAULTS && typeof draft.C[key] === 'number' && isFinite(draft.C[key]) && draft.C[key] !== C_DEFAULTS[key])
      clean.C[key] = draft.C[key];
  for (const i in draft.RAR)
    if (RAR_DEFAULTS[i])
      for (const f of ['d', 'w'])
        if (typeof draft.RAR[i][f] === 'number' && isFinite(draft.RAR[i][f]) && draft.RAR[i][f] !== RAR_DEFAULTS[i][f]) {
          clean.RAR[i] = clean.RAR[i] || {};
          clean.RAR[i][f] = draft.RAR[i][f];
        }
  try {
    if (Object.keys(clean.C).length || Object.keys(clean.RAR).length)
      localStorage.setItem(EDITOR_KEY, JSON.stringify(clean));
    else
      localStorage.removeItem(EDITOR_KEY);
  }
  catch (err) {
    alert('Could not save here (browser storage is blocked).');
    return;
  }
  location.reload();
}

// Export / import screen: your changes as text, to copy to another device or keep as a backup.
function editorShare(from, draft) {
  const o = $('ov');
  const json = JSON.stringify({ C: draft.C, RAR: draft.RAR }, null, 2);
  o.innerHTML = '<h1>Export / Import</h1><p class="edhint">Copy this text to keep or share your changes. To load changes, paste them here and press Import.</p>' +
    '<textarea class="fbin edjson" id="edJson" spellcheck="false"></textarea><p class="fbmsg" id="edMsg"></p>' +
    '<button class="opt fbbtn" id="edImport"><b>Import</b></button><button class="opt fbbtn" id="edCopy"><b>Copy</b></button><button class="opt fbbtn" id="edBack2"><b>Back</b></button>';
  $('edJson').value = json;
  $('edBack2').onclick = () => editorScreen(from, draft);
  $('edCopy').onclick = () => {
    $('edJson').select();
    try {
      navigator.clipboard.writeText($('edJson').value);
      $('edMsg').textContent = 'Copied.';
      $('edMsg').className = 'fbmsg ok';
    }
    catch (err) {
      document.execCommand('copy');
    }
  };
  $('edImport').onclick = () => {
    try {
      const parsed = JSON.parse($('edJson').value);
      const next = { C: {}, RAR: {} };
      for (const key in (parsed.C || {}))
        if (key in C_DEFAULTS && typeof parsed.C[key] === 'number' && isFinite(parsed.C[key]))
          next.C[key] = parsed.C[key];
      for (const i in (parsed.RAR || {}))
        if (RAR_DEFAULTS[i])
          for (const f of ['d', 'w'])
            if (typeof parsed.RAR[i][f] === 'number' && isFinite(parsed.RAR[i][f])) {
              next.RAR[i] = next.RAR[i] || {};
              next.RAR[i][f] = parsed.RAR[i][f];
            }
      editorScreen(from, next);
    }
    catch (err) {
      $('edMsg').textContent = 'That is not valid text from the Editor.';
      $('edMsg').className = 'fbmsg';
    }
  };
}
