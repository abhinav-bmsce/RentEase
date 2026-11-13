import { Brand } from "@/components/shared/brand";

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
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate } from "react-router-dom";
import { z } from "zod";

// ─── Validation schema ──────────────────────────────────────────────────────

const loginSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    ),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ─── Component ───────────────────────────────────────────────────────────────

export function LoginForm() {
  const { signIn, error: authError, userDoc, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsSubmitting(true);
    try {
      await signIn(data.username, data.password);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!loading && userDoc) {
    return (
      <Navigate
        to={
          userDoc.mustChangePassword
            ? "/change-password"
            : userDoc.role === "admin"
              ? "/a"
              : "/t"
        }
        replace
      />
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        {/* ── Logo / App title ────────────────────────────────────────── */}
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <Brand />
          <p className="text-sm text-muted-foreground">
            Sign in to manage your rental account
          </p>
        </div>

        {/* ── Login card ──────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to continue
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="space-y-4">
                {/* ── Auth error ──────────────────────────────────────── */}
                {authError && (
                  <div
                    role="alert"
                    className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                  >
                    {authError}
                  </div>
                )}

                {/* ── Username ────────────────────────────────────────── */}
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="e.g. admin"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    disabled={isSubmitting}
                    aria-invalid={!!errors.username}
                    aria-describedby={
                      errors.username ? "username-error" : undefined
                    }
                    {...register("username")}
                  />
                  {errors.username && (
                    <p
                      id="username-error"
                      className="text-sm text-destructive"
                      role="alert"
                    >
                      {errors.username.message}
                    </p>
                  )}
                </div>

                {/* ── Password ────────────────────────────────────────── */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      disabled={isSubmitting}
                      className="pr-10"
                      aria-invalid={!!errors.password}
                      aria-describedby={
                        errors.password ? "password-error" : undefined
                      }
                      {...register("password")}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors duration-150 hover:text-foreground"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p
                      id="password-error"
                      className="text-sm text-destructive"
                      role="alert"
                    >
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* ── Submit ──────────────────────────────────────────── */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Contact your administrator if you need access.
          </p>
          <p className="text-xs">
            <Link
              to="/setup"
              className="text-primary hover:underline font-medium text-[11px]"
            >
              First-time setup? Initialize primary admin account &rarr;
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
