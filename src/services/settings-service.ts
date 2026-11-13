import { DEFAULT_SETTINGS } from "@/lib/constants";
import { db } from "@/lib/firebase";
import type { SettingsDoc } from "@/lib/types";
import { doc, getDoc, setDoc } from "firebase/firestore";

const SETTINGS_DOC_ID = "general";

export async function isSystemInitialized(): Promise<boolean> {
  const docRef = doc(db, "settings", SETTINGS_DOC_ID);
  const snap = await getDoc(docRef);
  return snap.exists();
}

export async function getSettings(): Promise<SettingsDoc> {
  const docRef = doc(db, "settings", SETTINGS_DOC_ID);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as SettingsDoc;
  }
  const defaults: SettingsDoc = {
    ...DEFAULT_SETTINGS,
    upiId: import.meta.env.VITE_DEFAULT_UPI_ID || "owner@upi",
    businessName: "RentEase Residences",
    businessPhone: "+91 98765 43210",
  };
  return defaults;
}

export async function updateSettings(settings: Partial<SettingsDoc>) {
  const docRef = doc(db, "settings", SETTINGS_DOC_ID);
  await setDoc(docRef, settings, { merge: true });
}
