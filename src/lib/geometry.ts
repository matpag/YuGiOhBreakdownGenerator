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
const LABEL_LINE_COUNT = 2;

export function labelTextHeight(chart: PieChartSettings) {
  return chart.labelStyle.fontSize * LABEL_LINE_COUNT + chart.labelStyle.strokeWidth * 2;
}

export function safeLabelDistanceForAngle(chart: PieChartSettings, angle: number) {
  const radians = toRadians(angle);
  const xInward = Math.abs(Math.cos(radians)) * LABEL_BOX_OFFSET_X;
  const labelHeight = labelTextHeight(chart);
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
      safeLabelDistanceForAngle(chart, geometry.midAngle),
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
): SliceLabelBox {
  const position = labelPosition(chart, angle, labelDistance);
  const box = {
    x: position.x - LABEL_BOX_OFFSET_X,
    y: position.y - LABEL_BOX_OFFSET_Y,
    width: LABEL_BOX_WIDTH,
    height: Math.max(MIN_LABEL_BOX_HEIGHT, Math.ceil(labelTextHeight(chart))),
  };

  return clampLabelBoxToCanvas(box, canvas);
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
