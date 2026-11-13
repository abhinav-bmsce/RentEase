import { AppErrorBoundary } from "@/components/shared/app-error-boundary";
import { Brand } from "@/components/shared/brand";
import { NotificationBell } from "@/components/shared/notification-bell";
import { PageSkeleton } from "@/components/shared/page-ui";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  ClipboardCheck,
  CreditCard,
  FileText,
  FolderLock,
  History,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Receipt,
  Settings,
  Shield,
  User,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
const adminItems = [
  { path: "/a/messages", icon: MessageSquare, label: "Messages" },
  { path: "/a", icon: LayoutDashboard, label: "Overview" },
  { path: "/a/occupancy", icon: Home, label: "Rooms & occupancy" },
  { path: "/a/documents", icon: FolderLock, label: "Document records" },
  { path: "/a/maintenance", icon: Wrench, label: "Maintenance" },
  { path: "/a/inspections", icon: ClipboardCheck, label: "Inspections" },
  { path: "/a/notifications", icon: Bell, label: "Notifications" },
  { path: "/a/tenants", icon: Users, label: "Tenants" },
  { path: "/a/properties", icon: Building2, label: "Properties" },
  { path: "/a/billing", icon: Receipt, label: "Billing" },
  { path: "/a/payments", icon: CreditCard, label: "Payments" },
  { path: "/a/deposits", icon: Shield, label: "Deposits" },
  { path: "/a/reports", icon: BarChart3, label: "Reports" },
  { path: "/a/settings", icon: Settings, label: "Settings" },
];
const tenantItems = [
  { path: "/t/messages", icon: MessageSquare, label: "Messages" },
  { path: "/t", icon: Home, label: "Home" },
  { path: "/t/bills", icon: FileText, label: "Bills" },
  { path: "/t/history", icon: History, label: "History" },
  { path: "/t/room", icon: Building2, label: "My room" },
  { path: "/t/documents", icon: FolderLock, label: "My documents" },
  { path: "/t/occupants", icon: Users, label: "Room occupants" },
  { path: "/t/maintenance", icon: Wrench, label: "Maintenance" },
  { path: "/t/inspections", icon: ClipboardCheck, label: "Move-in / move-out" },
  { path: "/t/notifications", icon: Bell, label: "Notifications" },
  { path: "/t/settings", icon: Settings, label: "Settings" },
  { path: "/t/profile", icon: User, label: "Profile" },
];
export function PortalShell({ kind }: { kind: "admin" | "tenant" }) {
  const { userDoc, signOut } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const items = kind === "admin" ? adminItems : tenantItems;
  const current = [...items]
    .reverse()
    .find(
      (item) => pathname === item.path || pathname.startsWith(item.path + "/"),
    );
  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  const navigation = (mobile = false) =>
    (mobile
      ? items.filter((item) =>
          ["/t", "/t/bills", "/t/history", "/t/profile"].includes(item.path),
        )
      : items
    ).map((item) => (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.path === "/a" || item.path === "/t"}
        className={({ isActive }) =>
          `${mobile ? "mobile-tab" : "portal-nav-link"} ${isActive ? "is-active" : ""}`
        }
        aria-label={item.label}
      >
        <item.icon size={19} strokeWidth={1.7} />
        <span>{item.label}</span>
        {!mobile && <ArrowUpRight className="nav-arrow" size={15} />}
      </NavLink>
    ));
  return (
    <div className={`portal-shell portal-${kind}`}>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {open && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`portal-sidebar ${open ? "is-open" : ""}`}>
        <div className="sidebar-brand">
          <Brand inverse />
          <button
            className="sidebar-close"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        <p className="nav-caption">
          {kind === "admin" ? "PROPERTY WORKSPACE" : "YOUR RENTAL SPACE"}
        </p>
        <nav aria-label="Main navigation" className="portal-navigation">
          {navigation()}
        </nav>
        <div className="sidebar-note">
          <div className="note-symbol">
            <Home size={20} />
          </div>
          <p>
            Less managing.
            <br />
            <strong>More living.</strong>
          </p>
          <span>Your home, beautifully organised.</span>
        </div>
        <div className="sidebar-user">
          <div className="user-initial">
            {userDoc?.name?.charAt(0).toUpperCase() || "R"}
          </div>
          <div className="min-w-0 flex-1">
            <strong>{userDoc?.name || "Welcome"}</strong>
            <span>{kind === "admin" ? "Property owner" : "Resident"}</span>
          </div>
          <button onClick={() => void signOut()} aria-label="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <div className="portal-body">
        <header className="portal-header">
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="ghost"
              className="mobile-menu"
              aria-label="Open navigation"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </Button>
            <div className="header-mobile-brand">
              <Brand compact />
            </div>
            <div className="header-breadcrumb">
              <span>{kind === "admin" ? "Workspace" : "Resident portal"}</span>
              <span className="breadcrumb-divider">/</span>
              <strong>{current?.label || "Home"}</strong>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="header-date">
              {new Date().toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>
        <main id="main-content" className="portal-content">
          <AppErrorBoundary key={pathname}>
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </AppErrorBoundary>
        </main>
        <footer className="portal-footer">
          <span>RentEase · Made for everyday living.</span>
          <span>A little less to worry about.</span>
        </footer>
      </div>
      {kind === "tenant" && (
        <nav className="tenant-mobile-nav" aria-label="Mobile navigation">
          {navigation(true)}
        </nav>
      )}
    </div>
  );
}
