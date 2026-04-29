import type { ProjectAsset } from "../types/project";

export const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_FILE_SIZE_LABEL = "5 MB";
const IMAGE_FILE_EXTENSION_PATTERN = /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i;

export function fileToAsset(file: File): Promise<ProjectAsset> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        dataUrl: String(reader.result),
      });
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
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
