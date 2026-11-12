// ======================================================================
// LOADING SCREEN & IMAGE LIST
// Every image file of the game is listed here ONCE (the sprite code reads its paths from IMAGE_FILES).
// While the page starts, the loading screen (#loading in index.html) shows a progress bar and a Restless
// that walks towards the mage as the images load, then fades away. Sounds are not part of it: browsers
// only allow audio after the first tap, so they load right after that (see audio.js).
// To add a new image: put the file in assets/images, add it to this list and use IMAGE_FILES.yourName in the code.
// ======================================================================

const IMAGE_FILES = {
  restlessIdle: 'assets/images/restless-idle.png',                 // Restless sheets: 16 directions (rows) x 30 frames (columns), 79 x 108 per frame (2370 x 1728)
  restlessWalk: 'assets/images/restless-walk.png',                 // Blue Restless walking
  restlessAttack: 'assets/images/restless-attack.png',             // Blue Restless melee attack
  restlessJump: 'assets/images/restless-jump.png',                 // Blue Restless night jump attack
  restlessPurpleWalk: 'assets/images/restless-purple-walk.png',    // Purple (ranged) Restless walking
  restlessPurpleCast: 'assets/images/restless-purple-cast.png',    // Purple Restless casting its bolt
  giantZombie: 'assets/images/giant-zombie-sheet.webp',
  mage: 'assets/images/player-mage-sheet.png',
  mageRun: 'assets/images/mage3d-run.png',      // 3D mage run cycle (8 facings x 15 frames, 20 fps)
  mageCast: 'assets/images/mage3d-cast.png',    // 3D mage cast (8 facings x 24 frames, 20 fps); column 0 doubles as the idle pose
  mage16Cast: 'assets/images/mage16-cast.png',               // 16-direction mage, UPPER body: Standing_1H_Magic_Attack_01 (24 frames, 16 rows); column 0 is the aiming / idle pose
  mage16RunForward: 'assets/images/mage16-run-forward.png',  // 16-direction mage, LOWER body: Standing_Run_Forward (11 frames @ 15 fps, 16 rows)
  mage16RunRight: 'assets/images/mage16-run-right.png',      // Standing_Run_Right (12 frames)
  mage16RunBack: 'assets/images/mage16-run-back.png',        // Standing_Run_Back (10 frames)
  mage16RunLeft: 'assets/images/mage16-run-left.png',        // Standing_Run_left (12 frames)
  swordBlade: 'assets/images/sword-blade.png',
  swordHilt: 'assets/images/sword-hilt.png',
  arrow: 'assets/images/rogue-knife.png',      // the Rogue's thrown knife (was bow-arrow.png); drawn pointing right
  trail: 'assets/images/Main Projectile Trail.png',
  archerAim: 'assets/images/aim_aim_sheet_upper_body.png',
  archerShoot: 'assets/images/aim_shoot_sheet_upper_body.png',
  archerWalkForward: 'assets/images/aim_walk_forward_sheet_lower_body.png',
  archerWalkBack: 'assets/images/aim_walk_back_sheet_lower_body.png',
  archerWalkLeft: 'assets/images/aim_walk_left_sheet_lower_body.png',
  archerWalkRight: 'assets/images/aim_walk_right_sheet_lower_body.png',
  explosionSmoke: 'assets/images/fx-explosion-smoke.png',
  fireballSmoke: 'assets/images/fx-fireball-smoke.png',
  fireRing: 'assets/images/fx-fire-ring.png',
  fireballExplosion: 'assets/images/fx-fireball-explosion.png',
  deathExplosion: 'assets/images/fx-death-explosion.png',
  bossStomp: 'assets/images/fx-boss-stomp.webp',
  iceBurst: 'assets/images/fx-ice-burst.png',
  thunderFx: 'assets/images/fx-thunder-strike.png',      // Thunder Strike lightning (yellow), 768 x 384: 8 columns x 2 rows of 96 x 128 frames, 16 in use
  arcaneBolt: 'assets/images/fx-arcane-bolt.png',
  bloodHit: 'assets/images/fx-blood-hit.png',
  coinFx: 'assets/images/fx-coin-pickup.png',
  essence: 'assets/images/essence.png',
  iconSword: 'assets/images/icon-sword.png',
  iconRogue: 'assets/images/icon-rogue.png',
  iconGrimoire: 'assets/images/icon-grimoire.png',
  shieldFx: 'assets/images/fx-shield.png',
  healFx: 'assets/images/fx-heal.png',
  levelUpFx: 'assets/images/fx-level-up.png',
  arcaneFly: 'assets/images/fx-arcane-fly.png',
  frozenBlock: 'assets/images/fx-frozen.png',
  teleportIn: 'assets/images/fx-teleport-in.png',      // spawn animation when a run starts (see js/teleport.js)
  menuBackground: 'assets/images/menu-background.webp',
  grassGreen: 'assets/images/GreenGrass.png',
  grassLess: 'assets/images/lessGreenGrass.png',
  grassYellowGreen: 'assets/images/YellowGreenGrass.png',
  grassYellow: 'assets/images/YellowGrass.png',
  grassMoreYellow: 'assets/images/moreYellowGrass.png',
  grassDead: 'assets/images/DeadGrass.png',
  treeYellowGreen: 'assets/images/YellowGreenTree.png',
  treeYellow: 'assets/images/YellowTree.png',
  treeDead: 'assets/images/DeadTree.png',
  treeGray: 'assets/images/GrayTree.png',
  leafGreen: 'assets/images/GreenLeaf.png',
  leafYellowGreen: 'assets/images/YellowGreenLeaf.png',
  leafGray: 'assets/images/GrayLeaf.png',
  explosionCrater: 'assets/images/Explosion crater.png',
  chest: 'assets/images/Chest.png',
  treeTrunk: 'assets/images/Tree Trunk.png',
  deadTreeTrunk: 'assets/images/DeadTree Trunk.png',
  augSwordSpeed: 'assets/images/aug-sword-attack-speed.png',
  augSwordHealth: 'assets/images/aug-sword-health.png',
  augSwordRange: 'assets/images/aug-sword-range.png',
  augSwordArmor: 'assets/images/aug-sword-armor.png',
  guideZombie: 'assets/images/guide-zombie.png',
  guideRanger: 'assets/images/guide-ranger.png',
  guideGiant: 'assets/images/guide-giant-zombie.png',
  swordSlash: 'assets/images/fx-sword-slash.png',
  augRogueRate: 'assets/images/aug-rogue-fire-rate.png',
  augRogueMulti: 'assets/images/aug-rogue-multi-knives.png',
  augRogueBounce: 'assets/images/aug-rogue-bounce.png',
  augGrimoireFire: 'assets/images/aug-grimoire-fire.png',
  augGrimoireLightning: 'assets/images/aug-grimoire-lightning.png',
  augGrimoireIce: 'assets/images/aug-grimoire-ice.png'
};

