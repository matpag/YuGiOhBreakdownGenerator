import type { ProjectAsset } from "../types/project";

export const MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_FILE_SIZE_LABEL = "10 MB";
const IMAGE_FILE_EXTENSION_PATTERN = /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i;

export function fileToAsset(file: File): Promise<ProjectAsset> {
  return blobToAsset(file, file.name, file.type || "application/octet-stream");
}

export async function remoteImageToAsset(url: string, name: string): Promise<ProjectAsset> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Image download failed with status ${response.status}.`);
  }

  const blob = await response.blob();
  const mimeType = blob.type || "application/octet-stream";

  if (!mimeType.startsWith("image/")) {
    throw new Error(`${name} did not download as an image.`);
  }

  if (blob.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    throw new Error(`${name} is larger than ${MAX_IMAGE_FILE_SIZE_LABEL}.`);
  }

  return blobToAsset(blob, withImageExtension(name, mimeType), mimeType);
}

function blobToAsset(blob: Blob, name: string, mimeType: string): Promise<ProjectAsset> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve({
        id: crypto.randomUUID(),
        name,
        mimeType,
        dataUrl: String(reader.result),
      });
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function isImageFile(file: File) {
  return file.type.startsWith("image/") || IMAGE_FILE_EXTENSION_PATTERN.test(file.name);
}

export function validateImageFile(file: File): string | null {
  if (!isImageFile(file)) {
    return `${file.name} is not an image file.`;
  }

  if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    return `${file.name} is larger than ${MAX_IMAGE_FILE_SIZE_LABEL}.`;
  }

  return null;
}

function withImageExtension(name: string, mimeType: string) {
  if (IMAGE_FILE_EXTENSION_PATTERN.test(name)) {
    return name;
  }

  switch (mimeType) {
    case "image/jpeg":
      return `${name}.jpg`;
    case "image/png":
      return `${name}.png`;
    case "image/webp":
      return `${name}.webp`;
    case "image/gif":
      return `${name}.gif`;
    default:
      return name;
  }
}
