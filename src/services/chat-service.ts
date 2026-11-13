import { auth, db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
export interface Conversation {
  tenantUid: string;
  ownerUid: string;
  tenancyId: string;
  tenantName: string;
  seq: number;
  tenantSent: number;
  ownerSent: number;
  tenantRead: number;
  ownerRead: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
export interface ChatMessage {
  senderUid: string;
  text: string;
  seq: number;
  ordinal: number;
  maintenanceId: string;
  createdAt: Timestamp;
}
export function messageText(text: string) {
  const value = text.trim();
  if (!value || value.length > 2000)
    throw new Error("Enter a message between 1 and 2,000 characters.");
  return value;
}
export function unreadCount(c: Conversation, tenant: boolean) {
  return Math.max(
    0,
    tenant ? c.ownerSent - c.tenantRead : c.tenantSent - c.ownerRead,
  );
}
export async function openConversation(tenancyId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Please sign in again.");
  const lease = await getDoc(doc(db, "tenancies", tenancyId));
  if (!lease.exists() || !lease.data().active)
    throw new Error("An active tenancy is required.");
  const room = await getDoc(doc(db, "rooms", lease.data().roomId));
  if (!room.exists()) throw new Error("Assigned room is unavailable.");
  const property = await getDoc(doc(db, "properties", room.data().propertyId));
  const settings = await getDoc(doc(db, "settings", "general"));
  const ownerUid = property.data()?.ownerUid || settings.data()?.bootstrapUid;
  if (!ownerUid)
    throw new Error("The property owner must be configured before messaging.");
  if (uid !== ownerUid && uid !== lease.data().tenantUid)
    throw new Error("You are not assigned to this tenancy.");
  const tenant = await getDoc(doc(db, "users", lease.data().tenantUid));
  const ref = doc(db, "conversations", tenancyId);
  await runTransaction(db, async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists()) return;
    tx.set(ref, {
      tenantUid: lease.data().tenantUid,
      ownerUid,
      tenancyId,
      tenantName: tenant.data()?.name || "Tenant",
      seq: 0,
      tenantSent: 0,
      ownerSent: 0,
      tenantRead: 0,
      ownerRead: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  return tenancyId;
}
export async function sendMessage(
  id: string,
  raw: string,
  maintenanceId = "",
  messageId?: string,
) {
  const text = messageText(raw),
    uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Please sign in again.");
  const ref = doc(db, "conversations", id),
    message = messageId
      ? doc(db, "conversations", id, "messages", messageId)
      : doc(collection(ref, "messages"));
  let attemptedSeq = -1;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await runTransaction(db, async (tx) => {
        const prior = await tx.get(message);
        if (prior.exists()) return; // Retry after an uncertain response cannot duplicate this send.
        const snapshot = await tx.get(ref);
        if (!snapshot.exists()) throw new Error("Conversation not found.");
        const c = snapshot.data() as Conversation,
          tenant = uid === c.tenantUid;
        attemptedSeq = c.seq;
        if (!tenant && uid !== c.ownerUid)
          throw new Error("Not a conversation participant.");
        const field = tenant ? "tenantSent" : "ownerSent",
          ordinal = c[field] + 1;
        tx.set(message, {
          senderUid: uid,
          text,
          seq: c.seq + 1,
          ordinal,
          maintenanceId,
          createdAt: serverTimestamp(),
        });
        tx.update(ref, {
          seq: c.seq + 1,
          [field]: ordinal,
          lastMessageId: message.id,
          updatedAt: serverTimestamp(),
        });
      });
      return;
    } catch (error) {
      // Rule evaluation can reject an optimistic transaction before the SDK
      // detects contention. Retry only if another send advanced the sequence.
      if (
        attempt === 2 ||
        (error as { code?: string }).code !== "permission-denied"
      )
        throw error;
      const current = await getDoc(ref);
      if (!current.exists() || current.data().seq <= attemptedSeq) throw error;
    }
  }
}
export async function markConversationRead(
  id: string,
  received: number,
  tenant: boolean,
) {
  const ref = doc(db, "conversations", id),
    field = tenant ? "tenantRead" : "ownerRead";
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const c = snap.data() as Conversation;
    const next = Math.min(received, tenant ? c.ownerSent : c.tenantSent);
    if (next > c[field]) tx.update(ref, { [field]: next });
  });
}
