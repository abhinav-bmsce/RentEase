import { DEFAULT_SETTINGS, usernameToEmail } from "@/lib/constants";
import { auth, db } from "@/lib/firebase";
import type { SettingsDoc, UserDoc } from "@/lib/types";
import { isSystemInitialized } from "@/services/settings-service";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, serverTimestamp, writeBatch } from "firebase/firestore";

export async function initializeFirstAdmin({
  username,
  password,
  name,
  phone,
  businessName,
  upiId,
}: {
  username: string;
  password: string;
  name: string;
  phone: string;
  businessName?: string;
  upiId?: string;
}) {
  // 1. Guard check: Ensure system is not already initialized
  const initialized = await isSystemInitialized();
  if (initialized) {
    throw new Error(
      "System is already initialized. First-time admin creation is locked.",
    );
  }

  // 2. Create Firebase Auth account
  const email = usernameToEmail(username.trim().toLowerCase());
  // An earlier attempt may have created Auth successfully before Firestore failed.
  // Recover only by authenticating with that account's password.
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  ).catch((error: { code?: string }) => {
    if (error.code !== "auth/email-already-in-use") throw error;
    return signInWithEmailAndPassword(auth, email, password);
  });
  const uid = userCredential.user.uid;

  // 3. Create Admin user document
  const userDocData: Omit<UserDoc, "createdAt" | "updatedAt"> & {
    createdAt: unknown;
    updatedAt: unknown;
  } = {
    role: "admin",
    name: name.trim(),
    username: username.trim().toLowerCase(),
    phone: phone.trim(),
    mustChangePassword: false,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const batch = writeBatch(db);
  batch.set(doc(db, "users", uid), userDocData);

  // 4. Create settings/general document to lock setup permanently
  const settingsData: SettingsDoc = {
    ...DEFAULT_SETTINGS,
    upiId: upiId?.trim() || import.meta.env.VITE_DEFAULT_UPI_ID || "owner@upi",
    businessName: businessName?.trim() || "RentEase Property Management",
    businessPhone: phone.trim() || "+91 98765 43210",
  };

  batch.set(doc(db, "settings", "general"), {
    ...settingsData,
    bootstrapUid: uid,
  });
  await batch.commit();

  return { uid, email, username: username.trim().toLowerCase() };
}
