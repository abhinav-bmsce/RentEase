import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { LoginForm } from "@/components/auth/login-form";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AdminLayout } from "@/components/layouts/admin-layout";
import { TenantLayout } from "@/components/layouts/tenant-layout";
import { PageSkeleton } from "@/components/shared/page-ui";
import { useAuth } from "@/hooks/use-auth";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
const InitialSetup = lazy(() =>
  import("@/features/auth/initial-setup").then((module) => ({
    default: module.InitialSetup,
  })),
);

// Tenant pages
const TenantDashboard = lazy(() =>
  import("@/features/tenant/dashboard").then((module) => ({
    default: module.TenantDashboard,
  })),
);
const TenantBills = lazy(() =>
  import("@/features/tenant/bills").then((module) => ({
    default: module.TenantBills,
  })),
);
const TenantBillDetail = lazy(() =>
  import("@/features/tenant/bill-detail").then((module) => ({
    default: module.TenantBillDetail,
  })),
);
const PaymentSubmission = lazy(() =>
  import("@/features/tenant/payment-submission").then((module) => ({
    default: module.PaymentSubmission,
  })),
);
const PaymentHistory = lazy(() =>
  import("@/features/tenant/payment-history").then((module) => ({
    default: module.PaymentHistory,
  })),
);
const TenantProfile = lazy(() =>
  import("@/features/tenant/profile").then((module) => ({
    default: module.TenantProfile,
  })),
);

// Admin pages
const AdminDashboard = lazy(() =>
  import("@/features/admin/dashboard").then((module) => ({
    default: module.AdminDashboard,
  })),
);
const TenantManagement = lazy(() =>
  import("@/features/admin/tenants").then((module) => ({
    default: module.TenantManagement,
  })),
);
const AddTenant = lazy(() =>
  import("@/features/admin/add-tenant").then((module) => ({
    default: module.AddTenant,
  })),
);
const TenantDetail = lazy(() =>
  import("@/features/admin/tenant-detail").then((module) => ({
    default: module.TenantDetail,
  })),
);
const PropertyManagement = lazy(() =>
  import("@/features/admin/properties").then((module) => ({
    default: module.PropertyManagement,
  })),
);
const BillingPage = lazy(() =>
  import("@/features/admin/billing").then((module) => ({
    default: module.BillingPage,
  })),
);
const AdminBillDetail = lazy(() =>
  import("@/features/admin/bill-detail").then((module) => ({
    default: module.AdminBillDetail,
  })),
);
const PaymentReviewQueue = lazy(() =>
  import("@/features/admin/payments").then((module) => ({
    default: module.PaymentReviewQueue,
  })),
);
const DepositTracker = lazy(() =>
  import("@/features/admin/deposits").then((module) => ({
    default: module.DepositTracker,
  })),
);
const ReportsPage = lazy(() =>
  import("@/features/admin/reports").then((module) => ({
    default: module.ReportsPage,
  })),
);
const SettingsPage = lazy(() =>
  import("@/features/admin/settings").then((module) => ({
    default: module.SettingsPage,
  })),
);

const MaintenanceWorkspace = lazy(() =>
  import("@/features/workspace/maintenance").then((m) => ({
    default: m.MaintenanceWorkspace,
  })),
);
const OccupancyWorkspace = lazy(() =>
  import("@/features/workspace/occupancy").then((m) => ({
    default: m.OccupancyWorkspace,
  })),
);
const DocumentWorkspace = lazy(() =>
  import("@/features/workspace/documents").then((m) => ({
    default: m.DocumentWorkspace,
  })),
);
const InspectionWorkspace = lazy(() =>
  import("@/features/workspace/inspections").then((m) => ({
    default: m.InspectionWorkspace,
  })),
);
const NotificationsPage = lazy(() =>
  import("@/features/workspace/notifications").then((m) => ({
    default: m.NotificationsPage,
  })),
);
const TenantSettings = lazy(() =>
  import("@/features/workspace/tenant-settings").then((m) => ({
    default: m.TenantSettings,
  })),
);

const MessagesPage = lazy(() =>
  import("@/features/workspace/messages").then((m) => ({
    default: m.MessagesPage,
  })),
);

function AppRoutes() {
  const { userDoc } = useAuth();

  const homeRedirect = userDoc?.role === "admin" ? "/a" : "/t";

  return (
    <Suspense
      fallback={
        <div className="p-8">
          <PageSkeleton />
        </div>
      }
    >
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/setup" element={<InitialSetup />} />
        <Route path="/change-password" element={<ChangePasswordForm />} />

        {/* Tenant routes */}
        <Route
          path="/t"
          element={
            <ProtectedRoute requiredRole="tenant">
              <TenantLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<TenantDashboard />} />
          <Route path="bills" element={<TenantBills />} />
          <Route path="bills/:id" element={<TenantBillDetail />} />
          <Route path="bills/:id/pay" element={<PaymentSubmission />} />
          <Route path="history" element={<PaymentHistory />} />
          <Route path="profile" element={<TenantProfile />} />
          <Route path="room" element={<TenantProfile />} />
          <Route path="documents" element={<DocumentWorkspace />} />
          <Route path="occupants" element={<OccupancyWorkspace />} />
          <Route path="maintenance" element={<MaintenanceWorkspace />} />
          <Route path="inspections" element={<InspectionWorkspace />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<TenantSettings />} />
        </Route>

        {/* Admin routes */}
        <Route
          path="/a"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="tenants" element={<TenantManagement />} />
          <Route path="tenants/new" element={<AddTenant />} />
          <Route path="tenants/:id" element={<TenantDetail />} />
          <Route path="properties" element={<PropertyManagement />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="billing/:id" element={<AdminBillDetail />} />
          <Route path="payments" element={<PaymentReviewQueue />} />
          <Route path="deposits" element={<DepositTracker />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="occupancy" element={<OccupancyWorkspace />} />
          <Route path="documents" element={<DocumentWorkspace />} />
          <Route path="maintenance" element={<MaintenanceWorkspace />} />
          <Route path="inspections" element={<InspectionWorkspace />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>

        {/* Redirects */}
        <Route path="/" element={<Navigate to={homeRedirect} replace />} />
        <Route path="*" element={<Navigate to={homeRedirect} replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return <AppRoutes />;
}
