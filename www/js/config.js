// ======================================================================
// CONFIG & CANVAS SETUP
// Tunable game numbers (the C object) and the canvas / drawing-context shortcuts used everywhere.
// ======================================================================

// Where the Feedback button sends players' feedback: the address of your feedback website (see the feedback website's README).
// Example (Vercel): 'https://your-project.vercel.app/api/feedback'   - the default below is only for testing on your own computer.
// Leave '' to turn sending off (the form then tells players feedback is unavailable).
const FEEDBACK_URL = 'https://limbo-feedback-site.vercel.app/api/feedback';

// Developer tools (Settings > Developer: start level, free chests, Editor mode). Set to false before you release the game so players cannot see them.
const DEV_TOOLS = true;

// C holds every tunable number of the game (damage, speeds, ranges, boss timings...). Change values here to rebalance.
const C = {
  gmTR: 460, // Grimoire turret range
  gmZap: 320, // Lightning turret zap range
  gmChain: 170, // Lightning turret chain distance between enemies
  gmFireR: 75, // Fire turret explosion radius (base)
  gmFireSplash: 1, // Fire turret: damage dealt to the other enemies in the explosion radius, as a share of the direct hit (.9 = 90%)
  gmFireD:.20,// Fire turret Damage scale
  atkR: 520, // Attack range: weapons only target enemies this close
  gmThR: 90, // Thunder Strike area radius
  aosGuard: .8, // Death guard: a hit that would kill you while above this share of max HP...
  aosEnd: .2, // ...leaves you at this share of max HP instead
  gmIceA: 1, // Ice burst opacity
  pixEnemies: 0, // 1 = pixelated look for enemies
  dwdTick: .5, // Dance with Death: seconds between damage ticks
  gmFx: 1, // Fireball explosion sprite scale
  gmIceR: 70, // Ice turret explosion radius (base)
  gmSlow: .5, // Ice turret slow strength (base)
  burnChance: .5, // Fire turret: chance to inflict Burn on each enemy it hits
  burnDmg: .5, // Burn: total damage over its duration, as a share of the Fire turret's damage (.5 = 50%)
  burnT: 3, // Burn: duration in seconds
  burnTick: .5, // Burn: seconds between damage ticks
  freezeT: 2, // Ice turret: seconds an already-slowed enemy stays frozen (stunned); its slow restarts when it thaws
  teslaChance: .25, // Lightning turret: chance to inflict Tesla on each enemy it zaps
  teslaT: 3, // Tesla: duration in seconds
  teslaTick: .5, // Tesla: seconds between electric arcs
  teslaTargets: 2, // Tesla: how many nearest enemies each arc electrocutes
  teslaR: 160, // Tesla: how far an arc can reach (px)
  teslaThunderMult: 1, // Tesla arcs: Thunder Strike chance as a share of the normal chance (1 = same chance, .5 = half, 0 = Tesla never triggers it)
  teslaThunderCd: 1, // Tesla arcs: seconds before the same Tesla enemy can trigger another Thunder Strike
  teslaDmg: .5, // Tesla: damage of each arc as a share of your damage
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
  pHitR: 10, // Player hitbox radius (px): enemies and enemy bullets hurt you when their hitbox touches this circle
  eHitR: 10, // Normal enemy hitbox radius (px): your knives, sword and spells hit when they touch this circle
  eSpeedStep: 0.5, // Enemy speed gained every eSpeedEvery levels
  eSpeedEvery: 10, // Levels between enemy speed increases
  capBase: 20, // Base number of enemies allowed at once
  chestLvl: 15, // A chest is earned every this many levels
  orbCost: 10, // Orbs: Essence the first orb takes (you need at least this much to use one)
  orbCostStep: 5, // Orbs: how much more Essence the next orb costs after every orb you open in a run (0 = always the same price)
  orbChance: .45, // Orbs: chance that a map chunk (1000 x 1000) holds an orb
  orbTime: .8, // Orbs: seconds you must stand close to an orb to use it (or press E)
  orbRadius: 75, // Orbs: how close you must stand (world units)
  orbChoices: 3, // Orbs: how many special augments an orb offers (the picker shows 3)
  bossEvery: 50, // A boss appears every this many levels
  dashOn: 0, // 1 = Slash Dash augment enabled (currently off)
  swirlDist: 3, // Swirl flight distance with the Sword, as a multiple of the sword's current range (so it grows with Sword Range)
  swirlDistRanged: .5, // Swirl flight distance with the Bow / Grimoire, as a share of their attack range (.5 = half of it)
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
  bleedTick: .25, // Bleed: seconds between damage ticks
  capPerLvl: 1, // Extra enemies allowed per player level
  rangerFrom: 6, // Ranged zombies start appearing from this level
  rangerChance: .3, // Chance that a spawned zombie is ranged
  rangerRange: 420, // Ranged zombie shooting range
  rangerCd: 2, // Ranged zombie seconds between shots
  eBulletSpeed: 220, // Enemy bullet speed
  pSpeed: 150, // Player movement speed
  xpBase: 3, // XP needed for level 2
  xpLvl: 2, // Extra XP needed per level
  coinChance: 1, // Chance an enemy drops a coin when it dies (1 = always)
  coinValue: 1, // Coins gained per coin picked up
  coinBoss: 25, // Coins a boss drops (as one big pile) when it dies
  spawnBase: 0.7, // Enemy spawns per second at the start
  spawnGrow: 1 / 60, // Spawn rate growth per second
  arrowStart: 18, // How far in front of the rogue (toward the target) a Rogue knife starts, so it leaves the hand instead of the body
  pixelScale: 2, // Retro resolution: the game is drawn with this many times fewer pixels and stretched with sharp pixels (1 = full sharpness, 1.5 = a bit sharper than half, 2 = half, 3 = a third, 4 = a quarter)
  fps: 30, // Frame cap for the retro look (update + draw run this many times a second): 30 = retro, 60 = smooth, 0 = no cap (follows your monitor). Keep it at 24 or higher or the game runs in slow motion
  dayNight: 1, // Day / night cycle: 1 = on, 0 = always daytime
  dayLen: 240, // Length of one full day in seconds of play time (sunrise > day > sunset > night)
  dayStart: .14, // Time of day when a run starts (0 = late night, .14 = bright morning, .35 = midday, .65 = sunset, .8 = night)
  nightDark: 1, // How strong the day / night tint is (0 = none, 1 = normal, above 1 = darker nights)
  nightLight: .75, // How much the light around the player cuts through the dark at night (0 = none, 1 = fully bright)
  nightLightR: 380, // Radius of that light in px
  dayNightFx: 1, // Enemies change with the time of day: 1 = on, 0 = off (needs dayNight on)
  nightSpeed: .5, // Night: enemies move this much faster (.5 = +50%)
  nightDmg: 1, // Night: enemies deal this much more damage (1 = +100%, double)
  dayVuln: .5, // Day: enemies take this much more damage (.5 = +50%)
  fxLight: 1, // Light given off by projectiles and special effects at night (0 = none, 1 = normal, 2 = very bright)
  fxLightR: 1, // Size of that light (1 = normal, 1.5 = bigger glow)
  aimHold: .4, // Seconds the player model keeps facing the same enemy before it may pick another (stops direction flickering)
  aimMargin: .8, // How far past the edge of a direction the target must go before the model turns (1 = exactly at the edge, higher = steadier)
  enemySnap8: false, // Enemies and bosses walk in 8 directions too (horizontal, vertical, diagonal): false = free movement
  snap8: false, // Touch stick snaps to 8 directions (horizontal, vertical, diagonal) like the keyboard: false = free analog movement
  stickDead: 10, // Touch stick dead zone in px (only used with snap8)
  trailW: 10, // Rogue knife trail image: width in px
  trailLen: 48, // Rogue knife trail image: length in px
  trailStart: 6, // Rogue knife trail image: how far behind the knife's center the trail starts (px)
  arrowHeight: 34, // How high above the ground the Rogue knife is drawn (px): raise it if knives look too low, lower it if too high
  bulletSpeed: 1000, // Rogue knife speed (px per second)
  bulletLife: 1.3, // Rogue knife lifetime in seconds (range = speed x lifetime)
  gmShotSpeed: 420, // Grimoire orb speed (px per second)
  gmShotLife: 5, // Grimoire orb lifetime in seconds (range = speed x lifetime)
  gmShotTurn: 5, // Grimoire orb homing strength (0 = flies straight, higher = turns sharper towards enemies)
  gmShotSeek: 450, // How far from the orb an enemy can be for the orb to steer towards it
  gmShotWaveAmp: 14, // Grimoire orb snake sway: how far (px) the real path swings to each side (0 = straight)
  gmShotWaveFreq: 14, // Grimoire orb snake sway speed (radians per second; 14 = about 2.2 swings per second)
  gmShotTailT: .22, // Grimoire orb tail length in seconds of its past path (longer = longer snake tail)
  gmShotTailW: 10, // Grimoire orb tail thickness at the head (screen pixels)
  gmShotTailFade: .7, // seconds the Grimoire orb tail stays and slowly fades after the bolt hits or ends (0 = vanishes at once)
  bounceRange: 320, // Knife Bounce: how far a knife looks for the next enemy

  // ---- Augment numbers: the "per level" values of the augments (all of them can be edited in Editor mode) ----
  multiwieldDmg: .75, // MultiWield (Orb of Power): damage of each delayed attack as a share of your damage (.75 = 75%)
  multiwieldDelay: .3, // MultiWield: seconds between your attack and each delayed attack (the 2nd one comes 2x this later, and so on)
  killHeal: .5, // Lifesteal: share of a killed enemy's max health that heals you, per level
  regenPct: .1, // Regeneration: share of your max health regenerated every second, per level
  lifesteal: .1, // (unused now) old Lifesteal: share of the damage you deal that heals you
  shieldKills: 10, // Shield: kills needed to regain one shield charge
  moveSpeedPerLvl: .5, // Move Speed / Lightning Step: extra movement speed per level (.5 = +50%)
  magnetBase: 100, // Magnet: XP pickup range in pixels without the augment
  magnetPerLvl: 1, // Magnet: extra pickup range per level (1 = +100%)
  missileChance: .1, // Homing Explosive Knives: chance on hit per level
  missileMaxLvl: 10, // Homing Explosive Knives: highest level
  missileDmg: 1, // Homing Explosive Knives: explosion damage as a share of your damage
  deathBoomChance: .1, // Death Explosion: chance per level that an enemy explodes when it dies
  deathBoomDmg: 2, // Death Explosion: explosion damage at level 1 (2 = 200% of your damage)
  deathBoomDmgPerLvl: .5, // Death Explosion: extra damage per level after the first
  deathBoomR: 80, // Death Explosion: explosion radius
  armorPerLvl: 20, // Sword Armor augment: damage blocked from every hit you take, per level (0 armor at the start)
  hardenPerLvl: .5, // Harden (Orb of Perseverance): +% of your total armor per level (.5 = +50%, added together: x1.5, x2, x2.5...)
  hardenArmor: 20, // Harden: flat armor gained per level (added to your armor BEFORE the % increase is applied)
  sharpenMult: 5, // Sharpen (Orb of Power): multiplies your current damage by this
  swordRangePerLvl: .5, // Sword Range augment: extra sword range per level (.5 = +50%)
  ddTicksPerLvl: 2, // Dance with Death: how many ticks the damage is split into, per level
  swirlEvery: 3, // Swirl: a sword is thrown on every Nth attack
  swirlStayPerLvl: 1, // Swirl: seconds the sword hovers, per level
  bleedPerLvl: .01, // Bleed: damage per tick as a share of the hit, per level
  bleedBoomDmg: 1, // Bleed: explosion damage when a bleeding enemy dies, level 1 (1 = 100%)
  bleedBoomPerLvl: .1, // Bleed: extra explosion damage per level after the first
  bleedBoomR: 80, // Bleed: explosion radius
  vortexChance: .1, // Sword Soul Vortex: chance on enemy kill to pull all enemies towards you, per level (.1 = 10%, 20%, 30%...)
  vortexT: .5, // Soul Vortex: how long the pull lasts (seconds)
  vortexRate: 5, // Soul Vortex: pull strength (how fast enemies close the distance; higher = faster)
  gmTurAS: .5, // Fire / Lightning / Ice turrets: extra turret attack speed per level after the first (.5 = +50%; stacks with Haste)
  gmIceRPerLvl: .01, // Ice turret: extra burst radius per level (.01 = +1%)
  gmIceDmg: .75, // Ice turret: damage as a share of your damage
  gmChainPerLvl: 1, // Lightning turret: extra chain jumps per level
  gmStun: 1, // Lightning turret: stun seconds (fixed, does not grow with levels)
  spellcaster: 1, // Spellcaster: attack speed bonus (1 = +100%)
  thunderChance: .1, // Thunder Strike: chance on hit per level
  thunderMaxLvl: 10, // Thunder Strike: highest level
  thunderDmg: 1, // Thunder Strike: damage as a share of your damage
  siphonDmg: .5, // Health Siphon: damage to every enemy in range, as a share of your damage
  siphonOrbs: 8, // Health Siphon: most red orbs sent per tick (the drained HP of the other enemies is added to them)
  siphonPerLvl: .5 // Health Siphon: extra drain damage per level after the first (.5 = +50%)
};

// cv = the game canvas, g = its 2D drawing context, $(id) = shortcut for document.getElementById.
const cv = document.getElementById('c');

const g = cv.getContext('2d');

const $ = id => document.getElementById(id);

// W / H = current canvas size in CSS pixels (set by rs() on resize).
let W;

let H;
