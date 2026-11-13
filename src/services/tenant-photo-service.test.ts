import imageCompression from "browser-image-compression";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_PHOTO_LENGTH,
  prepareTenantPhoto,
  validateTenantPhoto,
} from "./tenant-photo-service";
vi.mock("browser-image-compression", () => ({
  default: vi.fn().mockResolvedValue({}),
}));
const photo = "data:image/jpeg;base64,/9j/AA==";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
describe("tenant identification photos", () => {
  it("allows optional photos and removal but rejects external or unsafe content", () => {
    expect(() => validateTenantPhoto("")).not.toThrow();
    expect(() => validateTenantPhoto(photo)).not.toThrow();
    for (const value of [
      "https://example.com/photo.jpg",
      "data:image/svg+xml;base64,AAAA",
      "data:image/jpeg;base64," + "A".repeat(MAX_PHOTO_LENGTH),
    ]) {
      expect(() => validateTenantPhoto(value)).toThrow();
    }
  });
  it("rejects unsupported or oversized files before compression", async () => {
    await expect(
      prepareTenantPhoto({ type: "application/pdf", size: 100 } as File),
    ).rejects.toThrow("JPG");
    await expect(
      prepareTenantPhoto({ type: "image/jpeg", size: 6 * 1024 * 1024 } as File),
    ).rejects.toThrow("5 MB");
    expect(imageCompression).not.toHaveBeenCalled();
  });
  it("compresses, strips EXIF and returns an inline photo for storage", async () => {
    vi.stubGlobal(
      "FileReader",
      class {
        result = photo;
        onload?: () => void;
        readAsDataURL() {
          this.onload?.();
        }
      },
    );
    const file = { type: "image/jpeg", size: 1000 } as File;
    expect(await prepareTenantPhoto(file)).toBe(photo);
    expect(imageCompression).toHaveBeenCalledWith(
      file,
      expect.objectContaining({
        maxWidthOrHeight: 640,
        preserveExif: false,
        fileType: "image/jpeg",
      }),
    );
  });
  it("reports corrupt/unreadable images", async () => {
    vi.stubGlobal(
      "FileReader",
      class {
        onerror?: () => void;
        readAsDataURL() {
          this.onerror?.();
        }
      },
    );
    await expect(
      prepareTenantPhoto({ type: "image/png", size: 100 } as File),
    ).rejects.toThrow("Could not read");
  });
});
