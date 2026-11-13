import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  collection,
  serverTimestamp,
  runTransaction,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
const env = await initializeTestEnvironment({
  projectId: "demo-rentease",
  firestore: {
    host: "127.0.0.1",
    port: 8088,
    rules: readFileSync("firestore.rules", "utf8"),
  },
});
let count = 0;
async function test(name, fn) {
  await fn();
  count++;
  console.log("PASS " + name);
}
try {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [uid, role, active] of [
      ["owner", "admin", true],
      ["otherOwner", "admin", true],
      ["alice", "tenant", true],
      ["bob", "tenant", true],
      ["disabled", "tenant", false],
    ])
      await setDoc(doc(db, "users", uid), {
        role,
        active,
        name: uid,
        tenancyId: uid === "alice" ? "lease" : "other",
      });
    await setDoc(doc(db, "settings", "general"), { bootstrapUid: "owner" });
    await setDoc(doc(db, "properties", "property"), { name: "Test" });
    await setDoc(doc(db, "rooms", "room"), { propertyId: "property" });
    await setDoc(doc(db, "tenancies", "lease"), {
      active: true,
      tenantUid: "alice",
      roomId: "room",
    });
    await setDoc(doc(db, "maintenance", "repair"), {
      tenantUid: "alice",
      roomId: "room",
    });
    await setDoc(doc(db, "maintenance", "foreign"), {
      tenantUid: "bob",
      roomId: "other",
    });
  });
  const alice = env.authenticatedContext("alice").firestore(),
    owner = env.authenticatedContext("owner").firestore(),
    bob = env.authenticatedContext("bob").firestore(),
    other = env.authenticatedContext("otherOwner").firestore(),
    disabled = env.authenticatedContext("disabled").firestore(),
    anon = env.unauthenticatedContext().firestore();
  const initial = {
    tenantUid: "alice",
    ownerUid: "owner",
    tenancyId: "lease",
    tenantName: "alice",
    seq: 0,
    tenantSent: 0,
    ownerSent: 0,
    tenantRead: 0,
    ownerRead: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const convo = (db) => doc(db, "conversations", "lease");
  await test("participant can check missing deterministic conversation", () =>
    assertSucceeds(getDoc(convo(alice))));
  await test("unrelated owner cannot start conversation", () =>
    assertFails(setDoc(convo(other), { ...initial, ownerUid: "otherOwner" })));
  await test("tenant creates assigned-owner conversation", () =>
    assertSucceeds(setDoc(convo(alice), initial)));
  await test("duplicate conversation id rejected", () =>
    assertFails(setDoc(doc(alice, "conversations", "duplicate"), initial)));
  await test("participant can query own conversations", () =>
    assertSucceeds(
      getDocs(
        query(
          collection(alice, "conversations"),
          where("tenantUid", "==", "alice"),
          limit(100),
        ),
      ),
    ));
  for (const [name, db] of [
    ["unrelated tenant", bob],
    ["unrelated admin", other],
    ["anonymous", anon],
    ["disabled", disabled],
  ])
    await test(name + " cannot read conversation", () =>
      assertFails(getDoc(convo(db))),
    );
  async function send(db, uid, id, text = "Hello", extra = {}, attempt = 0) {
    let attemptedSeq = -1;
    try {
      return await runTransaction(db, async (tx) => {
        const c = (await tx.get(convo(db))).data();
        attemptedSeq = c.seq;
        const tenant = uid === "alice",
          field = tenant ? "tenantSent" : "ownerSent";
        tx.set(doc(db, "conversations", "lease", "messages", id), {
          senderUid: uid,
          text,
          seq: c.seq + 1,
          ordinal: c[field] + 1,
          maintenanceId: "",
          createdAt: serverTimestamp(),
          ...extra,
        });
        tx.update(convo(db), {
          seq: c.seq + 1,
          [field]: c[field] + 1,
          lastMessageId: id,
          updatedAt: serverTimestamp(),
        });
      });
    } catch (error) {
      if (
        attempt < 2 &&
        error.code === "permission-denied" &&
        (await getDoc(convo(db))).data().seq > attemptedSeq
      )
        return send(db, uid, id, text, extra, attempt + 1);
      throw error;
    }
  }
  await test("tenant sends validated message atomically", () =>
    assertSucceeds(send(alice, "alice", "first")));
  await test("owner replies in real time", async () => {
    let stop;
    const arrival = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        stop?.();
        reject(new Error("Realtime timeout"));
      }, 5000);
      stop = onSnapshot(
        query(
          collection(alice, "conversations", "lease", "messages"),
          limit(40),
        ),
        (snap) => {
          if (snap.docs.some((d) => d.id === "reply")) {
            clearTimeout(timer);
            resolve();
          }
        },
        reject,
      );
    });
    try {
      await assertSucceeds(send(owner, "owner", "reply"));
      await arrival;
    } finally {
      stop?.();
    }
  });
  await test("sender spoofing rejected", () =>
    assertFails(
      send(alice, "alice", "spoof", "hello", { senderUid: "owner" }),
    ));
  await test("blank content rejected", () =>
    assertFails(send(alice, "alice", "blank", " \n\t")));
  await test("oversized content rejected", () =>
    assertFails(send(alice, "alice", "long", "x".repeat(2001))));
  await test("multiline content accepted", () =>
    assertSucceeds(send(alice, "alice", "multiline", "Line one\nLine two")));
  await test("maintenance link accepted for own room", () =>
    assertSucceeds(
      send(alice, "alice", "linked", "Repair update", {
        maintenanceId: "repair",
      }),
    ));
  await test("foreign maintenance link rejected", () =>
    assertFails(
      send(alice, "alice", "foreign", "Other repair", {
        maintenanceId: "foreign",
      }),
    ));
  await test("message body is immutable", () =>
    assertFails(
      updateDoc(doc(alice, "conversations", "lease", "messages", "first"), {
        text: "Edited",
      }),
    ));
  await test("message deletion denied", () =>
    assertFails(
      deleteDoc(doc(owner, "conversations", "lease", "messages", "first")),
    ));
  await test("message without parent counter update rejected", () =>
    assertFails(
      setDoc(doc(alice, "conversations", "lease", "messages", "orphan"), {
        senderUid: "alice",
        text: "hello",
        seq: 99,
        ordinal: 99,
        maintenanceId: "",
        createdAt: serverTimestamp(),
      }),
    ));
  await test("counter-only forgery rejected", () =>
    assertFails(
      updateDoc(convo(alice), {
        seq: 99,
        tenantSent: 99,
        lastMessageId: "first",
        updatedAt: serverTimestamp(),
      }),
    ));
  await test("participant can mark received messages read", () =>
    assertSucceeds(updateDoc(convo(alice), { tenantRead: 1 })));
  await test("participant cannot forge other read receipt", () =>
    assertFails(updateDoc(convo(alice), { ownerRead: 1 })));
  await test("cannot mark future messages read", () =>
    assertFails(updateDoc(convo(alice), { tenantRead: 999 })));
  await test("unbounded message query denied", () =>
    assertFails(
      getDocs(collection(alice, "conversations", "lease", "messages")),
    ));
  await test("unrelated tenant cannot read message", () =>
    assertFails(
      getDoc(doc(bob, "conversations", "lease", "messages", "first")),
    ));
  await test("concurrent sends keep unique ordered sequences", async () => {
    await Promise.all([
      send(alice, "alice", "parallel-a"),
      send(owner, "owner", "parallel-b"),
    ]);
    const messages = await getDocs(
      query(collection(alice, "conversations", "lease", "messages"), limit(40)),
    );
    const sequences = messages.docs.map((d) => d.data().seq);
    if (new Set(sequences).size !== sequences.length)
      throw new Error("Duplicate sequence");
  });
  await env.withSecurityRulesDisabled((ctx) =>
    updateDoc(doc(ctx.firestore(), "properties", "property"), {
      ownerUid: "otherOwner",
    }),
  );
  await test("previous owner cannot send after reassignment", () =>
    assertFails(send(owner, "owner", "reassigned")));
  await test("new owner cannot read previous private history", () =>
    assertFails(getDoc(convo(other))));
  await env.withSecurityRulesDisabled((ctx) =>
    updateDoc(doc(ctx.firestore(), "properties", "property"), {
      ownerUid: "owner",
    }),
  );
  await env.withSecurityRulesDisabled((ctx) =>
    updateDoc(doc(ctx.firestore(), "tenancies", "lease"), { active: false }),
  );
  await test("ended tenancy cannot send", () =>
    assertFails(send(alice, "alice", "ended")));
  await test("original participants retain read-only history", () =>
    assertSucceeds(
      getDoc(doc(alice, "conversations", "lease", "messages", "first")),
    ));
  console.log(`${count} Connect security/realtime tests passed.`);
} finally {
  await env.cleanup();
}
