// ShotScenes — fixed scenes for screenshots, driven by the ?shot= query.
//
//   ?shot=cover   the cover alone, full frame (controls hidden)
//   ?shot=editor  the editor with the sample photos loaded
//
// Query params pick the scene: layout, grade, size, caption, subtitle, heat,
// badge, split (1 = SplitPosterMode on). The scene resolves once the cover is
// painted and window.__shotReady is true, so a screenshot tool can wait on it
// instead of guessing a delay.

/**
 * Apply a shot scene. `setup` is the app's scene loader: it takes the scene
 * name, the parsed query and a state patch, and returns a promise that
 * resolves once the cover is drawn.
 */
export async function runShotScene(shot, query, setup) {
  const patch = {};
  for (const key of ['layout', 'grade', 'size', 'caption', 'subtitle', 'badge']) {
    const v = query.get(key);
    if (v !== null && v !== '') patch[key] = v;
  }
  const heat = query.get('heat');
  if (heat !== null && heat !== '') patch.heat = Math.max(0, Math.min(5, Number(heat) || 0));
  if (query.get('split') === '1') patch.splitMode = true;
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await setup(shot, patch);
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  window.__shotReady = true;
}
