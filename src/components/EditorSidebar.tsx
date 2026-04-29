import { useEffect, useState } from "react";
import { ImagePlus, Minus, Plus } from "lucide-react";
import { fileToAsset } from "../lib/assets";
import { useProjectStore } from "../store/projectStore";

const FONT_OPTIONS = ["Arial Black", "Impact", "Inter", "Georgia", "Trebuchet MS"];

export function EditorSidebar() {
  const project = useProjectStore((state) => state.project);
  const assets = useProjectStore((state) => state.assets);
  const selectedSlice = useProjectStore((state) => state.selectedSlice);
  const updateCanvas = useProjectStore((state) => state.updateCanvas);
  const setTitle = useProjectStore((state) => state.setTitle);
  const updateTitle = useProjectStore((state) => state.updateTitle);
  const updatePieChart = useProjectStore((state) => state.updatePieChart);
  const addSlice = useProjectStore((state) => state.addSlice);
  const removeSelectedSlice = useProjectStore((state) => state.removeSelectedSlice);
  const updateSlice = useProjectStore((state) => state.updateSlice);
  const updateSliceImageTransform = useProjectStore((state) => state.updateSliceImageTransform);
  const addAsset = useProjectStore((state) => state.addAsset);
  const setBackgroundAsset = useProjectStore((state) => state.setBackgroundAsset);
  const setLogoAsset = useProjectStore((state) => state.setLogoAsset);
  const setSliceAsset = useProjectStore((state) => state.setSliceAsset);
  const setSelectedSlice = useProjectStore((state) => state.setSelectedSlice);
  const [canvasWidthDraft, setCanvasWidthDraft] = useState(String(project.canvas.width));
  const [canvasHeightDraft, setCanvasHeightDraft] = useState(String(project.canvas.height));

  useEffect(() => {
    setCanvasWidthDraft(String(project.canvas.width));
  }, [project.canvas.width]);

  useEffect(() => {
    setCanvasHeightDraft(String(project.canvas.height));
  }, [project.canvas.height]);

  async function handleAssetUpload(file: File | undefined, target: "background" | "logo" | "slice") {
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

    if (target === "slice" && selectedSlice) {
      setSliceAsset(selectedSlice.id, assetId);
    }
  }

  function readNumber(value: string, fallback: number, min?: number) {
    if (value.trim() === "") {
      return fallback;
    }

    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) {
      return fallback;
    }

    return min === undefined ? nextValue : Math.max(min, nextValue);
  }

  function readCanvasDimension(value: string) {
    const nextValue = Number(value);

    if (!Number.isFinite(nextValue) || nextValue <= 0) {
      return null;
    }

    return Math.round(nextValue);
  }

  const backgroundAsset = project.background.assetId ? assets[project.background.assetId] : null;
  const logoAsset = project.logo.assetId ? assets[project.logo.assetId] : null;
  const selectedSliceAsset = selectedSlice?.assetId ? assets[selectedSlice.assetId] : null;

  return (
    <aside className="sidebar">
      <section className="panel">
        <h2>Canvas</h2>
        <div className="field-row">
          <label>
            Width
            <input
              inputMode="numeric"
              step="1"
              type="text"
              value={canvasWidthDraft}
              onBlur={() => {
                if (canvasWidthDraft.trim() === "") {
                  setCanvasWidthDraft(String(project.canvas.width));
                }
              }}
              onChange={(event) => {
                const nextDraft = event.target.value;
                const nextWidth = readCanvasDimension(nextDraft);

                setCanvasWidthDraft(nextDraft);

                if (nextWidth !== null) {
                  updateCanvas({ width: nextWidth });
                }
              }}
            />
          </label>
          <label>
            Height
            <input
              inputMode="numeric"
              step="1"
              type="text"
              value={canvasHeightDraft}
              onBlur={() => {
                if (canvasHeightDraft.trim() === "") {
                  setCanvasHeightDraft(String(project.canvas.height));
                }
              }}
              onChange={(event) => {
                const nextDraft = event.target.value;
                const nextHeight = readCanvasDimension(nextDraft);

                setCanvasHeightDraft(nextDraft);

                if (nextHeight !== null) {
                  updateCanvas({ height: nextHeight });
                }
              }}
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
              onChange={(event) => updateTitle({ fontFamily: event.target.value })}
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </label>
          <label>
            Size
            <input
              min="8"
              type="number"
              value={project.title.fontSize}
              onChange={(event) =>
                updateTitle({
                  fontSize: readNumber(event.target.value, project.title.fontSize, 8),
                })
              }
            />
          </label>
        </div>
        <div className="field-row">
          <label>
            Fill
            <input
              className="color-input"
              type="color"
              value={project.title.fill}
              onChange={(event) => updateTitle({ fill: event.target.value })}
            />
          </label>
          <label>
            Stroke
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
            <input
              min="0"
              type="number"
              value={project.title.strokeWidth}
              onChange={(event) =>
                updateTitle({
                  strokeWidth: readNumber(event.target.value, project.title.strokeWidth, 0),
                })
              }
            />
          </label>
          <label>
            Y
            <input
              type="number"
              value={project.title.y}
              onChange={(event) =>
                updateTitle({
                  y: readNumber(event.target.value, project.title.y),
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
        <h2>Chart</h2>
        <div className="field-row">
          <label>
            X
            <input
              type="number"
              value={project.pieChart.x}
              onChange={(event) =>
                updatePieChart({ x: readNumber(event.target.value, project.pieChart.x) })
              }
            />
          </label>
          <label>
            Y
            <input
              type="number"
              value={project.pieChart.y}
              onChange={(event) =>
                updatePieChart({ y: readNumber(event.target.value, project.pieChart.y) })
              }
            />
          </label>
        </div>
        <label>
          Radius
          <input
            min="80"
            type="number"
            value={project.pieChart.radius}
            onChange={(event) =>
              updatePieChart({
                radius: readNumber(event.target.value, project.pieChart.radius, 80),
              })
            }
          />
        </label>
        <div className="field-row">
          <label>
            Label font
            <select
              value={project.pieChart.labelStyle.fontFamily}
              onChange={(event) =>
                updatePieChart({
                  labelStyle: {
                    ...project.pieChart.labelStyle,
                    fontFamily: event.target.value,
                  },
                })
              }
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </label>
          <label>
            Label size
            <input
              min="1"
              type="number"
              value={project.pieChart.labelStyle.fontSize}
              onChange={(event) =>
                updatePieChart({
                  labelStyle: {
                    ...project.pieChart.labelStyle,
                    fontSize: readNumber(event.target.value, project.pieChart.labelStyle.fontSize, 1),
                  },
                })
              }
            />
          </label>
        </div>
        <label>
          Label stroke width
          <input
            min="0"
            type="number"
            value={project.pieChart.labelStyle.strokeWidth}
            onChange={(event) =>
              updatePieChart({
                labelStyle: {
                  ...project.pieChart.labelStyle,
                  strokeWidth: readNumber(
                    event.target.value,
                    project.pieChart.labelStyle.strokeWidth,
                    0,
                  ),
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
            Value
            <input
              min="1"
              type="number"
              value={selectedSlice.value}
              onChange={(event) =>
                updateSlice(selectedSlice.id, {
                  value: readNumber(event.target.value, selectedSlice.value, 1),
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
                  handleAssetUpload(event.target.files?.[0], "slice");
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          <div className="field-row">
            <label>
              Scale
              <input
                min="0.1"
                step="0.05"
                type="number"
                value={selectedSlice.imageTransform.scale}
                onChange={(event) =>
                  updateSliceImageTransform(selectedSlice.id, {
                    scale: readNumber(
                      event.target.value,
                      selectedSlice.imageTransform.scale,
                      0.1,
                    ),
                  })
                }
              />
            </label>
            <label>
              Rotation
              <input
                step="1"
                type="number"
                value={selectedSlice.imageTransform.rotation}
                onChange={(event) =>
                  updateSliceImageTransform(selectedSlice.id, {
                    rotation: readNumber(
                      event.target.value,
                      selectedSlice.imageTransform.rotation,
                    ),
                  })
                }
              />
            </label>
          </div>
          <div className="field-row">
            <label>
              X
              <input
                type="number"
                value={selectedSlice.imageTransform.x}
                onChange={(event) =>
                  updateSliceImageTransform(selectedSlice.id, {
                    x: readNumber(event.target.value, selectedSlice.imageTransform.x),
                  })
                }
              />
            </label>
            <label>
              Y
              <input
                type="number"
                value={selectedSlice.imageTransform.y}
                onChange={(event) =>
                  updateSliceImageTransform(selectedSlice.id, {
                    y: readNumber(event.target.value, selectedSlice.imageTransform.y),
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
