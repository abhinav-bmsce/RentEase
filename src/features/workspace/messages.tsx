import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useCollectionRealtime } from "@/hooks/use-firestore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  PageHeader,
  EmptyState,
  PageSkeleton,
} from "@/components/shared/page-ui";
import { DataNotice } from "@/components/shared/data-notice";
import type { TenancyDoc, WithId } from "@/lib/types";
import {
  markConversationRead,
  openConversation,
  sendMessage,
  unreadCount,
  type ChatMessage,
  type Conversation,
} from "@/services/chat-service";

export function MessagesPage() {
  const { user, userDoc, isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const id = params.get("conversation") || "",
    maintenanceId = params.get("maintenance") || "";
  const {
    data: conversations,
    loading,
    error,
  } = useCollectionRealtime<Conversation>(
    "conversations",
    [
      where(isAdmin ? "ownerUid" : "tenantUid", "==", user?.uid || ""),
      limit(100),
    ],
    Boolean(user),
  );
  const { data: leases } = useCollectionRealtime<TenancyDoc>(
    "tenancies",
    [where("active", "==", true)],
    isAdmin,
  );
  const [problem, setProblem] = useState(""),
    [opening, setOpening] = useState(false);
  const [selectedLease, setSelectedLease] = useState(
    params.get("tenancy") || "",
  );
  async function open(lease: string) {
    if (!lease) return;
    setOpening(true);
    setProblem("");
    try {
      const conversation = await openConversation(lease);
      setParams({
        conversation,
        ...(maintenanceId ? { maintenance: maintenanceId } : {}),
      });
    } catch (e) {
      setProblem((e as Error).message);
    } finally {
      setOpening(false);
    }
  }
  const current = conversations.find((c) => c.id === id);
  return (
    <div className="space-y-5">
      <PageHeader
        title="RentEase Connect"
        description="Private conversations about your home. Text only, between you and your assigned property owner."
      />
      {error && <DataNotice error={error} />}
      {problem && (
        <p role="alert" className="data-notice">
          {problem}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {isAdmin && (
          <select
            aria-label="Active tenancy"
            className="border rounded-md bg-background p-2 max-w-full"
            value={selectedLease}
            onChange={(e) => setSelectedLease(e.target.value)}
          >
            <option value="">Select an active tenancy</option>
            {leases.map((l) => (
              <option key={l.id} value={l.id}>
                {conversations.find((c) => c.id === l.id)?.tenantName ||
                  `Room ${l.roomId}`}{" "}
                · {l.id.slice(0, 8)}
              </option>
            ))}
          </select>
        )}
        <Button
          disabled={opening || (isAdmin ? !selectedLease : !userDoc?.tenancyId)}
          onClick={() =>
            void open(isAdmin ? selectedLease : userDoc?.tenancyId || "")
          }
        >
          {opening
            ? "Opening…"
            : isAdmin
              ? "Start conversation"
              : "Chat with owner"}
        </Button>
      </div>
      {loading ? (
        <PageSkeleton />
      ) : (
        <div className="grid md:grid-cols-[240px_minmax(0,1fr)] border rounded-xl bg-card overflow-hidden">
          <aside
            aria-label="Conversations"
            className={`${id ? "hidden md:block" : ""} border-b md:border-b-0 md:border-r p-3 space-y-2 max-h-[65dvh] overflow-y-auto`}
          >
            <p className="text-xs text-muted-foreground px-2 py-1">MESSAGES</p>
            {!conversations.length && (
              <p className="text-sm p-2 text-muted-foreground">
                No conversations yet. Start one above.
              </p>
            )}
            {[...conversations]
              .sort(
                (a, b) =>
                  (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0),
              )
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setProblem("");
                    setParams({ conversation: c.id });
                  }}
                  aria-current={id === c.id ? "page" : undefined}
                  className={`w-full text-left rounded-lg p-3 ${id === c.id ? "bg-primary/10" : "hover:bg-muted"}`}
                >
                  <span className="font-medium text-sm">
                    {isAdmin ? c.tenantName : "Property owner"}
                  </span>
                  {unreadCount(c, !isAdmin) > 0 && (
                    <span
                      aria-label={`${unreadCount(c, !isAdmin)} unread`}
                      className="float-right rounded-full bg-primary text-primary-foreground px-2 text-xs"
                    >
                      {unreadCount(c, !isAdmin)}
                    </span>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.updatedAt?.toDate().toLocaleDateString() ||
                      "Just started"}
                  </p>
                </button>
              ))}
            {conversations.length === 100 && (
              <p className="text-xs">Showing up to 100 conversations.</p>
            )}
          </aside>
          <section className={`${!id ? "hidden md:block" : ""} min-w-0`}>
            {current ? (
              <ChatThread
                key={id}
                conversation={current}
                maintenanceId={maintenanceId}
                onBack={() => setParams({})}
              />
            ) : (
              <EmptyState
                title={
                  id ? "Conversation unavailable" : "A direct line to home"
                }
                description={
                  id
                    ? "Select an accessible conversation or start one for your active tenancy."
                    : "Select a conversation to read and send messages."
                }
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function ChatThread({
  conversation: c,
  maintenanceId,
  onBack,
}: {
  conversation: WithId<Conversation>;
  maintenanceId: string;
  onBack: () => void;
}) {
  const { user, isAdmin } = useAuth();
  const [messages, setMessages] = useState<WithId<ChatMessage>[]>([]),
    [older, setOlder] = useState<WithId<ChatMessage>[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [more, setMore] = useState(true),
    [paging, setPaging] = useState(false);
  const [markVersion, setMarkVersion] = useState(0);
  const lastMarked = useRef(0);
  const [visible, setVisible] = useState(
    document.visibilityState === "visible",
  );
  const bottom = useRef<HTMLDivElement>(null),
    pending = useRef<{ id: string; text: string } | null>(null),
    marking = useRef(false);
  useEffect(() => {
    const change = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", change);
    return () => document.removeEventListener("visibilitychange", change);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      setError("Connection is taking too long. Reload to reconnect.");
    }, 15000);
    let firstServerSnapshot = true;
    const stop = onSnapshot(
      query(
        collection(db, "conversations", c.id, "messages"),
        orderBy("seq", "desc"),
        limit(40),
      ),
      (snap) => {
        clearTimeout(timer);
        setError("");
        setLoading(false);
        const next = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as WithId<ChatMessage>,
        );
        setMessages((previous) =>
          [
            ...new Map([...previous, ...next].map((m) => [m.id, m])).values(),
          ].sort((a, b) => b.seq - a.seq),
        );
        if (firstServerSnapshot && !snap.metadata.fromCache) {
          setMore(next.length === 40);
          firstServerSnapshot = false;
        }
      },
      () => {
        clearTimeout(timer);
        setLoading(false);
        setError(
          "Messages are unavailable. Check your connection, active tenancy, and published chat rules.",
        );
      },
    );
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [c.id]);
  const all = [
    ...new Map([...older, ...messages].map((m) => [m.id, m])).values(),
  ].sort((a, b) => a.seq - b.seq);
  const latest = messages[0]?.seq || 0;
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [latest]);
  useEffect(() => {
    if (
      loading ||
      error ||
      !visible ||
      latest < c.seq ||
      !unreadCount(c, !isAdmin) ||
      marking.current
    )
      return;
    const received = isAdmin ? c.tenantSent : c.ownerSent;
    if (received <= lastMarked.current) return;
    marking.current = true;
    markConversationRead(c.id, received, !isAdmin)
      .then(() => {
        lastMarked.current = received;
      })
      .catch(() => setError("Could not update read status. Reload to retry."))
      .finally(() => {
        marking.current = false;
        setMarkVersion((v) => v + 1);
      });
  }, [c, isAdmin, latest, loading, error, visible, markVersion]);
  async function loadOlder() {
    setPaging(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "conversations", c.id, "messages"),
          orderBy("seq", "desc"),
          startAfter(all[0]?.seq || 0),
          limit(40),
        ),
      );
      setOlder((old) => [
        ...old,
        ...snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as WithId<ChatMessage>,
        ),
      ]);
      setMore(snap.size === 40);
    } catch {
      setError("Could not load earlier messages. Please try again.");
    } finally {
      setPaging(false);
    }
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    if (!pending.current || pending.current.text !== text)
      pending.current = {
        id: doc(collection(db, "conversations", c.id, "messages")).id,
        text,
      };
    try {
      await sendMessage(c.id, text, maintenanceId, pending.current.id);
      setText("");
      pending.current = null;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col h-[min(72dvh,720px)] min-h-[380px]">
      <header className="p-4 border-b flex items-center gap-3">
        <Button variant="ghost" className="md:hidden" onClick={onBack}>
          Back
        </Button>
        <div>
          <h2 className="font-semibold">
            {isAdmin ? c.tenantName : "Property owner"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Private · Text messages
          </p>
        </div>
      </header>
      {maintenanceId && (
        <div className="px-4 py-2 bg-muted text-xs">
          Discussing maintenance request{" "}
          <Link
            className="underline"
            to={`${isAdmin ? "/a" : "/t"}/maintenance`}
          >
            {maintenanceId.slice(0, 10)}
          </Link>
        </div>
      )}
      {error && (
        <p role="alert" className="p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div
        role="log"
        aria-label="Conversation history"
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {loading ? (
          <PageSkeleton />
        ) : (
          <>
            {more && all.length > 0 && (
              <Button
                variant="outline"
                disabled={paging}
                onClick={() => void loadOlder()}
              >
                {paging ? "Loading…" : "Load earlier messages"}
              </Button>
            )}
            {!all.length && (
              <p className="text-sm text-muted-foreground">
                Start the conversation. Messages are shared only with this
                tenancy’s participants.
              </p>
            )}
            {all.map((m) => {
              const mine = m.senderUid === user?.uid;
              const read =
                mine && m.ordinal <= (isAdmin ? c.tenantRead : c.ownerRead);
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] sm:max-w-[75%] rounded-xl px-4 py-3 ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  >
                    {m.maintenanceId && (
                      <Link
                        className="block text-xs underline mb-2"
                        to={`${isAdmin ? "/a" : "/t"}/maintenance`}
                      >
                        Maintenance · {m.maintenanceId.slice(0, 10)}
                      </Link>
                    )}
                    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm">
                      {m.text}
                    </p>
                    <p className="text-[10px] opacity-75 mt-2">
                      {m.createdAt?.toDate().toLocaleString() || "Sending…"}
                      {mine ? ` · ${read ? "Read" : "Sent"}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottom} />
          </>
        )}
      </div>
      <form onSubmit={send} className="p-3 border-t flex gap-2 items-end">
        <div className="flex-1 min-w-0">
          <label htmlFor="chat-message" className="sr-only">
            Message
          </label>
          <Textarea
            id="chat-message"
            maxLength={2000}
            rows={2}
            value={text}
            disabled={busy}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a message…"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            {text.length}/2000 · Text only
          </p>
        </div>
        <Button type="submit" disabled={busy || loading || !text.trim()}>
          {busy ? "Sending…" : "Send"}
        </Button>
      </form>
    </div>
  );
}
