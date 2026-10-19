import { defaultDocument } from "./defaultProject";
import type { BreakdownDocument, ProjectAsset } from "../types/project";

export const GUIDE_BACKGROUND_FILE = "guide/breakdown-background-1080.png";

// Small, original geometric placeholders keep the lesson usable without an artwork service.
const illustrations = [
  { id: "demo-a", color: "#ffb3a0", accent: "#d85c43", motif: '<circle cx="420" cy="300" r="220"/><circle cx="420" cy="300" r="140"/><circle cx="420" cy="300" r="60"/>' },
  { id: "demo-b", color: "#a9e4e3", accent: "#278f9b", motif: '<path d="M300 80 520 300 300 520 80 300Z"/><path d="M300 160 440 300 300 440 160 300Z"/>' },
  { id: "demo-c", color: "#ffe1a1", accent: "#d69b25", motif: '<path d="M60 500 380 60M180 560 500 120M300 600 600 180"/>' },
];

export function createGuideDocument(background: ProjectAsset): BreakdownDocument {
  const document = structuredClone(defaultDocument);
  document.assets = { [background.id]: background };
  document.project.background.assetId = background.id;
  document.project.title = {
    ...document.project.title, text: "RETROFORMATS DEMO · 8P", y: 65,
    fontFamily: "Arial", fontSize: 38, fill: "#20324a", strokeWidth: 0,
  };
  const labels = ["Chaos Turbo", "Warrior", "Burn"];
  const values = [4, 3, 1];
  document.project.pieChart = {
    ...document.project.pieChart, y: 600, radius: 280, borderColor: "#20324a", borderWidth: 4,
    labelStyle: { fontFamily: "Arial", fontWeight: "700", fontSize: 32, fill: "#20324a", stroke: "#fffdf6", strokeWidth: 2 },
    selectedSliceId: "guide-slice-1",
    slices: illustrations.map((illustration, index) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" fill="${illustration.color}"/><g fill="none" stroke="${illustration.accent}" stroke-width="18" opacity=".55">${illustration.motif}</g></svg>`;
      document.assets[illustration.id] = {
        id: illustration.id, name: `${illustration.id}.svg`, mimeType: "image/svg+xml",
        dataUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
      };
      const id = `guide-slice-${index + 1}`;
      const layerId = `${id}-image-1`;
      return {
        id, label: labels[index], value: values[index], labelDistance: 100,
        imageLayers: [{ id: layerId, name: "Demo", assetId: illustration.id,
          imageTransform: { x: 0, y: 0, scale: 1, rotation: 0 } }],
        selectedImageLayerId: layerId,
      };
    }),
  };
  document.project.imageLibrary = illustrations.map(({ id }, index) => ({
    id: `guide-library-${index + 1}`, assetId: id, name: `Demo ${String.fromCharCode(65 + index)}`,
    createdAt: "2026-10-20T00:00:00.000Z",
  }));
  return document;
}
