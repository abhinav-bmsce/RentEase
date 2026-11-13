import { describe, expect, it } from "vitest";
import {
  formatMoney,
  paiseToCurrency,
  paiseToRupees,
  parseCurrencyInput,
  rupeesToPaise,
} from "./money";

describe("money utilities", () => {
  it("converts paise to currency string with Indian digit grouping", () => {
    expect(paiseToCurrency(0)).toBe("0.00");
    expect(paiseToCurrency(100)).toBe("1.00");
    expect(paiseToCurrency(5050)).toBe("50.50");
    expect(paiseToCurrency(876000)).toBe("8,760.00");
    expect(paiseToCurrency(10000000)).toBe("1,00,000.00");
    expect(paiseToCurrency(1234567800)).toBe("1,23,45,678.00");
    expect(paiseToCurrency(-50000)).toBe("-500.00");
  });

  it("formats money with INR symbol", () => {
    expect(formatMoney(0)).toBe("₹0.00");
    expect(formatMoney(876000)).toBe("₹8,760.00");
    expect(formatMoney(150000)).toBe("₹1,500.00");
  });

  it("converts rupees to paise", () => {
    expect(rupeesToPaise(0)).toBe(0);
    expect(rupeesToPaise(100)).toBe(10000);
    expect(rupeesToPaise(8760)).toBe(876000);
    expect(rupeesToPaise(45.5)).toBe(4550);
  });

  it("converts paise to rupees", () => {
    expect(paiseToRupees(0)).toBe(0);
    expect(paiseToRupees(876000)).toBe(8760);
    expect(paiseToRupees(4550)).toBe(45.5);
  });

  it("parses user currency inputs into paise", () => {
    expect(parseCurrencyInput("0")).toBe(0);
    expect(parseCurrencyInput("8760")).toBe(876000);
    expect(parseCurrencyInput("8,760")).toBe(876000);
    expect(parseCurrencyInput("8,760.50")).toBe(876050);
    expect(parseCurrencyInput("invalid")).toBe(0);
  });
});
