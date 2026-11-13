import { roomKey, roomLabel } from "@/lib/rooms";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRoom } from "./property-service";
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => name,
  doc: (_db: unknown, collection?: string, id?: string) =>
    id ? `${collection}/${id}` : "rooms/generated",
  runTransaction: mocks.transaction,
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  serverTimestamp: vi.fn(),
  Timestamp: {},
}));
const input = {
  propertyId: "building",
  name: "Room 101",
  floorNumber: 1,
  roomNumber: "101",
  monthlyRent: 800000,
  electricityRate: 800,
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation(async (_db, callback) =>
    callback({ get: mocks.get, set: mocks.set }),
  );
  mocks.get.mockImplementation(async (ref: string) => ({
    exists: () => ref.startsWith("properties/"),
  }));
});
describe("floor and room creation", () => {
  it("saves room numbers and floors with vacant status", async () => {
    await createRoom(input);
    expect(mocks.set).toHaveBeenCalledWith(
      `rooms/${roomKey("building", 1, "101")}`,
      expect.objectContaining({
        floorNumber: 1,
        roomNumber: "101",
        status: "vacant",
        monthlyRent: 800000,
      }),
    );
  });
  it("does not overwrite an existing room", async () => {
    mocks.get.mockResolvedValue({ exists: () => true });
    await expect(createRoom(input)).rejects.toThrow("already exists");
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it("rejects rooms for missing properties", async () => {
    mocks.get.mockResolvedValue({ exists: () => false });
    await expect(createRoom(input)).rejects.toThrow(
      "Property no longer exists",
    );
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it.each([
    { floorNumber: 1.5 },
    { monthlyRent: -1 },
    { electricityRate: NaN },
    { roomNumber: " " },
  ])("rejects invalid room inputs %j", async (change) => {
    await expect(createRoom({ ...input, ...change })).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("allows the same room number on different floors and normalizes case", () => {
    expect(roomKey("building", 1, " 2B ")).toBe(roomKey("building", 1, "2b"));
    expect(roomKey("building", 1, "101")).not.toBe(
      roomKey("building", 2, "101"),
    );
  });
  it("preserves labels for legacy rooms and handles ground and basement floors", () => {
    expect(roomLabel({ name: "Old Room" })).toBe("Old Room");
    expect(
      roomLabel({ name: "Room 001", roomNumber: "001", floorNumber: 0 }),
    ).toBe("Ground floor · Room 001");
    expect(
      roomLabel({ name: "Room B1", roomNumber: "B1", floorNumber: -1 }),
    ).toBe("Floor -1 · Room B1");
  });
});
