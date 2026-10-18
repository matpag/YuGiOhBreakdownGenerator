import type { TranslationKey, UiMessage } from "./I18nProvider";

// Keep archive/asset APIs and their data independent of the interface language.
// Store descriptors rather than translated strings so existing errors follow a language switch.
export function describeUiError(error: unknown, fallback: TranslationKey): UiMessage {
  const text = typeof error === "string" ? error : error instanceof Error ? error.message : "";
  let match: RegExpMatchArray | null;
  if ((match = text.match(/^(.*) is not an image file\.$/s))) return { key: "imageTypeError", values: { name: match[1] } };
  if ((match = text.match(/^(.*) is larger than (.*)\.$/s))) return { key: "imageSizeError", values: { name: match[1], limit: match[2] } };
  if ((match = text.match(/^(.*) did not download as an image\.$/s))) return { key: "downloadNotImageError", values: { name: match[1] } };
  if ((match = text.match(/^Image download failed with status (\d+)\.$/))) return { key: "imageDownloadError", values: { status: match[1] } };
  if ((match = text.match(/^DeviantArt search failed with status (\d+)\.$/))) return { key: "searchHttpError", values: { status: match[1] } };
  if (text === "DeviantArt returned an unreadable search response.") return { key: "searchParseError" };
  if (text === "Invalid .dhbreakdown archive: manifest.json is missing.") return { key: "archiveManifestMissing" };
  if ((match = text.match(/^Invalid \.dhbreakdown archive: asset file "(.*)" is missing\.$/s))) return { key: "archiveAssetMissing", values: { path: match[1] } };
  if (text.startsWith("Asset dataUrl")) return { key: "archiveExportError" };
  if (error instanceof Error) {
    if (error.name === "ZodError" || error.name === "SyntaxError") return { key: "invalidProject" };
    if (["NotAllowedError", "SecurityError"].includes(error.name)) return { key: "permissionError" };
    if (error.name === "NotFoundError") return { key: "missingFileError" };
    if (error.name === "TypeError" && /fetch|network/i.test(text)) return { key: "networkError" };
  }
  return { key: fallback };
}
