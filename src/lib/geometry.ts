import type { CanvasSettings, ChartSlice, PieChartSettings, SliceLabelBox } from "../types/project";

export interface SliceGeometry {
  slice: ChartSlice;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  points: number[];
}

interface PathContext {
  beginPath: () => void;
  closePath: () => void;
  lineTo: (x: number, y: number) => void;
  moveTo: (x: number, y: number) => void;
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
export const DEFAULT_LABEL_DISTANCE = 96;
const MIN_LABEL_STROKE_GAP = 16;
export const LABEL_BOX_WIDTH = 240;
export const LABEL_BOX_OFFSET_X = LABEL_BOX_WIDTH / 2;
export const LABEL_BOX_OFFSET_Y = 32;
export const MIN_LABEL_BOX_WIDTH = 72;
export const MIN_LABEL_BOX_HEIGHT = 40;
const LABEL_VALUE_LINE_COUNT = 1;
let measurementCanvas: HTMLCanvasElement | null = null;

export function labelTextHeight(chart: PieChartSettings, slice?: ChartSlice) {
  return labelTextLineCount(chart, slice) * chart.labelStyle.fontSize + chart.labelStyle.strokeWidth * 2;
}

export function safeLabelDistanceForAngle(
  chart: PieChartSettings,
  angle: number,
  slice?: ChartSlice,
) {
  const radians = toRadians(angle);
  const xInward = Math.abs(Math.cos(radians)) * LABEL_BOX_OFFSET_X;
  const labelHeight = labelTextHeight(chart, slice);
  const yInward =
    Math.sin(radians) >= 0
      ? Math.sin(radians) * LABEL_BOX_OFFSET_Y
      : Math.abs(Math.sin(radians)) * (labelHeight - LABEL_BOX_OFFSET_Y);
  const minimumDistance =
    xInward + yInward + chart.borderWidth / 2 + MIN_LABEL_STROKE_GAP;

  return Math.max(0, Math.ceil(minimumDistance));
}

export function normalizeLabelDistances(chart: PieChartSettings): ChartSlice[] {
  const geometries = getSliceGeometries(chart);
  const safeDistances = new Map(
    geometries.map((geometry) => [
      geometry.slice.id,
      safeLabelDistanceForAngle(chart, geometry.midAngle, geometry.slice),
    ]),
  );

  return chart.slices.map((slice) => ({
    ...slice,
    labelDistance: safeDistances.get(slice.id) ?? DEFAULT_LABEL_DISTANCE,
  }));
}

export function defaultLabelBox(
  chart: PieChartSettings,
  canvas: CanvasSettings,
  angle: number,
  labelDistance = DEFAULT_LABEL_DISTANCE,
  slice?: ChartSlice,
): SliceLabelBox {
  const position = labelPosition(chart, angle, labelDistance);
  const box = {
    x: position.x - LABEL_BOX_OFFSET_X,
    y: position.y - LABEL_BOX_OFFSET_Y,
    width: LABEL_BOX_WIDTH,
    height: Math.max(MIN_LABEL_BOX_HEIGHT, Math.ceil(labelTextHeight(chart, slice))),
  };

  return clampLabelBoxToCanvas(box, canvas);
}

function labelTextLineCount(chart: PieChartSettings, slice?: ChartSlice) {
  if (!slice) {
    return 1 + LABEL_VALUE_LINE_COUNT;
  }

  return wrappedLineCount(slice.label, LABEL_BOX_WIDTH, chart) + LABEL_VALUE_LINE_COUNT;
}

function wrappedLineCount(text: string, maxWidth: number, chart: PieChartSettings) {
  const paragraphs = text.split(/\r?\n/);

  return paragraphs.reduce((lineCount, paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      return lineCount + 1;
    }

    let paragraphLines = 1;
    let currentLineWidth = 0;
    const spaceWidth = measureLabelTextWidth(" ", chart);

    for (const word of words) {
      const wordWidth = measureLabelTextWidth(word, chart);

      if (currentLineWidth === 0) {
        paragraphLines += Math.max(0, Math.ceil(wordWidth / maxWidth) - 1);
        currentLineWidth = wordWidth % maxWidth || Math.min(wordWidth, maxWidth);
        continue;
      }

      if (currentLineWidth + spaceWidth + wordWidth > maxWidth) {
        paragraphLines += Math.max(1, Math.ceil(wordWidth / maxWidth));
        currentLineWidth = wordWidth % maxWidth || Math.min(wordWidth, maxWidth);
        continue;
      }

      currentLineWidth += spaceWidth + wordWidth;
    }

    return lineCount + paragraphLines;
  }, 0);
}

function measureLabelTextWidth(text: string, chart: PieChartSettings) {
  const context = getMeasurementContext();

  if (!context) {
    return text.length * chart.labelStyle.fontSize * 0.58;
  }

  context.font = `${chart.labelStyle.fontWeight} ${chart.labelStyle.fontSize}px ${chart.labelStyle.fontFamily}`;

  return context.measureText(text).width;
}

function getMeasurementContext() {
  if (typeof document === "undefined") {
    return null;
  }

  measurementCanvas ??= document.createElement("canvas");

  return measurementCanvas.getContext("2d");
}

export function clampLabelBoxToCanvas(
  labelBox: SliceLabelBox,
  canvas: CanvasSettings,
): SliceLabelBox {
  const width = Math.min(Math.max(labelBox.width, MIN_LABEL_BOX_WIDTH), canvas.width);
  const height = Math.min(Math.max(labelBox.height, MIN_LABEL_BOX_HEIGHT), canvas.height);

  return {
    x: Math.min(Math.max(labelBox.x, 0), canvas.width - width),
    y: Math.min(Math.max(labelBox.y, 0), canvas.height - height),
    width,
    height,
  };
}

export function getSliceGeometries(chart: PieChartSettings): SliceGeometry[] {
  const total = chart.slices.reduce((sum, slice) => sum + Math.max(slice.value, 0), 0);
  let currentAngle = chart.startAngle;

  return chart.slices.map((slice) => {
    const sweep = total > 0 ? (Math.max(slice.value, 0) / total) * 360 : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweep;
    currentAngle = endAngle;

    return {
      slice,
      startAngle,
      endAngle,
      midAngle: startAngle + sweep / 2,
      points: createWedgePoints(chart.radius, startAngle, endAngle),
    };
  });
}

export function createWedgePoints(radius: number, startAngle: number, endAngle: number) {
  const angleSpan = Math.max(endAngle - startAngle, 0);
  const steps = Math.max(2, Math.ceil(angleSpan / 6));
  const points = [0, 0];

  for (let index = 0; index <= steps; index += 1) {
    const angle = startAngle + (angleSpan * index) / steps;
    points.push(Math.cos(toRadians(angle)) * radius, Math.sin(toRadians(angle)) * radius);
  }

  return points;
}

export function traceWedgePath(context: PathContext, points: number[]) {
  if (points.length < 4) {
    return;
  }

  context.beginPath();
  context.moveTo(points[0], points[1]);

  for (let index = 2; index < points.length; index += 2) {
    context.lineTo(points[index], points[index + 1]);
  }

  context.closePath();
}

export function labelPosition(
  chart: PieChartSettings,
  angle: number,
  labelDistance = DEFAULT_LABEL_DISTANCE,
) {
  const distance = chart.radius + labelDistance;
  return {
    x: chart.x + Math.cos(toRadians(angle)) * distance,
    y: chart.y + Math.sin(toRadians(angle)) * distance,
  };
}
