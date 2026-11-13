import { describe, expect, it } from "vitest";
import {
  ADMIN_NAV_ITEMS,
  APP_NAME,
  BILL_STATUSES,
  EMAIL_DOMAIN,
  emailToUsername,
  NAV_ITEMS,
  PAYMENT_STATUSES,
  usernameToEmail,
} from "./constants";

describe("constants & helpers", () => {
  it("has app name and email domain", () => {
    expect(APP_NAME).toBe("RentEase");
    expect(EMAIL_DOMAIN).toBe("rentease.app");
  });

  it("converts username to email and vice-versa", () => {
    expect(usernameToEmail("rahul")).toBe("rahul@rentease.app");
    expect(emailToUsername("rahul@rentease.app")).toBe("rahul");
    expect(emailToUsername("admin@custom.com")).toBe("admin");
  });

  it("defines all required bill and payment statuses", () => {
    expect(BILL_STATUSES.unpaid).toBeDefined();
    expect(BILL_STATUSES.paid).toBeDefined();
    expect(BILL_STATUSES.submitted).toBeDefined();
    expect(BILL_STATUSES.overdue).toBeDefined();

    expect(PAYMENT_STATUSES.pending).toBeDefined();
    expect(PAYMENT_STATUSES.approved).toBeDefined();
    expect(PAYMENT_STATUSES.rejected).toBeDefined();
  });

  it("defines navigation configurations", () => {
    expect(NAV_ITEMS.length).toBeGreaterThan(0);
    expect(ADMIN_NAV_ITEMS.length).toBeGreaterThan(0);
  });
});
