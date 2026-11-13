import { usernameToEmail } from "@/lib/constants";
import { db, secondaryAuth } from "@/lib/firebase";
import type { TenancyDoc, UserDoc, WithId } from "@/lib/types";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { validateTenantPhoto } from "./tenant-photo-service";

export async function createTenant({
  username,
  password,
  name,
  phone,
  roomId,
  securityDeposit,
  rentDueDay,
  startDate,
  photoUrl = "",
}: {
  username: string;
  password: string;
  name: string;
  phone: string;
  roomId: string;
  securityDeposit: number;
  rentDueDay: number;
  startDate: Date;
  photoUrl?: string;
}) {
  validateTenantPhoto(photoUrl);
  const email = usernameToEmail(username.trim().toLowerCase());

  // 1. Create auth user with secondaryAuth so admin doesn't get signed out
  const userCredential = await createUserWithEmailAndPassword(
    secondaryAuth,
    email,
    password,
  );
  const uid = userCredential.user.uid;

  // 2. Create Tenancy doc
  const tenancyData: Omit<TenancyDoc, "createdAt"> & { createdAt: unknown } = {
    tenantUid: uid,
    roomId,
    startDate: Timestamp.fromDate(startDate),
    rentDueDay,
    securityDeposit,
    depositStatus: "held",
    active: true,
    createdAt: serverTimestamp(),
  };

  const tenancyRef = await addDoc(collection(db, "tenancies"), tenancyData);

  // 3. Create User doc
  const userData: Omit<UserDoc, "createdAt" | "updatedAt"> & {
    createdAt: unknown;
    updatedAt: unknown;
  } = {
    role: "tenant",
    photoUrl,
    name: name.trim(),
    username: username.trim().toLowerCase(),
    phone: phone.trim(),
    mustChangePassword: true,
    active: true,
    tenancyId: tenancyRef.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, "users", uid), userData);

  // 4. Mark room as occupied
  await updateDoc(doc(db, "rooms", roomId), {
    status: "occupied",
  });

  return { uid, tenancyId: tenancyRef.id };
}

export async function getTenants(): Promise<WithId<UserDoc>[]> {
  const q = query(collection(db, "users"), where("role", "==", "tenant"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as UserDoc) }));
}

export async function updateTenantStatus(uid: string, active: boolean) {
  await updateDoc(doc(db, "users", uid), {
    active,
    updatedAt: serverTimestamp(),
  });
}

export async function endTenancy(tenancyId: string, roomId: string) {
  await updateDoc(doc(db, "tenancies", tenancyId), {
    active: false,
    endDate: Timestamp.now(),
  });
  await updateDoc(doc(db, "rooms", roomId), {
    status: "vacant",
  });
}

export async function updateTenantPhoto(uid: string, photoUrl: string) {
  validateTenantPhoto(photoUrl);
  await updateDoc(doc(db, "users", uid), {
    photoUrl,
    updatedAt: serverTimestamp(),
  });
}
