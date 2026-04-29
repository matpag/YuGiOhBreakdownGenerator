import type { AssetId, EmbeddedFont, ProjectAsset } from "../types/project";

export const FONT_FILE_ACCEPT = ".ttf,.otf,.woff,.woff2,font/*";

const registeredFonts = new Set<string>();

export function inferFontFamilyFromFileName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isFontAsset(asset: ProjectAsset) {
  const extension = asset.name.split(".").pop()?.toLowerCase() ?? "";

  return (
    asset.mimeType.startsWith("font/") ||
    asset.mimeType === "application/font-woff" ||
    asset.mimeType === "application/font-woff2" ||
    asset.mimeType === "application/vnd.ms-fontobject" ||
    ["ttf", "otf", "woff", "woff2"].includes(extension)
  );
}

export async function registerEmbeddedFont(font: EmbeddedFont, asset: ProjectAsset | undefined) {
  if (!asset || !isFontAsset(asset) || registeredFonts.has(font.id)) {
    return;
  }

  const fontFace = new FontFace(font.family, `url(${asset.dataUrl})`);
  await fontFace.load();
  document.fonts.add(fontFace);
  registeredFonts.add(font.id);
}

export async function registerEmbeddedFonts(
  fonts: EmbeddedFont[] | undefined,
  assets: Record<AssetId, ProjectAsset>,
) {
  await Promise.all((fonts ?? []).map((font) => registerEmbeddedFont(font, assets[font.assetId])));
}

