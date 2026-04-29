import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Minus, Plus, Trash2 } from "lucide-react";
import { fileToAsset, validateImageFile } from "../lib/assets";
import {
  FONT_FILE_ACCEPT,
  inferFontFamilyFromFileName,
  registerEmbeddedFont,
} from "../lib/fonts";
import { DEFAULT_LABEL_DISTANCE } from "../lib/geometry";
import { useProjectStore } from "../store/projectStore";

const FALLBACK_FONT_OPTIONS = [
  "Berlin Sans FB",
  "Arial Black",
  "Arial",
  "Calibri",
  "Cambria",
  "Comic Sans MS",
  "Courier New",
  "Georgia",
  "Impact",
  "Inter",
  "Segoe UI",
  "Tahoma",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
];

interface LocalFontData {
  family: string;
}

interface DraftNumberInputProps {
  min?: number;
  onCommit: (value: number) => void;
  step?: number;
  value: number;
}

declare global {
  interface Window {
    queryLocalFonts?: () => Promise<LocalFontData[]>;
  }
}

export function EditorSidebar() {
  const project = useProjectStore((state) => state.project);
  const assets = useProjectStore((state) => state.assets);
  const updateCanvas = useProjectStore((state) => state.updateCanvas);
  const setTitle = useProjectStore((state) => state.setTitle);
  const updateTitle = useProjectStore((state) => state.updateTitle);
  const updatePieChart = useProjectStore((state) => state.updatePieChart);
  const addSlice = useProjectStore((state) => state.addSlice);
  const removeSelectedSlice = useProjectStore((state) => state.removeSelectedSlice);
  const updateSlice = useProjectStore((state) => state.updateSlice);
  const updateSliceImageLayerTransform = useProjectStore(
    (state) => state.updateSliceImageLayerTransform,
  );
  const setSelectedSliceImageLayer = useProjectStore((state) => state.setSelectedSliceImageLayer);
  const addSliceImageLayer = useProjectStore((state) => state.addSliceImageLayer);
  const removeSliceImageLayer = useProjectStore((state) => state.removeSliceImageLayer);
  const moveSliceImageLayer = useProjectStore((state) => state.moveSliceImageLayer);
  const setSliceImageLayerAsset = useProjectStore((state) => state.setSliceImageLayerAsset);
  const addAsset = useProjectStore((state) => state.addAsset);
  const addEmbeddedFont = useProjectStore((state) => state.addEmbeddedFont);
  const addImageLibraryItem = useProjectStore((state) => state.addImageLibraryItem);
  const setBackgroundAsset = useProjectStore((state) => state.setBackgroundAsset);
  const setSliceAsset = useProjectStore((state) => state.setSliceAsset);
  const setSelectedSlice = useProjectStore((state) => state.setSelectedSlice);
  const [fontOptions, setFontOptions] = useState(() =>
    mergeFontOptions([
      ...FALLBACK_FONT_OPTIONS,
      ...project.fonts.map((font) => font.family),
      project.title.fontFamily,
      project.pieChart.labelStyle.fontFamily,
    ]),
  );
  const [fontAccessRequested, setFontAccessRequested] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  useEffect(() => {
    setFontOptions((currentOptions) =>
      mergeFontOptions([
        ...currentOptions,
        ...project.fonts.map((font) => font.family),
        project.title.fontFamily,
        project.pieChart.labelStyle.fontFamily,
      ]),
    );
  }, [project.fonts, project.title.fontFamily, project.pieChart.labelStyle.fontFamily]);

  async function loadSystemFonts() {
    if (fontAccessRequested || !window.queryLocalFonts) {
      return;
    }

    setFontAccessRequested(true);

    try {
      const localFonts = await window.queryLocalFonts();
      setFontOptions((currentOptions) =>
        mergeFontOptions([
          ...currentOptions,
          ...localFonts.map((font) => font.family),
          ...project.fonts.map((font) => font.family),
          project.title.fontFamily,
          project.pieChart.labelStyle.fontFamily,
        ]),
      );
    } catch {
      setFontOptions((currentOptions) =>
        mergeFontOptions([
          ...currentOptions,
          ...project.fonts.map((font) => font.family),
          project.title.fontFamily,
          project.pieChart.labelStyle.fontFamily,
        ]),
      );
    }
  }

  async function handleAssetUpload(
    file: File | undefined,
    target: "background" | "slice",
    sliceId?: string,
    layerId?: string,
  ) {
    if (!file) {
      return;
    }

    const error = validateImageFile(file);

    if (error) {
      setImageUploadError(error);
      return;
    }

    setImageUploadError(null);

    const asset = await fileToAsset(file);
    const assetId = addAsset(asset);
    addImageLibraryItem({
      id: crypto.randomUUID(),
      assetId,
      name: asset.name,
      createdAt: new Date().toISOString(),
    });

    if (target === "background") {
      setBackgroundAsset(assetId);
    }

    if (target === "slice" && sliceId && layerId) {
      setSliceImageLayerAsset(sliceId, layerId, assetId);
    } else if (target === "slice" && sliceId) {
      setSliceAsset(sliceId, assetId);
    }
  }

  async function handleFontUpload(file: File | undefined) {
    if (!file) {
      return;
    }

    const inferredFamily = inferFontFamilyFromFileName(file.name);
    const family = window.prompt("Font family name", inferredFamily)?.trim();

    if (!family) {
      return;
    }

    const asset = await fileToAsset(file);
    const assetId = addAsset(asset);
    const embeddedFont = {
      id: crypto.randomUUID(),
      family,
      assetId,
    };

    addEmbeddedFont(embeddedFont);
    await registerEmbeddedFont(embeddedFont, asset);
    setFontOptions((currentOptions) => mergeFontOptions([...currentOptions, family]));
  }

  const backgroundAsset = project.background.assetId ? assets[project.background.assetId] : null;
  const selectedSlice =
    project.pieChart.slices.find((slice) => slice.id === project.pieChart.selectedSliceId) ?? null;
  const selectedSliceImageLayer =
    selectedSlice?.imageLayers.find((layer) => layer.id === selectedSlice.selectedImageLayerId) ??
    selectedSlice?.imageLayers[0] ??
    null;

  return (
    <aside className="sidebar">
      <section className="panel">
        <h2>Canvas</h2>
        <div className="field-row">
          <label>
            Width
            <DraftNumberInput
              min={1}
              step={1}
              value={project.canvas.width}
              onCommit={(width) => updateCanvas({ width: Math.round(width) })}
            />
          </label>
          <label>
            Height
            <DraftNumberInput
              min={1}
              step={1}
              value={project.canvas.height}
              onCommit={(height) => updateCanvas({ height: Math.round(height) })}
            />
          </label>
        </div>
      </section>

      <section className="panel">
        <h2>Title</h2>
        <label>
          Text
          <textarea value={project.title.text} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <div className="field-row">
          <label>
            Font
            <select
              value={project.title.fontFamily}
              onFocus={loadSystemFonts}
              onPointerDown={loadSystemFonts}
              onChange={(event) => updateTitle({ fontFamily: event.target.value })}
            >
              {fontOptions.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </label>
          <label>
            Size
            <DraftNumberInput
              min={8}
              value={project.title.fontSize}
              onCommit={(fontSize) =>
                updateTitle({
                  fontSize,
                })
              }
            />
          </label>
        </div>
        <div className="field-row">
          <label>
            Text color
            <input
              className="color-input"
              type="color"
              value={project.title.fill}
              onChange={(event) => updateTitle({ fill: event.target.value })}
            />
          </label>
          <label>
            Stroke color
            <input
              className="color-input"
              type="color"
              value={project.title.stroke}
              onChange={(event) => updateTitle({ stroke: event.target.value })}
            />
          </label>
        </div>
        <div className="field-row">
          <label>
            Stroke width
            <DraftNumberInput
              min={0}
              value={project.title.strokeWidth}
              onCommit={(strokeWidth) =>
                updateTitle({
                  strokeWidth,
                })
              }
            />
          </label>
          <label>
            Y
            <DraftNumberInput
              value={project.title.y}
              onCommit={(y) =>
                updateTitle({
                  y,
                })
              }
            />
          </label>
        </div>
      </section>

      <section className="panel">
        <h2>Static Images</h2>
        {imageUploadError ? <p className="field-error">{imageUploadError}</p> : null}
        <div className="asset-control">
          <span>
            Background
            <small>{backgroundAsset?.name ?? "No image selected"}</small>
          </span>
          <label className="file-button">
            <ImagePlus size={16} />
            Upload
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                handleAssetUpload(event.target.files?.[0], "background");
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </section>

      <section className="panel">
        <h2>Embedded Fonts</h2>
        <div className="asset-control">
          <span>
            Project fonts
            <small>
              {project.fonts.length > 0
                ? project.fonts.map((font) => font.family).join(", ")
                : "No embedded fonts"}
            </small>
          </span>
          <label className="file-button">
            <ImagePlus size={16} />
            Upload
            <input
              type="file"
              accept={FONT_FILE_ACCEPT}
              onChange={(event) => {
                handleFontUpload(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </section>

      <section className="panel">
        <h2>Chart</h2>
        <div className="field-row">
          <label>
            X
            <DraftNumberInput
              value={project.pieChart.x}
              onCommit={(x) => updatePieChart({ x })}
            />
          </label>
          <label>
            Y
            <DraftNumberInput
              value={project.pieChart.y}
              onCommit={(y) => updatePieChart({ y })}
            />
          </label>
        </div>
        <label>
          Radius
          <DraftNumberInput
            min={80}
            value={project.pieChart.radius}
            onCommit={(radius) =>
              updatePieChart({
                radius,
              })
            }
          />
        </label>
        <div className="field-row">
          <label>
            Label font
            <select
              value={project.pieChart.labelStyle.fontFamily}
              onFocus={loadSystemFonts}
              onPointerDown={loadSystemFonts}
              onChange={(event) =>
                updatePieChart({
                  labelStyle: {
                    ...project.pieChart.labelStyle,
                    fontFamily: event.target.value,
                  },
                })
              }
            >
              {fontOptions.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </label>
          <label>
            Label size
            <DraftNumberInput
              min={1}
              value={project.pieChart.labelStyle.fontSize}
              onCommit={(fontSize) =>
                updatePieChart({
                  labelStyle: {
                    ...project.pieChart.labelStyle,
                    fontSize,
                  },
                })
              }
            />
          </label>
        </div>
        <div className="field-row">
          <label>
            Label text color
            <input
              className="color-input"
              type="color"
              value={project.pieChart.labelStyle.fill}
              onChange={(event) =>
                updatePieChart({
                  labelStyle: {
                    ...project.pieChart.labelStyle,
                    fill: event.target.value,
                  },
                })
              }
            />
          </label>
          <label>
            Label stroke color
            <input
              className="color-input"
              type="color"
              value={project.pieChart.labelStyle.stroke}
              onChange={(event) =>
                updatePieChart({
                  labelStyle: {
                    ...project.pieChart.labelStyle,
                    stroke: event.target.value,
                  },
                })
              }
            />
          </label>
        </div>
        <label>
          Label stroke width
          <DraftNumberInput
            min={0}
            value={project.pieChart.labelStyle.strokeWidth}
            onCommit={(strokeWidth) =>
              updatePieChart({
                labelStyle: {
                  ...project.pieChart.labelStyle,
                  strokeWidth,
                },
              })
            }
          />
        </label>
      </section>

      <section className="panel">
        <h2>Slices</h2>
        <div className="topbar-actions">
          <button type="button" onClick={addSlice}>
            <Plus size={16} />
            Add
          </button>
          <button type="button" onClick={removeSelectedSlice} disabled={!selectedSlice}>
            <Minus size={16} />
            Remove
          </button>
        </div>
        <div className="slice-list">
          {project.pieChart.slices.map((slice) => (
            <button
              className={`slice-row ${
                project.pieChart.selectedSliceId === slice.id ? "slice-row-active" : ""
              }`}
              key={slice.id}
              type="button"
              onClick={() => setSelectedSlice(slice.id)}
            >
              <span>{slice.label}</span>
              <strong>{slice.value}</strong>
            </button>
          ))}
        </div>
      </section>

      {selectedSlice ? (
        <section className="panel">
          <h2>Selected Slice</h2>
          <label>
            Label
            <input
              value={selectedSlice.label}
              onChange={(event) => updateSlice(selectedSlice.id, { label: event.target.value })}
            />
          </label>
          <label>
            Slice value
            <DraftNumberInput
              min={1}
              value={selectedSlice.value}
              onCommit={(value) =>
                updateSlice(selectedSlice.id, {
                  value,
                })
              }
            />
          </label>
          <label>
            Label distance
            <DraftNumberInput
              min={0}
              value={selectedSlice.labelDistance ?? DEFAULT_LABEL_DISTANCE}
              onCommit={(labelDistance) =>
                updateSlice(selectedSlice.id, {
                  labelDistance,
                })
              }
            />
          </label>
          <div className="slice-layer-header">
            <h3>Slice Images</h3>
            <button
              type="button"
              onClick={() => addSliceImageLayer(selectedSlice.id)}
            >
              <Plus size={16} />
              Add image
            </button>
          </div>
          <div className="slice-layer-list">
            {selectedSlice.imageLayers.map((layer, index) => {
              const layerAsset = layer.assetId ? assets[layer.assetId] : null;

              return (
                <div
                  className={`slice-layer-row ${
                    selectedSliceImageLayer?.id === layer.id ? "slice-layer-row-active" : ""
                  }`}
                  key={layer.id}
                >
                  <button
                    className="slice-layer-select"
                    type="button"
                    onClick={() => setSelectedSliceImageLayer(selectedSlice.id, layer.id)}
                  >
                    <span>{layer.name}</span>
                    <small>{layerAsset?.name ?? "No image selected"}</small>
                  </button>
                  <label className="slice-layer-upload" title={`Upload ${layer.name}`}>
                    <ImagePlus size={15} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        handleAssetUpload(
                          event.target.files?.[0],
                          "slice",
                          selectedSlice.id,
                          layer.id,
                        );
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <button
                    className="icon-button"
                    type="button"
                    title="Move image down"
                    disabled={index === selectedSlice.imageLayers.length - 1}
                    onClick={() => moveSliceImageLayer(selectedSlice.id, layer.id, 1)}
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    title="Move image up"
                    disabled={index === 0}
                    onClick={() => moveSliceImageLayer(selectedSlice.id, layer.id, -1)}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    title="Remove image layer"
                    disabled={selectedSlice.imageLayers.length <= 1}
                    onClick={() => removeSliceImageLayer(selectedSlice.id, layer.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
          {selectedSliceImageLayer ? (
            <>
              <div className="field-row">
                <label>
                  Scale
                  <DraftNumberInput
                    min={0.01}
                    step={0.01}
                    value={selectedSliceImageLayer.imageTransform.scale}
                    onCommit={(scale) =>
                      updateSliceImageLayerTransform(selectedSlice.id, selectedSliceImageLayer.id, {
                        scale,
                      })
                    }
                  />
                </label>
                <label>
                  Rotation
                  <DraftNumberInput
                    step={1}
                    value={selectedSliceImageLayer.imageTransform.rotation}
                    onCommit={(rotation) =>
                      updateSliceImageLayerTransform(selectedSlice.id, selectedSliceImageLayer.id, {
                        rotation,
                      })
                    }
                  />
                </label>
              </div>
              <div className="field-row">
                <label>
                  X
                  <DraftNumberInput
                    value={selectedSliceImageLayer.imageTransform.x}
                    onCommit={(x) =>
                      updateSliceImageLayerTransform(selectedSlice.id, selectedSliceImageLayer.id, {
                        x,
                      })
                    }
                  />
                </label>
                <label>
                  Y
                  <DraftNumberInput
                    value={selectedSliceImageLayer.imageTransform.y}
                    onCommit={(y) =>
                      updateSliceImageLayerTransform(selectedSlice.id, selectedSliceImageLayer.id, {
                        y,
                      })
                    }
                  />
                </label>
              </div>
            </>
          ) : null}
        </section>
      ) : null}
    </aside>
  );
}

function DraftNumberInput({ min, onCommit, step, value }: DraftNumberInputProps) {
  const [draft, setDraft] = useState(String(value));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraft(String(value));
    }
  }, [isEditing, value]);

  function parseDraft(nextDraft: string) {
    if (nextDraft.trim() === "") {
      return null;
    }

    const nextValue = Number(nextDraft);

    if (!Number.isFinite(nextValue) || (min !== undefined && nextValue < min)) {
      return null;
    }

    return nextValue;
  }

  return (
    <input
      inputMode="decimal"
      min={min}
      step={step}
      type="text"
      value={draft}
      onFocus={() => setIsEditing(true)}
      onBlur={() => {
        const parsedDraft = parseDraft(draft);

        setIsEditing(false);

        if (parsedDraft === null) {
          setDraft(String(value));
          return;
        }

        setDraft(String(parsedDraft));
      }}
      onChange={(event) => {
        const nextDraft = event.target.value;
        const nextValue = parseDraft(nextDraft);

        setDraft(nextDraft);

        if (nextValue !== null) {
          onCommit(nextValue);
        }
      }}
    />
  );
}

function mergeFontOptions(fonts: string[]) {
  return Array.from(new Set(fonts.map((font) => font.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
}
