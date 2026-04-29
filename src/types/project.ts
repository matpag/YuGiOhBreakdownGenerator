export type AssetId = string;

export interface CanvasSettings {
  width: number;
  height: number;
}

export interface TextStyle {
  text: string;
  x: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface LabelTextStyle {
  fontFamily: string;
  fontSize: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface ImageLayer {
  assetId: AssetId | null;
  x: number;
  y: number;
  width: number;
  height?: number;
  fit: "cover" | "contain";
}

export interface EmbeddedFont {
  id: string;
  family: string;
  assetId: AssetId;
}

export interface ImageLibraryItem {
  id: string;
  assetId: AssetId;
  name: string;
  createdAt: string;
}

export interface SliceImageTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface ChartSlice {
  id: string;
  label: string;
  labelDistance?: number;
  value: number;
  assetId: AssetId | null;
  imageTransform: SliceImageTransform;
}

export interface PieChartSettings {
  x: number;
  y: number;
  radius: number;
  startAngle: number;
  borderColor: string;
  borderWidth: number;
  labelStyle: LabelTextStyle;
  selectedSliceId: string | null;
  slices: ChartSlice[];
}

export interface BreakdownProject {
  version: 1;
  canvas: CanvasSettings;
  title: TextStyle;
  background: ImageLayer;
  logo: ImageLayer;
  fonts: EmbeddedFont[];
  imageLibrary: ImageLibraryItem[];
  pieChart: PieChartSettings;
}

export interface ProjectAsset {
  id: AssetId;
  name: string;
  mimeType: string;
  dataUrl: string;
}

export interface BreakdownDocument {
  project: BreakdownProject;
  assets: Record<AssetId, ProjectAsset>;
}
