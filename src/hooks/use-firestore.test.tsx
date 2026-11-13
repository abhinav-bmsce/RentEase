import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCollectionRealtime, useDocumentRealtime } from "./use-firestore";
const mocks = vi.hoisted(() => ({ listen: vi.fn(), stop: vi.fn() }));
vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, path: string) => path,
  doc: (_db: unknown, path: string, id: string) => `${path}/${id}`,
  query: (path: string, ...constraints: unknown[]) => ({ path, constraints }),
  queryEqual: (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b),
  onSnapshot: mocks.listen,
}));
let result: any;
function Collection({ id, enabled = true }: { id: string; enabled?: boolean }) {
  result = useCollectionRealtime(
    "bills",
    [{ type: "where", value: id } as any],
    enabled,
  );
  return null;
}
function Document({ id }: { id: string | null }) {
  result = useDocumentRealtime("rooms", id);
  return null;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.listen.mockReturnValue(mocks.stop);
});
describe("navigation subscriptions", () => {
  it("keeps equal queries stable and unsubscribes when tenant changes", () => {
    let r: ReactTestRenderer;
    act(() => {
      r = create(<Collection id="alice" />);
    });
    expect(mocks.listen).toHaveBeenCalledTimes(1);
    act(() => {
      r.update(<Collection id="alice" />);
    });
    expect(mocks.listen).toHaveBeenCalledTimes(1);
    act(() => {
      r.update(<Collection id="bob" />);
    });
    expect(mocks.stop).toHaveBeenCalledTimes(1);
    expect(mocks.listen).toHaveBeenCalledTimes(2);
    act(() => r.unmount());
    expect(mocks.stop).toHaveBeenCalledTimes(2);
  });
  it("ends loading on API failure and exposes the error", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    let r: ReactTestRenderer;
    act(() => {
      r = create(<Collection id="alice" />);
    });
    const error = Object.assign(new Error("Denied"), {
      code: "permission-denied",
    });
    act(() => mocks.listen.mock.calls[0]![2](error));
    expect(result.loading).toBe(false);
    expect(result.error).toBe(error);
    act(() => r.unmount());
    log.mockRestore();
  });
  it("does not subscribe when signed out", () => {
    let r: ReactTestRenderer;
    act(() => {
      r = create(<Collection id="" enabled={false} />);
    });
    expect(mocks.listen).not.toHaveBeenCalled();
    expect(result.loading).toBe(false);
    act(() => r.unmount());
  });
  it("clears the previous room when its id changes or becomes unavailable", () => {
    let r: ReactTestRenderer;
    act(() => {
      r = create(<Document id="one" />);
    });
    act(() =>
      mocks.listen.mock.calls[0]![1]({
        exists: () => true,
        id: "one",
        data: () => ({ name: "Room one" }),
      }),
    );
    expect(result.data.name).toBe("Room one");
    act(() => r.update(<Document id="two" />));
    expect(result.data).toBeNull();
    act(() => r.update(<Document id={null} />));
    expect(result.data).toBeNull();
    expect(result.loading).toBe(false);
    act(() => r.unmount());
  });
});

describe("offline loading recovery", () => {
  it("ends an unanswered request and recovers when a snapshot arrives", () => {
    vi.useFakeTimers();
    let r: ReactTestRenderer;
    act(() => { r = create(<Collection id="alice" />); });
    act(() => { vi.advanceTimersByTime(15000); });
    expect(result.loading).toBe(false);
    expect(result.error?.message).toContain("Connection timed out");
    act(() => mocks.listen.mock.calls[0]![1]({ docs: [] }));
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
    act(() => r.unmount());
    vi.useRealTimers();
  });
  it("cancels the timeout after a document arrives", () => {
    vi.useFakeTimers();
    let r: ReactTestRenderer;
    act(() => { r = create(<Document id="one" />); });
    act(() => mocks.listen.mock.calls[0]![1]({exists: () => false}));
    act(() => { vi.advanceTimersByTime(15000); });
    expect(result.error).toBeNull();
    expect(result.loading).toBe(false);
    act(() => r.unmount());
    vi.useRealTimers();
  });
});
