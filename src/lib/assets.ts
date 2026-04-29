import type { ProjectAsset } from "../types/project";

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

