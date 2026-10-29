# Endless Survivor

Isometric survivor game (Staff, Sword and Grimoire weapons). Plain HTML + CSS + JavaScript, no build step.

## Run it

The game loads images and sounds from the `assets/` folder, so it has to be served over http
(opening `index.html` straight from disk blocks sprite processing and sound loading in most browsers):

    python3 -m http.server 8000      # run inside this folder
    # then open http://localhost:8000

Any static web host works too (upload the whole folder).

## Folder layout

    index.html          page markup + the list of scripts (order matters)
    css/style.css       all styles (colours are variables at the top)
    assets/images/      sprite sheets and effect images
    assets/audio/       music and sound effects (mp3 / wav)
    js/                 game code, one topic per file (see below)

## Code files (loaded in this order)

| File | What is in it |
|------|---------------|
| config.js | `C` = every tunable number (damage, speeds, ranges, boss timings), canvas shortcuts |
| sprites.js | loads character / sword art, builds tinted + pixelated sprite sheets |
| audio.js | Web Audio: synthesized beeps, sound files, music, sword swing |
| settings.js | developer menu, volume settings, save-code export / import |
| buildings.js | procedural buildings: generation, enemy path steering, collisions |
| state.js | pre-rendered emoji sprites, canvas resize, the run state `S` |
| player-data.js | inventory, rarities, saved profile, stat formulas, `init()` (new run) |
| input.js | touch joystick and keyboard |
| combat.js | targeting, `hit()`, sword swing, Swirl |
| boss.js | Giant Zombie boss (every 50 levels) |
| hud.js | taking damage, damage over time, on-screen HUD |
| grimoire.js | Grimoire weapon, turrets, shared explosion / homing-heal effects, Grimoire augments |
| levelup.js | Staff / Sword special augments, augment picking, level-up and game-over screens |
| menus.js | pause menu, Weapon Guide, main menu, inventory, chest opening |
| update.js | one simulation step (`update(dt)`) |
| draw.js | draws one frame |
| main.js | starts the game and runs the animation loop |

All scripts share one global scope, so keep the order in `index.html`.

## Assets

Images (`assets/images/`)

| File | Used for |
|------|----------|
| zombie-sheet.png | basic zombie walk sheet (8 directions x 8 frames) |
| giant-zombie-sheet.webp | Giant Zombie boss run sheet |
| player-mage-sheet.png | player (hooded mage), 8 directions |
| sword-blade.png / sword-hilt.png | sword (blade stretches with Sword Range) |
| staff-bullet.png | Staff bullet (tinted per rarity) |
| fx-fireball-explosion.png / fx-fireball-smoke.png | Fire turret explosion |
| fx-ice-burst.png | Ice turret burst |
| fx-death-explosion.png | Death Explosion / Bleed explosion |
| fx-boss-stomp.webp | boss stomp shockwave |

Sounds (`assets/audio/`) are listed in `SOUND_FILES` in `js/audio.js` (key -> file);
the sword swing file is `SWING_FILE` in the same place. To replace a sound, overwrite the file or change the path there.

## Common edits

* Balance numbers: `js/config.js` (every value has a short note).
* Augment text and values: the `SP` / `SW` / `SG` tables (`levelup.js`, `grimoire.js`) and what `pickAug()` does.
* Weapon Guide text: the `WG` table in `js/menus.js`.
