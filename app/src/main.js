// ViceCoverStudio — wires the editor: photos, panels, lettering, export.
//
// The flow is three steps: load a photo (or use the preloaded samples),
// tweak the cover, export a PNG. Every edit redraws the same canvas the
// export uses, so the preview is the export. Photos are read with
// URL.createObjectURL on the user's own machine and never leave it.
//
// Named systems in this file:
//   PhotoTray      — the user's photos plus the five built-in samples
//   PanelPicker    — click a panel on the cover to edit it; drag to pan, wheel to zoom
//   ExportEngine   — one-click PNG export in 1080x1080 / 1080x1350 / 1920x1080
//   ShotScenes     — ?shot=cover / ?shot=editor fixed scenes (shots.js)

import { drawCoverArt } from './cover.js';
import { PANEL_LAYOUTS } from './layouts.js';
import { GRADE_PRESETS, EXPORT_SIZES, getExportSize } from './grades.js';
import {
  defaultCoverState,
  cloneCoverState,
  HistoryStack,
  CAPTION_PRESETS,
  SUBTITLE_PRESETS,
} from './state.js';
import { runShotScene } from './shots.js';

const SAMPLE_PHOTOS = ['samples/woman-car.jpg', 'samples/man-rooftop.jpg', 'samples/friends-neon.jpg', 'samples/woman-boardwalk.jpg', 'samples/man-convertible.jpg'];
const MAX_PHOTOS = 9;

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');

let state = defaultCoverState();
let photos = []; // HTMLImageElement per photo slot (index = photo id)
let photoNames = []; // display names for the tray
let geometry = null; // last drawn panel geometry, for hit-testing
let history = new HistoryStack();
let fontsReady = false;

/** Load an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/** Resize the preview canvas to the current export size and redraw. */
function redraw() {
  const size = getExportSize(state.size);
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  geometry = drawCoverArt(canvas, state, photos);
  // The selection outline is an editor aid: never draw it in a cover shot,
  // where the canvas must show exactly what the exported PNG holds.
  if (!document.body.classList.contains('shot-cover')) drawSelectionOverlay();
  updatePanelHint();
}

/** Dashed outline around the selected panel — preview only, never exported. */
function drawSelectionOverlay() {
  if (!geometry) return;
  const ctx = canvas.getContext('2d');
  const panels = geometry.panels.filter((p) => !p.title);
  const panel = panels[state.selectedPanel];
  if (!panel) return;
  const cx = panel.x + panel.w / 2;
  const cy = panel.y + panel.h / 2;
  ctx.save();
  if (panel.rot) {
    ctx.translate(cx, cy);
    ctx.rotate(panel.rot);
    ctx.translate(-cx, -cy);
  }
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = Math.max(3, Math.min(canvas.width, canvas.height) * 0.004);
  ctx.setLineDash([18, 12]);
  ctx.strokeRect(panel.x - 4, panel.y - 4, panel.w + 8, panel.h + 8);
  ctx.restore();
}

/** Push history, apply a change, sync the controls, redraw. */
function commit(mutator) {
  history.push(state);
  mutator(state);
  syncControls();
  redraw();
}

/** Apply a live change (drag, slider) without pushing history. */
function live(mutator) {
  mutator(state);
  redraw();
}

/** Push one history entry at the start of a drag or slider gesture. */
function gestureStart() {
  history.push(state);
}

/**
 * Text and slider edits mutate live on 'input', so the pre-edit snapshot is
 * taken when the edit begins (focus / pointerdown) and pushed when it ends
 * ('change') — pushing at 'change' time would snapshot the new state.
 */
let editSnapshot = null;
function editBegin() {
  editSnapshot = cloneCoverState(state);
}
function editEnd() {
  if (editSnapshot && JSON.stringify(editSnapshot) !== JSON.stringify(state)) {
    history.push(editSnapshot);
    syncControls();
  }
  editSnapshot = null;
}

function setStatus(text) {
  statusEl.textContent = text;
}

// ---- PhotoTray ------------------------------------------------------------

/** Add a loaded image to the tray; returns its photo id, or -1 when full. */
function addPhoto(img, name) {
  if (photos.length >= MAX_PHOTOS) return -1;
  photos.push(img);
  photoNames.push(name);
  renderTray();
  return photos.length - 1;
}

