// ======================================================================
// LOADING SCREEN & IMAGE LIST
// Every image file of the game is listed here ONCE (the sprite code reads its paths from IMAGE_FILES).
// While the page starts, the loading screen (#loading in index.html) shows a progress bar and a zombie
// that walks towards the mage as the images load, then fades away. Sounds are not part of it: browsers
// only allow audio after the first tap, so they load right after that (see audio.js).
// To add a new image: put the file in assets/images, add it to this list and use IMAGE_FILES.yourName in the code.
// ======================================================================

const IMAGE_FILES = {
  zombie: 'assets/images/zombie-sheet.png',
  giantZombie: 'assets/images/giant-zombie-sheet.webp',
  mage: 'assets/images/player-mage-sheet.png',
  swordBlade: 'assets/images/sword-blade.png',
  swordHilt: 'assets/images/sword-hilt.png',
  staffBullet: 'assets/images/staff-bullet.png',
  fireballSmoke: 'assets/images/fx-fireball-smoke.png',
  fireballExplosion: 'assets/images/fx-fireball-explosion.png',
  deathExplosion: 'assets/images/fx-death-explosion.png',
  bossStomp: 'assets/images/fx-boss-stomp.webp',
  iceBurst: 'assets/images/fx-ice-burst.png',
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
  deadTreeTrunk: 'assets/images/DeadTree Trunk.png'
};

(function runLoadingScreen() {
  const screen = document.getElementById('loading');
  if (!screen)
    return;
  const fill = document.getElementById('ldFill');
  const zombie = document.getElementById('ldZombie');
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
    zombie.style.left = fraction * 86 + '%';          // the zombie chases the mage but stops just short of it
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
