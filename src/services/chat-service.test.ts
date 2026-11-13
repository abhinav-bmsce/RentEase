import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/firebase", () => ({ auth: {}, db: {} }));
import { messageText, unreadCount, type Conversation } from "./chat-service";
describe("Connect message validation", () => {
  it("trims text and rejects empty or oversized messages", () => {
    expect(messageText(" Hello \n")).toBe("Hello");
    expect(() => messageText(" \n\t")).toThrow();
    expect(() => messageText("x".repeat(2001))).toThrow();
    expect(messageText("x".repeat(2000))).toHaveLength(2000);
  });
  it("counts received unread messages without counting own sends", () => {
    const c = {
      ownerSent: 7,
      tenantRead: 4,
      tenantSent: 20,
      ownerRead: 19,
    } as Conversation;
    expect(unreadCount(c, true)).toBe(3);
    expect(unreadCount(c, false)).toBe(1);
  });
});
