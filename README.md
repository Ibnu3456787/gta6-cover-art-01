# Vice Cover Studio — GTA-style cover art maker

Turn your photos and a caption into multi-panel GTA-style cover art with a
Vice City sunset or neon grade — offline, free, no upload, no watermark.
Export a PNG in 1080×1080, 1080×1350 or 1920×1080 in three steps: load a
photo, tweak the cover, export.

Built for the make.fun bounty **gta6-cover-art-01** ("Make GTA 6 Cover Art").

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request: `app/` is plain static files. Three
sample photos are preloaded so the first thing you see is a finished cover.

## Why it wins

**The art.** Six poster layouts, six colour grades, Anton display lettering
with a neon-glow outline, a Pacifico script subtitle, a five-star heat
meter, a tilted badge ribbon, film grain, vignette and a halftone title
block. The cover on screen *is* the export — the preview and the PNG run
the same `drawCoverArt` code at the same backing size.

**Any photo.** Up to 9 photos (your own files, read on your machine, never
uploaded). Click any panel to edit it: drag the photo to move it, scroll to
zoom, or use the sliders. Every panel takes its own photo — or switch on
Split Poster and one photo tiles across every panel like a poster cut into
pieces. The caption, subtitle, badge and heat are all editable, with
one-click presets.

**Fast and easy.** Three steps from photo to PNG. One click exports the
current size; one more exports all three post sizes at once.

**Polish.** A dark neon editor with a live preview, undo/redo (Ctrl+Z /
Ctrl+Y), a "Surprise me" shuffle, and a clean empty-panel state when a
photo is missing.

## The named systems

| System | File | What it does |
| --- | --- | --- |
| PanelLayoutEngine | `app/src/layouts.js` | 6 layouts (Hero Grid, Nine Panel, Tilted Snapshots, Full Bleed, Comic Strip, Diptych Duo), each a pure function of canvas size, so every layout works at every post size |
| GradePresetLibrary | `app/src/grades.js` | 6 grades (Vice Sunset, Neon Night, Pastel Day, Golden Hour, Teal Noir, Mono Pop) — filter + sky/ground washes + lettering palette |
| CoverEngine | `app/src/cover.js` | `drawCoverArt`: panels, grades, lettering, effects — one renderer for preview and export |
| LetteringEngine | `app/src/cover.js` | Anton title, auto-fit to one or two balanced lines, outlined + neon glow; Pacifico subtitle |
| SplitPosterMode | `app/src/cover.js` | One photo tiled across every panel by its position on the cover |
| PosterEffects | `app/src/cover.js` | Deterministic film grain (seeded PRNG), vignette, halftone title block, HeatMeter stars, BadgeRibbon |
| CoverState + HistoryStack | `app/src/state.js` | Plain-JSON state, 60-deep undo/redo |
| PhotoTray / PanelPicker / ExportEngine | `app/src/main.js` | Photo management, click/drag/wheel panel editing, one-click PNG export |

## Screenshots

Four real renders of this app, taken in headless Chromium (see
`shots.json` for the scenes):

1. `1-cover.jpg` — a Wide 1920×1080 cover, Hero Grid, Vice Sunset
2. `2-editor.jpg` — the editor with photos loaded
3. `3-cover-portrait.jpg` — a Portrait 1080×1350 cover, Nine Panel, Neon Night
4. `4-cover-square.jpg` — a Square 1080×1080 cover, Tilted Snapshots, Golden Hour

## Originality

Everything here is original or openly licensed. The fonts (Anton and
Pacifico) are vendored under the SIL Open Font License — see
`app/fonts/OFL.txt`. The five sample photos were made with an image model
for this entry; they show fictional people. No Rockstar Games logo,
wordmark, official artwork, character or font is used anywhere, and this
project is not affiliated with Rockstar Games.

## Handing it in

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to `/output` and writes `/output/dossier.json` with the kit's vendored
library (`vendor/makefun-app.ts`, copied unchanged):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see `LICENSE`. Fonts under the SIL Open Font License 1.1
(`app/fonts/OFL.txt`).
