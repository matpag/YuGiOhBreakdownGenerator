# Deck Breakdown Maker

Local-only desktop web app for generating Yu-Gi-Oh retroformat deck breakdown graphics from reusable templates.

## Stack

- Vite
- React
- TypeScript
- Konva / react-konva
- Zustand
- JSZip
- Zod

## Branch Workflow

This repository uses a lightweight branch model:

- `main`: stable current branch
- `feature/...` or `codex/...`: focused work branches created from `main`
- Open pull requests from feature branches into `main`
- Run `npm run build` and the relevant manual QA before merging
- Delete merged feature branches when they are no longer needed

## Local Setup

```bash
npm install
npm run dev
```

## Project Files

Breakdown projects use a ZIP-based `.dhbreakdown` file:

```txt
manifest.json
assets/
  <asset-id>.png
  <asset-id>.webp
```

The manifest is JSON with `format: "dhbreakdown"` and `version: 1`. It stores the project canvas, title, background/logo asset references, chart geometry, slice values, labels, per-slice image transforms, and an asset table. Asset table entries keep the in-app asset id, original filename, MIME type, and ZIP path; the asset bytes live under `assets/*` and are restored to in-memory `dataUrl`s on import.

## MVP Workflow

1. Create or open a project.
2. Upload a background.
3. Edit title text.
4. Add chart slices and set values.
5. Upload an image for each slice.
6. Export the final PNG at the original canvas size.

## Embedded Fonts

Font files can be uploaded into a project from the Embedded Fonts panel. Uploaded `.ttf`, `.otf`, `.woff`, and `.woff2` files are saved inside the `.dhbreakdown` archive under `fonts/`, registered with the browser through `FontFace`, and become available in the title and pie-label font dropdowns after the project is loaded.

## Starter Layout

The default project starts at `1600x1600`, matching the provided breakdown images. The title is centered near the top, the chart is centered lower on the canvas at `x: 800`, `y: 900`, with a `540px` radius, and the logo placeholder sits in the lower-right area.

## Manual QA

- Run `npm run dev` and confirm the editor opens without a backend.
- Upload a background and logo, then verify both render on the canvas.
- Add, remove, select, and edit slices; slice values should change wedge sizes.
- Upload a slice image and adjust its scale, rotation, X, and Y controls.
- Save a `.dhbreakdown`, reload it with Open, and confirm images and edits return.
- Export PNG and confirm the downloaded image is `1600x1600`.

## Future Improvements

- Named templates for Tengu, GOAT, Edison, and other recurring formats.
- Drag handles for title, logo, chart, and label positioning.
- Better image-fit presets per slice.
- Optional font loading for a closer match to the sample outlined title style.
