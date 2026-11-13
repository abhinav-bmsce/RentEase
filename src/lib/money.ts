/**
 * Converts paise to a currency string with Indian digit grouping.
 * Example: 876000 → "8,760.00"
 *
 * Indian grouping: the first group (from the right) is 3 digits,
 * subsequent groups are 2 digits. e.g. 1,23,45,678.00
 */
export function paiseToCurrency(paise: number): string {
  const rupees = Math.abs(paise) / 100;
  const fixed = rupees.toFixed(2);
  const [intPart, decPart] = fixed.split(".");

  // Apply Indian digit grouping to the integer part
  const lastThree = intPart!.slice(-3);
  const remaining = intPart!.slice(0, -3);

  const grouped =
    remaining.length > 0
      ? remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree
      : lastThree;

  const sign = paise < 0 ? "-" : "";
  return `${sign}${grouped}.${decPart}`;
}

/**
 * Converts paise to a formatted INR string.
 * Example: 876000 → "₹8,760.00"
 */
export function formatMoney(paise: number): string {
  return `₹${paiseToCurrency(paise)}`;
}

/**
 * Converts rupees to paise.
 * Example: 8760 → 876000
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Converts paise to rupees.
 * Example: 876000 → 8760
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Parses a user-entered currency string to paise.
 * Accepts "8760", "8,760", "8760.50", "8,760.50", etc.
 * Returns the value in paise.
 * Example: "8,760" → 876000
 */
export function parseCurrencyInput(input: string): number {
  const cleaned = input.replace(/,/g, "").trim();
  const parsed = parseFloat(cleaned);

  if (isNaN(parsed)) {
    return 0;
  }

  return Math.round(parsed * 100);
}
