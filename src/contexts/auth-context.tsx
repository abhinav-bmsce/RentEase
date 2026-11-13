import { authErrorMessage } from "@/lib/auth-errors";
import { usernameToEmail } from "@/lib/constants";
import { auth, db } from "@/lib/firebase";
import type { UserDoc, WithId } from "@/lib/types";
import {
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  type User,
} from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// ─── Context value ───────────────────────────────────────────────────────────

interface AuthContextValue {
  /** Firebase Auth user object */
  user: User | null;
  /** Firestore user document */
  userDoc: WithId<UserDoc> | null;
  /** True while auth state or user doc is loading */
  loading: boolean;
  /** Last auth-related error */
  error: string | null;
  /** Convenience booleans */
  isAdmin: boolean;
  isTenant: boolean;
  /** Sign in with username (not email) and password */
  signIn: (username: string, password: string) => Promise<void>;
  /** Sign out the current user */
  signOut: () => Promise<void>;
  /** Re-fetch the user doc from Firestore */
  updateUserDoc: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

// ─── Provider ────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<WithId<UserDoc> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Listen to Firebase Auth state ────────────────────────────────────────

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUserDoc(null);
      setLoading(Boolean(firebaseUser));
      setUser(firebaseUser);
      if (!firebaseUser) {
        setUserDoc(null);
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  // ── Listen to Firestore user doc whenever user changes ────────────────────

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const userRef = doc(db, "users", user.uid);

    const unsubDoc = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setError(null);
          setUserDoc({
            id: snapshot.id,
            ...(snapshot.data() as UserDoc),
          });
        } else {
          setUserDoc(null);
          setError(
            "Account profile is missing. If initial registration was interrupted, return to First-time setup and use the same username and password.",
          );
        }
        setLoading(false);
      },
      (err) => {
        console.error("Failed to subscribe to user document:", err);
        setUserDoc(null);
        setError(authErrorMessage(err));
        setLoading(false);
      },
    );

    return () => unsubDoc();
  }, [user]);

  // ── Sign in ──────────────────────────────────────────────────────────────

  const signIn = useCallback(async (username: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const email = usernameToEmail(username.trim().toLowerCase());
      await signInWithEmailAndPassword(auth, email, password);
      // Auth state listener will handle setting user + loading userDoc
    } catch (err) {
      setError(authErrorMessage(err));
      setLoading(false);
    }
  }, []);

  // ── Sign out ─────────────────────────────────────────────────────────────

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await firebaseSignOut(auth);
      setUserDoc(null);
    } catch (err) {
      console.error("Sign out failed:", err);
      setError("Sign out failed. Please try again.");
    }
  }, []);

  // ── Update user doc manually (e.g. after password change) ────────────────

  const updateUserDoc = useCallback(async () => {
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      const snapshot = await getDoc(userRef);
      if (snapshot.exists()) {
        setUserDoc({
          id: snapshot.id,
          ...(snapshot.data() as UserDoc),
        });
      }
    } catch (err) {
      console.error("Failed to refresh user document:", err);
    }
  }, [user]);

  // ── Derived values ───────────────────────────────────────────────────────

  const isAdmin = userDoc?.role === "admin";
  const isTenant = userDoc?.role === "tenant";

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      userDoc,
      loading,
      error,
      isAdmin,
      isTenant,
      signIn,
      signOut,
      updateUserDoc,
    }),
    [
      user,
      userDoc,
      loading,
      error,
      isAdmin,
      isTenant,
      signIn,
      signOut,
      updateUserDoc,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
