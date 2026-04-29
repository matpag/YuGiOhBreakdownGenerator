import { create } from "zustand";
import { defaultDocument } from "../data/defaultProject";
import type {
  AssetId,
  BreakdownDocument,
  CanvasSettings,
  ChartSlice,
  EmbeddedFont,
  ImageLibraryItem,
  PieChartSettings,
  ProjectAsset,
  SliceImageLayer,
  SliceImageTransform,
  TextStyle,
} from "../types/project";

const DEFAULT_SLICE_IMAGE_TRANSFORM: SliceImageTransform = { x: 0, y: 0, scale: 1, rotation: 0 };

interface ProjectState extends BreakdownDocument {
  project: BreakdownDocument["project"];
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
  updateSliceImageLayerTransform: (
    sliceId: string,
    layerId: string,
    updates: Partial<SliceImageTransform>,
  ) => void;
  setSelectedSliceImageLayer: (sliceId: string, layerId: string) => void;
  addSliceImageLayer: (sliceId: string) => void;
  removeSliceImageLayer: (sliceId: string, layerId: string) => void;
  moveSliceImageLayer: (sliceId: string, layerId: string, direction: -1 | 1) => void;
  addSlice: () => void;
  removeSelectedSlice: () => void;
  addAsset: (asset: ProjectAsset) => AssetId;
  addEmbeddedFont: (font: EmbeddedFont) => void;
  addImageLibraryItem: (item: ImageLibraryItem) => void;
  removeImageLibraryItem: (itemId: string) => void;
  setBackgroundAsset: (assetId: AssetId) => void;
  setSliceAsset: (sliceId: string, assetId: AssetId) => void;
  setSliceImageLayerAsset: (sliceId: string, layerId: string, assetId: AssetId) => void;
  exportPng: () => void;
}

function normalizeDocument(document: BreakdownDocument): BreakdownDocument {
  return {
    assets: document.assets,
    project: {
      ...document.project,
      fonts: document.project.fonts ?? [],
      imageLibrary: document.project.imageLibrary ?? [],
      background: {
        ...document.project.background,
        width: document.project.canvas.width,
        height: document.project.canvas.height,
      },
      title: {
        ...document.project.title,
        x: document.project.canvas.width / 2,
      },
      pieChart: {
        ...document.project.pieChart,
        slices: document.project.pieChart.slices.map(normalizeSlice),
      },
    },
  };
}

function normalizeSlice(slice: ChartSlice): ChartSlice {
  const imageLayers =
    slice.imageLayers.length > 0
      ? slice.imageLayers
      : [
          {
            id: `${slice.id}-image-1`,
            name: "Image 1",
            assetId: slice.assetId,
            imageTransform: slice.imageTransform,
          },
        ];
  const selectedImageLayerId = imageLayers.some((layer) => layer.id === slice.selectedImageLayerId)
    ? slice.selectedImageLayerId
    : imageLayers[0]?.id ?? null;

  return syncLegacySliceFields({
    ...slice,
    imageLayers,
    selectedImageLayerId,
  });
}

