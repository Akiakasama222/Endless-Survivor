// ======================================================================
// MAIN LOOP
// Starts the game: shows the main menu and runs the animation loop.
// ======================================================================

// last = timestamp of the previous frame, used to compute dt.
let last = performance.now();

// Runs every animation frame: computes dt, updates the game if playing, then draws.
function loop(n) {
  const dt = Math.min(.05, (n - last) / 1000);
  last = n;
  if (S.state === 'play')
    update(dt);
  draw();
  requestAnimationFrame(loop);
}

menu();

requestAnimationFrame(loop);
