import { describe, expect, it } from "vitest";
import {
  calculateBillTotal,
  calculateElectricity,
  generateBillItems,
} from "./bill-calculator";
import type { RoomDoc } from "./types";

describe("bill-calculator", () => {
  it("calculates electricity units and amount in paise", () => {
    // 150 units at ₹8 per unit (800 paise)
    const res = calculateElectricity(100, 250, 800);
    expect(res.units).toBe(150);
    expect(res.amount).toBe(120000); // ₹1200
  });

  it("calculates total of bill items", () => {
    const total = calculateBillTotal([
      { type: "rent", label: "Rent", amount: 800000 },
      { type: "electricity", label: "Electricity", amount: 96000 },
      { type: "other", label: "Water", amount: 20000 },
    ]);
    expect(total).toBe(916000); // ₹9160
  });

  it("generates standard bill items for room", () => {
    const room: RoomDoc = {
      propertyId: "prop1",
      name: "Room 101",
      monthlyRent: 800000, // ₹8,000
      electricityRate: 800, // ₹8 / unit
      lastMeterReading: 120,
      status: "occupied",
    };

    const items = generateBillItems(room, 120, 220, [
      { label: "Maintenance", amount: 50000 },
    ]);

    expect(items).toHaveLength(3);
    expect(items[0]).toEqual({
      type: "rent",
      label: "Monthly Rent",
      amount: 800000,
    });
    expect(items[1]).toEqual({
      type: "electricity",
      label: "Electricity Charges",
      amount: 80000, // 100 units * 800 paise = 80,000 paise (₹800)
      prevReading: 120,
      currReading: 220,
      units: 100,
      rate: 800,
    });
    expect(items[2]).toEqual({
      type: "other",
      label: "Maintenance",
      amount: 50000,
    });
  });
});
