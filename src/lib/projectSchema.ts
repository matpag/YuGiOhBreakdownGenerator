import { z } from "zod";
import type { BreakdownDocument } from "../types/project";

const finiteNumberSchema = z.number().finite();
const positiveNumberSchema = finiteNumberSchema.positive();
const nonNegativeNumberSchema = finiteNumberSchema.nonnegative();
const assetIdSchema = z.string().min(1);
const nullableAssetIdSchema = assetIdSchema.nullable();

export const canvasSettingsSchema = z
  .object({
    width: positiveNumberSchema,
    height: positiveNumberSchema,
  })
  .strict();

export const textStyleSchema = z
  .object({
    text: z.string(),
    x: finiteNumberSchema,
    y: finiteNumberSchema,
    fontFamily: z.string().min(1),
    fontSize: positiveNumberSchema,
    fill: z.string().min(1),
    stroke: z.string().min(1),
    strokeWidth: nonNegativeNumberSchema,
  })
  .strict();

export const imageLayerSchema = z
  .object({
    assetId: nullableAssetIdSchema,
    x: finiteNumberSchema,
    y: finiteNumberSchema,
    width: positiveNumberSchema,
    height: positiveNumberSchema.optional(),
    fit: z.enum(["cover", "contain"]),
  })
  .strict();

export const sliceImageTransformSchema = z
  .object({
    x: finiteNumberSchema,
    y: finiteNumberSchema,
    scale: positiveNumberSchema,
    rotation: finiteNumberSchema,
  })
  .strict();

export const chartSliceSchema = z
  .object({
    id: z.string().min(1),
    label: z.string(),
    value: nonNegativeNumberSchema,
    assetId: nullableAssetIdSchema,
    imageTransform: sliceImageTransformSchema,
  })
  .strict();

export const pieChartSettingsSchema = z
  .object({
    x: finiteNumberSchema,
    y: finiteNumberSchema,
    radius: positiveNumberSchema,
    startAngle: finiteNumberSchema,
    borderColor: z.string().min(1),
    borderWidth: nonNegativeNumberSchema,
    selectedSliceId: z.string().min(1).nullable(),
    slices: z.array(chartSliceSchema),
  })
  .strict()
  .superRefine((pieChart, context) => {
    const sliceIds = new Set<string>();

    for (const [index, slice] of pieChart.slices.entries()) {
      if (sliceIds.has(slice.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate slice id "${slice.id}".`,
          path: ["slices", index, "id"],
        });
      }

      sliceIds.add(slice.id);
    }

    if (pieChart.selectedSliceId !== null && !sliceIds.has(pieChart.selectedSliceId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Selected slice "${pieChart.selectedSliceId}" does not exist.`,
        path: ["selectedSliceId"],
      });
    }
  });

export const breakdownProjectSchema = z
  .object({
    version: z.literal(1),
    canvas: canvasSettingsSchema,
    title: textStyleSchema,
    background: imageLayerSchema,
    logo: imageLayerSchema,
    pieChart: pieChartSettingsSchema,
  })
  .strict();

export const projectAssetSchema = z
  .object({
    id: assetIdSchema,
    name: z.string().min(1),
    mimeType: z.string().min(1),
    dataUrl: z.string().startsWith("data:"),
  })
  .strict();

export const breakdownDocumentSchema = z
  .object({
    project: breakdownProjectSchema,
    assets: z.record(assetIdSchema, projectAssetSchema),
  })
  .strict()
  .superRefine((document, context) => {
    const assetIds = new Set(Object.keys(document.assets));
    const referencedAssetIds = [
      document.project.background.assetId,
      document.project.logo.assetId,
      ...document.project.pieChart.slices.map((slice) => slice.assetId),
    ].filter((assetId): assetId is string => assetId !== null);

    for (const [assetId, asset] of Object.entries(document.assets)) {
      if (asset.id !== assetId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Asset record key "${assetId}" does not match asset id "${asset.id}".`,
          path: ["assets", assetId, "id"],
        });
      }
    }

    for (const assetId of referencedAssetIds) {
      if (!assetIds.has(assetId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Referenced asset "${assetId}" is missing from document assets.`,
          path: ["assets"],
        });
      }
    }
  }) satisfies z.ZodType<BreakdownDocument>;

export function parseBreakdownDocument(value: unknown): BreakdownDocument {
  return breakdownDocumentSchema.parse(value);
}

export function safeParseBreakdownDocument(value: unknown) {
  return breakdownDocumentSchema.safeParse(value);
}
