import { Capacitor } from "@capacitor/core";
import { AppError } from "../types/errors";

export const MAX_PHOTOS = 5;
export const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
export const MAX_EDGE = 1600;
const QUALITY = 0.82;

async function compress(file: File): Promise<File> {
  if (file.size <= 400_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: QUALITY });
    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/**
 * Photos: at most 5, compressed to a 1600 px long edge before upload. The picker
 * degrades to a file input in the browser, which is how the gate exercises it.
 */
export function usePhotoPicker() {
  function validate(files: File[], existing = 0): File[] {
    if (existing + files.length > MAX_PHOTOS) throw new AppError("PHOTO_LIMIT");
    for (const file of files) {
      // A non-picture is its own answer: "too large" sends the user to compress a file
      // that no amount of compressing would make uploadable.
      if (!file.type.startsWith("image/")) throw new AppError("PHOTO_WRONG_TYPE");
      if (file.size > MAX_SOURCE_BYTES) throw new AppError("PHOTO_TOO_LARGE");
    }
    return files;
  }

  async function prepare(files: File[]): Promise<File[]> {
    return await Promise.all(files.map(compress));
  }

  async function pickFromCamera(): Promise<File | null> {
    if (!Capacitor.isNativePlatform()) return null;
    try {
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
        quality: 80,
        correctOrientation: true,
      });
      if (!photo.webPath) return null;
      const blob = await (await fetch(photo.webPath)).blob();
      return new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
    } catch {
      return null;
    }
  }

  return { validate, prepare, pickFromCamera, maxPhotos: MAX_PHOTOS };
}
