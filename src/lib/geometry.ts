import type { ChartSlice, PieChartSettings } from "../types/project";

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
