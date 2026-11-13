import { beforeEach, describe, expect, it, vi } from "vitest";
import { initializeFirstAdmin } from "./admin-init-service";
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  login: vi.fn(),
  initialized: vi.fn(),
  set: vi.fn(),
  commit: vi.fn(),
}));
vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: mocks.create,
  signInWithEmailAndPassword: mocks.login,
}));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, collection: string, id: string) => `${collection}/${id}`,
  serverTimestamp: () => "timestamp",
  writeBatch: () => ({ set: mocks.set, commit: mocks.commit }),
}));
vi.mock("@/lib/firebase", () => ({ auth: {}, db: {} }));
vi.mock("@/services/settings-service", () => ({
  isSystemInitialized: mocks.initialized,
}));
const input = {
  username: " Admin ",
  password: "Example123!",
  name: "Owner",
  phone: "1234567890",
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.initialized.mockResolvedValue(false);
  mocks.create.mockResolvedValue({ user: { uid: "owner" } });
  mocks.commit.mockResolvedValue(undefined);
});
describe("first admin registration", () => {
  it("commits the admin profile and setup lock together", async () => {
    const result = await initializeFirstAdmin(input);
    expect(result.email).toBe("admin@rentease.app");
    expect(mocks.set).toHaveBeenCalledWith(
      "users/owner",
      expect.objectContaining({ role: "admin" }),
    );
    expect(mocks.set).toHaveBeenCalledWith(
      "settings/general",
      expect.objectContaining({ bootstrapUid: "owner" }),
    );
    expect(mocks.commit).toHaveBeenCalledTimes(1);
  });
  it("refuses registration after setup is locked", async () => {
    mocks.initialized.mockResolvedValue(true);
    await expect(initializeFirstAdmin(input)).rejects.toThrow(
      "already initialized",
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("recovers interrupted registration only after password authentication", async () => {
    mocks.create.mockRejectedValue({ code: "auth/email-already-in-use" });
    mocks.login.mockResolvedValue({ user: { uid: "existing" } });
    await initializeFirstAdmin(input);
    expect(mocks.login).toHaveBeenCalledWith(
      {},
      "admin@rentease.app",
      input.password,
    );
    expect(mocks.set).toHaveBeenCalledWith(
      "users/existing",
      expect.objectContaining({ role: "admin" }),
    );
  });
  it("does not write profiles when recovery authentication fails", async () => {
    mocks.create.mockRejectedValue({ code: "auth/email-already-in-use" });
    mocks.login.mockRejectedValue(new Error("invalid credentials"));
    await expect(initializeFirstAdmin(input)).rejects.toThrow(
      "invalid credentials",
    );
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it("reports a failed database commit instead of reporting setup success", async () => {
    mocks.commit.mockRejectedValue(new Error("permission denied"));
    await expect(initializeFirstAdmin(input)).rejects.toThrow(
      "permission denied",
    );
  });
});
