// ======================================================================
// CONFIG & CANVAS SETUP
// Tunable game numbers (the C object) and the canvas / drawing-context shortcuts used everywhere.
// ======================================================================

// C holds every tunable number of the game (damage, speeds, ranges, boss timings...). Change values here to rebalance.
const C = {
  gmTR: 460, // Grimoire turret range
  gmZap: 320, // Lightning turret zap range
  gmChain: 170, // Lightning turret chain distance between enemies
  gmFireR: 75, // Fire turret explosion radius (base)
  atkR: 520, // Attack range: weapons only target enemies this close
  gmThR: 90, // Thunder Strike area radius
  aosGuard: .8, // Death guard: a hit that would kill you while above this share of max HP...
  aosEnd: .2, // ...leaves you at this share of max HP instead
  gmIceA: 1, // Ice burst opacity
  pixEnemies: 1, // 1 = pixelated look for enemies
  dwdTick: .5, // Dance with Death: seconds between damage ticks
  gmFx: 1.5, // Fireball explosion sprite scale
  gmIceR: 70, // Ice turret explosion radius (base)
  gmSlow: .5, // Ice turret slow strength (base)
  gmSlowT: 2, // Ice turret slow duration in seconds
  hpAug: 0.5, // Health augment: +% max HP per level
  baseHp: 125, // Starting max HP
  hpLvl: 10, // Max HP gained per level
  baseDmg: 15, // Base damage (replaced by the equipped weapon rarity at run start)
  dmgLvl: 0, // Extra damage per level
  fireRate: 1, // Base attacks per second
  rateAug: 0.5, // Fire Rate / Attack Speed augment: +% per level
  eHp: 100, // Enemy base HP
  eHpLvl: 25, // Enemy HP gained per player level
  eDmg: 10, // Enemy base damage
  eDmgLvl: 10, // Enemy damage gained per player level
  eSpeed: 48, // Enemy base speed
  eSpeedStep: 0.5, // Enemy speed gained every eSpeedEvery levels
  eSpeedEvery: 10, // Levels between enemy speed increases
  capBase: 20, // Base number of enemies allowed at once
  chestLvl: 15, // A chest is earned every this many levels
  bossEvery: 50, // A boss appears every this many levels
  dashOn: 0, // 1 = Slash Dash augment enabled (currently off)
  swirlDist: 3, // Swirl flight distance as a multiple of base sword range (fixed, does not grow with Sword Range)
  swirlRad: .5, // Swirl radius as a share of Sword Range
  swirlOut: .45, // Swirl seconds spent flying out
  swirlStay: 1.1, // Not used any more: Swirl hover time is now 1s + 1s per Swirl level
  swirlTick: .3, // Swirl damages enemies inside it every this many seconds
  bossWarn: 5, // Seconds of warning before the boss arrives
  bossHp: 10, // Boss HP as a multiple of a normal enemy
  bossDmg: 1, // Boss damage multiplier
  bossR: 48, // Boss body radius
  bossWind: 1.3, // Boss wind-up seconds before an attack
  bossDashLen: 760, // Boss dash distance
  bossDashT: .55, // Boss dash duration
  bossJumpT: .6, // Boss jump duration
  bossJumpH: 150, // Boss jump height
  bossJumpR: 110, // Boss stomp radius
  bossRest: 1.1, // Boss rest time after an attack
  bossGap: 1.6, // Minimum time between boss attacks
  swordRot: -Math.PI / 4, // Sword emoji rotation (auto-adjusted for the device font)
  rocketRot: Math.PI / 4, // Rocket emoji rotation
  dashDist: 150, // Slash Dash distance
  windBack: 2.9, // Boss wind-up pull-back distance
  arc: 1.5708, // Sword swing arc (radians)
  cone: 0, // Sword hit cone
  swordR: 60, // Base sword range
  pushBase: 250, // Slash Push base strength
  bleedTick: .25, // Bleed: seconds between damage ticks
  capPerLvl: 1, // Extra enemies allowed per player level
  rangerFrom: 6, // Ranged zombies start appearing from this level
  rangerChance: .3, // Chance that a spawned zombie is ranged
  rangerRange: 420, // Ranged zombie shooting range
  rangerCd: 2, // Ranged zombie seconds between shots
  eBulletSpeed: 220, // Enemy bullet speed
  pSpeed: 130, // Player movement speed
  xpBase: 3, // XP needed for level 2
  xpLvl: 2, // Extra XP needed per level
  spawnBase: 0.7, // Enemy spawns per second at the start
  spawnGrow: 1 / 60, // Spawn rate growth per second
  bulletSpeed: 420, // Player bullet speed
  bounceRange: 320 // Projectile Bounce: how far a bullet looks for the next enemy
};

// cv = the game canvas, g = its 2D drawing context, $(id) = shortcut for document.getElementById.
const cv = document.getElementById('c');

const g = cv.getContext('2d');

const $ = id => document.getElementById(id);

// W / H = current canvas size in CSS pixels (set by rs() on resize).
let W;

let H;
