import { db } from "@/lib/firebase";
import type { WithId } from "@/lib/types";
import {
  collection,
  doc,
  onSnapshot,
  query,
  queryEqual,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";

interface RealtimeCollectionResult<T> {
  data: WithId<T>[];
  loading: boolean;
  error: Error | null;
}

export function useCollectionRealtime<T extends DocumentData = DocumentData>(
  collectionPath: string,
  constraints: QueryConstraint[] = [],
  enabled: boolean = true,
): RealtimeCollectionResult<T> {
  const [data, setData] = useState<WithId<T>[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const nextQuery = query(collection(db, collectionPath), ...constraints);
  const stableQuery = useRef(nextQuery);
  if (!queryEqual(stableQuery.current, nextQuery))
    stableQuery.current = nextQuery;
  const currentQuery = stableQuery.current;

  useEffect(() => {
    setData([]);
    setError(null);
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Firestore retries offline indefinitely without invoking the error callback.
    // End the initial loading state, but keep listening so reconnection recovers.
    const timeout = setTimeout(() => {
      setError(new Error("Connection timed out. Check your connection and reload."));
      setLoading(false);
    }, 15000);
    const unsubscribe = onSnapshot(
      currentQuery,
      (snapshot) => {
        clearTimeout(timeout);
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as T),
        }));
        setData(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        clearTimeout(timeout);
        console.error(`Could not load ${collectionPath}`, err.code);
        setError(err as Error);
        setLoading(false);
      },
    );

    return () => { clearTimeout(timeout); unsubscribe(); };
  }, [collectionPath, enabled, currentQuery]);

  return { data, loading, error };
}

interface RealtimeDocumentResult<T> {
  data: WithId<T> | null;
  loading: boolean;
  error: Error | null;
}

export function useDocumentRealtime<T extends DocumentData = DocumentData>(
  collectionPath: string,
  docId: string | undefined | null,
): RealtimeDocumentResult<T> {
  const [data, setData] = useState<WithId<T> | null>(null);
  const [loading, setLoading] = useState(Boolean(docId));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    if (!docId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const docRef = doc(db, collectionPath, docId);

    // Firestore retries offline indefinitely without invoking the error callback.
    // End the initial loading state, but keep listening so reconnection recovers.
    const timeout = setTimeout(() => {
      setError(new Error("Connection timed out. Check your connection and reload."));
      setLoading(false);
    }, 15000);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        clearTimeout(timeout);
        if (snapshot.exists()) {
          setData({
            id: snapshot.id,
            ...(snapshot.data() as T),
          });
        } else {
          setData(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        clearTimeout(timeout);
        console.error(`Could not load ${collectionPath} record`, err.code);
        setError(err as Error);
        setLoading(false);
      },
    );

    return () => { clearTimeout(timeout); unsubscribe(); };
  }, [collectionPath, docId]);

  return { data, loading, error };
}
