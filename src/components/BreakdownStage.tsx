import { useCallback, useEffect, useRef, useState } from "react";
import Konva from "konva";
import { Circle, Group, Image, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import {
  DEFAULT_LABEL_DISTANCE,
  MIN_LABEL_BOX_HEIGHT,
  MIN_LABEL_BOX_WIDTH,
  clampLabelBoxToCanvas,
  defaultLabelBox,
  getSliceGeometries,
  traceWedgePath,
} from "../lib/geometry";
import { useProjectStore } from "../store/projectStore";
import type {
  CanvasSettings,
  ChartSlice,
  PieChartSettings,
  ProjectAsset,
  SliceImageLayer,
  SliceImageTransform,
} from "../types/project";
import type { SliceGeometry } from "../lib/geometry";

const HIT_FILL = "rgba(255,255,255,0.001)";
const SELECTED_SLICE_STROKE = "#e3342f";
const MAX_IMAGE_SCALE = 4;
const MIN_IMAGE_SCALE = 0.01;
const ZOOM_FACTOR = 1.08;
const EDITOR_OVERLAY_NAME = "editor-overlay";
const ZOOM_PRESETS = [25, 50, 75, 100, 150, 200];
const CANVAS_PADDING = 56;
const OUTER_TEXT_STROKE_MULTIPLIER = 2;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function pointInPolygon(point: { x: number; y: number }, points: number[]) {
  let inside = false;

  for (let index = 0, previousIndex = points.length - 2; index < points.length; index += 2) {
    const xi = points[index];
    const yi = points[index + 1];
    const xj = points[previousIndex];
    const yj = points[previousIndex + 1];
    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

    if (intersects) {
      inside = !inside;
    }

    previousIndex = index;
  }

  return inside;
}

function useAssetImages(assets: Record<string, ProjectAsset>) {
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    let active = true;
    const assetList = Object.values(assets);
    const expectedSources = new Map(assetList.map((asset) => [asset.id, asset.dataUrl]));

    setImages((currentImages) => {
      const nextImages: Record<string, HTMLImageElement> = {};

      for (const [assetId, image] of Object.entries(currentImages)) {
        if (expectedSources.get(assetId) === image.src) {
          nextImages[assetId] = image;
        }
      }

      return nextImages;
    });

    for (const asset of assetList) {
      const image = new window.Image();
      const handleLoad = () => {
        if (!active) {
          return;
        }

        setImages((currentImages) => {
          if (currentImages[asset.id]?.src === asset.dataUrl) {
            return currentImages;
          }

          return {
            ...currentImages,
            [asset.id]: image,
          };
        });
      };

      image.addEventListener("load", handleLoad);
      image.src = asset.dataUrl;

      if (image.complete) {
        handleLoad();
      }
    }

    return () => {
      active = false;
    };
  }, [assets]);

  return images;
}

