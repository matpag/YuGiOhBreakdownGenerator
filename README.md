# Deck Breakdown Maker

## Interface languages

The complete interface supports English, Italiano, Deutsch, Español and Français through React dictionaries in `src/i18n/locales/`. Use the compact language selector in the header. Initial language priority is a valid `ui_lang` URL parameter, then `retroformats-ui-language` in localStorage, then the first supported entry in `navigator.languages`, then English. Supported URL/storage values are exactly `en`, `it`, `de`, `es`, `fr`; storage access failures do not prevent editing.

Changing language saves the preference, updates the HTML language and the current URL with `history.replaceState`, and preserves other query parameters, hashes and history state. The suite navigation carries `ui_lang` to the destination. Translations cover labels, accessible names, tooltips, dialogs, errors, file-picker descriptions, font-weight controls and zoom. Existing errors use message descriptors so they update with the selected language.

Project content, user filenames and names, font-family names, `.dhbreakdown` data, chart coordinates and the PNG renderer are independent of interface language. Switching language keeps the current project, numeric drafts, selections, theme and output. Native browser/file-picker chrome follows the browser or operating-system language; app-supplied descriptions are translated.

Run `npm run test:i18n` for dictionary/placeholder completeness, language resolution, storage failure handling, URL propagation, error descriptors and untranslated JSX detection, then `npm run build`. Browser verification should also switch all five languages with an edited project, reload to verify preference precedence, exercise dialogs/errors and compare PNG output across languages and both existing themes.

Live demo: https://matpag.github.io/YuGiOhBreakdownGenerator/

Deck Breakdown Maker is a browser-based editor for creating Yu-Gi-Oh deck breakdown graphics. It runs locally in your browser, lets you build a reusable project, and exports the final composition as a PNG.

Use the toolbar at the top to open projects, save projects, save copies, preview the exported PNG, export the PNG, and switch theme.

## Retroformats handoff (2026-10-17)

Continue work in this repository on `main`. The visual alignment is committed here and published on GitHub Pages; the portal's `.local/worktrees/` directories were temporary implementation copies. The canonical kit and cross-app verification report live in the sibling `YuGiOh Retroformatsdotcom/design-system/` and `YuGiOh Retroformatsdotcom/docs/visual-alignment-verification.md`.

Probability Calculator is the interface style reference. Serve the shared CSS and mark from `public/retroformats/` unchanged; put app-specific styling in `src/styles.css`. The header links to the portal and its four shortlinks. Existing Light/Dark modes remain available; coral selection overlays apply only in Dark and are excluded from PNG output. The desktop editor keeps its 1180px minimum width.

Verification passed TypeScript/Vite build (`npm run build`) and the suite's 13 browser tests / 101 consistency checks, including comparison of the existing Light palette with the previous version. The 1080×1080 sample PNG was identical pixel for pixel. Preserve project archives, chart geometry, embedded fonts and document rendering when changing interface styling.

## Top Toolbar

### Open Project

Use the folder button to load a saved `.dhbreakdown` file. The project file restores the canvas settings, title, chart, slices, uploaded images, image library, and embedded fonts.

In Chrome and Edge, the app remembers the opened local file so Save can write back to it directly.

### Save Project

Use the floppy disk button to save the current project.

In Chrome and Edge, if the project was opened through the app's file picker, Save overwrites the same local `.dhbreakdown` file. If direct overwrite is not available, the app downloads a new copy instead.

### Save Project As

Use the Save As button to choose a new destination or filename for the current project.

In browsers that do not support direct file writing, Save As downloads a new `.dhbreakdown` copy.

### Preview PNG

Use the eye button to open a dialog showing the exact PNG render that will be exported. Editor-only outlines, handles, and selection overlays are hidden in the preview.

The preview dialog includes:

- Download button: downloads the previewed PNG.
- Close button: closes the dialog.
- Backdrop click or `Esc`: closes the dialog.

### Export PNG

Use the download button to export the final image directly as a PNG. The export uses the original canvas size, not the current zoom level.

### Theme

Use the Light/Dark button to switch the editor theme. This only affects the editor interface, not the exported image.

## Preview Area

The center panel shows the editable canvas.

### Zoom Controls

Use the zoom toolbar to change how the canvas is displayed while editing:

- `Fill`: fits the canvas into the available preview area.
- Preset percentages: switch to a fixed zoom level.
- Custom zoom input: type a custom zoom percentage.

Zoom only changes the editor view. It does not change the exported PNG dimensions.

### Selecting Slices

Click a pie slice to select it. The editor-only outline is coral in Dark and retains its original red in Light.

### Selecting Labels

Click a slice label to select and edit its text box. Selection handles are editor-only and are hidden from preview/export.

### Moving Slice Images

Click a slice image layer to select it. Drag the image to reposition it. When selected, the image can be dragged from its full transform rectangle, even when part of that rectangle extends outside the slice.

Clicking another slice through the selected image bounds still selects the slice underneath.

### Resizing Slice Images

Use the selected image handles to resize the image while preserving its ratio. You can also use the mouse wheel over the selected slice/image to zoom the active slice image layer.

## Left Editor Panel

The left panel controls the canvas, title, static images, embedded fonts, chart, slices, and selected slice details. Use the collapse button at the top to hide or show this panel.

