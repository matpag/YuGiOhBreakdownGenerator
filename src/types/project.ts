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
  fontWeight: string;
  fontSize: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface LabelTextStyle {
  fontFamily: string;
  fontWeight: string;
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

export interface SliceImageLayer {
  id: string;
  name: string;
  assetId: AssetId | null;
  imageTransform: SliceImageTransform;
}

export interface SliceLabelBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ChartSlice {
  id: string;
  label: string;
  labelBox?: SliceLabelBox;
  labelDistance?: number;
  value: number;
  imageLayers: SliceImageLayer[];
  selectedImageLayerId: string;
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
