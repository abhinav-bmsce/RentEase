import { isOverdue } from "@/lib/date";
import { db } from "@/lib/firebase";
import type { BillDoc, PaymentDoc, RoomDoc } from "@/lib/types";
import imageCompression from "browser-image-compression";
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  runTransaction,
  where,
} from "firebase/firestore";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_RAW_FILE_SIZE = 5 * 1024 * 1024; // 5 MB raw ceiling
const MAX_BASE64_LENGTH = 600_000; // ~450 KB encoded limit (well under Firestore 1 MiB doc limit)

export async function compressPaymentProof(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.2,
    maxWidthOrHeight: 1024,
    useWebWorker: true,
    initialQuality: 0.7,
  };
  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.warn("Image compression warning, using original file", error);
    return file;
  }
}

/**
 * Validates, compresses, and encodes a payment proof screenshot into a size-limited
 * Base64 Data URL for Firestore document storage (avoids requiring paid Cloud Storage).
 */
export async function processPaymentProofAsBase64(file: File): Promise<string> {
  // 1. Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(
      "Invalid image format. Allowed formats: JPG, PNG, or WEBP.",
    );
  }

  // 2. Validate raw file size
  if (file.size > MAX_RAW_FILE_SIZE) {
    throw new Error(
      "Selected image exceeds the 5 MB limit. Please choose a smaller image.",
    );
  }

  // 3. Compress image
  const compressed = await compressPaymentProof(file);

  // 4. Convert to Base64 Data URL
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(compressed);
  });

  // 5. Enforce safe Firestore document size limit
  if (dataUrl.length > MAX_BASE64_LENGTH) {
    throw new Error(
      "Image size after compression exceeds 450 KB limit for Firestore. Please select a smaller photo.",
    );
  }

  return dataUrl;
}

export async function uploadPaymentProof(
  _billId: string,
  file: File,
): Promise<string> {
  return await processPaymentProofAsBase64(file);
}

export async function submitPayment({
  billId,
  tenantUid,
  amount,
  utr,
  proofFile,
}: {
  billId: string;
  tenantUid: string;
  amount: number;
  utr: string;
  proofFile: File;
}) {
  const trimmedUtr = utr.trim();

  // 1. Check duplicate UTR
  const utrQuery = query(
    collection(db, "payments"),
    where("tenantUid", "==", tenantUid),
    where("utr", "==", trimmedUtr),
  );
  const utrSnap = await getDocs(utrQuery);
  const activeExisting = utrSnap.docs.find(
    (d) => d.data().status === "pending" || d.data().status === "approved",
  );
  if (activeExisting) {
    throw new Error("This UTR / Transaction ID has already been submitted.");
  }

  // 2. Upload proof screenshot
  const proofUrl = await uploadPaymentProof(billId, proofFile);

  // 3. Create payment record
  const paymentData: Omit<PaymentDoc, "createdAt"> & { createdAt: unknown } = {
    billId,
    tenantUid,
    amount,
    paidOn: Timestamp.now(),
    utr: trimmedUtr,
    proofUrl,
    status: "pending",
    createdAt: serverTimestamp(),
  };

  const paymentRef = doc(collection(db, "payments"));
  const billRef = doc(db, "bills", billId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(billRef);
    if (!snapshot.exists()) throw new Error("Bill not found");
    const bill = snapshot.data() as BillDoc;
    if (bill.tenantUid !== tenantUid) throw new Error("This bill belongs to another account.");
    if (!["unpaid", "overdue"].includes(bill.status)) throw new Error("This bill is already paid or awaiting review.");
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > bill.total - (bill.paidAmount || 0)) {
      throw new Error("Payment amount must be within the outstanding balance.");
    }
    transaction.set(paymentRef, paymentData);
    transaction.update(billRef, { status: "submitted", updatedAt: serverTimestamp() });
  });
  return paymentRef.id;
}

export async function approvePayment(input: {paymentId: string; billId: string; reviewedBy: string}) {
  return reviewPayment(input, "approved");
}
export async function rejectPayment(input: {paymentId: string; billId: string; reviewedBy: string; reason: string}) {
  if (!input.reason.trim()) throw new Error("A rejection reason is required.");
  return reviewPayment(input, "rejected", input.reason.trim());
}

async function reviewPayment(
  {paymentId, billId, reviewedBy}: {paymentId: string; billId: string; reviewedBy: string},
  decision: "approved" | "rejected",
  reason = "",
) {
  const paymentRef = doc(db, "payments", paymentId);
  const billRef = doc(db, "bills", billId);
  const notificationRef = doc(collection(db, "notifications"));
  await runTransaction(db, async (transaction) => {
    const paymentSnap = await transaction.get(paymentRef);
    const billSnap = await transaction.get(billRef);
    if (!paymentSnap.exists() || !billSnap.exists()) throw new Error("Payment or bill not found.");
    const payment = paymentSnap.data() as PaymentDoc;
    const bill = billSnap.data() as BillDoc;
    if (payment.billId !== billId || payment.tenantUid !== bill.tenantUid) throw new Error("Payment does not match this bill.");
    if (payment.status !== "pending") throw new Error("This payment has already been reviewed.");
    const currentPaid = bill.paidAmount || 0;
    if (!Number.isSafeInteger(payment.amount) || payment.amount <= 0) throw new Error("Invalid payment amount.");
    const paidAmount = currentPaid + (decision === "approved" ? payment.amount : 0);
    if (decision === "approved" && paidAmount > bill.total) throw new Error("Payment exceeds the remaining bill balance.");
    const fullyPaid = paidAmount >= bill.total;
    const dueDate = bill.dueDate?.toDate?.() ?? new Date(String(bill.dueDate));
    const status = fullyPaid ? "paid" : isOverdue(dueDate) ? "overdue" : "unpaid";
    const electricity = (bill.items ?? []).find(item => item.type === "electricity");
    const roomRef = decision === "approved" && fullyPaid && electricity?.currReading != null && bill.roomId
      ? doc(db, "rooms", bill.roomId) : null;
    // Firestore transactions require all reads before the first write.
    const roomSnap = roomRef ? await transaction.get(roomRef) : null;
    const now = Timestamp.now();
    transaction.update(paymentRef, {status: decision, reviewedBy, reviewedAt: now, ...(decision === "rejected" ? {rejectReason: reason} : {})});
    transaction.update(billRef, {status, paidAmount, updatedAt: now});
    if (roomRef && roomSnap?.exists() && electricity?.currReading != null) {
      const room = roomSnap.data() as RoomDoc;
      if (electricity.currReading > (room.lastMeterReading || 0)) transaction.update(roomRef, {lastMeterReading: electricity.currReading});
    }
    transaction.set(notificationRef, {
      tenantUid: bill.tenantUid,
      type: decision === "approved" ? "payment_approved" : "payment_rejected",
      title: decision === "rejected" ? "Payment Rejected" : fullyPaid ? "Payment Approved (Bill Cleared)" : "Partial Payment Approved",
      message: decision === "rejected" ? `Your payment for ${bill.month} was rejected. Reason: ${reason}` : `Your payment of ₹${(payment.amount / 100).toFixed(2)} for ${bill.month} has been approved. Remaining balance: ₹${((bill.total - paidAmount) / 100).toFixed(2)}.`,
      read: false, createdAt: now,
    });
  });
}
