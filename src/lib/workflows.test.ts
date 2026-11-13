import { describe, expect, it } from "vitest";
import {
  canAdvanceMaintenance,
  maintenanceSchema,
  registrationDueDate,
} from "./workflows";
describe("rental workflows", () => {
  it("rejects empty complaints and unsupported priority", () => {
    expect(
      maintenanceSchema.safeParse({
        category: "plumbing",
        description: "x",
        repairNeeded: "tap",
        priority: "urgent",
      }).success,
    ).toBe(false);
    expect(
      maintenanceSchema.safeParse({
        category: "plumbing",
        description: "The tap keeps dripping",
        repairNeeded: "Replace washer",
        priority: "critical",
      }).success,
    ).toBe(false);
  });
  it("enforces ordered maintenance stages", () => {
    expect(canAdvanceMaintenance("submitted", "acknowledged")).toBe(true);
    expect(canAdvanceMaintenance("submitted", "resolved")).toBe(false);
    expect(canAdvanceMaintenance("closed", "submitted")).toBe(false);
  });
  it("calculates registration deadlines across month boundaries", () => {
    expect(registrationDueDate(new Date(2026, 10, 28), 7).getDate()).toBe(5);
    expect(registrationDueDate(new Date(2026, 10, 28), 7).getMonth()).toBe(11);
  });
});
