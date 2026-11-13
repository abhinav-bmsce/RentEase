import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatMonth,
  getCurrentMonth,
  getDaysUntilDue,
  isOverdue,
} from "./date";

describe("date utilities", () => {
  it("handles invalid API date values without crashing the page", () => {
    expect(formatDate("bad-date")).toBe("Date unavailable");
    expect(formatMonth("bad-month")).toBe("Month unavailable");
  });
  it("formats dates into dd MMM yyyy", () => {
    const d = new Date(2026, 10, 5); // 05 Nov 2026
    expect(formatDate(d)).toBe("05 Nov 2026");
  });

  it("formats month strings into MMMM yyyy", () => {
    expect(formatMonth("2026-11")).toBe("November 2026");
    expect(formatMonth("2026-01")).toBe("January 2026");
  });

  it("gets current month in YYYY-MM format", () => {
    const current = getCurrentMonth();
    expect(current).toMatch(/^\d{4}-\d{2}$/);
  });

  it("calculates days until due correctly", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const future = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    expect(getDaysUntilDue(future)).toBe(3);

    const past = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
    expect(getDaysUntilDue(past)).toBe(-2);
  });

  it("determines if due date is overdue", () => {
    const past = new Date(2020, 0, 1);
    expect(isOverdue(past)).toBe(true);

    const farFuture = new Date(2099, 0, 1);
    expect(isOverdue(farFuture)).toBe(false);
  });
});
