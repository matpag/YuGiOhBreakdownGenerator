import JSZip from "jszip";
import { z } from "zod";
import type { AssetId, BreakdownDocument, ProjectAsset } from "../types/project";
import { isFontAsset } from "./fonts";
import { breakdownProjectSchema, parseBreakdownDocument } from "./projectSchema";

export const BREAKDOWN_ARCHIVE_EXTENSION = ".dhbreakdown";
export const BREAKDOWN_ARCHIVE_MIME_TYPE = "application/vnd.dhbreakdown+zip";

const archiveAssetPathSchema = z
  .string()
  .regex(/^(assets|fonts)\/[^/\\]+$/, "Asset files must live directly under assets/ or fonts/.");

const archiveAssetSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    mimeType: z.string().min(1),
    path: archiveAssetPathSchema,
  })
  .strict();

const archiveManifestSchema = z
  .object({
    format: z.literal("dhbreakdown"),
    version: z.literal(1),
    project: breakdownProjectSchema,
    assets: z.record(z.string().min(1), archiveAssetSchema),
  })
  .strict()
  .superRefine((manifest, context) => {
    const paths = new Set<string>();

    for (const [assetId, asset] of Object.entries(manifest.assets)) {
      if (asset.id !== assetId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Asset record key "${assetId}" does not match asset id "${asset.id}".`,
          path: ["assets", assetId, "id"],
        });
      }

      if (paths.has(asset.path)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Asset path "${asset.path}" is used more than once.`,
          path: ["assets", assetId, "path"],
        });
      }

      paths.add(asset.path);
    }
  });

type ArchiveManifest = z.infer<typeof archiveManifestSchema>;
type ArchiveInput = Blob | ArrayBuffer | Uint8Array;

interface DataUrlPayload {
  mimeType: string;
  bytes: Uint8Array;
}

export async function exportBreakdownDocument(document: BreakdownDocument): Promise<Blob> {
  const validatedDocument = parseBreakdownDocument(document);
  const validatedProject = breakdownProjectSchema.parse(validatedDocument.project);
  const zip = new JSZip();
  const manifestAssets: ArchiveManifest["assets"] = {};
  const assetPaths = new Set<string>();

  for (const asset of Object.values(validatedDocument.assets)) {
    const payload = dataUrlToBytes(asset.dataUrl, asset.mimeType);
    const path = uniqueAssetArchivePath(asset, assetPaths);

    manifestAssets[asset.id] = {
      id: asset.id,
      name: asset.name,
      mimeType: payload.mimeType,
      path,
    };

    zip.file(path, payload.bytes);
  }

  const manifest: ArchiveManifest = {
    format: "dhbreakdown",
    version: 1,
    project: validatedProject,
    assets: manifestAssets,
  };

  zip.file("manifest.json", JSON.stringify(archiveManifestSchema.parse(manifest), null, 2));

  return zip.generateAsync({
    type: "blob",
    mimeType: BREAKDOWN_ARCHIVE_MIME_TYPE,
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

export async function importBreakdownDocument(input: ArchiveInput): Promise<BreakdownDocument> {
  const zip = await JSZip.loadAsync(input);
  const manifestFile = zip.file("manifest.json");

  if (!manifestFile) {
    throw new Error("Invalid .dhbreakdown archive: manifest.json is missing.");
  }

  const manifestJson = await manifestFile.async("string");
  const manifest = archiveManifestSchema.parse(JSON.parse(manifestJson));
  const assets: Record<AssetId, ProjectAsset> = {};

  for (const [assetId, manifestAsset] of Object.entries(manifest.assets)) {
    const assetFile = zip.file(manifestAsset.path);

    if (!assetFile) {
      throw new Error(`Invalid .dhbreakdown archive: asset file "${manifestAsset.path}" is missing.`);
    }

    const bytes = await assetFile.async("uint8array");
    assets[assetId] = {
      id: manifestAsset.id,
      name: manifestAsset.name,
      mimeType: manifestAsset.mimeType,
      dataUrl: bytesToDataUrl(bytes, manifestAsset.mimeType),
    };
  }

  return parseBreakdownDocument({
    project: manifest.project,
    assets,
  });
}

function dataUrlToBytes(dataUrl: string, fallbackMimeType: string): DataUrlPayload {
  if (!dataUrl.startsWith("data:")) {
    throw new Error("Asset dataUrl must start with data:.");
  }

  const commaIndex = dataUrl.indexOf(",");

  if (commaIndex === -1) {
    throw new Error("Asset dataUrl is missing a payload separator.");
  }

  const metadata = dataUrl.slice(5, commaIndex);
  const data = dataUrl.slice(commaIndex + 1);
  const metadataParts = metadata.split(";").filter(Boolean);
  const declaredMimeType = metadataParts[0]?.includes("/") ? metadataParts[0] : "";
  const mimeType = declaredMimeType || fallbackMimeType || "application/octet-stream";
  const isBase64 = metadataParts.includes("base64");

  if (isBase64) {
    return {
      mimeType,
      bytes: binaryStringToBytes(atob(data)),
    };
  }

  return {
    mimeType,
    bytes: new TextEncoder().encode(decodeURIComponent(data)),
  };
}

function bytesToDataUrl(bytes: Uint8Array, mimeType: string): string {
  return `data:${mimeType};base64,${bytesToBase64(bytes)}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

function binaryStringToBytes(binary: string): Uint8Array {
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function uniqueAssetArchivePath(asset: ProjectAsset, usedPaths: Set<string>): string {
  const extension = assetExtension(asset);
  const encodedId = encodeURIComponent(asset.id).replace(/\*/g, "%2A");
  const directory = isFontAsset(asset) ? "fonts" : "assets";
  let path = `${directory}/${encodedId}${extension}`;
  let suffix = 2;

  while (usedPaths.has(path)) {
    path = `${directory}/${encodedId}-${suffix}${extension}`;
    suffix += 1;
  }

  usedPaths.add(path);

  return path;
}

function assetExtension(asset: ProjectAsset): string {
  const nameExtension = extensionFromName(asset.name);

  if (nameExtension) {
    return nameExtension;
  }

  switch (asset.mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/svg+xml":
      return ".svg";
    case "image/webp":
      return ".webp";
    case "font/ttf":
    case "application/x-font-ttf":
      return ".ttf";
    case "font/otf":
    case "application/x-font-otf":
      return ".otf";
    case "font/woff":
    case "application/font-woff":
      return ".woff";
    case "font/woff2":
    case "application/font-woff2":
      return ".woff2";
    default:
      return "";
  }
}

function extensionFromName(name: string): string {
  const match = name.match(/(\.[A-Za-z0-9]+)$/);

  return match?.[1]?.toLowerCase() ?? "";
}
