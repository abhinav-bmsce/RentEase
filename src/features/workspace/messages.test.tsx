import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
const mock = vi.hoisted(() => ({
  owner: true,
  user: { uid: "owner" },
  userDoc: { tenancyId: "lease" },
  leases: [
    { id: "lease", roomId: "encoded-id", tenantUid: "tenant", active: true },
  ],
  conversations: [],
  open: vi.fn(),
  contacts: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: mock.user,
    userDoc: mock.userDoc,
    isAdmin: mock.owner,
  }),
}));
vi.mock("@/hooks/use-firestore", () => ({
  useCollectionRealtime: (path: string) => ({
    data: path === "tenancies" ? mock.leases : mock.conversations,
    loading: false,
    error: null,
  }),
}));
vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("@/services/chat-service", () => ({
  openConversation: mock.open,
  unreadCount: () => 0,
  sendMessage: vi.fn(),
  markConversationRead: vi.fn(),
}));
vi.mock("@/services/chat-contacts", () => ({
  loadChatContacts: mock.contacts,
}));
import { MessagesPage } from "./messages";
beforeEach(() => {
  vi.clearAllMocks();
  mock.owner = true;
  mock.open.mockResolvedValue("lease");
  mock.contacts.mockResolvedValue([
    { id: "lease", name: "Sample Tenant", room: "Floor 4 · Room 02" },
  ]);
});
describe("automatic Messages entry", () => {
  it("shows named tenant contacts without a setup dropdown and opens on one click", async () => {
    let view: ReactTestRenderer;
    await act(async () => {
      view = create(
        <MemoryRouter>
          <MessagesPage />
        </MemoryRouter>,
      );
    });
    const rendered = JSON.stringify(view!.toJSON());
    expect(rendered).toContain("Sample Tenant");
    expect(rendered).toContain("Floor 4 · Room 02");
    expect(rendered).not.toContain("encoded-id");
    expect(view!.root.findAllByType("select")).toHaveLength(0);
    const contact = view!.root
      .findAllByType("button")
      .find((b) => b.findAllByType("span").some(span => span.props.children === "Sample Tenant"))!;
    await act(async () => {
      await contact.props.onClick();
    });
    expect(mock.open).toHaveBeenCalledWith("lease");
    act(() => view!.unmount());
  });
  it("automatically opens the tenant’s assigned chat once", async () => {
    mock.owner = false;
    let view: ReactTestRenderer;
    await act(async () => {
      view = create(
        <MemoryRouter>
          <MessagesPage />
        </MemoryRouter>,
      );
    });
    expect(mock.open).toHaveBeenCalledTimes(1);
    expect(mock.open).toHaveBeenCalledWith("lease");
    act(() => view!.unmount());
  });
});