function syncLegacySliceFields(slice: ChartSlice): ChartSlice {
  const primaryLayer = slice.imageLayers[0];

  return {
    ...slice,
    assetId: primaryLayer?.assetId ?? null,
    imageTransform: primaryLayer?.imageTransform ?? slice.imageTransform,
  };
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  ...normalizeDocument(structuredClone(defaultDocument)),
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
            slice.id === sliceId ? updateActiveSliceImageLayerTransform(slice, updates) : slice,
          ),
        },
      },
    })),
  updateSliceImageLayerTransform: (sliceId, layerId, updates) =>
    set((state) => ({
      project: {
        ...state.project,
        pieChart: {
          ...state.project.pieChart,
          slices: state.project.pieChart.slices.map((slice) =>
            slice.id === sliceId
              ? syncLegacySliceFields({
                  ...slice,
                  imageLayers: slice.imageLayers.map((layer) =>
                    layer.id === layerId
                      ? {
                          ...layer,
                          imageTransform: {
                            ...layer.imageTransform,
                            ...updates,
                          },
                        }
                      : layer,
                  ),
                })
              : slice,
          ),
        },
      },
    })),
  setSelectedSliceImageLayer: (sliceId, layerId) =>
    set((state) => ({
      project: {
        ...state.project,
        pieChart: {
          ...state.project.pieChart,
          slices: state.project.pieChart.slices.map((slice) =>
            slice.id === sliceId && slice.imageLayers.some((layer) => layer.id === layerId)
              ? {
                  ...slice,
                  selectedImageLayerId: layerId,
                }
              : slice,
          ),
        },
      },
    })),
  addSliceImageLayer: (sliceId) =>
    set((state) => ({
      project: {
        ...state.project,
        pieChart: {
          ...state.project.pieChart,
          slices: state.project.pieChart.slices.map((slice) => {
            if (slice.id !== sliceId) {
              return slice;
            }

            const layer: SliceImageLayer = {
              id: `slice-image-${crypto.randomUUID()}`,
              name: `Image ${slice.imageLayers.length + 1}`,
              assetId: null,
              imageTransform: { ...DEFAULT_SLICE_IMAGE_TRANSFORM },
            };

            return syncLegacySliceFields({
              ...slice,
              imageLayers: [...slice.imageLayers, layer],
              selectedImageLayerId: layer.id,
            });
          }),
        },
      },
    })),
  removeSliceImageLayer: (sliceId, layerId) =>
    set((state) => ({
      project: {
        ...state.project,
        pieChart: {
          ...state.project.pieChart,
          slices: state.project.pieChart.slices.map((slice) => {
            if (slice.id !== sliceId || slice.imageLayers.length <= 1) {
              return slice;
            }

            const imageLayers = slice.imageLayers.filter((layer) => layer.id !== layerId);

            return syncLegacySliceFields({
              ...slice,
              imageLayers,
              selectedImageLayerId:
                slice.selectedImageLayerId === layerId
                  ? imageLayers[0]?.id ?? null
                  : slice.selectedImageLayerId,
            });
          }),
        },
      },
    })),
  moveSliceImageLayer: (sliceId, layerId, direction) =>
    set((state) => ({
      project: {
        ...state.project,
        pieChart: {
          ...state.project.pieChart,
          slices: state.project.pieChart.slices.map((slice) => {
            if (slice.id !== sliceId) {
              return slice;
            }

            const currentIndex = slice.imageLayers.findIndex((layer) => layer.id === layerId);
            const nextIndex = currentIndex + direction;

            if (
              currentIndex === -1 ||
              nextIndex < 0 ||
              nextIndex >= slice.imageLayers.length
            ) {
              return slice;
            }

            const imageLayers = [...slice.imageLayers];
            const [layer] = imageLayers.splice(currentIndex, 1);
            imageLayers.splice(nextIndex, 0, layer);

            return syncLegacySliceFields({
              ...slice,
              imageLayers,
            });
          }),
        },
      },
    })),
  addSlice: () =>
    set((state) => {
      const index = state.project.pieChart.slices.length + 1;
      const id = `slice-${crypto.randomUUID()}`;
      const layerId = `slice-image-${crypto.randomUUID()}`;

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
                labelDistance: 96,
                value: 1,
                assetId: null,
                imageTransform: { ...DEFAULT_SLICE_IMAGE_TRANSFORM },
                imageLayers: [
                  {
                    id: layerId,
                    name: "Image 1",
                    assetId: null,
                    imageTransform: { ...DEFAULT_SLICE_IMAGE_TRANSFORM },
                  },
                ],
                selectedImageLayerId: layerId,
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
  addEmbeddedFont: (font) =>
    set((state) => ({
      project: {
        ...state.project,
        fonts: [
          ...state.project.fonts.filter(
            (existingFont) =>
              existingFont.id !== font.id && existingFont.family !== font.family,
          ),
          font,
        ],
      },
    })),
  addImageLibraryItem: (item) =>
    set((state) => ({
      project: {
        ...state.project,
        imageLibrary: [
          ...state.project.imageLibrary.filter(
            (existingItem) => existingItem.id !== item.id && existingItem.assetId !== item.assetId,
          ),
          item,
        ],
      },
    })),
  removeImageLibraryItem: (itemId) =>
    set((state) => {
      const item = state.project.imageLibrary.find(
        (libraryItem) => libraryItem.id === itemId,
      );
      const imageLibrary = state.project.imageLibrary.filter(
        (libraryItem) => libraryItem.id !== itemId,
      );

      if (!item || isAssetReferenced(state.project, imageLibrary, item.assetId)) {
        return {
          project: {
            ...state.project,
            imageLibrary,
          },
        };
      }

      const { [item.assetId]: _removedAsset, ...assets } = state.assets;

      return {
        assets,
        project: {
          ...state.project,
          imageLibrary,
        },
      };
    }),
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
  setSliceAsset: (sliceId, assetId) =>
    set((state) => ({
      project: {
        ...state.project,
        pieChart: {
          ...state.project.pieChart,
          slices: state.project.pieChart.slices.map((slice) => {
            if (slice.id !== sliceId) {
              return slice;
            }

            const selectedLayerId = slice.selectedImageLayerId ?? slice.imageLayers[0]?.id;
            const targetLayerId =
              selectedLayerId ?? `slice-image-${crypto.randomUUID()}`;
            const existingLayers =
              slice.imageLayers.length > 0
                ? slice.imageLayers
                : [
                    {
                      id: targetLayerId,
                      name: "Image 1",
                      assetId: null,
                      imageTransform: { ...DEFAULT_SLICE_IMAGE_TRANSFORM },
                    },
                  ];

            return syncLegacySliceFields({
              ...slice,
              imageLayers: existingLayers.map((layer) =>
                layer.id === targetLayerId ? { ...layer, assetId } : layer,
              ),
              selectedImageLayerId: targetLayerId,
            });
          }),
        },
      },
    })),
  setSliceImageLayerAsset: (sliceId, layerId, assetId) =>
    set((state) => ({
      project: {
        ...state.project,
        pieChart: {
          ...state.project.pieChart,
          slices: state.project.pieChart.slices.map((slice) =>
            slice.id === sliceId
              ? syncLegacySliceFields({
                  ...slice,
                  imageLayers: slice.imageLayers.map((layer) =>
                    layer.id === layerId ? { ...layer, assetId } : layer,
                  ),
                  selectedImageLayerId: layerId,
                })
              : slice,
          ),
        },
      },
    })),
  exportPng: () => {
    window.dispatchEvent(new CustomEvent("deck-breakdown-maker:export-png"));
  },
}));

