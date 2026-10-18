import { Fragment, type DragEvent, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  ImagePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { fileToAsset, validateImageFile } from "../lib/assets";
import {
  FONT_FILE_ACCEPT,
  inferFontFamilyFromFileName,
  registerEmbeddedFont,
} from "../lib/fonts";
import { DEFAULT_LABEL_DISTANCE } from "../lib/geometry";
import { useProjectStore } from "../store/projectStore";
import { useI18n, type UiMessage } from "../i18n/I18nProvider";
import { describeUiError } from "../i18n/errors";

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

const FONT_WEIGHT_OPTIONS = [
  { labelKey: "weight100", value: "100" },
  { labelKey: "weight200", value: "200" },
  { labelKey: "weight300", value: "300" },
  { labelKey: "weight400", value: "400" },
  { labelKey: "weight500", value: "500" },
  { labelKey: "weight600", value: "600" },
  { labelKey: "weight700", value: "700" },
  { labelKey: "weight800", value: "800" },
  { labelKey: "weight900", value: "900" },
] as const;

interface LocalFontData {
  family: string;
}

interface DraftNumberInputProps {
  min?: number;
  onCommit: (value: number) => void;
  step?: number;
  value: number;
}

interface ColorInputProps {
  onCommit: (value: string) => void;
  value: string;
}

interface FontSelectProps {
  label: string;
  onChange: (fontFamily: string) => void;
  onOpen: () => void;
  options: string[];
  value: string;
}

interface FontMenuPosition {
  left: number;
  maxHeight: number;
  top: number;
  width: number;
}

declare global {
  interface Window {
    queryLocalFonts?: () => Promise<LocalFontData[]>;
  }
}

export function EditorSidebar() {
  const { t, message } = useI18n();
  const project = useProjectStore((state) => state.project);
  const assets = useProjectStore((state) => state.assets);
  const updateCanvas = useProjectStore((state) => state.updateCanvas);
  const setTitle = useProjectStore((state) => state.setTitle);
  const updateTitle = useProjectStore((state) => state.updateTitle);
  const updatePieChart = useProjectStore((state) => state.updatePieChart);
  const addSlice = useProjectStore((state) => state.addSlice);
  const moveSlice = useProjectStore((state) => state.moveSlice);
  const removeSlice = useProjectStore((state) => state.removeSlice);
  const updateSlice = useProjectStore((state) => state.updateSlice);
  const updateSliceImageLayerTransform = useProjectStore(
    (state) => state.updateSliceImageLayerTransform,
  );
  const setSelectedSliceImageLayer = useProjectStore((state) => state.setSelectedSliceImageLayer);
  const addSliceImageLayer = useProjectStore((state) => state.addSliceImageLayer);
  const removeSliceImageLayer = useProjectStore((state) => state.removeSliceImageLayer);
  const moveSliceImageLayer = useProjectStore((state) => state.moveSliceImageLayer);
  const resetChartLabelsAndImages = useProjectStore((state) => state.resetChartLabelsAndImages);
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
  const [collapsed, setCollapsed] = useState(false);
  const [fontAccessRequested, setFontAccessRequested] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<UiMessage | null>(null);
  const [fontUploadError, setFontUploadError] = useState<UiMessage | null>(null);
  const [draggingSliceId, setDraggingSliceId] = useState<string | null>(null);
  const [dragPreviewSliceIds, setDragPreviewSliceIds] = useState<string[] | null>(null);
  const sliceRowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const sliceRowRectsRef = useRef<Map<string, DOMRect> | null>(null);

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
      setImageUploadError(describeUiError(error, "readImageError"));
      return;
    }

    setImageUploadError(null);

    try {
    const asset = await fileToAsset(file);
    const assetId = addAsset(asset);

    if (target === "background") {
      setBackgroundAsset(assetId);
    }

    if (target === "slice") {
      addImageLibraryItem({
        id: crypto.randomUUID(),
        assetId,
        name: asset.name,
        createdAt: new Date().toISOString(),
      });
    }

    if (target === "slice" && sliceId && layerId) {
      setSliceImageLayerAsset(sliceId, layerId, assetId);
    } else if (target === "slice" && sliceId) {
      setSliceAsset(sliceId, assetId);
    }
    } catch (error) {
      setImageUploadError(describeUiError(error, "readImageError"));
    }
  }

  async function handleFontUpload(file: File | undefined) {
    if (!file) {
      return;
    }

    const inferredFamily = inferFontFamilyFromFileName(file.name);
    const family = window.prompt(t("fontFamilyName"), inferredFamily)?.trim();

    if (!family) {
      return;
    }

    setFontUploadError(null);
    try {
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
    } catch (error) {
      setFontUploadError(describeUiError(error, "readFontError"));
    }
  }

  function setSliceRowRef(sliceId: string, node: HTMLDivElement | null) {
    if (node) {
      sliceRowRefs.current.set(sliceId, node);
      return;
    }

    sliceRowRefs.current.delete(sliceId);
  }

  function captureSliceRowPositions() {
    sliceRowRectsRef.current = new Map(
      Array.from(sliceRowRefs.current.entries()).map(([sliceId, node]) => [
        sliceId,
        node.getBoundingClientRect(),
      ]),
    );
  }

  function handleSliceDragStart(event: DragEvent<HTMLDivElement>, sliceId: string) {
    const sliceIds = project.pieChart.slices.map((slice) => slice.id);

    setDraggingSliceId(sliceId);
    setDragPreviewSliceIds(sliceIds);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", sliceId);
  }

  function handleSliceDragOver(event: DragEvent<HTMLDivElement>, targetSliceId: string) {
    const sourceSliceId = draggingSliceId ?? event.dataTransfer.getData("text/plain");
    const orderedSliceIds = dragPreviewSliceIds ?? project.pieChart.slices.map((slice) => slice.id);

    if (!sourceSliceId || sourceSliceId === targetSliceId) {
      return;
    }

    const dragIndex = orderedSliceIds.indexOf(sourceSliceId);
    const targetIndex = orderedSliceIds.indexOf(targetSliceId);

    if (dragIndex === -1 || targetIndex === -1) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const rect = event.currentTarget.getBoundingClientRect();
    const pointerY = event.clientY - rect.top;
    const rowMidpoint = rect.height / 2;

    if (dragIndex < targetIndex && pointerY < rowMidpoint) {
      return;
    }

    if (dragIndex > targetIndex && pointerY > rowMidpoint) {
      return;
    }

    const nextSliceIds = [...orderedSliceIds];
    const [sliceId] = nextSliceIds.splice(dragIndex, 1);
    nextSliceIds.splice(targetIndex, 0, sliceId);

    captureSliceRowPositions();
    setDragPreviewSliceIds(nextSliceIds);
  }

  function handleSliceDrop(event: DragEvent<HTMLDivElement>) {
    const sourceSliceId = draggingSliceId ?? event.dataTransfer.getData("text/plain");
    const targetIndex = dragPreviewSliceIds?.indexOf(sourceSliceId) ?? -1;
    const listRect = event.currentTarget.getBoundingClientRect();
    const droppedInsideList =
      event.clientX >= listRect.left &&
      event.clientX <= listRect.right &&
      event.clientY >= listRect.top &&
      event.clientY <= listRect.bottom;

    event.preventDefault();

    if (sourceSliceId && targetIndex !== -1 && droppedInsideList) {
      moveSlice(sourceSliceId, targetIndex);
    }

    setDraggingSliceId(null);
    setDragPreviewSliceIds(null);
  }


  const backgroundAsset = project.background.assetId ? assets[project.background.assetId] : null;
  const selectedSlice =
    project.pieChart.slices.find((slice) => slice.id === project.pieChart.selectedSliceId) ?? null;
  const selectedSliceImageLayer =
    selectedSlice?.imageLayers.find((layer) => layer.id === selectedSlice.selectedImageLayerId) ??
    selectedSlice?.imageLayers[0] ??
    null;
  const sliceById = new Map(project.pieChart.slices.map((slice) => [slice.id, slice]));
  const previewSlices = dragPreviewSliceIds
    ? dragPreviewSliceIds.map((sliceId) => sliceById.get(sliceId)).filter((slice) => slice !== undefined)
    : null;
  const visibleSlices = previewSlices ?? project.pieChart.slices;
  const dropIndicatorSliceId = draggingSliceId && dragPreviewSliceIds ? draggingSliceId : null;

  useLayoutEffect(() => {
    const previousRects = sliceRowRectsRef.current;

    if (!previousRects) {
      return;
    }

    sliceRowRectsRef.current = null;

    for (const [sliceId, node] of sliceRowRefs.current.entries()) {
      if (sliceId === draggingSliceId) {
        continue;
      }

      const previousRect = previousRects.get(sliceId);

      if (!previousRect) {
        continue;
      }

      const currentRect = node.getBoundingClientRect();
      const deltaY = previousRect.top - currentRect.top;

      if (Math.abs(deltaY) < 1) {
        continue;
      }

      node.animate(
        [
          { transform: `translateY(${deltaY}px)` },
          { transform: "translateY(0)" },
        ],
        {
          duration: 160,
          easing: "ease-out",
        },
      );
    }
  }, [dragPreviewSliceIds, draggingSliceId, project.pieChart.slices]);

  return (
    <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""}`}>
      <button
        className="sidebar-collapse-button"
        type="button"
        title={t(collapsed ? "openEditor" : "closeEditor")}
        aria-label={t(collapsed ? "openEditor" : "closeEditor")}
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((isCollapsed) => !isCollapsed)}
      >
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>

      {collapsed ? null : (
        <>
      <section className="panel">
        <h2>{t("canvas")}</h2>
        <div className="field-row">
          <label>
            {t("width")}
            <DraftNumberInput
              min={1}
              step={1}
              value={project.canvas.width}
              onCommit={(width) => updateCanvas({ width: Math.round(width) })}
            />
          </label>
          <label>
            {t("height")}
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
        <h2>{t("title")}</h2>
        <label>
          {t("text")}
          <textarea value={project.title.text} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <div className="field-row">
          <div className="field-label">
            <span>{t("font")}</span>
            <FontSelect
              label={t("font")}
              value={project.title.fontFamily}
              options={fontOptions}
              onOpen={loadSystemFonts}
              onChange={(fontFamily) => updateTitle({ fontFamily })}
            />
          </div>
          <label>
            {t("fontWeight")}
            <select
              value={project.title.fontWeight}
              onChange={(event) => updateTitle({ fontWeight: event.target.value })}
            >
              {FONT_WEIGHT_OPTIONS.map((fontWeight) => (
                <option key={fontWeight.value} value={fontWeight.value}>
                  {t(fontWeight.labelKey)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          {t("size")}
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
        <div className="field-row">
          <div className="field-label">
            <span>{t("textColor")}</span>
            <ColorInput
              value={project.title.fill}
              onCommit={(fill) => updateTitle({ fill })}
            />
          </div>
          <div className="field-label">
            <span>{t("strokeColor")}</span>
            <ColorInput
              value={project.title.stroke}
              onCommit={(stroke) => updateTitle({ stroke })}
            />
          </div>
        </div>
        <div className="field-row">
          <label>
            {t("strokeWidth")}
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
            {t("y")}
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
        <h2>{t("staticImages")}</h2>
        {imageUploadError ? <p className="field-error">{message(imageUploadError)}</p> : null}
        <div className="asset-control">
          <span>
            {t("background")}
            <small>{backgroundAsset?.name ?? t("noImage")}</small>
          </span>
          <label className="file-button">
            <ImagePlus size={16} />
            {t("upload")}
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
        <h2>{t("embeddedFonts")}</h2>
        {fontUploadError ? <p className="field-error">{message(fontUploadError)}</p> : null}
        <div className="asset-control">
          <span>
            {t("projectFonts")}
            <small>
              {project.fonts.length > 0
                ? project.fonts.map((font) => font.family).join(", ")
                : t("noFonts")}
            </small>
          </span>
          <label className="file-button">
            <ImagePlus size={16} />
            {t("upload")}
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
        <h2>{t("chart")}</h2>
        <div className="field-row">
          <label>
            {t("x")}
            <DraftNumberInput
              value={project.pieChart.x}
              onCommit={(x) => updatePieChart({ x })}
            />
          </label>
          <label>
            {t("y")}
            <DraftNumberInput
              value={project.pieChart.y}
              onCommit={(y) => updatePieChart({ y })}
            />
          </label>
        </div>
        <div className="field-row">
          <label>
            {t("radius")}
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
          <label>
            {t("chartStrokeWidth")}
            <DraftNumberInput
              min={0}
              value={project.pieChart.borderWidth}
              onCommit={(borderWidth) =>
                updatePieChart({
                  borderWidth,
                })
              }
            />
          </label>
        </div>
        <div className="field-row">
          <div className="field-label">
            <span>{t("labelFont")}</span>
            <FontSelect
              label={t("labelFont")}
              value={project.pieChart.labelStyle.fontFamily}
              options={fontOptions}
              onOpen={loadSystemFonts}
              onChange={(fontFamily) =>
                updatePieChart({
                  labelStyle: {
                    ...project.pieChart.labelStyle,
                    fontFamily,
                  },
                })
              }
            />
          </div>
          <label>
            {t("labelFontWeight")}
            <select
              value={project.pieChart.labelStyle.fontWeight}
              onChange={(event) =>
                updatePieChart({
                  labelStyle: {
                    ...project.pieChart.labelStyle,
                    fontWeight: event.target.value,
                  },
                })
              }
            >
              {FONT_WEIGHT_OPTIONS.map((fontWeight) => (
                <option key={fontWeight.value} value={fontWeight.value}>
                  {t(fontWeight.labelKey)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          {t("labelSize")}
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
        <div className="field-row">
          <div className="field-label">
            <span>{t("labelTextColor")}</span>
            <ColorInput
              value={project.pieChart.labelStyle.fill}
              onCommit={(fill) =>
                updatePieChart({
                  labelStyle: {
                    ...project.pieChart.labelStyle,
                    fill,
                  },
                })
              }
            />
          </div>
          <div className="field-label">
            <span>{t("labelStrokeColor")}</span>
            <ColorInput
              value={project.pieChart.labelStyle.stroke}
              onCommit={(stroke) =>
                updatePieChart({
                  labelStyle: {
                    ...project.pieChart.labelStyle,
                    stroke,
                  },
                })
              }
            />
          </div>
        </div>
        <label>
          {t("labelStrokeWidth")}
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
        <button type="button" onClick={resetChartLabelsAndImages}>
          <RotateCcw size={16} />
          {t("resetAll")}
        </button>
      </section>

      <section className="panel">
        <h2>{t("slices")}</h2>
        <div className="topbar-actions">
          <button type="button" onClick={addSlice}>
            <Plus size={16} />
            {t("add")}
          </button>
        </div>
        <div
          className="slice-list"
          onDragOver={(event) => {
            if (draggingSliceId) {
              event.preventDefault();
            }
          }}
          onDrop={handleSliceDrop}
        >
          {visibleSlices.map((slice) => (
            <Fragment key={slice.id}>
              {dropIndicatorSliceId === slice.id ? (
                <div className="slice-drop-indicator" aria-hidden="true" />
              ) : null}
              <div
                ref={(node) => setSliceRowRef(slice.id, node)}
                className={`slice-row ${
                  project.pieChart.selectedSliceId === slice.id ? "slice-row-active" : ""
                } ${draggingSliceId === slice.id ? "slice-row-dragging" : ""
                }`}
                draggable
                title={t("dragReorder")}
                onDragEnd={() => {
                  setDraggingSliceId(null);
                  setDragPreviewSliceIds(null);
                }}
                onDragOver={(event) => handleSliceDragOver(event, slice.id)}
                onDragStart={(event) => handleSliceDragStart(event, slice.id)}
              >
                <GripVertical aria-hidden="true" className="slice-row-grip" size={16} />
                <button
                  className="slice-row-select"
                  type="button"
                  aria-pressed={project.pieChart.selectedSliceId === slice.id}
                  onClick={() => setSelectedSlice(slice.id)}
                >
                  <span>{slice.label}</span>
                  <strong>{slice.value}</strong>
                </button>
                <button
                  className="icon-button slice-row-delete"
                  type="button"
                  title={t("deleteName", { name: slice.label })}
                  onClick={() => removeSlice(slice.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </Fragment>
          ))}
        </div>
      </section>

      {selectedSlice ? (
        <section className="panel">
          <h2>{t("selectedSlice")}</h2>
          <label>
            {t("label")}
            <input
              value={selectedSlice.label}
              onChange={(event) => updateSlice(selectedSlice.id, { label: event.target.value })}
            />
          </label>
          <label>
            {t("sliceValue")}
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
            {t("labelDistance")}
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
          {selectedSlice.labelBox ? (
            <button
              type="button"
              onClick={() => updateSlice(selectedSlice.id, { labelBox: undefined })}
            >
              <RotateCcw size={16} />
              {t("resetLabel")}
            </button>
          ) : null}
          <div className="slice-layer-header">
            <h3>{t("sliceImages")}</h3>
            <button
              type="button"
              onClick={() => addSliceImageLayer(selectedSlice.id)}
            >
              <Plus size={16} />
              {t("addImage")}
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
                    aria-pressed={selectedSliceImageLayer?.id === layer.id}
                    onClick={() => setSelectedSliceImageLayer(selectedSlice.id, layer.id)}
                  >
                    <span>{layer.name}</span>
                    <small>{layerAsset?.name ?? t("noImage")}</small>
                  </button>
                  <label className="slice-layer-upload" title={t("uploadName", { name: layer.name })}>
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
                    title={t("moveImageDown")}
                    disabled={index === selectedSlice.imageLayers.length - 1}
                    onClick={() => moveSliceImageLayer(selectedSlice.id, layer.id, 1)}
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    title={t("moveImageUp")}
                    disabled={index === 0}
                    onClick={() => moveSliceImageLayer(selectedSlice.id, layer.id, -1)}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    title={
                      selectedSlice.imageLayers.length <= 1
                        ? t("clearImage")
                        : t("removeLayer")
                    }
                    disabled={selectedSlice.imageLayers.length <= 1 && !layer.assetId}
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
                  {t("scale")}
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
                  {t("rotation")}
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
                  {t("x")}
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
                  {t("y")}
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
        </>
      )}
    </aside>
  );
}

function ColorInput({ onCommit, value }: ColorInputProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    input.value = value;
  }, [value]);

  useEffect(() => {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    const element = input;

    function handleChange() {
      onCommit(element.value);
      element.blur();
    }

    element.addEventListener("change", handleChange);

    return () => {
      element.removeEventListener("change", handleChange);
    };
  }, [onCommit]);

  return (
    <span className="color-picker-control">
      <button
        className="color-picker-button"
        type="button"
        title={value}
        aria-label={t("chooseColor", { value })}
        style={{ backgroundColor: value }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          inputRef.current?.click();
        }}
      />
      <input ref={inputRef} className="color-input" type="color" defaultValue={value} />
    </span>
  );
}

function FontSelect({ label, onChange, onOpen, options, value }: FontSelectProps) {
  const { t } = useI18n();
  const menuId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const skipNextFocusOpenRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [menuPosition, setMenuPosition] = useState<FontMenuPosition | null>(null);
  const availableOptions = mergeFontOptions([...options, value]);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? availableOptions.filter((font) => font.toLowerCase().includes(normalizedQuery))
    : availableOptions;

  useEffect(() => {
    if (!isOpen) {
      setQuery(value);
    }
  }, [isOpen, value]);

  function updateMenuPosition() {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    const rect = input.getBoundingClientRect();
    const gap = 4;
    const viewportMargin = 10;
    const spaceBelow = window.innerHeight - rect.bottom - viewportMargin;
    const spaceAbove = rect.top - viewportMargin;
    const opensAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
    const availableHeight = Math.max(120, opensAbove ? spaceAbove : spaceBelow);
    const maxHeight = Math.min(320, availableHeight - gap);
    const top = opensAbove
      ? Math.max(viewportMargin, rect.top - maxHeight - gap)
      : Math.min(rect.bottom + gap, window.innerHeight - maxHeight - viewportMargin);
    const left = Math.min(
      Math.max(viewportMargin, rect.left),
      Math.max(viewportMargin, window.innerWidth - rect.width - viewportMargin),
    );

    setMenuPosition({
      left,
      maxHeight,
      top,
      width: rect.width,
    });
  }

  function openMenu() {
    onOpen();
    setIsOpen(true);
  }

  function closeMenu() {
    setIsOpen(false);
  }

  function focusInputWithoutOpening() {
    skipNextFocusOpenRef.current = true;
    inputRef.current?.focus();
    window.setTimeout(() => {
      skipNextFocusOpenRef.current = false;
    }, 0);
  }

  function selectFont(font: string) {
    onChange(font);
    setQuery(font);
    closeMenu();
    focusInputWithoutOpening();
  }

  useLayoutEffect(() => {
    if (isOpen) {
      updateMenuPosition();
    }
  }, [isOpen, filteredOptions.length]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (inputRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }

      closeMenu();
    }

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  return (
    <>
      <div className="font-combobox">
        <input
          ref={inputRef}
          aria-autocomplete="list"
          aria-controls={isOpen ? menuId : undefined}
          aria-expanded={isOpen}
          aria-label={label}
          className="font-combobox-input"
          role="combobox"
          value={isOpen ? query : value}
          onChange={(event) => {
            setQuery(event.target.value);
            openMenu();
          }}
          onFocus={() => {
            if (skipNextFocusOpenRef.current) {
              return;
            }

            openMenu();
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              openMenu();
              menuRef.current
                ?.querySelector<HTMLButtonElement>(".font-select-option")
                ?.focus();
            }

            if (event.key === "Enter") {
              const exactMatch = availableOptions.find(
                (font) => font.toLowerCase() === query.trim().toLowerCase(),
              );
              const nextFont = exactMatch ?? filteredOptions[0];

              if (nextFont) {
                event.preventDefault();
                selectFont(nextFont);
              }
            }

            if (event.key === "Escape") {
              event.preventDefault();
              setQuery(value);
              closeMenu();
            }
          }}
        />
        <Search aria-hidden="true" className="font-combobox-icon" size={15} />
      </div>
      {isOpen && menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              className="font-select-menu"
              id={menuId}
              role="listbox"
              aria-label={label}
              style={{
                left: menuPosition.left,
                maxHeight: menuPosition.maxHeight,
                top: menuPosition.top,
                width: menuPosition.width,
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setQuery(value);
                  closeMenu();
                  focusInputWithoutOpening();
                }

                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  const options = Array.from(
                    menuRef.current?.querySelectorAll<HTMLButtonElement>(".font-select-option") ??
                      [],
                  );
                  const currentIndex = options.findIndex((option) => option === document.activeElement);
                  options[Math.min(currentIndex + 1, options.length - 1)]?.focus();
                }

                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  const options = Array.from(
                    menuRef.current?.querySelectorAll<HTMLButtonElement>(".font-select-option") ??
                      [],
                  );
                  const currentIndex = options.findIndex((option) => option === document.activeElement);

                  if (currentIndex <= 0) {
                    inputRef.current?.focus();
                    return;
                  }

                  options[currentIndex - 1]?.focus();
                }
              }}
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((font) => (
                  <button
                    className={`font-select-option ${
                      font === value ? "font-select-option-active" : ""
                    }`}
                    key={font}
                    role="option"
                    aria-selected={font === value}
                    type="button"
                    onClick={() => {
                      selectFont(font);
                    }}
                  >
                    {font}
                  </button>
                ))
              ) : (
                <div className="font-select-empty">{t("noFontResults")}</div>
              )}
            </div>,
            document.body,
          )
        : null}
    </>
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