interface SliceImageEditorProps {
  geometry: SliceGeometry;
  image: HTMLImageElement | null;
  isSelected: boolean;
  layer: SliceImageLayer;
  selectSliceAtPointer: (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => boolean;
  radius: number;
  setSelectedSlice: (sliceId: string) => void;
  setSelectedSliceImageLayer: (sliceId: string, layerId: string) => void;
  clearSelectedLabel: () => void;
  updateSliceImageLayerTransform: (
    sliceId: string,
    layerId: string,
    updates: Partial<SliceImageTransform>,
  ) => void;
}

interface DraftZoomInputProps {
  onCommit: (value: number) => void;
  value: number;
}

function SliceImageEditor({
  clearSelectedLabel,
  geometry,
  image,
  isSelected,
  layer,
  radius,
  selectSliceAtPointer,
  setSelectedSlice,
  setSelectedSliceImageLayer,
  updateSliceImageLayerTransform,
}: SliceImageEditorProps) {
  const imageRef = useRef<Konva.Image>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const transform = layer.imageTransform;
  const imageSize = getSliceImageSize(image, radius);

  useEffect(() => {
    const transformer = transformerRef.current;
    const imageNode = imageRef.current;

    if (!transformer) {
      return;
    }

    if (isSelected && imageNode) {
      transformer.nodes([imageNode]);
      transformer.moveToTop();
      transformer.getLayer()?.batchDraw();
      return;
    }

    transformer.nodes([]);
    transformer.getLayer()?.batchDraw();
  }, [image, isSelected, imageSize.height, imageSize.width]);

  if (!image) {
    return null;
  }

  function commitImageTransform(node: Konva.Image) {
    const nextScale = clamp(
      Math.max(Math.abs(node.scaleX()), Math.abs(node.scaleY())),
      MIN_IMAGE_SCALE,
      MAX_IMAGE_SCALE,
    );

    node.scale({ x: nextScale, y: nextScale });

    updateSliceImageLayerTransform(geometry.slice.id, layer.id, {
      ...transform,
      x: node.x(),
      y: node.y(),
      scale: nextScale,
      rotation: node.rotation(),
    });
  }

  function handleImageWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    if (!isSelected) {
      return;
    }

    event.evt.preventDefault();
    event.cancelBubble = true;

    const nextScale =
      event.evt.deltaY < 0 ? transform.scale * ZOOM_FACTOR : transform.scale / ZOOM_FACTOR;

    updateSliceImageLayerTransform(geometry.slice.id, layer.id, {
      ...transform,
      scale: clamp(nextScale, MIN_IMAGE_SCALE, MAX_IMAGE_SCALE),
    });
  }

  function selectLayer() {
    clearSelectedLabel();
    setSelectedSlice(geometry.slice.id);
    setSelectedSliceImageLayer(geometry.slice.id, layer.id);
  }

  function moveImageNodeTo(node: Konva.Node) {
    const imageNode = imageRef.current;

    if (!imageNode) {
      return;
    }

    imageNode.position({ x: node.x(), y: node.y() });
    transformerRef.current?.forceUpdate();
    node.getLayer()?.batchDraw();
  }

  function commitDragProxyTransform(node: Konva.Node) {
    const imageNode = imageRef.current;

    if (!imageNode) {
      return;
    }

    imageNode.position({ x: node.x(), y: node.y() });
    commitImageTransform(imageNode);
  }

  function handleSelectedImageBoundsClick(
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) {
    const relativePointer = event.target.getParent()?.getRelativePointerPosition();

    if (relativePointer && !pointInPolygon(relativePointer, geometry.points)) {
      event.cancelBubble = true;

      if (selectSliceAtPointer(event)) {
        return;
      }
    }

    selectLayer();
  }

  return (
    <>
      <Group
        clipFunc={(context) => {
          traceWedgePath(context, geometry.points);
        }}
      >
        <Image
          ref={imageRef}
          draggable={isSelected}
          image={image}
          height={imageSize.height}
          offsetX={imageSize.width / 2}
          offsetY={imageSize.height / 2}
          onClick={selectLayer}
          onDragEnd={(event) => commitImageTransform(event.target as Konva.Image)}
          onTap={selectLayer}
          onTransformEnd={(event) => commitImageTransform(event.target as Konva.Image)}
          onWheel={handleImageWheel}
          rotation={transform.rotation}
          scaleX={transform.scale}
          scaleY={transform.scale}
          width={imageSize.width}
          x={transform.x}
          y={transform.y}
        />
      </Group>
      {isSelected ? (
        <>
          <Rect
            draggable
            fill={HIT_FILL}
            height={imageSize.height}
            name={EDITOR_OVERLAY_NAME}
            offsetX={imageSize.width / 2}
            offsetY={imageSize.height / 2}
            onClick={handleSelectedImageBoundsClick}
            onDragEnd={(event) => commitDragProxyTransform(event.target)}
            onDragMove={(event) => moveImageNodeTo(event.target)}
            onTap={handleSelectedImageBoundsClick}
            onWheel={handleImageWheel}
            rotation={transform.rotation}
            scaleX={transform.scale}
            scaleY={transform.scale}
            width={imageSize.width}
            x={transform.x}
            y={transform.y}
          />
          <Transformer
            ref={transformerRef}
            anchorCornerRadius={3}
            anchorFill="#2f80ed"
            anchorSize={14}
            anchorStroke="#ffffff"
            anchorStrokeWidth={2}
            borderDash={[8, 6]}
            borderStroke="#2f80ed"
            borderStrokeWidth={2}
            enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
            flipEnabled={false}
            keepRatio
            name={EDITOR_OVERLAY_NAME}
            rotateEnabled={false}
          />
        </>
      ) : null}
    </>
  );
}

