// PanelLayoutEngine — the six poster layouts of Vice Cover Studio.
//
// Every layout is a pure function of the canvas size (W, H) that returns the
// panel rectangles (fractions of the canvas, scaled to pixels), the title
// zone and the badge corner. The same layout code draws the live preview and
// the exported PNG, so what you see is what you share. Layouts adapt to all
// three post sizes (1080x1080, 1080x1350, 1920x1080) because every rect is
// derived from W and H, never hard-coded pixels.
//
// Panel rects carry an optional `rot` (radians) for the tilted layouts and an
// optional `title` flag: the nine-panel grid reserves its centre cell for the
// halftone title block instead of a photo.

/** Clamp helper shared by the layout math. */
function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

/** Scale a normalised rect {x, y, w, h} (fractions of the canvas) to pixels. */
function scaleRect(r, W, H) {
  return { x: r.x * W, y: r.y * H, w: r.w * W, h: r.h * H, rot: r.rot ?? 0, title: r.title ?? false };
}

/**
 * Hero Grid — the GTA poster classic: one big hero panel, three small panels
 * stacked beside it, title band along the foot. 4 photo panels.
 */
function heroGrid(W, H) {
  const titleH = clamp(0.16 * H, 90, 260);
  const bodyH = H - titleH;
  const gap = Math.max(6, W * 0.008);
  const heroW = W * 0.615 - gap;
  const colX = W * 0.615 + gap;
  const colW = W - colX;
  const smallH = (bodyH - gap * 2) / 3;
  return {
    id: 'hero-grid',
    name: 'Hero Grid',
    panels: [
      { x: 0, y: 0, w: heroW, h: bodyH },
      { x: colX, y: 0, w: colW, h: smallH },
      { x: colX, y: smallH + gap, w: colW, h: smallH },
      { x: colX, y: (smallH + gap) * 2, w: colW, h: smallH },
    ].map((r) => scaleRect(r, 1, 1)),
    title: { x: W * 0.04, y: bodyH + titleH * 0.06, w: W * 0.92, h: titleH * 0.88, align: 'left' },
    badge: { x: W * 0.97, y: H * 0.03, align: 'right' },
    frame: true,
  };
}

/**
 * Nine Panel — a 3x3 cover grid; the centre cell is the halftone title block.
 * 8 photo panels, the densest poster in the studio.
 */
function ninePanel(W, H) {
  const gap = Math.max(5, Math.min(W, H) * 0.008);
  const cw = (W - gap * 2) / 3;
  const ch = (H - gap * 2) / 3;
  const panels = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x = col * (cw + gap);
      const y = row * (ch + gap);
      if (row === 1 && col === 1) {
        panels.push({ x, y, w: cw, h: ch, title: true });
      } else {
        panels.push({ x, y, w: cw, h: ch });
      }
    }
  }
  return {
    id: 'nine-panel',
    name: 'Nine Panel',
    panels: panels.map((r) => scaleRect(r, 1, 1)),
    title: { x: cw + gap, y: ch + gap, w: cw, h: ch, align: 'center', inset: true },
    badge: { x: W * 0.97, y: H * 0.025, align: 'right' },
    frame: true,
  };
}

/**
 * Tilted Snapshots — four polaroid-style panels tilted a few degrees over a
 * gradient backdrop, overlapping like photos tossed on a table. 4 panels.
 */
function tiltedSnapshots(W, H) {
  const titleH = clamp(0.2 * H, 90, 260);
  const bodyH = H - titleH;
  const pw = W * 0.46;
  const ph = bodyH * 0.52;
  return {
    id: 'tilted-snapshots',
    name: 'Tilted Snapshots',
    panels: [
      { x: W * 0.04, y: bodyH * 0.03, w: pw, h: ph, rot: -0.055 },
      { x: W * 0.50, y: bodyH * 0.06, w: pw, h: ph, rot: 0.045 },
      { x: W * 0.07, y: bodyH * 0.47, w: pw, h: ph, rot: 0.05 },
      { x: W * 0.47, y: bodyH * 0.44, w: pw, h: ph, rot: -0.04 },
    ].map((r) => scaleRect(r, 1, 1)),
    title: { x: W * 0.05, y: bodyH + titleH * 0.08, w: W * 0.9, h: titleH * 0.84, align: 'left' },
    badge: { x: W * 0.96, y: H * 0.03, align: 'right' },
    backdrop: true,
    frame: true,
  };
}

