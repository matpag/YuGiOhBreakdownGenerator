import { useCallback, useEffect, useRef, useState } from "react";
import Konva from "konva";
import { Circle, Group, Image, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import { getSliceGeometries, labelPosition, traceWedgePath } from "../lib/geometry";
import { useProjectStore } from "../store/projectStore";
import type { ChartSlice, ProjectAsset, SliceImageTransform } from "../types/project";
import type { SliceGeometry } from "../lib/geometry";

const PREVIEW_MAX_SIZE = 900;
const HIT_FILL = "rgba(255,255,255,0.001)";
const MAX_IMAGE_SCALE = 4;
const MIN_IMAGE_SCALE = 0.35;
const ZOOM_FACTOR = 1.08;
const EDITOR_OVERLAY_NAME = "editor-overlay";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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
  radius: number;
  setSelectedSlice: (sliceId: string) => void;
  updateSlice: (sliceId: string, updates: Partial<ChartSlice>) => void;
}

function SliceImageEditor({
  geometry,
  image,
  isSelected,
  radius,
  setSelectedSlice,
  updateSlice,
}: SliceImageEditorProps) {
  const imageRef = useRef<Konva.Image>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const transform = geometry.slice.imageTransform;
  const imageSize = getSliceImageSize(image, radius);

  useEffect(() => {
    const transformer = transformerRef.current;
    const imageNode = imageRef.current;

    if (!transformer) {
      return;
    }

    if (isSelected && imageNode) {
      transformer.nodes([imageNode]);
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

    updateSlice(geometry.slice.id, {
      imageTransform: {
        ...transform,
        x: node.x(),
        y: node.y(),
        scale: nextScale,
        rotation: node.rotation(),
      },
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

    updateSlice(geometry.slice.id, {
      imageTransform: {
        ...transform,
        scale: clamp(nextScale, MIN_IMAGE_SCALE, MAX_IMAGE_SCALE),
      },
    });
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
          onClick={() => setSelectedSlice(geometry.slice.id)}
          onDragEnd={(event) => commitImageTransform(event.target as Konva.Image)}
          onDragMove={(event) => {
            updateSlice(geometry.slice.id, {
              imageTransform: {
                ...transform,
                x: event.target.x(),
                y: event.target.y(),
              },
            });
          }}
          onTap={() => setSelectedSlice(geometry.slice.id)}
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
        <Transformer
          ref={transformerRef}
          anchorCornerRadius={3}
          anchorFill="#ffffff"
          anchorSize={14}
          borderDash={[8, 6]}
          borderStroke="#2f80ed"
          borderStrokeWidth={2}
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
          flipEnabled={false}
          keepRatio
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

export function BreakdownStage() {
  const stageRef = useRef<Konva.Stage>(null);
  const project = useProjectStore((state) => state.project);
  const assets = useProjectStore((state) => state.assets);
  const setSelectedSlice = useProjectStore((state) => state.setSelectedSlice);
  const updateSlice = useProjectStore((state) => state.updateSlice);
  const previewScale = Math.min(
    PREVIEW_MAX_SIZE / project.canvas.width,
    PREVIEW_MAX_SIZE / project.canvas.height,
  );
  const previewWidth = Math.round(project.canvas.width * previewScale);
  const previewHeight = Math.round(project.canvas.height * previewScale);
  const assetImages = useAssetImages(assets);
  const backgroundImage = project.background.assetId ? assetImages[project.background.assetId] : null;
  const logoImage = project.logo.assetId ? assetImages[project.logo.assetId] : null;
  const slices = getSliceGeometries(project.pieChart);

  const updateSliceImageTransform = useCallback(
    (sliceId: string, imageTransform: SliceImageTransform) => {
      updateSlice(sliceId, { imageTransform });
    },
    [updateSlice],
  );

  const handleSliceWheel = useCallback(
    (event: Konva.KonvaEventObject<WheelEvent>, slice: ChartSlice, canTransformImage: boolean) => {
      if (!canTransformImage) {
        return;
      }

      event.evt.preventDefault();
      event.cancelBubble = true;

      const currentTransform = slice.imageTransform;
      const nextScale =
        event.evt.deltaY < 0
          ? currentTransform.scale * ZOOM_FACTOR
          : currentTransform.scale / ZOOM_FACTOR;

      updateSliceImageTransform(slice.id, {
        ...currentTransform,
        scale: clamp(nextScale, MIN_IMAGE_SCALE, MAX_IMAGE_SCALE),
      });
    },
    [updateSliceImageTransform],
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

    window.addEventListener("graphic-templater:export-png", handleExport);
    return () => window.removeEventListener("graphic-templater:export-png", handleExport);
  }, [previewScale]);

  return (
    <div className="canvas-wrap">
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
              fontFamily={project.title.fontFamily}
              fontSize={project.title.fontSize}
              fontStyle="bold"
              listening={false}
              offsetX={project.canvas.width / 2}
              stroke={project.title.stroke}
              strokeWidth={project.title.strokeWidth}
              text={project.title.text}
              width={project.canvas.width}
              x={project.canvas.width / 2}
              y={project.title.y}
            />
          </Layer>

          <Layer>
            <Group x={project.pieChart.x} y={project.pieChart.y}>
              {slices.map((geometry) => {
                const sliceImage = geometry.slice.assetId ? assetImages[geometry.slice.assetId] : null;
                const selected = project.pieChart.selectedSliceId === geometry.slice.id;
                const canTransformImage = selected && Boolean(sliceImage);

                return (
                  <Group key={geometry.slice.id}>
                    <Line
                      closed
                      fill={selected ? "#e9f2ff" : "#f6f8fb"}
                      listening={false}
                      points={geometry.points}
                    />
                    <Line
                      closed
                      fill={HIT_FILL}
                      onClick={() => setSelectedSlice(geometry.slice.id)}
                      onTap={() => setSelectedSlice(geometry.slice.id)}
                      onWheel={(event) => handleSliceWheel(event, geometry.slice, canTransformImage)}
                      points={geometry.points}
                    />
                    <SliceImageEditor
                      geometry={geometry}
                      image={sliceImage ?? null}
                      isSelected={selected}
                      radius={project.pieChart.radius}
                      setSelectedSlice={setSelectedSlice}
                      updateSlice={updateSlice}
                    />
                    <Line
                      closed
                      listening={false}
                      points={geometry.points}
                      stroke={project.pieChart.borderColor}
                      strokeWidth={
                        selected ? project.pieChart.borderWidth + 3 : project.pieChart.borderWidth
                      }
                    />
                  </Group>
                );
              })}
              <Circle
                radius={project.pieChart.radius}
                listening={false}
                stroke={project.pieChart.borderColor}
                strokeWidth={project.pieChart.borderWidth}
              />
            </Group>
            {slices.map((geometry) => {
              const position = labelPosition(project.pieChart, geometry.midAngle);
              const labelStyle = project.pieChart.labelStyle;

              return (
                <Text
                  key={geometry.slice.id}
                  align="center"
                  fill={labelStyle.fill}
                  fontFamily={labelStyle.fontFamily}
                  fontSize={labelStyle.fontSize}
                  fontStyle="bold"
                  offsetX={120}
                  offsetY={32}
                  stroke={labelStyle.stroke}
                  strokeWidth={labelStyle.strokeWidth}
                  text={`${geometry.slice.label}\n(${geometry.slice.value})`}
                  width={240}
                  x={position.x}
                  y={position.y}
                />
              );
            })}
            {logoImage ? (
              <Image
                image={logoImage}
                x={project.logo.x}
                y={project.logo.y}
                width={project.logo.width}
                height={project.logo.height ?? project.logo.width}
              />
            ) : null}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