function renderTray() {
  const tray = document.getElementById('tray');
  tray.innerHTML = '';
  photos.forEach((img, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb';
    btn.title = photoNames[i];
    btn.setAttribute('aria-label', `Use photo ${photoNames[i]} in the selected panel`);
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = photoNames[i];
    btn.appendChild(thumb);
    const used = state.panels.some((p) => p.photo === i);
    if (used) btn.classList.add('in-use');
    btn.addEventListener('click', () => {
      commit((s) => {
        s.panels[s.selectedPanel].photo = i;
        s.panels[s.selectedPanel].zoom = 1;
        s.panels[s.selectedPanel].panX = 0;
        s.panels[s.selectedPanel].panY = 0;
      });
      setStatus(`${photoNames[i]} is now in panel ${state.selectedPanel + 1}.`);
    });
    tray.appendChild(btn);
  });
  document.getElementById('photo-count').textContent = `${photos.length}/${MAX_PHOTOS} photos`;
}

async function loadSamples() {
  for (const [i, url] of SAMPLE_PHOTOS.entries()) {
    try {
      const img = await loadImage(url);
      addPhoto(img, `Sample ${i + 1}`);
    } catch {
      // A missing sample leaves its panels to the empty-panel art; the app
      // still works with the user's own photos.
    }
  }
  redraw();
}

// ---- PanelPicker ----------------------------------------------------------

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

/** Which photo panel (index among photo panels) contains point (x, y)? */
function hitTestPanel(x, y) {
  if (!geometry) return -1;
  const panels = geometry.panels.filter((p) => !p.title);
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    let px = x;
    let py = y;
    if (p.rot) {
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      const cos = Math.cos(-p.rot);
      const sin = Math.sin(-p.rot);
      const dx = x - cx;
      const dy = y - cy;
      px = cx + dx * cos - dy * sin;
      py = cy + dx * sin + dy * cos;
    }
    if (px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h) return i;
  }
  return -1;
}

function updatePanelHint() {
  const panels = geometry ? geometry.panels.filter((p) => !p.title) : [];
  const hint = document.getElementById('panel-hint');
  const slot = state.panels[state.selectedPanel];
  const name = photoNames[slot?.photo] ?? 'no photo';
  hint.textContent = panels.length
    ? `Panel ${state.selectedPanel + 1} of ${panels.length} · ${name} · drag the photo to move it, scroll to zoom`
    : 'Pick a layout to begin';
}

let dragging = null;

canvas.addEventListener('pointerdown', (event) => {
  const { x, y } = canvasPoint(event);
  const hit = hitTestPanel(x, y);
  if (hit === -1) return;
  gestureStart();
  canvas.setPointerCapture(event.pointerId);
  if (hit !== state.selectedPanel) {
    state.selectedPanel = hit;
    syncControls();
  }
  dragging = { x, y, panel: hit };
  redraw();
});

canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const { x, y } = canvasPoint(event);
  const panels = geometry.panels.filter((p) => !p.title);
  const panel = panels[dragging.panel];
  if (!panel) return;
  const dx = x - dragging.x;
  const dy = y - dragging.y;
  dragging.x = x;
  dragging.y = y;
  live((s) => {
    const slot = s.panels[dragging.panel];
    slot.panX += dx / (panel.w * 0.5);
    slot.panY += dy / (panel.h * 0.5);
  });
  syncPanelSliders();
});

canvas.addEventListener('pointerup', () => {
  dragging = null;
});

let lastWheelPushAt = 0;
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const { x, y } = canvasPoint(event);
  const hit = hitTestPanel(x, y);
  if (hit === -1) return;
  // One history entry per wheel gesture, not one per wheel tick.
  const now = Date.now();
  if (now - lastWheelPushAt > 800) {
    gestureStart();
    lastWheelPushAt = now;
  }
  live((s) => {
    const slot = s.panels[hit];
    slot.zoom = Math.min(3, Math.max(1, slot.zoom * Math.exp(-event.deltaY * 0.0012)));
  });
  syncPanelSliders();
}, { passive: false });

// ---- Controls -------------------------------------------------------------

