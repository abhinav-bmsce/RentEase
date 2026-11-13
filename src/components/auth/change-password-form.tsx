"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { APP_NAME } from "@/lib/constants";
import { db } from "@/lib/firebase";
import { zodResolver } from "@hookform/resolvers/zod";
import { updatePassword } from "firebase/auth";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

// ─── Validation schema ──────────────────────────────────────────────────────

const changePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/\d/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

// ─── Component ───────────────────────────────────────────────────────────────

export function ChangePasswordForm() {
  const { user, updateUserDoc } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: ChangePasswordFormValues) {
    if (!user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Update Firebase Auth password
      await updatePassword(user, data.newPassword);

      // Update Firestore doc to clear mustChangePassword flag
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        mustChangePassword: false,
        updatedAt: serverTimestamp(),
      });

      // Refresh the user doc in context
      await updateUserDoc();

      setSuccess(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update password.";

      if (message.includes("requires-recent-login")) {
        setError(
          "Your session has expired. Please sign out, sign back in, and try again.",
        );
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div
              className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
              aria-hidden="true"
            >
              <Lock className="size-6" />
            </div>
            <CardTitle className="text-xl">Password Updated</CardTitle>
            <CardDescription>
              Your password has been changed successfully. Redirecting&hellip;
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {APP_NAME}
          </h1>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <div
              className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
              aria-hidden="true"
            >
              <Lock className="size-6" />
            </div>
            <CardTitle className="text-center text-xl">
              Change Your Password
            </CardTitle>
            <CardDescription className="text-center">
              You must set a new password before continuing
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="space-y-4">
                {/* ── Error ──────────────────────────────────────────── */}
                {error && (
                  <div
                    role="alert"
                    className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                  >
                    {error}
                  </div>
                )}

                {/* ── New password ───────────────────────────────────── */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNew ? "text" : "password"}
                      placeholder="Min. 8 characters with a number"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      className="pr-10"
                      aria-invalid={!!errors.newPassword}
                      aria-describedby={
                        errors.newPassword ? "new-password-error" : undefined
                      }
                      {...register("newPassword")}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors duration-150 hover:text-foreground"
                      onClick={() => setShowNew((prev) => !prev)}
                      aria-label={showNew ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showNew ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p
                      id="new-password-error"
                      className="text-sm text-destructive"
                      role="alert"
                    >
                      {errors.newPassword.message}
                    </p>
                  )}
                </div>

                {/* ── Confirm password ───────────────────────────────── */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter your new password"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      className="pr-10"
                      aria-invalid={!!errors.confirmPassword}
                      aria-describedby={
                        errors.confirmPassword
                          ? "confirm-password-error"
                          : undefined
                      }
                      {...register("confirmPassword")}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors duration-150 hover:text-foreground"
                      onClick={() => setShowConfirm((prev) => !prev)}
                      aria-label={
                        showConfirm ? "Hide password" : "Show password"
                      }
                      tabIndex={-1}
                    >
                      {showConfirm ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p
                      id="confirm-password-error"
                      className="text-sm text-destructive"
                      role="alert"
                    >
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {/* ── Submit ─────────────────────────────────────────── */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Updating…
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
