// ======================================================================
// MAIN LOOP
// Starts the game: shows the main menu and runs the animation loop.
// ======================================================================

// last = timestamp of the previous frame, used to compute dt.
let last = performance.now();

// Runs every animation frame: computes dt, updates the game if playing, then draws.
function loop(n) {
  requestAnimationFrame(loop);
  const el = (n - last) / 1000;
  // Retro frame cap (C.fps): skip this screen refresh until enough time has passed. 'last' is not updated, so the skipped time is added to the next step and the game speed stays the same.
  if (C.fps && el < 1 / C.fps - .004)
    return;
  last = n;
  const dt = Math.min(.05, el);
  if (S.state === 'play')
    update(dt);
  draw();
}

menu();

requestAnimationFrame(loop);
