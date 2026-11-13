import { db } from "@/lib/firebase";
import { roomKey } from "@/lib/rooms";
import type { PropertyDoc, RoomDoc, WithId } from "@/lib/types";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

export async function createProperty(
  name: string,
  address: string,
): Promise<string> {
  const docRef = await addDoc(collection(db, "properties"), {
    name: name.trim(),
    address: address.trim(),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateProperty(
  propertyId: string,
  data: Partial<PropertyDoc>,
) {
  await updateDoc(doc(db, "properties", propertyId), data);
}

export async function deleteProperty(propertyId: string) {
  await deleteDoc(doc(db, "properties", propertyId));
}

export async function createRoom({
  propertyId,
  name,
  monthlyRent,
  electricityRate,
  initialMeterReading = 0,
  floorNumber,
  roomNumber,
}: {
  propertyId: string;
  name: string;
  monthlyRent: number;
  electricityRate: number;
  initialMeterReading?: number;
  floorNumber?: number;
  roomNumber?: string;
}): Promise<string> {
  if (!propertyId || !name.trim())
    throw new Error("Property and room number are required.");
  if (
    ![monthlyRent, electricityRate, initialMeterReading].every(
      (n) => Number.isFinite(n) && n >= 0,
    )
  ) {
    throw new Error(
      "Rent, electricity rate, and meter reading must be zero or greater.",
    );
  }
  if (floorNumber !== undefined && !Number.isSafeInteger(floorNumber))
    throw new Error("Enter a whole floor number.");
  if (
    roomNumber !== undefined &&
    (!roomNumber.trim() || roomNumber.trim().length > 30)
  )
    throw new Error("Room number must be 1–30 characters.");
  const roomRef =
    floorNumber !== undefined && roomNumber !== undefined
      ? doc(db, "rooms", roomKey(propertyId, floorNumber, roomNumber))
      : doc(collection(db, "rooms"));
  await runTransaction(db, async (transaction) => {
    const property = await transaction.get(doc(db, "properties", propertyId));
    const existing = await transaction.get(roomRef);
    if (!property.exists())
      throw new Error("Property no longer exists. Choose another property.");
    if (existing.exists())
      throw new Error("This room number already exists on this floor.");
    transaction.set(roomRef, {
      propertyId,
      name: name.trim(),
      monthlyRent,
      electricityRate,
      lastMeterReading: initialMeterReading,
      status: "vacant",
      ...(floorNumber !== undefined ? { floorNumber } : {}),
      ...(roomNumber !== undefined ? { roomNumber: roomNumber.trim() } : {}),
    });
  });
  return roomRef.id;
}

export async function updateRoom(roomId: string, data: Partial<RoomDoc>) {
  await updateDoc(doc(db, "rooms", roomId), data);
}

export async function getProperties(): Promise<WithId<PropertyDoc>[]> {
  const snap = await getDocs(collection(db, "properties"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as PropertyDoc) }));
}

export async function getRooms(
  propertyId?: string,
): Promise<WithId<RoomDoc>[]> {
  const colRef = collection(db, "rooms");
  const q = propertyId
    ? query(colRef, where("propertyId", "==", propertyId))
    : colRef;
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as RoomDoc) }));
}
