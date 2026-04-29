import type { BreakdownDocument } from "../types/project";

export const defaultDocument: BreakdownDocument = {
  project: {
    version: 1,
    canvas: {
      width: 1080,
      height: 1080,
    },
    title: {
      text: "3vs3 DECK BREAKDOWN (21P) - 21/01/2026",
      x: 540,
      y: 55,
      fontFamily: "Berlin Sans FB",
      fontSize: 44,
      fill: "#000000",
      stroke: "#ffffff",
      strokeWidth: 2,
    },
    background: {
      assetId: null,
      x: 0,
      y: 0,
      width: 1080,
      height: 1080,
      fit: "cover",
    },
    logo: {
      assetId: null,
      x: 1330,
      y: 1360,
      width: 210,
      fit: "contain",
    },
    fonts: [],
    imageLibrary: [],
    pieChart: {
      x: 540,
      y: 600,
      radius: 300,
      startAngle: -90,
      borderColor: "#000000",
      borderWidth: 8,
      labelStyle: {
        fontFamily: "Berlin Sans FB",
        fontSize: 40,
        fill: "#000000",
        stroke: "#ffffff",
        strokeWidth: 2,
      },
      selectedSliceId: "slice-1",
      slices: [
        {
          id: "slice-1",
          label: "Chaos Turbo",
          value: 2,
          assetId: null,
          imageTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
          imageLayers: [
            {
              id: "slice-1-image-1",
              name: "Image 1",
              assetId: null,
              imageTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
            },
          ],
          selectedImageLayerId: "slice-1-image-1",
        },
        {
          id: "slice-2",
          label: "Burn",
          value: 2,
          assetId: null,
          imageTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
          imageLayers: [
            {
              id: "slice-2-image-1",
              name: "Image 1",
              assetId: null,
              imageTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
            },
          ],
          selectedImageLayerId: "slice-2-image-1",
        },
        {
          id: "slice-3",
          label: "Warrior",
          value: 1,
          assetId: null,
          imageTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
          imageLayers: [
            {
              id: "slice-3-image-1",
              name: "Image 1",
              assetId: null,
              imageTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
            },
          ],
          selectedImageLayerId: "slice-3-image-1",
        },
        {
          id: "slice-4",
          label: "Control",
          value: 1,
          assetId: null,
          imageTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
          imageLayers: [
            {
              id: "slice-4-image-1",
              name: "Image 1",
              assetId: null,
              imageTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
            },
          ],
          selectedImageLayerId: "slice-4-image-1",
        },
        {
          id: "slice-5",
          label: "Aggro",
          value: 1,
          assetId: null,
          imageTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
          imageLayers: [
            {
              id: "slice-5-image-1",
              name: "Image 1",
              assetId: null,
              imageTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
            },
          ],
          selectedImageLayerId: "slice-5-image-1",
        },
      ],
    },
  },
  assets: {},
};
