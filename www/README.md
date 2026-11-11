# Limbo

Isometric survivor game (Bow, Sword and Grimoire weapons). Plain HTML + CSS + JavaScript, no build step.

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
| teleport.js | the teleport-in spawn animation at the start of a run |
| loader.js | the list of image files (`IMAGE_FILES`) and the loading screen (progress bar, zombie chasing the mage) |
| tuning.js | remembers the default of every number in `C`, applies the changes saved by the Editor mode, and small text helpers (`pc`, `pcn`, `pcl`) |
| config.js | `C` = every tunable number (damage, speeds, ranges, boss timings), canvas shortcuts |
| sprites.js | loads character / sword art, builds tinted + pixelated sprite sheets |
| mage3d.js | the live 3D mage (Rogue / Grimoire): poses the Mixamo model every frame and draws it with a small software rasterizer at the game's pixel resolution; upper body aims, legs follow the movement. Settings are in the `LIVE3D` block at the top. If the model file is missing the 16-direction sprite mage is used |
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
| levelup.js | Bow / Sword special augments, augment picking, level-up and game-over screens |
| editor.js | Editor mode screen (Settings > Developer > Editor mode) |
| menus.js | pause menu, Weapon Guide, main menu, inventory, chest opening |
| feedback.js | the Feedback form (name / anonymous, title, message) and sending it to the feedback website |
| update.js | one simulation step (`update(dt)`) |
| draw.js | draws one frame |
| main.js | starts the game and runs the animation loop |

All scripts share one global scope, so keep the order in `index.html`.

## Editor mode (change the game's numbers without code)

**Settings > Developer > Editor mode** lists the game's numbers in groups, each with its default value:

* **Weapons: base damage by tier** (and the chest drop weight of every tier),
* **Player**, **Enemies** and **Boss** (HP, damage, speed, spawn rates, boss attack timings),
* **Multipliers** (Overload levels / steps, Enlightenment),
* **Arrows** (Bow arrow, Grimoire orb),
* **Augments** for the Bow, Sword and Grimoire: every "per level" value (% damage, range, chance, radius, seconds...),
* **Other numbers**: everything else in `config.js`.

Type new values (percent rows are in %), use the search box to find a setting, and press **Save & restart**. The changed rows are highlighted and the little
arrow next to a row puts its default back. **Export / Import** gives you your changes as text (to back them up or move them to another device) and
**Reset all** removes every change. Changes are stored in the browser (`localStorage` key `limboEditor`), so they only affect that device.
The augment cards and the Weapon Guide show the edited numbers after the restart.

The defaults are the values in `js/config.js` (and the tier table in `js/player-data.js`). To change the defaults for everybody, edit those files.
Before you release the game set `DEV_TOOLS = false` in `js/config.js`: the Developer button (and with it the Editor) disappears.

## Icon, loading screen and main menu

* **Icon:** `assets/icons/` holds the game icon in every size (browser tab `favicon.ico` + 32 px, iOS home screen 180 px, Android 192 / 512 px and a
  "maskable" 512 px one). `index.html` links them and `manifest.webmanifest` describes the app (name, colours, icons), so "Add to Home Screen" shows the icon.
  To change the icon, replace those files (keep the names) - a bigger source picture (1024 px) gives sharper big icons.
* **Loading screen:** `#loading` in `index.html`, styled at the end of `css/style.css`, driven by `js/loader.js`. It waits for the images and the font
  (at least 1 second), then fades out. A new image file must be added to `IMAGE_FILES` in `js/loader.js`.
* **Main menu:** full-screen art `assets/images/menu-background.webp` with the title and buttons on top (`menu()` in `js/menus.js`, styles `.menu-card` / `.mbtn`
  in `css/style.css`). **Quit** tries to close the tab; browsers usually refuse that for a normal page, so a "Thanks for playing" screen is shown instead.

## Feedback button

The main menu and the pause menu have a **Feedback** button. Players rate the game with **1 to 5 stars** (required), tick
*Anonymous* or *Use my name*, optionally write a title and a message (a comment needs both), and press Submit. Stars alone are enough. It is sent to the feedback website (a separate project, see its README), where you can read,
edit, hide and delete it. Set the website's address in `js/config.js` (`FEEDBACK_URL`), for example
`https://your-project.vercel.app/api/feedback`.

## Assets

Images (`assets/images/`)

| File | Used for |
|------|----------|
| zombie-sheet.png | basic zombie walk sheet (8 directions x 8 frames) |
| giant-zombie-sheet.webp | Giant Zombie boss run sheet |
| player-mage-sheet.png | player (hooded mage), 8 directions |
| sword-blade.png / sword-hilt.png | sword (blade stretches with Sword Range) |
| bow-arrow.png | Bow arrow (tinted per rarity) |
| aim_aim_sheet_upper_body.png, aim_shoot_sheet_upper_body.png | Archer upper body (aiming / shooting), 8 columns x 8 directions |
| aim_walk_forward / back / left / right_sheet_lower_body.png | Archer lower body walk cycles, 8 columns x 8 directions |
| fx-fireball-explosion.png / fx-fireball-smoke.png | Fire turret explosion (the explosion sheet is cut with `FX_FRAMES` in `js/grimoire.js`) |
| fx-ice-burst.png | Ice turret burst (cut with `ICE_FRAMES` in `js/grimoire.js`) |
| fx-teleport-in.png | Spawn animation when a run starts (8 x 3 frames of 40 x 64, played by `js/teleport.js`; size / speed / timing are constants at the top of that file) |
| fx-death-explosion.png | Death Explosion / Bleed explosion |
| fx-boss-stomp.webp | boss stomp shockwave |
| menu-background.webp | main menu art |

Sounds (`assets/audio/`) are listed in `SOUND_FILES` in `js/audio.js` (key -> file);
the sword swing file is `SWING_FILE` in the same place. To replace a sound, overwrite the file or change the path there.

## Common edits

* Balance numbers: `js/config.js` (every value has a short note).
* Augment text and values: the `SP` / `SW` / `SG` tables (`levelup.js`, `grimoire.js`) and what `pickAug()` does.
* Weapon Guide text: the `WG` table in `js/menus.js`.


## The live 3D mage

`assets/models/mage3d.json` holds the mage model (mesh, skin weights, skeleton) and its five animations (Run Forward / Back / Left / Right and the 1H Magic Attack cast), baked from the FBX files at 30 fps.
The FBX files have no texture image, only a color per material, so the model colors are set in `LIVE3D.colors` (js/mage3d.js).
`LIVE3D.on = false` switches back to the 16-direction sprite mage.