interface SliceLabelEditorProps {
  canvas: CanvasSettings;
  geometry: SliceGeometry;
  isSelected: boolean;
  pieChart: PieChartSettings;
  setSelectedLabelSliceId: (sliceId: string) => void;
  setSelectedSlice: (sliceId: string) => void;
  updateSlice: (sliceId: string, updates: Partial<ChartSlice>) => void;
}

function SliceLabelEditor({
  canvas,
  geometry,
  isSelected,
  pieChart,
  setSelectedLabelSliceId,
  setSelectedSlice,
  updateSlice,
}: SliceLabelEditorProps) {
  const textRef = useRef<Konva.Text>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const labelStyle = pieChart.labelStyle;
  const labelBox =
    geometry.slice.labelBox ??
    defaultLabelBox(
      pieChart,
      canvas,
      geometry.midAngle,
      geometry.slice.labelDistance ?? DEFAULT_LABEL_DISTANCE,
    );

  useEffect(() => {
    const transformer = transformerRef.current;
    const textNode = textRef.current;

    if (!transformer) {
      return;
    }

    if (isSelected && textNode) {
      transformer.nodes([textNode]);
      transformer.moveToTop();
      transformer.getLayer()?.batchDraw();
      return;
    }

    transformer.nodes([]);
    transformer.getLayer()?.batchDraw();
  }, [isSelected, labelBox.height, labelBox.width]);

  function selectLabel(event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    event.cancelBubble = true;
    setSelectedSlice(geometry.slice.id);
    setSelectedLabelSliceId(geometry.slice.id);
  }

  function applyLabelBoxResize(node: Konva.Text) {
    const nextLabelBox = clampLabelBoxToCanvas(
      {
        x: node.x(),
        y: node.y(),
        width: node.width() * node.scaleX(),
        height: node.height() * node.scaleY(),
      },
      canvas,
    );

    node.scale({ x: 1, y: 1 });
    node.position({ x: nextLabelBox.x, y: nextLabelBox.y });
    node.size({ width: nextLabelBox.width, height: nextLabelBox.height });

    return nextLabelBox;
  }

  function handleLabelTransform(event: Konva.KonvaEventObject<Event>) {
    const node = event.target as Konva.Text;

    applyLabelBoxResize(node);
    node.getLayer()?.batchDraw();
  }

  function commitLabelBox(node: Konva.Text) {
    const nextLabelBox = applyLabelBoxResize(node);

    updateSlice(geometry.slice.id, {
      labelBox: nextLabelBox,
    });
  }

  return (
    <>
      <Text
        ref={textRef}
        align="center"
        draggable={isSelected}
        fill={labelStyle.fill}
        fillAfterStrokeEnabled
        fontFamily={labelStyle.fontFamily}
        fontSize={labelStyle.fontSize}
        fontStyle={labelStyle.fontWeight}
        height={labelBox.height}
        onClick={selectLabel}
        onDragEnd={(event) => commitLabelBox(event.target as Konva.Text)}
        onTap={selectLabel}
        onTransform={handleLabelTransform}
        onTransformEnd={(event) => commitLabelBox(event.target as Konva.Text)}
        stroke={labelStyle.stroke}
        strokeWidth={labelStyle.strokeWidth * OUTER_TEXT_STROKE_MULTIPLIER}
        text={`${geometry.slice.label}\n(${geometry.slice.value})`}
        verticalAlign="middle"
        width={labelBox.width}
        x={labelBox.x}
        y={labelBox.y}
      />
      {isSelected ? (
        <Transformer
          ref={transformerRef}
          anchorCornerRadius={3}
          anchorFill="#2f80ed"
          anchorSize={12}
          anchorStroke="#ffffff"
          anchorStrokeWidth={2}
          borderDash={[8, 6]}
          borderStroke="#2f80ed"
          borderStrokeWidth={2}
          boundBoxFunc={(_oldBox, newBox) => ({
            ...newBox,
            height: Math.max(newBox.height, MIN_LABEL_BOX_HEIGHT),
            width: Math.max(newBox.width, MIN_LABEL_BOX_WIDTH),
          })}
          enabledAnchors={[
            "top-left",
            "top-center",
            "top-right",
            "middle-left",
            "middle-right",
            "bottom-left",
            "bottom-center",
            "bottom-right",
          ]}
          flipEnabled={false}
          name={EDITOR_OVERLAY_NAME}
          rotateEnabled={false}
        />
      ) : null}
    </>
  );
}

