import imageCompression from "browser-image-compression";
export const MAX_PHOTO_LENGTH = 300_000;
export function validateTenantPhoto(photoUrl: string): void {
  if (
    photoUrl &&
    (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photoUrl) ||
      photoUrl.length > MAX_PHOTO_LENGTH)
  ) {
    throw new Error(
      "Choose a valid JPG, PNG, or WebP photo under 225 KB after compression.",
    );
  }
}
export async function prepareTenantPhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPG, PNG, or WebP photo.");
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Photo must be 5 MB or smaller.");
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.15,
    maxWidthOrHeight: 640,
    useWebWorker: true,
    fileType: "image/jpeg",
    preserveExif: false,
  });
  const result = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(new Error("Could not read the photo. Please try another image."));
    reader.readAsDataURL(compressed);
  });
  validateTenantPhoto(result);
  return result;
}
