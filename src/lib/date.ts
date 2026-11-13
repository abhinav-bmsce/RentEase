import { differenceInDays, format, isAfter, parse } from "date-fns";
import { Timestamp } from "firebase/firestore";

/**
 * Formats a date as "05 Nov 2026".
 * Accepts Date objects, ISO strings, or millisecond timestamps.
 */
export function formatDate(date: Date | string | number): string {
  const d = toDate(date);
  return Number.isNaN(d.getTime())
    ? "Date unavailable"
    : format(d, "dd MMM yyyy");
}

/**
 * Formats a month string like "2026-11" into "November 2026".
 */
export function formatMonth(month: string): string {
  if (typeof month !== "string") return "Month unavailable";
  const d = parse(month, "yyyy-MM", new Date());
  return Number.isNaN(d.getTime())
    ? "Month unavailable"
    : format(d, "MMMM yyyy");
}

/**
 * Returns the current month in "YYYY-MM" format.
 */
export function getCurrentMonth(): string {
  return format(new Date(), "yyyy-MM");
}

/**
 * Returns the number of days until the due date.
 * Negative values mean the due date has passed.
 */
export function getDaysUntilDue(dueDate: Date | string): number {
  const d = toDate(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return differenceInDays(d, today);
}

/**
 * Returns true if the due date has passed.
 */
export function isOverdue(dueDate: Date | string): boolean {
  const d = toDate(dueDate);
  d.setHours(23, 59, 59, 999);
  return isAfter(new Date(), d);
}

/**
 * Converts a JS Date to a Firestore Timestamp.
 */
export function toFirestoreTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

/**
 * Converts a Firestore Timestamp (or Timestamp-like object) to a JS Date.
 */
export function fromFirestoreTimestamp(
  timestamp: Timestamp | { seconds: number; nanoseconds: number },
): Date {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  // Handle plain objects with seconds/nanoseconds (e.g. from REST API or serialized data)
  return new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
}

// ─── Internal helper ─────────────────────────────────────────────────────────

function toDate(value: Date | string | number): Date {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (typeof value === "number") {
    return new Date(value);
  }
  return new Date(value);
}
