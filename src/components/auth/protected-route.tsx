import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import type { UserRole } from "@/lib/types";
import { Loader2, LogOut, ShieldX } from "lucide-react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

// ─── Props ───────────────────────────────────────────────────────────────────

interface ProtectedRouteProps {
  children: ReactNode;
  /** If set, user must have this role to access the route */
  requiredRole?: UserRole;
  /** Where to redirect unauthenticated users (default: /login) */
  redirectTo?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const { user, userDoc, loading, signOut } = useAuth();

  // ── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="flex min-h-svh items-center justify-center"
        role="status"
        aria-label="Loading"
      >
        <Loader2 className="size-8 animate-spin text-primary" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  // ── Not authenticated ──────────────────────────────────────────────────
  if (!user || !userDoc) {
    return <Navigate to={redirectTo} replace />;
  }

  // ── Account deactivated ────────────────────────────────────────────────
  if (!userDoc.active) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <div
              className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
              aria-hidden="true"
            >
              <ShieldX className="size-6" />
            </div>
            <CardTitle className="text-xl">Account Deactivated</CardTitle>
            <CardDescription>
              Your account has been deactivated by an administrator. Please
              contact your landlord if you believe this is an error.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => signOut()}
            >
              <LogOut className="size-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Must change password ───────────────────────────────────────────────
  if (userDoc.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  // ── Role check ─────────────────────────────────────────────────────────
  if (requiredRole && userDoc.role !== requiredRole) {
    // Redirect to the user's appropriate dashboard
    const destination = userDoc.role === "admin" ? "/a" : "/t";
    return <Navigate to={destination} replace />;
  }

  // ── Authorized ─────────────────────────────────────────────────────────
  return <>{children}</>;
}
