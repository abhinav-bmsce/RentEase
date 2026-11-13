import { auth, db } from "@/lib/firebase";
import {
  canAdvanceMaintenance,
  maintenanceSchema,
  type MaintenanceStatus,
} from "@/lib/workflows";
import type { Timestamp } from "firebase/firestore";
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { validateTenantPhoto } from "./tenant-photo-service";
export interface MaintenanceDoc {
  tenantUid: string;
  roomId: string;
  propertyId: string;
  category: string;
  description: string;
  repairNeeded: string;
  priority: string;
  status: MaintenanceStatus;
  photoUrl: string;
  assignee: string;
  cost: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
export async function submitMaintenance(input: {
  category: string;
  description: string;
  repairNeeded: string;
  priority: string;
  photoUrl: string;
}) {
  const fields = maintenanceSchema.parse(input);
  validateTenantPhoto(input.photoUrl);
  if (!auth.currentUser) throw new Error("Please sign in again.");
  const uid = auth.currentUser.uid;
  const ref = doc(collection(db, "maintenance"));
  await runTransaction(db, async (tx) => {
    const user = await tx.get(doc(db, "users", uid));
    if (
      !user.exists() ||
      user.data().role !== "tenant" ||
      !user.data().active ||
      !user.data().tenancyId
    )
      throw new Error(
        "An active tenant account and room assignment are required.",
      );
    const tenancy = await tx.get(doc(db, "tenancies", user.data().tenancyId));
    if (
      !tenancy.exists() ||
      !tenancy.data().active ||
      tenancy.data().tenantUid !== uid
    )
      throw new Error("Your lease is not active.");
    const room = await tx.get(doc(db, "rooms", tenancy.data().roomId));
    if (!room.exists()) throw new Error("Assigned room was not found.");
    tx.set(ref, {
      ...fields,
      tenantUid: uid,
      roomId: room.id,
      propertyId: room.data().propertyId,
      photoUrl: input.photoUrl,
      status: "submitted",
      assignee: "",
      cost: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  return ref.id;
}
export async function reviewMaintenance(
  id: string,
  status: MaintenanceStatus,
  assignee: string,
  cost: number,
) {
  if (!Number.isSafeInteger(cost) || cost < 0)
    throw new Error("Enter a valid non-negative repair cost.");
  if (
    ["assigned", "in_progress", "resolved", "closed"].includes(status) &&
    !assignee.trim()
  )
    throw new Error(
      "Enter the repair person’s name before assigning this request.",
    );
  await runTransaction(db, async (tx) => {
    const ref = doc(db, "maintenance", id);
    const record = await tx.get(ref);
    if (!record.exists()) throw new Error("Request no longer exists.");
    if (!canAdvanceMaintenance(record.data().status, status))
      throw new Error("Move through each maintenance stage in order.");
    tx.update(ref, {
      status,
      assignee: assignee.trim(),
      cost,
      updatedAt: serverTimestamp(),
    });
  });
}