(function runLoadingScreen() {
  const screen = document.getElementById('loading');
  if (!screen)
    return;
  const fill = document.getElementById('ldFill');
  const zombie = document.getElementById('ldZombie');
  const ver = document.getElementById('ldVer');
  if (ver)
    ver.textContent = 'v' + GAME_VERSION;      // GAME_VERSION is defined in version.js
  const files = Object.values(IMAGE_FILES);
  const total = files.length + 1;            // every image + the game font
  const MIN_MS = 1000;                       // show the loading screen at least this long (no flicker on fast connections)
  const MAX_MS = 8000;                       // never get stuck on a failed download
  const started = performance.now();
  const keep = [];                           // keeps the preloading images alive until they finish
  let done = 0;
  let finished = false;

  // Moves the bar (and the zombie following its end) to `fraction` of the way (0 - 1).
  function show(fraction) {
    const percent = Math.round(fraction * 100) + '%';
    fill.style.width = percent;
    zombie.style.setProperty('--p', fraction);          // the Restless chases the mage but stops just short of it (css: .ld-zombie left)
  }

  function oneDone() {
    done++;
    show(Math.min(1, done / total));
    if (done >= total)
      finish();
  }

  function finish() {
    if (finished)
      return;
    finished = true;
    const wait = Math.max(0, MIN_MS - (performance.now() - started));
    setTimeout(() => {
      show(1);
      setTimeout(() => {
        screen.classList.add('done');            // fade out
        setTimeout(() => screen.remove(), 600);
      }, 350);
    }, wait);
  }

  show(0);
  for (const file of files) {
    const img = new Image();
    keep.push(img);
    img.onload = img.onerror = oneDone;      // a missing file must not block the game
    img.src = file;
  }
  const fontReady = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([fontReady, new Promise(resolve => setTimeout(resolve, 3000))]).then(oneDone);
  setTimeout(finish, MAX_MS);
})();