function updateActiveSliceImageLayerTransform(
  slice: ChartSlice,
  updates: Partial<SliceImageTransform>,
) {
  const targetLayerId = slice.selectedImageLayerId ?? slice.imageLayers[0]?.id;

  if (!targetLayerId) {
    return syncLegacySliceFields({
      ...slice,
      imageTransform: {
        ...slice.imageTransform,
        ...updates,
      },
    });
  }

  return syncLegacySliceFields({
    ...slice,
    imageLayers: slice.imageLayers.map((layer) =>
      layer.id === targetLayerId
        ? {
            ...layer,
            imageTransform: {
              ...layer.imageTransform,
              ...updates,
            },
          }
        : layer,
    ),
    selectedImageLayerId: targetLayerId,
  });
}

function isAssetReferenced(
  project: BreakdownDocument["project"],
  imageLibrary: ImageLibraryItem[],
  assetId: AssetId,
) {
  return [
    project.background.assetId,
    project.logo.assetId,
    ...project.fonts.map((font) => font.assetId),
    ...imageLibrary.map((item) => item.assetId),
    ...project.pieChart.slices.map((slice) => slice.assetId),
    ...project.pieChart.slices.flatMap((slice) =>
      slice.imageLayers.map((layer) => layer.assetId),
    ),
  ].includes(assetId);
}
