import type { BreakdownDocument } from "../types/project";

export const defaultDocument: BreakdownDocument = {
  project: {
    version: 1,
    canvas: {
      width: 1600,
      height: 1600,
    },
    title: {
      text: "3vs3 DECK BREAKDOWN (21P) - 21/01/2026",
      x: 800,
      y: 86,
      fontFamily: "Arial Black",
      fontSize: 54,
      fill: "#ffffff",
      stroke: "#000000",
      strokeWidth: 10,
    },
    background: {
      assetId: null,
      x: 0,
      y: 0,
      width: 1600,
      height: 1600,
      fit: "cover",
    },
    logo: {
      assetId: null,
      x: 1330,
      y: 1360,
      width: 210,
      fit: "contain",
    },
    pieChart: {
      x: 800,
      y: 900,
      radius: 540,
      startAngle: -90,
      borderColor: "#000000",
      borderWidth: 8,
      selectedSliceId: "slice-1",
      slices: [
        {
          id: "slice-1",
          label: "Chaos Turbo",
          value: 2,
          assetId: null,
          imageTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
        },
        {
          id: "slice-2",
          label: "Burn",
          value: 2,
          assetId: null,
          imageTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
        },
        {
          id: "slice-3",
          label: "Warrior",
          value: 1,
          assetId: null,
          imageTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
        },
        {
          id: "slice-4",
          label: "Control",
          value: 1,
          assetId: null,
          imageTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
        },
        {
          id: "slice-5",
          label: "Aggro",
          value: 1,
          assetId: null,
          imageTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
        },
      ],
    },
  },
  assets: {},
};

