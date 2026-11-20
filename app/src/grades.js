// GradePresetLibrary — the six colour grades of Vice Cover Studio.
//
// A grade is a recipe the CoverEngine applies to every photo panel: a CSS
// filter string (saturation, contrast, brightness, sepia, hue) on the photo
// itself, plus two blended overlay washes (a sky wash and a ground wash) and
// a vignette strength. The lettering palette travels with the grade so the
// caption, subtitle and badge always sit on the grade instead of fighting it.
//
// The grades are named for the Vice City palette: sunset, neon, pastel,
// golden hour, noir teal and a monochrome pop. No grade touches the photo
// file — everything is drawn live on canvas, so switching grades is instant
// and undoable.

/**
 * One grade preset:
 *  filter   — ctx.filter string applied while the photo is drawn
 *  sky      — [colour, alpha] wash over the top of each panel (screen blend)
 *  ground   — [colour, alpha] wash over the bottom of each panel (multiply blend)
 *  duotone  — optional [shadowColour, highlightColour] gradient-map pair
 *  vignette — 0..1 strength of the edge darkening
 *  title    — lettering palette { fill, outline, glow, sub }
 *  frame    — colour of the panel gutters and outer frame
 */
export const GRADE_PRESETS = [
  {
    id: 'vice-sunset',
    name: 'Vice Sunset',
    filter: 'saturate(1.25) contrast(1.08) brightness(1.02)',
    sky: ['#ff9a5a', 0.22],
    ground: ['#c2187a', 0.30],
    duotone: null,
    vignette: 0.28,
    title: { fill: '#fff7e8', outline: '#1b0b2e', glow: '#ff5e8a', sub: '#ffd166' },
    frame: '#14101d',
  },
  {
    id: 'neon-night',
    name: 'Neon Night',
    filter: 'saturate(1.45) contrast(1.18) brightness(0.94)',
    sky: ['#22d3ee', 0.20],
    ground: ['#ff2e88', 0.34],
    duotone: null,
    vignette: 0.42,
    title: { fill: '#ffffff', outline: '#0a0618', glow: '#ff2e88', sub: '#22d3ee' },
    frame: '#0a0618',
  },
  {
    id: 'pastel-day',
    name: 'Pastel Day',
    filter: 'saturate(0.92) contrast(0.94) brightness(1.10)',
    sky: ['#aee9ff', 0.26],
    ground: ['#ffb3c8', 0.22],
    duotone: null,
    vignette: 0.10,
    title: { fill: '#ffffff', outline: '#3b2a4a', glow: '#ff8fab', sub: '#7dd3fc' },
    frame: '#f4e9f2',
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    filter: 'saturate(1.18) contrast(1.05) brightness(1.05) sepia(0.22)',
    sky: ['#ffd166', 0.26],
    ground: ['#e25822', 0.24],
    duotone: null,
    vignette: 0.30,
    title: { fill: '#fff3d6', outline: '#2b1503', glow: '#ff9f1c', sub: '#ffe066' },
    frame: '#241207',
  },
  {
    id: 'teal-noir',
    name: 'Teal Noir',
    filter: 'saturate(0.78) contrast(1.16) brightness(0.92) hue-rotate(-12deg)',
    sky: ['#2ec4b6', 0.20],
    ground: ['#011627', 0.38],
    duotone: null,
    vignette: 0.48,
    title: { fill: '#e8fff8', outline: '#011627', glow: '#2ec4b6', sub: '#90e0ef' },
    frame: '#011627',
  },
  {
    id: 'mono-pop',
    name: 'Mono Pop',
    filter: 'grayscale(1) contrast(1.22) brightness(1.03)',
    sky: ['#ffffff', 0.10],
    ground: ['#ff2e88', 0.30],
    duotone: ['#12041f', '#ffe3f0'],
    vignette: 0.36,
    title: { fill: '#ffffff', outline: '#12041f', glow: '#ff2e88', sub: '#ff8fab' },
    frame: '#12041f',
  },
];

/** Look a grade up by id; falls back to Vice Sunset for unknown ids. */
export function getGradePreset(id) {
  return GRADE_PRESETS.find((g) => g.id === id) ?? GRADE_PRESETS[0];
}

/** The three post sizes the studio exports. */
export const EXPORT_SIZES = [
  { id: 'square', name: 'Square · 1080 x 1080', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait · 1080 x 1350', w: 1080, h: 1350 },
  { id: 'wide', name: 'Wide · 1920 x 1080', w: 1920, h: 1080 },
];

/** Look an export size up by id; falls back to Square. */
export function getExportSize(id) {
  return EXPORT_SIZES.find((s) => s.id === id) ?? EXPORT_SIZES[0];
}
