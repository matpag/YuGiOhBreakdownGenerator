import { create } from "zustand";
import { defaultDocument } from "../data/defaultProject";
import type {
  AssetId,
  BreakdownDocument,
  CanvasSettings,
  ChartSlice,
  PieChartSettings,
  ProjectAsset,
  SliceImageTransform,
  TextStyle,
} from "../types/project";

interface ProjectState extends BreakdownDocument {
  project: BreakdownDocument["project"];
  selectedSlice: ChartSlice | null;
  loadDocument: (document: BreakdownDocument) => void;
  updateCanvas: (updates: Partial<CanvasSettings>) => void;
  setTitle: (text: string) => void;
  updateTitle: (updates: Partial<TextStyle>) => void;
  updatePieChart: (updates: Partial<Omit<PieChartSettings, "slices">>) => void;
  setSelectedSlice: (sliceId: string) => void;
  updateSlice: (sliceId: string, updates: Partial<ChartSlice>) => void;
  updateSliceImageTransform: (
    sliceId: string,
    updates: Partial<SliceImageTransform>,
  ) => void;
  addSlice: () => void;
  removeSelectedSlice: () => void;
  addAsset: (asset: ProjectAsset) => AssetId;
  setBackgroundAsset: (assetId: AssetId) => void;
  setLogoAsset: (assetId: AssetId) => void;
  setSliceAsset: (sliceId: string, assetId: AssetId) => void;
  exportPng: () => void;
}

function normalizeDocument(document: BreakdownDocument): BreakdownDocument {
  return {
    assets: document.assets,
    project: {
      ...document.project,
      background: {
        ...document.project.background,
        width: document.project.canvas.width,
        height: document.project.canvas.height,
      },
      title: {
        ...document.project.title,
        x: document.project.canvas.width / 2,
      },
    },
  };
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  ...normalizeDocument(structuredClone(defaultDocument)),
  get selectedSlice() {
    const { project } = get();
    return (
      project.pieChart.slices.find((slice) => slice.id === project.pieChart.selectedSliceId) ??
      null
    );
  },
  loadDocument: (document) =>
    set(normalizeDocument(document)),
  updateCanvas: (updates) =>
    set((state) => {
      const nextCanvas = {
        ...state.project.canvas,
        ...updates,
      };

      return {
        project: {
          ...state.project,
          canvas: nextCanvas,
          background: {
            ...state.project.background,
            width: nextCanvas.width,
            height: nextCanvas.height,
          },
          title: {
            ...state.project.title,
            x: nextCanvas.width / 2,
          },
        },
      };
    }),
  setTitle: (text) => get().updateTitle({ text }),
  updateTitle: (updates) =>
    set((state) => ({
      project: {
        ...state.project,
        title: {
          ...state.project.title,
          ...updates,
        },
      },
    })),
  updatePieChart: (updates) =>
    set((state) => ({
      project: {
        ...state.project,
        pieChart: {
          ...state.project.pieChart,
          ...updates,
        },
      },
    })),
  setSelectedSlice: (sliceId) =>
    set((state) => ({
      project: {
        ...state.project,
        pieChart: {
          ...state.project.pieChart,
          selectedSliceId: sliceId,
        },
      },
    })),
  updateSlice: (sliceId, updates) =>
    set((state) => ({
      project: {
        ...state.project,
        pieChart: {
          ...state.project.pieChart,
          slices: state.project.pieChart.slices.map((slice) =>
            slice.id === sliceId ? { ...slice, ...updates } : slice,
          ),
        },
      },
    })),
  updateSliceImageTransform: (sliceId, updates) =>
    set((state) => ({
      project: {
        ...state.project,
        pieChart: {
          ...state.project.pieChart,
          slices: state.project.pieChart.slices.map((slice) =>
            slice.id === sliceId
              ? {
                  ...slice,
                  imageTransform: {
                    ...slice.imageTransform,
                    ...updates,
                  },
                }
              : slice,
          ),
        },
      },
    })),
  addSlice: () =>
    set((state) => {
      const index = state.project.pieChart.slices.length + 1;
      const id = `slice-${crypto.randomUUID()}`;

      return {
        project: {
          ...state.project,
          pieChart: {
            ...state.project.pieChart,
            selectedSliceId: id,
            slices: [
              ...state.project.pieChart.slices,
              {
                id,
                label: `Deck ${index}`,
                value: 1,
                assetId: null,
                imageTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
              },
            ],
          },
        },
      };
    }),
  removeSelectedSlice: () =>
    set((state) => {
      const selectedSliceId = state.project.pieChart.selectedSliceId;
      const slices = state.project.pieChart.slices.filter((slice) => slice.id !== selectedSliceId);

      return {
        project: {
          ...state.project,
          pieChart: {
            ...state.project.pieChart,
            selectedSliceId: slices[0]?.id ?? null,
            slices,
          },
        },
      };
    }),
  addAsset: (asset) => {
    set((state) => ({
      assets: {
        ...state.assets,
        [asset.id]: asset,
      },
    }));

    return asset.id;
  },
  setBackgroundAsset: (assetId) =>
    set((state) => ({
      project: {
        ...state.project,
        background: {
          ...state.project.background,
          assetId,
        },
      },
    })),
  setLogoAsset: (assetId) =>
    set((state) => ({
      project: {
        ...state.project,
        logo: {
          ...state.project.logo,
          assetId,
        },
      },
    })),
  setSliceAsset: (sliceId, assetId) => get().updateSlice(sliceId, { assetId }),
  exportPng: () => {
    window.dispatchEvent(new CustomEvent("graphic-templater:export-png"));
  },
}));
