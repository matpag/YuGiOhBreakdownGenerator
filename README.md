# Deck Breakdown Maker

Live demo: https://matpag.github.io/YuGiOhBreakdownGenerator/

Deck Breakdown Maker is a browser-based editor for creating Yu-Gi-Oh deck breakdown graphics. It runs locally in your browser, lets you build a reusable project, and exports the final composition as a PNG.

Use the toolbar at the top to open projects, save projects, preview the exported PNG, export the PNG, and switch theme.

## Top Toolbar

### Open Project

Use the folder button to load a saved `.dhbreakdown` file. The project file restores the canvas settings, title, chart, slices, uploaded images, image library, and embedded fonts.

### Save Project

Use the archive button to download the current project as a `.dhbreakdown` file. Save this when you want to continue editing later.

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

Click a pie slice to select it. The selected slice gets a red outline in the editor only.

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
