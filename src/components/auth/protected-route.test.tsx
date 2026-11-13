import { MemoryRouter, Route, Routes } from "react-router-dom";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "./protected-route";
const state = vi.hoisted(() => ({ value: {} as any }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => state.value }));
function render(role: "admin" | "tenant" = "tenant") {
  let r: ReactTestRenderer;
  act(() => {
    r = create(
      <MemoryRouter
        initialEntries={["/private"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route
            path="/private"
            element={
              <ProtectedRoute requiredRole={role}>
                <h1>Private page</h1>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<h1>Login</h1>} />
          <Route path="/change-password" element={<h1>Change password</h1>} />
          <Route path="/a" element={<h1>Owner home</h1>} />
          <Route path="/t" element={<h1>Tenant home</h1>} />
        </Routes>
      </MemoryRouter>,
    );
  });
  return r!;
}
beforeEach(() => {
  state.value = {
    user: { uid: "tenant" },
    userDoc: { role: "tenant", active: true, mustChangePassword: false },
    loading: false,
    signOut: vi.fn(),
  };
});
describe("protected navigation", () => {
  it("renders a tenant destination", () => {
    const r = render();
    expect(JSON.stringify(r.toJSON())).toContain("Private page");
    r.unmount();
  });
  it("redirects an expired session to login", () => {
    state.value.user = null;
    state.value.userDoc = null;
    const r = render();
    expect(JSON.stringify(r.toJSON())).toContain("Login");
    r.unmount();
  });
  it("redirects a tenant away from owner routes without looping", () => {
    const r = render("admin");
    expect(JSON.stringify(r.toJSON())).toContain("Tenant home");
    r.unmount();
  });
  it("keeps inactive users out even if a password change is required", () => {
    state.value.userDoc.active = false;
    state.value.userDoc.mustChangePassword = true;
    const r = render();
    expect(JSON.stringify(r.toJSON())).toContain("Account Deactivated");
    r.unmount();
  });
  it("shows a loading state before authorization is known", () => {
    state.value.loading = true;
    const r = render();
    expect(JSON.stringify(r.toJSON())).toContain("Loading");
    r.unmount();
  });
});
