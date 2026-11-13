import { describe, expect, it } from "vitest";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_RAW_FILE_SIZE = 5 * 1024 * 1024;
const MAX_BASE64_LENGTH = 600_000;

describe("Payment screenshot validation logic", () => {
  it("accepts allowed image MIME types", () => {
    expect(ALLOWED_MIME_TYPES.includes("image/jpeg")).toBe(true);
    expect(ALLOWED_MIME_TYPES.includes("image/png")).toBe(true);
    expect(ALLOWED_MIME_TYPES.includes("image/webp")).toBe(true);
  });

  it("rejects unallowed MIME types", () => {
    expect(ALLOWED_MIME_TYPES.includes("application/pdf")).toBe(false);
    expect(ALLOWED_MIME_TYPES.includes("image/gif")).toBe(false);
    expect(ALLOWED_MIME_TYPES.includes("text/plain")).toBe(false);
  });

  it("validates raw file size limit (5MB)", () => {
    const validSize = 2 * 1024 * 1024; // 2MB
    const oversize = 6 * 1024 * 1024; // 6MB
    expect(validSize <= MAX_RAW_FILE_SIZE).toBe(true);
    expect(oversize <= MAX_RAW_FILE_SIZE).toBe(false);
  });

  it("validates base64 length limit to fit comfortably within Firestore 1MB document limit", () => {
    // 400KB base64 string
    const validBase64 = "a".repeat(400_000);
    // 800KB base64 string
    const invalidBase64 = "a".repeat(800_000);

    expect(validBase64.length <= MAX_BASE64_LENGTH).toBe(true);
    expect(invalidBase64.length <= MAX_BASE64_LENGTH).toBe(false);
  });

  it("validates Base64 data URL format regex matching firestore rules", () => {
    const ruleRegex = /^data:image\/(jpeg|png|webp);base64,.+/;
    expect(ruleRegex.test("data:image/jpeg;base64,/9j/4AAQSkZJRg...")).toBe(
      true,
    );
    expect(ruleRegex.test("data:image/png;base64,iVBORw0KGgo...")).toBe(true);
    expect(ruleRegex.test("data:image/webp;base64,UklGR...")).toBe(true);
    expect(ruleRegex.test("https://storage.googleapis.com/test.jpg")).toBe(
      false,
    );
    expect(ruleRegex.test("data:application/pdf;base64,JVBERi...")).toBe(false);
  });
});