/**
 * Full Bleed — one photo edge to edge with a scrimmed title band. 1 panel.
 */
function fullBleed(W, H) {
  const titleH = clamp(0.24 * H, 110, 320);
  return {
    id: 'full-bleed',
    name: 'Full Bleed',
    panels: [{ x: 0, y: 0, w: W, h: H }].map((r) => scaleRect(r, 1, 1)),
    title: { x: W * 0.05, y: H - titleH + titleH * 0.1, w: W * 0.9, h: titleH * 0.8, align: 'left' },
    badge: { x: W * 0.96, y: H * 0.035, align: 'right' },
    scrim: true,
    frame: true,
  };
}

/**
 * Comic Strip — three horizontal bands, alternating a slight tilt, title bar
 * across the top. 3 photo panels.
 */
function comicStrip(W, H) {
  const titleH = clamp(0.16 * H, 80, 220);
  const bodyY = titleH;
  const bodyH = H - titleH;
  const gap = Math.max(5, H * 0.006);
  const sh = (bodyH - gap * 2) / 3;
  return {
    id: 'comic-strip',
    name: 'Comic Strip',
    panels: [
      { x: W * 0.01, y: bodyY, w: W * 0.98, h: sh, rot: -0.008 },
      { x: W * 0.01, y: bodyY + sh + gap, w: W * 0.98, h: sh, rot: 0.008 },
      { x: W * 0.01, y: bodyY + (sh + gap) * 2, w: W * 0.98, h: sh, rot: -0.008 },
    ].map((r) => scaleRect(r, 1, 1)),
    title: { x: W * 0.04, y: titleH * 0.08, w: W * 0.92, h: titleH * 0.84, align: 'left' },
    badge: { x: W * 0.97, y: H * 0.945, align: 'right' },
    frame: true,
  };
}

/**
 * Diptych Duo — two tall panels side by side, title band along the foot.
 * The landscape favourite for 1920x1080. 2 photo panels.
 */
function diptychDuo(W, H) {
  const titleH = clamp(0.19 * H, 90, 260);
  const bodyH = H - titleH;
  const gap = Math.max(6, W * 0.01);
  const pw = (W - gap) / 2;
  return {
    id: 'diptych-duo',
    name: 'Diptych Duo',
    panels: [
      { x: 0, y: 0, w: pw, h: bodyH },
      { x: pw + gap, y: 0, w: pw, h: bodyH },
    ].map((r) => scaleRect(r, 1, 1)),
    title: { x: W * 0.04, y: bodyH + titleH * 0.06, w: W * 0.92, h: titleH * 0.88, align: 'left' },
    badge: { x: W * 0.97, y: H * 0.03, align: 'right' },
    frame: true,
  };
}

/** Every layout the studio offers, in the order the picker shows them. */
export const PANEL_LAYOUTS = [
  { id: 'hero-grid', name: 'Hero Grid', panels: 4, build: heroGrid },
  { id: 'nine-panel', name: 'Nine Panel', panels: 8, build: ninePanel },
  { id: 'tilted-snapshots', name: 'Tilted Snapshots', panels: 4, build: tiltedSnapshots },
  { id: 'full-bleed', name: 'Full Bleed', panels: 1, build: fullBleed },
  { id: 'comic-strip', name: 'Comic Strip', panels: 3, build: comicStrip },
  { id: 'diptych-duo', name: 'Diptych Duo', panels: 2, build: diptychDuo },
];

/** Look a layout up by id; falls back to Hero Grid for unknown ids. */
export function getPanelLayout(id) {
  return PANEL_LAYOUTS.find((l) => l.id === id) ?? PANEL_LAYOUTS[0];
}

/** Build the panel geometry for a layout id at canvas size W x H. */
export function buildPanelGeometry(layoutId, W, H) {
  return getPanelLayout(layoutId).build(W, H);
}