function getSliceImageSize(image: HTMLImageElement | null, radius: number) {
  const diameter = radius * 2;

  if (!image?.naturalWidth || !image.naturalHeight) {
    return {
      width: diameter,
      height: diameter,
    };
  }

  const aspectRatio = image.naturalWidth / image.naturalHeight;

  if (aspectRatio >= 1) {
    return {
      width: diameter * aspectRatio,
      height: diameter,
    };
  }

  return {
    width: diameter,
    height: diameter / aspectRatio,
  };
}

function DraftZoomInput({ onCommit, value }: DraftZoomInputProps) {
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
    return Number.isFinite(nextValue) && nextValue > 0 ? nextValue : null;
  }

  return (
    <input
      inputMode="decimal"
      min={5}
      step={5}
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

export function BreakdownStage() {
  const stageRef = useRef<Konva.Stage>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 900, height: 900 });
  const [zoomMode, setZoomMode] = useState<"fit" | "fixed">("fit");
  const [zoomPercent, setZoomPercent] = useState(100);
  const [selectedLabelSliceId, setSelectedLabelSliceId] = useState<string | null>(null);
  const project = useProjectStore((state) => state.project);
  const assets = useProjectStore((state) => state.assets);
  const setSelectedSlice = useProjectStore((state) => state.setSelectedSlice);
  const updateSlice = useProjectStore((state) => state.updateSlice);
  const setSelectedSliceImageLayer = useProjectStore((state) => state.setSelectedSliceImageLayer);
  const updateSliceImageLayerTransform = useProjectStore(
    (state) => state.updateSliceImageLayerTransform,
  );
  const fitScale = Math.min(
    Math.max((viewportSize.width - CANVAS_PADDING) / project.canvas.width, 0.05),
    Math.max((viewportSize.height - CANVAS_PADDING) / project.canvas.height, 0.05),
  );
  const previewScale = zoomMode === "fit" ? fitScale : zoomPercent / 100;
  const previewWidth = Math.round(project.canvas.width * previewScale);
  const previewHeight = Math.round(project.canvas.height * previewScale);
  const assetImages = useAssetImages(assets);
  const backgroundImage = project.background.assetId ? assetImages[project.background.assetId] : null;
  const slices = getSliceGeometries(project.pieChart);
  const pieSliceGeometries = [...slices].sort((leftGeometry, rightGeometry) => {
    const selectedSliceId = project.pieChart.selectedSliceId;

    if (leftGeometry.slice.id === selectedSliceId) {
      return 1;
    }

    if (rightGeometry.slice.id === selectedSliceId) {
      return -1;
    }

    return 0;
  });

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setViewportSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (
      selectedLabelSliceId &&
      (project.pieChart.selectedSliceId !== selectedLabelSliceId ||
        !project.pieChart.slices.some((slice) => slice.id === selectedLabelSliceId))
    ) {
      setSelectedLabelSliceId(null);
    }
  }, [project.pieChart.selectedSliceId, project.pieChart.slices, selectedLabelSliceId]);

  function selectSlice(sliceId: string) {
    setSelectedLabelSliceId(null);
    setSelectedSlice(sliceId);
  }

  function selectSliceAtPointer(event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    const stage = event.target.getStage();
    const pointer = stage?.getPointerPosition();

    if (!stage || !pointer) {
      return false;
    }

    const stagePoint = stage.getAbsoluteTransform().copy().invert().point(pointer);
    const piePoint = {
      x: stagePoint.x - project.pieChart.x,
      y: stagePoint.y - project.pieChart.y,
    };
    const targetGeometry = slices.find((geometry) => pointInPolygon(piePoint, geometry.points));

    if (!targetGeometry) {
      return false;
    }

    selectSlice(targetGeometry.slice.id);
    return true;
  }

  const handleSliceWheel = useCallback(
    (event: Konva.KonvaEventObject<WheelEvent>, slice: ChartSlice) => {
      const activeLayer =
        slice.imageLayers.find((layer) => layer.id === slice.selectedImageLayerId) ??
        slice.imageLayers[0];

      if (!activeLayer?.assetId) {
        return;
      }

      event.evt.preventDefault();
      event.cancelBubble = true;

      const currentTransform = activeLayer.imageTransform;
      const nextScale =
        event.evt.deltaY < 0
          ? currentTransform.scale * ZOOM_FACTOR
          : currentTransform.scale / ZOOM_FACTOR;

      updateSliceImageLayerTransform(slice.id, activeLayer.id, {
        ...currentTransform,
        scale: clamp(nextScale, MIN_IMAGE_SCALE, MAX_IMAGE_SCALE),
      });
    },
    [updateSliceImageLayerTransform],
  );

  useEffect(() => {
    function handleExport() {
      const stage = stageRef.current;

      if (!stage) {
        return;
      }

      const editorOverlays = stage.find(`.${EDITOR_OVERLAY_NAME}`);
      editorOverlays.forEach((node) => node.hide());
      stage.draw();

      const dataUrl = stage.toDataURL({
        pixelRatio: 1 / previewScale,
        mimeType: "image/png",
      });

      editorOverlays.forEach((node) => node.show());
      stage.draw();

      const link = document.createElement("a");
      link.download = "deck-breakdown.png";
      link.href = dataUrl;
      link.click();
    }

    window.addEventListener("deck-breakdown-maker:export-png", handleExport);
    return () => window.removeEventListener("deck-breakdown-maker:export-png", handleExport);
  }, [previewScale]);

  return (
    <section className="preview-pane">
      <div className="preview-toolbar">
        <div className="zoom-controls" aria-label="Preview zoom">
          <button
            className={zoomMode === "fit" ? "zoom-button-active" : ""}
            type="button"
            onClick={() => setZoomMode("fit")}
          >
            Fill
          </button>
          {ZOOM_PRESETS.map((preset) => (
            <button
              className={zoomMode === "fixed" && zoomPercent === preset ? "zoom-button-active" : ""}
              key={preset}
              type="button"
              onClick={() => {
                setZoomMode("fixed");
                setZoomPercent(preset);
              }}
            >
              {preset}%
            </button>
          ))}
        </div>
        <label className="zoom-custom">
          Zoom
          <DraftZoomInput
            value={zoomMode === "fit" ? Math.round(fitScale * 100) : zoomPercent}
            onCommit={(nextPercent) => {
              setZoomMode("fixed");
              setZoomPercent(nextPercent);
            }}
          />
        </label>
      </div>
      <div ref={viewportRef} className="canvas-wrap">
        <div className="stage-shell">
          <Stage
            ref={stageRef}
            width={previewWidth}
            height={previewHeight}
            scaleX={previewScale}
            scaleY={previewScale}
          >
          <Layer>
            <Rect width={project.canvas.width} height={project.canvas.height} fill="#202536" />
            {backgroundImage ? (
              <Image
                image={backgroundImage}
                x={0}
                y={0}
                width={project.canvas.width}
                height={project.canvas.height}
              />
            ) : null}
            <Text
              align="center"
              fill={project.title.fill}
              fillAfterStrokeEnabled
              fontFamily={project.title.fontFamily}
              fontSize={project.title.fontSize}
              fontStyle={project.title.fontWeight}
              listening={false}
              offsetX={project.canvas.width / 2}
              stroke={project.title.stroke}
              strokeWidth={project.title.strokeWidth * OUTER_TEXT_STROKE_MULTIPLIER}
              text={project.title.text}
              width={project.canvas.width}
              x={project.canvas.width / 2}
              y={project.title.y}
            />
          </Layer>

          <Layer>
            <Group x={project.pieChart.x} y={project.pieChart.y}>
              <Circle
                radius={project.pieChart.radius}
                listening={false}
                stroke={project.pieChart.borderColor}
                strokeWidth={project.pieChart.borderWidth}
              />
              {pieSliceGeometries.map((geometry) => {
                const selected = project.pieChart.selectedSliceId === geometry.slice.id;

                return (
                  <Group key={geometry.slice.id}>
                    <Line
                      closed
                      fill="#f6f8fb"
                      listening={false}
                      points={geometry.points}
                    />
                    <Line
                      closed
                      fill={HIT_FILL}
                      onClick={() => selectSlice(geometry.slice.id)}
                      onTap={() => selectSlice(geometry.slice.id)}
                      onWheel={(event) => {
                        if (selected) {
                          handleSliceWheel(event, geometry.slice);
                        }
                      }}
                      points={geometry.points}
                    />
                    {geometry.slice.imageLayers.map((layer) => (
                      <SliceImageEditor
                        geometry={geometry}
                        image={layer.assetId ? assetImages[layer.assetId] ?? null : null}
                        isSelected={
                          selected &&
                          selectedLabelSliceId !== geometry.slice.id &&
                          geometry.slice.selectedImageLayerId === layer.id
                        }
                        key={layer.id}
                        layer={layer}
                        radius={project.pieChart.radius}
                        selectSliceAtPointer={selectSliceAtPointer}
                        clearSelectedLabel={() => setSelectedLabelSliceId(null)}
                        setSelectedSlice={setSelectedSlice}
                        setSelectedSliceImageLayer={setSelectedSliceImageLayer}
                        updateSliceImageLayerTransform={updateSliceImageLayerTransform}
                      />
                    ))}
                    <Line
                      closed
                      listening={false}
                      points={geometry.points}
                      stroke={project.pieChart.borderColor}
                      strokeWidth={project.pieChart.borderWidth}
                    />
                    {selected ? (
                      <Line
                        closed
                        listening={false}
                        name={EDITOR_OVERLAY_NAME}
                        points={geometry.points}
                        stroke={SELECTED_SLICE_STROKE}
                        strokeWidth={project.pieChart.borderWidth + 3}
                      />
                    ) : null}
                  </Group>
                );
              })}
            </Group>
            {slices.map((geometry) => {
              return (
                <SliceLabelEditor
                  canvas={project.canvas}
                  geometry={geometry}
                  isSelected={selectedLabelSliceId === geometry.slice.id}
                  key={geometry.slice.id}
                  pieChart={project.pieChart}
                  setSelectedLabelSliceId={setSelectedLabelSliceId}
                  setSelectedSlice={setSelectedSlice}
                  updateSlice={updateSlice}
                />
              );
            })}
          </Layer>
          </Stage>
        </div>
      </div>
    </section>
  );
}
