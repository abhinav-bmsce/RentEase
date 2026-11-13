import type { BillStatus, PaymentStatus, SettingsDoc } from "@/lib/types";

// ─── App ─────────────────────────────────────────────────────────────────────
export const APP_NAME = "RentEase";
export const EMAIL_DOMAIN = "rentease.app";

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
}

export function emailToUsername(email: string): string {
  return email.split("@")[0] ?? email;
}

// ─── Status configurations ──────────────────────────────────────────────────

interface StatusConfig {
  label: string;
  color: string;
  icon: string;
}

export const BILL_STATUSES: Record<BillStatus, StatusConfig> = {
  unpaid: {
    label: "Unpaid",
    color: "text-amber-600 bg-amber-50 border-amber-200",
    icon: "Clock",
  },
  submitted: {
    label: "Submitted",
    color: "text-blue-600 bg-blue-50 border-blue-200",
    icon: "Upload",
  },
  paid: {
    label: "Paid",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    icon: "CheckCircle",
  },
  overdue: {
    label: "Overdue",
    color: "text-red-600 bg-red-50 border-red-200",
    icon: "AlertTriangle",
  },
  void: {
    label: "Void",
    color: "text-gray-500 bg-gray-50 border-gray-200",
    icon: "Ban",
  },
};

export const PAYMENT_STATUSES: Record<PaymentStatus, StatusConfig> = {
  pending: {
    label: "Pending",
    color: "text-amber-600 bg-amber-50 border-amber-200",
    icon: "Clock",
  },
  approved: {
    label: "Approved",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    icon: "CheckCircle",
  },
  rejected: {
    label: "Rejected",
    color: "text-red-600 bg-red-50 border-red-200",
    icon: "XCircle",
  },
};

// ─── Navigation ──────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", path: "/t", icon: "Home" },
  { label: "Bills", path: "/t/bills", icon: "Receipt" },
  { label: "History", path: "/t/history", icon: "History" },
  { label: "Profile", path: "/t/profile", icon: "User" },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/a", icon: "LayoutDashboard" },
  { label: "Tenants", path: "/a/tenants", icon: "Users" },
  { label: "Properties", path: "/a/properties", icon: "Building2" },
  { label: "Billing", path: "/a/billing", icon: "Receipt" },
  { label: "Payments", path: "/a/payments", icon: "CreditCard" },
  { label: "Deposits", path: "/a/deposits", icon: "Wallet" },
  { label: "Reports", path: "/a/reports", icon: "BarChart3" },
  { label: "Settings", path: "/a/settings", icon: "Settings" },
];

// ─── Default settings ────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: Omit<
  SettingsDoc,
  "upiId" | "businessName" | "businessPhone"
> = {
  defaultDueDay: 5,
  lateFeeAmount: 0,
  lateFeeEnabled: false,
};