### Canvas

Set the output canvas width and height. These values define the final PNG dimensions.

### Title

Edit the title shown at the top of the canvas.

Title controls:

- Text: changes the title content.
- Font: chooses a system or embedded font.
- Font weight: sets the title weight.
- Size: changes the title font size.
- Text color: sets the title fill color.
- Stroke color: sets the title outline color.
- Stroke width: sets the title outline thickness.
- Y: moves the title vertically.

### Static Images

Upload a background image. The background fills the canvas.

Uploaded images are also added to the image library so they can be reused later.

### Embedded Fonts

Upload `.ttf`, `.otf`, `.woff`, or `.woff2` font files. Embedded fonts are saved inside the project file and become available in the title and label font controls.

### Chart

Control the pie chart layout and label style.

Chart controls:

- X: horizontal chart position.
- Y: vertical chart position.
- Radius: chart size.
- Chart stroke width: outline thickness around slices.
- Label font: font used by slice labels.
- Label font weight: label text weight.
- Label size: label font size.
- Label text color: label fill color.
- Label stroke color: label outline color.
- Label stroke width: label outline thickness.

### Slices

Use this section to manage chart slices.

Slice controls:

- Add: creates a new slice.
- Remove: removes the selected slice.
- Slice list: selects a slice and shows its current value.

Slice values determine the relative size of each pie wedge.

### Selected Slice

This section appears when a slice is selected.

Selected slice controls:

- Label: changes the slice label text.
- Slice value: changes the slice's chart weight.
- Label distance: controls the default label placement distance from the chart.
- Reset label box: removes a manually moved/resized label box and returns it to automatic placement.

### Slice Images

Each slice can contain multiple image layers.

Layer controls:

- Add image: creates another image layer for the selected slice.
- Layer row: selects an image layer.
- Upload: assigns an uploaded image to that layer.
- Move down/up: changes layer order.
- Remove: deletes the layer when more than one layer exists.

Selected image layer controls:

- Scale: changes image scale.
- Rotation: changes image rotation.
- X: moves the image horizontally within the chart coordinate space.
- Y: moves the image vertically within the chart coordinate space.

## Right Image Library Panel

The right panel stores uploaded images for reuse. Use the collapse button at the top to hide or show this panel.

### Upload Images

Upload one or more image files into the library. Library images are saved with the project.

### Search

Use the search field to filter images by library name or original filename.

### Rename

Use the pencil button on an image card to rename a library item.

### Use as Background

Use the background button on an image card to apply that image as the canvas background.

### Use in Slice

Use the slice button on an image card to assign that image to the currently selected slice image layer.

### Remove

Use the trash button to remove a library item. If an asset is still used by the project, the library item can be removed while the underlying asset remains available to the existing reference.

## Project Files

Projects are saved as `.dhbreakdown` files. A project file contains:

- Canvas settings
- Title settings
- Background image reference
- Chart geometry
- Slice labels and values
- Slice image layers and transforms
- Image library entries
- Embedded fonts
- Uploaded asset files

Use project files when you want to keep editing later or reuse a breakdown template.

## Export Notes

Preview and Export use the same render path. Both hide editor-only overlays before rendering.

The exported PNG uses the canvas dimensions configured in the Canvas section, regardless of editor zoom.

## Breakdown quick-start guide (2026-10-20)

Use **Guide** in the header for an inline five-step lesson: example, title, counts, images and export. It stays open while the canvas and both sidebars remain interactive. Opening, changing steps and closing the guide do not edit the document. The guide is translated into all five interface languages. Closing it returns focus to the header button; Show controls expands the relevant sidebar, scrolls to the section and focuses its heading.

**Load example** asks before replacing the current editor document. Fetching/decoding the local background completes before the document is replaced; failure leaves the current document intact. The loaded example clears any previous writable file handle, so saving it cannot overwrite a previously opened community template. Save As produces a separate `.dhbreakdown` file.

The original 1080 × 1080 background is in `public/guide/breakdown-background-1080.png` and can be downloaded from the guide. `src/data/guideExample.ts` builds a self-contained demo with three archetypes (4 + 3 + 1 = 8 players), three original geometric SVG placeholders and system fonts. It loads without an artwork API or a community template download. Project text and images remain independent of the interface language. The existing default document, archive format and PNG renderer are unchanged.

Run `node scripts/check-guide.mjs`, `npm run test:i18n` and `npm run build`. Browser verification should cover all steps, both themes, collapsed sidebar navigation, cancellation/retry when loading, project preservation when changing language, preview/export equality, and Save As/reopen of the demo. Asset provenance and generation prompt are in `docs/guide-background.md`.

### Verification status of the initial guide draft

The 2026-10-20 checks passed for five complete dictionaries (177 messages), TypeScript/Vite production build, all five copies of the shared suite assets, exact background dimensions, self-contained example archive export/import and independence from the default document. The initial inline guide layout was inspected in the browser at 1280 × 720.

Interactive verification of the final guide remains pending: an early native confirmation blocked the Codex in-app browser. It has been replaced with an application dialog with cancel, Escape, focus return and Tab handling, but loading the example, both themes, sidebar navigation and PNG comparison must still be exercised in an unblocked browser before release. No original community template was changed. Keep this change as a draft until those checks are completed.
