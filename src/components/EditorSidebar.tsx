import { useEffect, useState } from "react";
import { ImagePlus, Minus, Plus } from "lucide-react";
import { fileToAsset } from "../lib/assets";
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
  const updateSliceImageTransform = useProjectStore((state) => state.updateSliceImageTransform);
  const addAsset = useProjectStore((state) => state.addAsset);
  const addEmbeddedFont = useProjectStore((state) => state.addEmbeddedFont);
  const setBackgroundAsset = useProjectStore((state) => state.setBackgroundAsset);
  const setLogoAsset = useProjectStore((state) => state.setLogoAsset);
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
    target: "background" | "logo" | "slice",
    sliceId?: string,
  ) {
    if (!file) {
      return;
    }

    const asset = await fileToAsset(file);
    const assetId = addAsset(asset);

    if (target === "background") {
      setBackgroundAsset(assetId);
    }

    if (target === "logo") {
      setLogoAsset(assetId);
    }

    if (target === "slice" && sliceId) {
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
  const logoAsset = project.logo.assetId ? assets[project.logo.assetId] : null;
  const selectedSlice =
    project.pieChart.slices.find((slice) => slice.id === project.pieChart.selectedSliceId) ?? null;
  const selectedSliceAsset = selectedSlice?.assetId ? assets[selectedSlice.assetId] : null;

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
        <div className="asset-control">
          <span>
            Logo
            <small>{logoAsset?.name ?? "No image selected"}</small>
          </span>
          <label className="file-button">
            <ImagePlus size={16} />
            Upload
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                handleAssetUpload(event.target.files?.[0], "logo");
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
          <div className="asset-control">
            <span>
              Image
              <small>{selectedSliceAsset?.name ?? "No image selected"}</small>
            </span>
            <label className="file-button">
              <ImagePlus size={16} />
              Upload
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  handleAssetUpload(event.target.files?.[0], "slice", selectedSlice.id);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          <div className="field-row">
            <label>
              Scale
              <DraftNumberInput
                min={0.1}
                step={0.05}
                value={selectedSlice.imageTransform.scale}
                onCommit={(scale) =>
                  updateSliceImageTransform(selectedSlice.id, {
                    scale,
                  })
                }
              />
            </label>
            <label>
              Rotation
              <DraftNumberInput
                step={1}
                value={selectedSlice.imageTransform.rotation}
                onCommit={(rotation) =>
                  updateSliceImageTransform(selectedSlice.id, {
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
                value={selectedSlice.imageTransform.x}
                onCommit={(x) =>
                  updateSliceImageTransform(selectedSlice.id, {
                    x,
                  })
                }
              />
            </label>
            <label>
              Y
              <DraftNumberInput
                value={selectedSlice.imageTransform.y}
                onCommit={(y) =>
                  updateSliceImageTransform(selectedSlice.id, {
                    y,
                  })
                }
              />
            </label>
          </div>
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
