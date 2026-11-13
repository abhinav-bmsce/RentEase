import { calculateBillTotal } from "@/lib/bill-calculator";
import { db } from "@/lib/firebase";
import type { BillDoc, BillItem, WithId } from "@/lib/types";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

export async function createBill({
  tenancyId,
  tenantUid,
  roomId,
  month,
  items,
  dueDate,
  notes,
}: {
  tenancyId: string;
  tenantUid: string;
  roomId: string;
  month: string;
  items: BillItem[];
  dueDate: Date;
  notes?: string;
}): Promise<string> {
  const total = calculateBillTotal(items);

  const billData: Omit<BillDoc, "createdAt" | "updatedAt"> & {
    createdAt: unknown;
    updatedAt: unknown;
  } = {
    tenancyId,
    tenantUid,
    roomId,
    month,
    items,
    total,
    paidAmount: 0,
    dueDate: Timestamp.fromDate(dueDate),
    status: "unpaid",
    lateFee: 0,
    notes: notes ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "bills"), billData);

  // Send notification to tenant
  await addDoc(collection(db, "notifications"), {
    tenantUid,
    type: "new_bill",
    title: "New Bill Generated",
    message: `Your rent bill for ${month} has been generated. Total: ₹${(total / 100).toFixed(2)}`,
    read: false,
    createdAt: Timestamp.now(),
  });

  return docRef.id;
}

export async function getBillsByTenant(
  tenantUid: string,
): Promise<WithId<BillDoc>[]> {
  const q = query(
    collection(db, "bills"),
    where("tenantUid", "==", tenantUid),
    orderBy("month", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as BillDoc) }));
}

export async function getBillById(
  billId: string,
): Promise<WithId<BillDoc> | null> {
  const snap = await getDoc(doc(db, "bills", billId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as BillDoc) };
}

export async function updateBill(billId: string, updates: Partial<BillDoc>) {
  await updateDoc(doc(db, "bills", billId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}
