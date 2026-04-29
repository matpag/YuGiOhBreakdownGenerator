import { useCallback, useEffect, useRef, useState } from "react";
import Konva from "konva";
import { Circle, Group, Image, Layer, Line, Rect, Stage, Text } from "react-konva";
import { getSliceGeometries, labelPosition, traceWedgePath } from "../lib/geometry";
import { useProjectStore } from "../store/projectStore";
import type { ChartSlice, ProjectAsset, SliceImageTransform } from "../types/project";

const PREVIEW_SIZE = 900;
const HIT_FILL = "rgba(255,255,255,0.001)";
const MAX_IMAGE_SCALE = 4;
const MIN_IMAGE_SCALE = 0.35;
const ZOOM_FACTOR = 1.08;

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

export function BreakdownStage() {
  const stageRef = useRef<Konva.Stage>(null);
  const sliceTransformsRef = useRef<Record<string, SliceImageTransform>>({});
  const project = useProjectStore((state) => state.project);
  const assets = useProjectStore((state) => state.assets);
  const setSelectedSlice = useProjectStore((state) => state.setSelectedSlice);
  const updateSlice = useProjectStore((state) => state.updateSlice);
  const scale = PREVIEW_SIZE / project.canvas.width;
  const assetImages = useAssetImages(assets);
  const backgroundImage = project.background.assetId ? assetImages[project.background.assetId] : null;
  const logoImage = project.logo.assetId ? assetImages[project.logo.assetId] : null;
  const slices = getSliceGeometries(project.pieChart);

  useEffect(() => {
    sliceTransformsRef.current = Object.fromEntries(
      project.pieChart.slices.map((slice) => [slice.id, slice.imageTransform]),
    ) as Record<string, SliceImageTransform>;
  }, [project.pieChart.slices]);

  const updateSliceImageTransform = useCallback(
    (sliceId: string, imageTransform: SliceImageTransform) => {
      sliceTransformsRef.current = {
        ...sliceTransformsRef.current,
        [sliceId]: imageTransform,
      };
      updateSlice(sliceId, { imageTransform });
    },
    [updateSlice],
  );

  const handleSliceDragMove = useCallback(
    (event: Konva.KonvaEventObject<Event>, slice: ChartSlice, canTransformImage: boolean) => {
      if (!canTransformImage) {
        return;
      }

      const dx = event.target.x();
      const dy = event.target.y();
      event.target.position({ x: 0, y: 0 });

      if (dx === 0 && dy === 0) {
        return;
      }

      const currentTransform = sliceTransformsRef.current[slice.id] ?? slice.imageTransform;
      updateSliceImageTransform(slice.id, {
        ...currentTransform,
        x: currentTransform.x + dx,
        y: currentTransform.y + dy,
      });
    },
    [updateSliceImageTransform],
  );

  const handleSliceWheel = useCallback(
    (event: Konva.KonvaEventObject<WheelEvent>, slice: ChartSlice, canTransformImage: boolean) => {
      if (!canTransformImage) {
        return;
      }

      event.evt.preventDefault();
      event.cancelBubble = true;

      const currentTransform = sliceTransformsRef.current[slice.id] ?? slice.imageTransform;
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

      const dataUrl = stage.toDataURL({
        pixelRatio: project.canvas.width / PREVIEW_SIZE,
        mimeType: "image/png",
      });
      const link = document.createElement("a");
      link.download = "deck-breakdown.png";
      link.href = dataUrl;
      link.click();
    }

    window.addEventListener("graphic-templater:export-png", handleExport);
    return () => window.removeEventListener("graphic-templater:export-png", handleExport);
  }, [project.canvas.width]);

  return (
    <div className="canvas-wrap">
      <div className="stage-shell">
        <Stage
          ref={stageRef}
          width={PREVIEW_SIZE}
          height={PREVIEW_SIZE}
          scaleX={scale}
          scaleY={scale}
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
              x={project.title.x}
              y={project.title.y}
            />
          </Layer>

          <Layer>
            <Group x={project.pieChart.x} y={project.pieChart.y}>
              {slices.map((geometry) => {
                const sliceImage = geometry.slice.assetId ? assetImages[geometry.slice.assetId] : null;
                const selected = project.pieChart.selectedSliceId === geometry.slice.id;
                const canTransformImage = selected && Boolean(sliceImage);
                const imageTransform = geometry.slice.imageTransform;

                return (
                  <Group key={geometry.slice.id}>
                    <Line
                      closed
                      fill={selected ? "#e9f2ff" : "#f6f8fb"}
                      listening={false}
                      points={geometry.points}
                    />
                    <Group
                      clipFunc={(context) => {
                        traceWedgePath(context, geometry.points);
                      }}
                      listening={false}
                    >
                      {sliceImage ? (
                        <Image
                          image={sliceImage}
                          offsetX={project.pieChart.radius}
                          offsetY={project.pieChart.radius}
                          rotation={imageTransform.rotation}
                          scaleX={imageTransform.scale}
                          scaleY={imageTransform.scale}
                          width={project.pieChart.radius * 2}
                          height={project.pieChart.radius * 2}
                          x={imageTransform.x}
                          y={imageTransform.y}
                        />
                      ) : null}
                    </Group>
                    <Line
                      closed
                      draggable={canTransformImage}
                      fill={HIT_FILL}
                      onClick={() => setSelectedSlice(geometry.slice.id)}
                      onDragMove={(event) =>
                        handleSliceDragMove(event, geometry.slice, canTransformImage)
                      }
                      onDragStart={() => setSelectedSlice(geometry.slice.id)}
                      onTap={() => setSelectedSlice(geometry.slice.id)}
                      onWheel={(event) => handleSliceWheel(event, geometry.slice, canTransformImage)}
                      points={geometry.points}
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

              return (
                <Text
                  key={geometry.slice.id}
                  align="center"
                  fill="#ffffff"
                  fontFamily="Arial Black"
                  fontSize={40}
                  fontStyle="bold"
                  offsetX={120}
                  offsetY={32}
                  stroke="#000000"
                  strokeWidth={8}
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