function buildPickers() {
  const layoutBox = document.getElementById('layout-picker');
  for (const layout of PANEL_LAYOUTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pick';
    btn.dataset.layout = layout.id;
    btn.textContent = `${layout.name} · ${layout.panels}`;
    btn.addEventListener('click', () => {
      commit((s) => {
        s.layout = layout.id;
        s.selectedPanel = 0;
      });
      setStatus(`Layout: ${layout.name}.`);
    });
    layoutBox.appendChild(btn);
  }

  const gradeBox = document.getElementById('grade-picker');
  for (const grade of GRADE_PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'swatch';
    btn.dataset.grade = grade.id;
    btn.title = grade.name;
    btn.setAttribute('aria-label', `Grade ${grade.name}`);
    btn.style.background = `linear-gradient(135deg, ${grade.sky[0]}, ${grade.ground[0]})`;
    const label = document.createElement('span');
    label.textContent = grade.name;
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      commit((s) => { s.grade = grade.id; });
      setStatus(`Grade: ${grade.name}.`);
    });
    gradeBox.appendChild(btn);
  }

  const sizeBox = document.getElementById('size-picker');
  for (const size of EXPORT_SIZES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pick';
    btn.dataset.size = size.id;
    btn.textContent = size.name;
    btn.addEventListener('click', () => {
      commit((s) => { s.size = size.id; });
      setStatus(`Canvas: ${size.name}.`);
    });
    sizeBox.appendChild(btn);
  }

  const captionPresets = document.getElementById('caption-presets');
  for (const preset of CAPTION_PRESETS) {
    const opt = document.createElement('option');
    opt.value = preset;
    opt.textContent = preset;
    captionPresets.appendChild(opt);
  }
  const subtitlePresets = document.getElementById('subtitle-presets');
  for (const preset of SUBTITLE_PRESETS) {
    const opt = document.createElement('option');
    opt.value = preset;
    opt.textContent = preset;
    subtitlePresets.appendChild(opt);
  }
}

function syncControls() {
  document.querySelectorAll('#layout-picker .pick').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('#grade-picker .swatch').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  document.querySelectorAll('#size-picker .pick').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === state.size);
  });
  document.getElementById('caption').value = state.caption;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('badge').value = state.badge;
  document.getElementById('heat').value = String(state.heat);
  document.getElementById('heat-value').textContent = `${state.heat} / 5`;
  document.getElementById('split-mode').checked = state.splitMode;
  document.getElementById('undo').disabled = !history.canUndo;
  document.getElementById('redo').disabled = !history.canRedo;
  syncPanelSliders();
  renderTray();
}

function syncPanelSliders() {
  const slot = state.panels[state.selectedPanel] ?? { zoom: 1, panX: 0, panY: 0 };
  document.getElementById('zoom').value = String(slot.zoom);
  document.getElementById('zoom-value').textContent = `${slot.zoom.toFixed(2)}x`;
  document.getElementById('pan-x').value = String(slot.panX);
  document.getElementById('pan-y').value = String(slot.panY);
}

