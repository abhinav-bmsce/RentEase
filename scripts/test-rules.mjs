import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
const env = await initializeTestEnvironment({
  projectId: "demo-rentease",
  firestore: {
    host: "127.0.0.1",
    port: 8088,
    rules: readFileSync("firestore.rules", "utf8"),
  },
});
let passed = 0;
async function check(name, work) {
  await work();
  passed++;
  console.log(`PASS ${name}`);
}
try {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const [id, role, active, tenancyId] of [
      ["owner", "admin", true, ""],
      ["alice", "tenant", true, "lease-a"],
      ["bob", "tenant", true, "lease-b"],
      ["disabled", "tenant", false, "lease-a"],
    ])
      await setDoc(doc(db, "users", id), { role, active, tenancyId });
    await setDoc(doc(db, "settings", "general"), { businessName: "Test" });
    await setDoc(doc(db, "rooms", "room-a"), {
      propertyId: "building",
      status: "occupied",
    });
    await setDoc(doc(db, "tenancies", "lease-a"), {
      tenantUid: "alice",
      roomId: "room-a",
      active: true,
    });
    await setDoc(doc(db, "tenancies", "lease-b"), {
      tenantUid: "bob",
      roomId: "room-b",
      active: true,
    });
  });
  const alice = env.authenticatedContext("alice").firestore(),
    bob = env.authenticatedContext("bob").firestore(),
    owner = env.authenticatedContext("owner").firestore(),
    anon = env.unauthenticatedContext().firestore(),
    disabled = env.authenticatedContext("disabled").firestore();
  const request = {
    tenantUid: "alice",
    roomId: "room-a",
    propertyId: "building",
    category: "plumbing",
    description: "The kitchen tap is leaking.",
    repairNeeded: "Repair the tap",
    priority: "normal",
    photoUrl: "",
    status: "submitted",
    assignee: "",
    cost: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await check("tenant can create own request", () =>
    assertSucceeds(setDoc(doc(alice, "maintenance", "repair"), request)),
  );
  await check("unrelated tenant cannot read request", () =>
    assertFails(getDoc(doc(bob, "maintenance", "repair"))),
  );
  await check("anonymous cannot read request", () =>
    assertFails(getDoc(doc(anon, "maintenance", "repair"))),
  );
  await check("owner can read request", () =>
    assertSucceeds(getDoc(doc(owner, "maintenance", "repair"))),
  );
  await check("cannot spoof another tenant", () =>
    assertFails(setDoc(doc(bob, "maintenance", "spoof"), request)),
  );
  await check("cannot assign request to unrelated room", () =>
    assertFails(
      setDoc(doc(alice, "maintenance", "wrong-room"), {
        ...request,
        roomId: "room-b",
      }),
    ),
  );
  await check("tenant cannot approve request", () =>
    assertFails(
      updateDoc(doc(alice, "maintenance", "repair"), {
        status: "acknowledged",
        updatedAt: serverTimestamp(),
      }),
    ),
  );
  await check("owner cannot skip maintenance stages", () =>
    assertFails(
      updateDoc(doc(owner, "maintenance", "repair"), {
        status: "resolved",
        assignee: "Plumber",
        updatedAt: serverTimestamp(),
      }),
    ),
  );
  await check("owner can acknowledge request", () =>
    assertSucceeds(
      updateDoc(doc(owner, "maintenance", "repair"), {
        status: "acknowledged",
        updatedAt: serverTimestamp(),
      }),
    ),
  );
  await check("disabled tenant cannot read request", () =>
    assertFails(getDoc(doc(disabled, "maintenance", "repair"))),
  );
  await check("other tenant cannot read identity profile", () =>
    assertFails(getDoc(doc(bob, "users", "alice"))),
  );
  await check("tenant cannot elevate their role", () =>
    assertFails(updateDoc(doc(alice, "users", "alice"), { role: "admin" })),
  );
  console.log(`${passed} security-rule tests passed.`);
} finally {
  await env.cleanup();
}
