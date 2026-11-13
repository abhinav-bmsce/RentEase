import { z } from "zod";
export const maintenanceStatuses = [
  "submitted",
  "acknowledged",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
] as const;
export const maintenanceSchema = z.object({
  category: z.enum([
    "plumbing",
    "electrical",
    "appliances",
    "furniture",
    "doors_windows",
    "other",
  ]),
  description: z
    .string()
    .trim()
    .min(10, "Please describe the problem in at least 10 characters.")
    .max(2000),
  repairNeeded: z
    .string()
    .trim()
    .min(3, "Explain the repair you need.")
    .max(1000),
  priority: z.enum(["low", "normal", "urgent"]),
});
export type MaintenanceStatus = (typeof maintenanceStatuses)[number];
export const inspectionAreas = [
  "Walls",
  "Flooring",
  "Furniture",
  "Doors and windows",
  "Electrical fixtures",
  "Plumbing fixtures",
  "Appliances",
  "Overall condition",
];
export function canAdvanceMaintenance(
  from: MaintenanceStatus,
  to: MaintenanceStatus,
) {
  return (
    from === to ||
    maintenanceStatuses.indexOf(to) === maintenanceStatuses.indexOf(from) + 1
  );
}
export function registrationDueDate(moveIn: Date, days: number) {
  const result = new Date(moveIn);
  result.setDate(result.getDate() + days);
  return result;
}
