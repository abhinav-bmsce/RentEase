import {
  doc,
  getDoc,
  type DocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { roomLabel } from "@/lib/rooms";
import type { RoomDoc, TenancyDoc, WithId } from "@/lib/types";
export interface ChatContact {
  id: string;
  name: string;
  room: string;
}
export async function loadChatContacts(
  uid: string,
  owner: boolean,
  leases: WithId<TenancyDoc>[],
): Promise<ChatContact[]> {
  // Cache shared properties/rooms within this refresh; no extra live listeners.
  const cache = new Map<string, Promise<DocumentSnapshot<DocumentData>>>();
  const read = (path: string, id: string) => {
    const key = `${path}/${id}`;
    if (!cache.has(key)) cache.set(key, getDoc(doc(db, path, id)));
    return cache.get(key)!;
  };
  const settings = await read("settings", "general");
  const contacts = await Promise.all(
    leases
      .filter((l) => l.active)
      .map(async (lease) => {
        const room = await read("rooms", lease.roomId);
        if (!room.exists()) return null;
        const property = await read("properties", room.data().propertyId);
        const assignedOwner =
          property.data()?.ownerUid || settings.data()?.bootstrapUid;
        if (owner ? assignedOwner !== uid : lease.tenantUid !== uid)
          return null;
        const tenant = await read("users", lease.tenantUid);
        if (
          !tenant.exists() ||
          !tenant.data().active ||
          tenant.data().tenancyId !== lease.id
        )
          return null;
        return {
          id: lease.id,
          name: tenant.data().name || "Tenant",
          room: roomLabel(room.data() as RoomDoc),
        };
      }),
  );
  return contacts
    .filter((c): c is ChatContact => c !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}
