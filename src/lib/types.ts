import type { Timestamp } from "firebase/firestore";

// ─── Generic helper ──────────────────────────────────────────────────────────
export type WithId<T> = T & { id: string };

// ─── User ────────────────────────────────────────────────────────────────────
export type UserRole = "admin" | "tenant";

export interface UserDoc {
  role: UserRole;
  name: string;
  username: string;
  phone: string;
  mustChangePassword: boolean;
  active: boolean;
  tenancyId?: string;
  /** Compressed identification photo; readable by admin and this tenant only. */
  photoUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Property ────────────────────────────────────────────────────────────────
export interface PropertyDoc {
  /** Assigned owner; legacy properties use settings.general.bootstrapUid. */
  ownerUid?: string;
  name: string;
  address: string;
  createdAt: Timestamp;
}

// ─── Room ────────────────────────────────────────────────────────────────────
export type RoomStatus = "occupied" | "vacant";

export interface RoomDoc {
  propertyId: string;
  name: string;
  /** Optional for rooms created before floor numbering was introduced. */
  floorNumber?: number;
  roomNumber?: string;
  maxOccupancy?: number;
  registrationDeadlineDays?: 5 | 7 | 10;
  /** Monthly rent in paise */
  monthlyRent: number;
  /** Electricity rate in paise per unit */
  electricityRate: number;
  lastMeterReading: number;
  status: RoomStatus;
}

// ─── Tenancy ─────────────────────────────────────────────────────────────────
export type DepositStatus = "held" | "partially_refunded" | "refunded";

export interface TenancyDoc {
  tenantUid: string;
  roomId: string;
  startDate: Timestamp;
  endDate?: Timestamp;
  rentDueDay: number;
  /** Security deposit in paise */
  securityDeposit: number;
  depositStatus: DepositStatus;
  active: boolean;
  createdAt: Timestamp;
}

// ─── Bill ────────────────────────────────────────────────────────────────────
export type BillItemType = "rent" | "electricity" | "other";

export interface BillItem {
  type: BillItemType;
  label: string;
  /** Amount in paise */
  amount: number;
  /** Electricity-specific fields */
  prevReading?: number;
  currReading?: number;
  units?: number;
  /** Rate in paise per unit */
  rate?: number;
}

export type BillStatus = "unpaid" | "submitted" | "paid" | "overdue" | "void";

export interface BillDoc {
  tenancyId: string;
  tenantUid: string;
  roomId: string;
  /** Month string in "YYYY-MM" format, e.g. "2026-11" */
  month: string;
  items: BillItem[];
  /** Total in paise */
  total: number;
  /** Amount paid so far in paise */
  paidAmount: number;
  dueDate: Timestamp;
  status: BillStatus;
  /** Late fee in paise */
  lateFee: number;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Payment ─────────────────────────────────────────────────────────────────
export type PaymentStatus = "pending" | "approved" | "rejected";

export interface PaymentDoc {
  billId: string;
  tenantUid: string;
  /** Amount in paise */
  amount: number;
  paidOn: Timestamp;
  utr: string;
  proofUrl: string;
  status: PaymentStatus;
  rejectReason?: string;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  createdAt: Timestamp;
}

// ─── Notification ────────────────────────────────────────────────────────────
export type NotificationType =
  | "new_bill"
  | "due_soon"
  | "overdue"
  | "payment_approved"
  | "payment_rejected";

export interface NotificationDoc {
  tenantUid: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Timestamp;
}

// ─── Audit Log ───────────────────────────────────────────────────────────────
export interface AuditLogDoc {
  actorUid: string;
  action: string;
  targetId?: string;
  details?: string;
  timestamp: Timestamp;
}

// ─── Settings ────────────────────────────────────────────────────────────────
export interface SettingsDoc {
  upiId: string;
  defaultDueDay: number;
  /** Late fee amount in paise */
  lateFeeAmount: number;
  lateFeeEnabled: boolean;
  businessName: string;
  businessPhone: string;
}
