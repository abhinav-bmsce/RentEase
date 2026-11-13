import { act, create } from "react-test-renderer";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { PortalShell } from "./portal-shell";
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ userDoc: { name: "Test" }, signOut: vi.fn() }),
}));
vi.mock("@/components/shared/notification-bell", () => ({
  NotificationBell: () => null,
}));
vi.mock("@/components/shared/theme-toggle", () => ({
  ThemeToggle: () => null,
}));
vi.mock("@/components/shared/brand", () => ({ Brand: () => null }));
describe("Connect navigation", () => {
  for (const [kind, path] of [
    ["admin", "/a/messages"],
    ["tenant", "/t/messages"],
  ] as const) {
    it(`exposes a working Messages link in the ${kind} portal`, () => {
      vi.stubGlobal("window", {
        scrollTo: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      let view: ReturnType<typeof create>;
      act(() => {
        view = create(
          <MemoryRouter initialEntries={[path]}>
            <PortalShell kind={kind} />
          </MemoryRouter>,
        );
      });
      const link = view!.root
        .findAllByType("a")
        .find((a) => a.props.href === path);
      expect(link?.props["aria-current"]).toBe("page");
      expect(link?.props["aria-label"]).toBe("Messages");
      act(() => view!.unmount());
      vi.unstubAllGlobals();
    });
  }
});
