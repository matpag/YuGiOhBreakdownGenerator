import { create } from "zustand";
import { defaultDocument } from "../data/defaultProject";
import { normalizeLabelDistances } from "../lib/geometry";
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
  updateSliceImageLayerTransform: (
    sliceId: string,
    layerId: string,
    updates: Partial<SliceImageTransform>,
  ) => void;
  setSelectedSliceImageLayer: (sliceId: string, layerId: string) => void;
  addSliceImageLayer: (sliceId: string) => void;
  removeSliceImageLayer: (sliceId: string, layerId: string) => void;
  moveSliceImageLayer: (sliceId: string, layerId: string, direction: -1 | 1) => void;
  resetChartLabelsAndImages: () => void;
  addSlice: () => void;
  removeSelectedSlice: () => void;
  addAsset: (asset: ProjectAsset) => AssetId;
  addEmbeddedFont: (font: EmbeddedFont) => void;
  addImageLibraryItem: (item: ImageLibraryItem) => void;
  renameImageLibraryItem: (itemId: string, name: string) => void;
  removeImageLibraryItem: (itemId: string) => void;
  setBackgroundAsset: (assetId: AssetId) => void;
  setSliceAsset: (sliceId: string, assetId: AssetId) => void;
  setSliceImageLayerAsset: (sliceId: string, layerId: string, assetId: AssetId) => void;
  exportPng: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  ...structuredClone(defaultDocument),
  loadDocument: (document) => set(document),
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
    set((state) => {
      const pieChart = {
        ...state.project.pieChart,
        ...updates,
      };
      const labelLayoutChanged =
        updates.startAngle !== undefined ||
        updates.borderWidth !== undefined ||
        updates.labelStyle !== undefined;

      return {
        project: {
          ...state.project,
          pieChart: {
            ...pieChart,
            slices: labelLayoutChanged
              ? normalizeLabelDistances(pieChart)
              : state.project.pieChart.slices,
          },
        },
      };
    }),
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
    set((state) => {
      const slices = state.project.pieChart.slices.map((slice) =>
        slice.id === sliceId ? { ...slice, ...updates } : slice,
      );
      const pieChart = {
        ...state.project.pieChart,
        slices,
      };

      return {
        project: {
          ...state.project,
          pieChart: {
            ...pieChart,
            slices:
              updates.value === undefined
                ? slices
                : normalizeLabelDistances(pieChart),
          },
        },
      };
    }),
  updateSliceImageLayerTransform: (sliceId, layerId, updates) =>
    set((state) => ({
      project: {
        ...state.project,
        pieChart: {
          ...state.project.pieChart,
          slices: state.project.pieChart.slices.map((slice) =>
            slice.id === sliceId
              ? {
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
                }
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

            return {
              ...slice,
              imageLayers: [...slice.imageLayers, layer],
              selectedImageLayerId: layer.id,
            };
          }),
        },
      },
    })),
  removeSliceImageLayer: (sliceId, layerId) =>
    set((state) => {
      let removedAssetId: AssetId | null = null;
      const slices = state.project.pieChart.slices.map((slice) => {
        if (slice.id !== sliceId) {
          return slice;
        }

        const targetLayer = slice.imageLayers.find((layer) => layer.id === layerId);
        removedAssetId = targetLayer?.assetId ?? null;

        if (slice.imageLayers.length <= 1) {
          return {
            ...slice,
            imageLayers: slice.imageLayers.map((layer) =>
              layer.id === layerId
                ? {
                    ...layer,
                    assetId: null,
                    imageTransform: { ...DEFAULT_SLICE_IMAGE_TRANSFORM },
                  }
                : layer,
            ),
            selectedImageLayerId: layerId,
          };
        }

        const imageLayers = slice.imageLayers.filter((layer) => layer.id !== layerId);

        return {
          ...slice,
          imageLayers,
          selectedImageLayerId:
            slice.selectedImageLayerId === layerId ? imageLayers[0].id : slice.selectedImageLayerId,
        };
      });
      const project = {
        ...state.project,
        pieChart: {
          ...state.project.pieChart,
          slices,
        },
      };

      if (!removedAssetId || isAssetReferenced(project, project.imageLibrary, removedAssetId)) {
        return { project };
      }

      const { [removedAssetId]: _removedAsset, ...assets } = state.assets;

      return {
        assets,
        project,
      };
    }),
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

            return {
              ...slice,
              imageLayers,
            };
          }),
        },
      },
    })),
  resetChartLabelsAndImages: () =>
    set((state) => {
      const removedAssetIds = new Set<AssetId>();
      const slices = state.project.pieChart.slices.map((slice) => {
        slice.imageLayers.forEach((layer) => {
          if (layer.assetId) {
            removedAssetIds.add(layer.assetId);
          }
        });

        const defaultLayer = slice.imageLayers[0] ?? {
          id: `slice-image-${crypto.randomUUID()}`,
          name: "Image 1",
          assetId: null,
          imageTransform: { ...DEFAULT_SLICE_IMAGE_TRANSFORM },
        };

        return {
          ...slice,
          labelBox: undefined,
          imageLayers: [
            {
              ...defaultLayer,
              name: "Image 1",
              assetId: null,
              imageTransform: { ...DEFAULT_SLICE_IMAGE_TRANSFORM },
            },
          ],
          selectedImageLayerId: defaultLayer.id,
        };
      });
      const pieChart = {
        ...state.project.pieChart,
        slices,
      };
      const project = {
        ...state.project,
        pieChart: {
          ...pieChart,
          slices: normalizeLabelDistances(pieChart),
        },
      };
      const assets = { ...state.assets };

      for (const assetId of removedAssetIds) {
        if (!isAssetReferenced(project, project.imageLibrary, assetId)) {
          delete assets[assetId];
        }
      }

      return {
        assets,
        project,
      };
    }),
  addSlice: () =>
    set((state) => {
      const index = state.project.pieChart.slices.length + 1;
      const id = `slice-${crypto.randomUUID()}`;
      const layerId = `slice-image-${crypto.randomUUID()}`;
      const slices = [
        ...state.project.pieChart.slices,
        {
          id,
          label: `Deck ${index}`,
          labelDistance: 0,
          value: 1,
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
      ];
      const pieChart = {
        ...state.project.pieChart,
        selectedSliceId: id,
        slices,
      };

      return {
        project: {
          ...state.project,
          pieChart: {
            ...pieChart,
            slices: normalizeLabelDistances(pieChart),
          },
        },
      };
    }),
  removeSelectedSlice: () =>
    set((state) => {
      const selectedSliceId = state.project.pieChart.selectedSliceId;
      const slices = state.project.pieChart.slices.filter((slice) => slice.id !== selectedSliceId);
      const pieChart = {
        ...state.project.pieChart,
        selectedSliceId: slices[0]?.id ?? null,
        slices,
      };

      return {
        project: {
          ...state.project,
          pieChart: {
            ...pieChart,
            slices: normalizeLabelDistances(pieChart),
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
  renameImageLibraryItem: (itemId, name) =>
    set((state) => {
      const trimmedName = name.trim();

      if (!trimmedName) {
        return state;
      }

      return {
        project: {
          ...state.project,
          imageLibrary: state.project.imageLibrary.map((item) =>
            item.id === itemId ? { ...item, name: trimmedName } : item,
          ),
        },
      };
    }),
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

            const firstLayer = slice.imageLayers[0];

            if (!firstLayer) {
              const layer: SliceImageLayer = {
                id: `slice-image-${crypto.randomUUID()}`,
                name: "Image 1",
                assetId,
                imageTransform: { ...DEFAULT_SLICE_IMAGE_TRANSFORM },
              };

              return {
                ...slice,
                imageLayers: [layer],
                selectedImageLayerId: layer.id,
              };
            }

            if (firstLayer.assetId) {
              const layer: SliceImageLayer = {
                id: `slice-image-${crypto.randomUUID()}`,
                name: `Image ${slice.imageLayers.length + 1}`,
                assetId,
                imageTransform: { ...DEFAULT_SLICE_IMAGE_TRANSFORM },
              };

              return {
                ...slice,
                imageLayers: [...slice.imageLayers, layer],
                selectedImageLayerId: layer.id,
              };
            }

            return {
              ...slice,
              imageLayers: slice.imageLayers.map((layer) =>
                layer.id === firstLayer.id ? { ...layer, assetId } : layer,
              ),
              selectedImageLayerId: firstLayer.id,
            };
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
              ? {
                  ...slice,
                  imageLayers: slice.imageLayers.map((layer) =>
                    layer.id === layerId ? { ...layer, assetId } : layer,
                  ),
                  selectedImageLayerId: layerId,
                }
              : slice,
          ),
        },
      },
    })),
  exportPng: () => {
    window.dispatchEvent(new CustomEvent("deck-breakdown-maker:export-png"));
  },
}));

function isAssetReferenced(
  project: BreakdownDocument["project"],
  imageLibrary: ImageLibraryItem[],
  assetId: AssetId,
) {
  return [
    project.background.assetId,
    ...project.fonts.map((font) => font.assetId),
    ...imageLibrary.map((item) => item.assetId),
    ...project.pieChart.slices.flatMap((slice) =>
      slice.imageLayers.map((layer) => layer.assetId),
    ),
  ].includes(assetId);
}
