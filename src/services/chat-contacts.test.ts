import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TenancyDoc, WithId } from "@/lib/types";
const mock = vi.hoisted(() => ({
  records: new Map<string, any>(),
  read: vi.fn(),
}));
vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_: unknown, path: string, id: string) => `${path}/${id}`,
  getDoc: mock.read,
}));
import { loadChatContacts } from "./chat-contacts";
const leases = [
  {
    id: "lease",
    roomId: "encoded-private-room-id",
    tenantUid: "tenant",
    active: true,
  },
] as WithId<TenancyDoc>[];
beforeEach(() => {
  mock.records = new Map([
    ["settings/general", { bootstrapUid: "owner" }],
    [
      "rooms/encoded-private-room-id",
      { propertyId: "p", name: "Room 02", roomNumber: "02", floorNumber: 4 },
    ],
    ["properties/p", { name: "Property" }],
    [
      "users/tenant",
      { name: "Sample Tenant", active: true, tenancyId: "lease" },
    ],
  ]);
  mock.read.mockImplementation(async (path: string) => ({
    exists: () => mock.records.has(path),
    data: () => mock.records.get(path),
  }));
});
describe("chat contact labels and assignment", () => {
  it("resolves tenant name and floor/room instead of encoded IDs", async () => {
    expect(await loadChatContacts("owner", true, leases)).toEqual([
      { id: "lease", name: "Sample Tenant", room: "Floor 4 · Room 02" },
    ]);
  });
  it("excludes another owner’s tenants", async () => {
    expect(await loadChatContacts("other-owner", true, leases)).toEqual([]);
  });
  it("respects explicit ownership and inactive tenant accounts", async () => {
    mock.records.set("properties/p", { ownerUid: "assigned" });
    expect(await loadChatContacts("owner", true, leases)).toEqual([]);
    expect(await loadChatContacts("assigned", true, leases)).toHaveLength(1);
    mock.records.get("users/tenant").active = false;
    expect(await loadChatContacts("assigned", true, leases)).toEqual([]);
  });
  it("only exposes the signed-in tenant’s own contact", async () => {
    expect(await loadChatContacts("tenant", false, leases)).toHaveLength(1);
    expect(await loadChatContacts("other-tenant", false, leases)).toEqual([]);
  });
});
