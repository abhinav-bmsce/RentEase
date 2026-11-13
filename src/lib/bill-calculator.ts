import type { BillItem, RoomDoc } from "@/lib/types";

/**
 * Calculates electricity usage and cost.
 *
 * @param prevReading - Previous meter reading
 * @param currReading - Current meter reading
 * @param rate - Rate in paise per unit
 * @returns units consumed and total amount in paise
 */
export function calculateElectricity(
  prevReading: number,
  currReading: number,
  rate: number,
): { units: number; amount: number } {
  const units = currReading - prevReading;
  const amount = units * rate;
  return { units, amount };
}

/**
 * Calculates the total of all bill items.
 *
 * @param items - Array of BillItem
 * @returns Total amount in paise
 */
export function calculateBillTotal(items: BillItem[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

/**
 * Generates the standard bill items for a room.
 *
 * Produces a rent item, an electricity item (if currReading > prevReading),
 * and any additional extra charges.
 *
 * @param room - The room document
 * @param prevReading - Previous electricity meter reading
 * @param currReading - Current electricity meter reading
 * @param extraCharges - Optional additional line items with label and amount in paise
 * @returns Array of BillItem
 */
export function generateBillItems(
  room: RoomDoc,
  prevReading: number,
  currReading: number,
  extraCharges?: { label: string; amount: number }[],
): BillItem[] {
  const items: BillItem[] = [];

  // Rent
  items.push({
    type: "rent",
    label: "Monthly Rent",
    amount: room.monthlyRent,
  });

  // Electricity
  if (currReading > prevReading) {
    const { units, amount } = calculateElectricity(
      prevReading,
      currReading,
      room.electricityRate,
    );

    items.push({
      type: "electricity",
      label: "Electricity Charges",
      amount,
      prevReading,
      currReading,
      units,
      rate: room.electricityRate,
    });
  }

  // Extra charges
  if (extraCharges) {
    for (const charge of extraCharges) {
      items.push({
        type: "other",
        label: charge.label,
        amount: charge.amount,
      });
    }
  }

  return items;
}