function bindControls() {
  document.getElementById('photo-input').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    let added = 0;
    for (const file of files) {
      if (photos.length >= MAX_PHOTOS) break;
      try {
        const img = await loadImage(URL.createObjectURL(file));
        if (addPhoto(img, file.name) !== -1) added++;
      } catch {
        setStatus(`Could not read ${file.name}; skipped.`);
      }
    }
    if (added) {
      commit((s) => {
        s.panels[s.selectedPanel].photo = photos.length - 1;
        s.panels[s.selectedPanel].zoom = 1;
        s.panels[s.selectedPanel].panX = 0;
        s.panels[s.selectedPanel].panY = 0;
      });
      setStatus(`${added} photo${added > 1 ? 's' : ''} added — the newest is in the selected panel.`);
    }
    e.target.value = '';
  });

  const captionInput = document.getElementById('caption');
  captionInput.addEventListener('focus', editBegin);
  captionInput.addEventListener('input', () => live((s) => { s.caption = captionInput.value; }));
  captionInput.addEventListener('change', editEnd);
  document.getElementById('caption-presets').addEventListener('change', (e) => {
    if (!e.target.value) return;
    commit((s) => { s.caption = e.target.value; });
    e.target.value = '';
  });

  const subtitleInput = document.getElementById('subtitle');
  subtitleInput.addEventListener('focus', editBegin);
  subtitleInput.addEventListener('input', () => live((s) => { s.subtitle = subtitleInput.value; }));
  subtitleInput.addEventListener('change', editEnd);
  document.getElementById('subtitle-presets').addEventListener('change', (e) => {
    if (!e.target.value) return;
    commit((s) => { s.subtitle = e.target.value; });
    e.target.value = '';
  });

  const badgeInput = document.getElementById('badge');
  badgeInput.addEventListener('focus', editBegin);
  badgeInput.addEventListener('input', () => live((s) => { s.badge = badgeInput.value; }));
  badgeInput.addEventListener('change', editEnd);

  const heatInput = document.getElementById('heat');
  heatInput.addEventListener('pointerdown', editBegin);
  heatInput.addEventListener('keydown', editBegin);
  heatInput.addEventListener('input', () => {
    live((s) => { s.heat = Number(heatInput.value); });
    document.getElementById('heat-value').textContent = `${heatInput.value} / 5`;
  });
  heatInput.addEventListener('change', editEnd);

  document.getElementById('split-mode').addEventListener('change', (e) => {
    commit((s) => { s.splitMode = e.target.checked; });
    setStatus(e.target.checked
      ? 'Split Poster on: one photo tiled across every panel.'
      : 'Split Poster off: each panel keeps its own photo.');
  });

  const zoomInput = document.getElementById('zoom');
  zoomInput.addEventListener('pointerdown', editBegin);
  zoomInput.addEventListener('keydown', editBegin);
  zoomInput.addEventListener('input', () => {
    live((s) => { s.panels[s.selectedPanel].zoom = Number(zoomInput.value); });
    document.getElementById('zoom-value').textContent = `${Number(zoomInput.value).toFixed(2)}x`;
  });
  zoomInput.addEventListener('change', editEnd);
  const panXInput = document.getElementById('pan-x');
  panXInput.addEventListener('pointerdown', editBegin);
  panXInput.addEventListener('keydown', editBegin);
  panXInput.addEventListener('input', () => live((s) => { s.panels[s.selectedPanel].panX = Number(panXInput.value); }));
  panXInput.addEventListener('change', editEnd);
  const panYInput = document.getElementById('pan-y');
  panYInput.addEventListener('pointerdown', editBegin);
  panYInput.addEventListener('keydown', editBegin);
  panYInput.addEventListener('input', () => live((s) => { s.panels[s.selectedPanel].panY = Number(panYInput.value); }));
  panYInput.addEventListener('change', editEnd);

  document.getElementById('undo').addEventListener('click', () => {
    const prev = history.undo(state);
    if (!prev) return;
    state = prev;
    syncControls();
    redraw();
  });
  document.getElementById('redo').addEventListener('click', () => {
    const next = history.redo(state);
    if (!next) return;
    state = next;
    syncControls();
    redraw();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('undo').click();
    } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
      e.preventDefault();
      document.getElementById('redo').click();
    }
  });

  document.getElementById('surprise').addEventListener('click', () => {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    commit((s) => {
      s.layout = pick(PANEL_LAYOUTS).id;
      s.grade = pick(GRADE_PRESETS).id;
      s.caption = pick(CAPTION_PRESETS);
      s.subtitle = pick(SUBTITLE_PRESETS);
      s.heat = 3 + Math.floor(Math.random() * 3);
      s.selectedPanel = 0;
    });
    setStatus('Surprise me: new layout, grade and words. Undo brings the old cover back.');
  });

  document.getElementById('export-one').addEventListener('click', () => {
    exportCoverPNG(state.size);
  });
  document.getElementById('export-all').addEventListener('click', async () => {
    for (const size of EXPORT_SIZES) {
      exportCoverPNG(size.id);
      await new Promise((r) => setTimeout(r, 350));
    }
  });
}

// ---- ExportEngine ---------------------------------------------------------

/** Render the cover at a post size on an offscreen canvas and download it. */
export function exportCoverPNG(sizeId) {
  const size = getExportSize(sizeId);
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCoverArt(off, state, photos);
  const slug = (state.caption || 'cover').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cover';
  off.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed: the browser could not write the PNG.');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${slug}-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved vice-cover-${slug}-${size.w}x${size.h}.png`);
  }, 'image/png');
}

// ---- Boot -----------------------------------------------------------------

/** Load the display fonts, then paint the first cover. */
async function loadFonts() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.ready,
    ]);
    fontsReady = true;
  } catch {
    fontsReady = false;
  }
}

/** Apply a shot scene's state patch and redraw once the samples are in. */
async function setupShot(shot, patch) {
  state = { ...cloneCoverState(defaultCoverState()), ...patch };
  if (!photos.length) await loadSamples();
  syncControls();
  redraw();
  setStatus('Five sample photos are loaded — swap in your own, tweak, export.');
}

async function boot() {
  buildPickers();
  bindControls();
  syncControls();
  await loadFonts();
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot === 'cover' || shot === 'editor') {
    await runShotScene(shot, query, setupShot);
  } else {
    await loadSamples();
    setStatus('Five sample photos are loaded — swap in your own, tweak, export.');
  }
  redraw();
  // Exposed for the finalist review and for automated checks: the live state,
  // the photos and the export, all on the page itself.
  window.__viceCover = { get state() { return state; }, photos, redraw, exportCoverPNG, fontsReady: () => fontsReady };
}

boot();
