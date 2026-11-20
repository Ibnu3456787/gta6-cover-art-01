// CoverState — the single source of truth for a cover, plus HistoryStack.
//
// The state is plain JSON: layout, grade, size, caption, subtitle, heat,
// badge, SplitPosterMode, and nine panel slots (photo index, zoom, pan).
// Every edit goes through `update`, which snapshots the previous state onto
// the undo stack, so Ctrl+Z / the Undo button always rewinds one real edit.
// The state serialises to JSON for the shot scenes and for debugging.

/** Nine panel slots — the most any layout shows (Nine Panel has 8 photos). */
export const PANEL_SLOT_COUNT = 9;

/** A fresh panel slot: first photo, no zoom, centred. */
export function freshPanelSlot() {
  return { photo: 0, zoom: 1, panX: 0, panY: 0 };
}

/** The default cover: Hero Grid, Vice Sunset, five sample photos, ready to export.
 *  Panel slots carry varied crops so a photo repeated across panels (the
 *  nine-panel grid shows 8 panels from 5 photos) still reads as distinct
 *  shots instead of the same frame stamped twice. The crops are tuned so no
 *  face is cut at a panel edge in any of the four screenshot scenes. */
export function defaultCoverState() {
  const photo = [0, 1, 3, 4, 2, 1, 3, 0, 4];
  const zoom = [1, 1.1, 1.15, 1.1, 1.05, 1.45, 1.35, 1.3, 1.1];
  const panX = [0, -0.4, 0, 0, 0.7, -0.45, 0.1, -0.15, 0];
  const panY = [0.75, 0.7, 0.48, 0.75, 0, 0.5, 0.15, 0.4, 0.5];
  const panels = Array.from({ length: PANEL_SLOT_COUNT }, (_, i) => ({
    photo: photo[i],
    zoom: zoom[i],
    panX: panX[i],
    panY: panY[i],
  }));
  return {
    layout: 'hero-grid',
    grade: 'vice-sunset',
    size: 'square',
    caption: 'Sunset Heist',
    subtitle: 'vice city nights',
    heat: 4,
    badge: 'Vice City',
    splitMode: false,
    panels,
    selectedPanel: 0,
  };
}

/** Deep-clone a state through JSON (the state holds no functions or images). */
export function cloneCoverState(state) {
  return JSON.parse(JSON.stringify(state));
}

/**
 * HistoryStack — undo/redo over state snapshots. `push` records the state
 * BEFORE an edit; `undo`/`redo` return the state to show, or null at the ends.
 */
export class HistoryStack {
  constructor(limit = 60) {
    this.limit = limit;
    this.undoStack = [];
    this.redoStack = [];
  }

  push(state) {
    this.undoStack.push(cloneCoverState(state));
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
  }

  undo(current) {
    if (!this.undoStack.length) return null;
    this.redoStack.push(cloneCoverState(current));
    return this.undoStack.pop();
  }

  redo(current) {
    if (!this.redoStack.length) return null;
    this.undoStack.push(cloneCoverState(current));
    return this.redoStack.pop();
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }
}

/** Caption presets for the one-click caption picker. */
export const CAPTION_PRESETS = [
  'Sunset Heist',
  'Neon Shore',
  'Boulevard Queen',
  'Pier Pressure',
  'Night Shift',
  'Vice Nights',
  'Golden Hour Gang',
  'Rooftop Royalty',
];

/** Subtitle presets for the script line under the title. */
export const SUBTITLE_PRESETS = [
  'vice city nights',
  'welcome to paradise',
  'sun, sand & sirens',
  'est. 2026',
  'no speed limit',
  'the coast is ours',
];
