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
import { useToast } from "@/hooks/use-toast";
import { authErrorMessage } from "@/lib/auth-errors";
import { APP_NAME } from "@/lib/constants";
import { initializeFirstAdmin } from "@/services/admin-init-service";
import { isSystemInitialized } from "@/services/settings-service";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

const setupSchema = z
  .object({
    name: z.string().min(2, "Full name is required"),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be at most 30 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores",
      ),
    phone: z
      .string()
      .min(10, "Valid 10-digit phone number is required")
      .max(15, "Phone number too long"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/\d/, "Password must contain at least one number"),
    confirmPassword: z.string(),
    businessName: z.string().min(2, "Business or property name is required"),
    upiId: z.string().min(3, "Valid UPI ID / VPA is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SetupFormValues = z.infer<typeof setupSchema>;

export function InitialSetup() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [checkingInit, setCheckingInit] = useState(true);
  const [alreadyInitialized, setAlreadyInitialized] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function checkStatus() {
      try {
        const initialized = await isSystemInitialized();
        setAlreadyInitialized(initialized);
      } catch (err) {
        setErrorMessage(authErrorMessage(err));
        setAlreadyInitialized(false);
      } finally {
        setCheckingInit(false);
      }
    }
    checkStatus();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      name: "",
      username: "admin",
      phone: "",
      password: "",
      confirmPassword: "",
      businessName: "RentEase Residences",
      upiId: "",
    },
  });

  const onSubmit = async (data: SetupFormValues) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await initializeFirstAdmin({
        username: data.username,
        password: data.password,
        name: data.name,
        phone: data.phone,
        businessName: data.businessName,
        upiId: data.upiId,
      });

      toast({
        title: "System Initialized!",
        description: `Admin account @${data.username} created successfully.`,
      });

      navigate("/a");
    } catch (err) {
      console.error(err);
      const msg = authErrorMessage(err);
      setErrorMessage(msg);
      toast({
        variant: "destructive",
        title: "Setup Failed",
        description: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingInit) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Locked State if already initialized
  if (alreadyInitialized) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <ShieldAlert className="size-6" />
            </div>
            <CardTitle className="text-xl">
              System Already Initialized
            </CardTitle>
            <CardDescription className="text-xs">
              A primary administrator account has already been registered. For
              security, the one-time initialization wizard is locked.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Please sign in with your administrator credentials. Additional
              landlords or staff can be managed directly from the Admin Portal.
            </p>
            <Button asChild className="w-full">
              <Link to="/login">
                Return to Sign In
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // One-time Setup Form
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <Brand />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {APP_NAME} — One-Time Setup
          </h1>
          <p className="text-sm text-muted-foreground">
            Initialize your primary Landlord / Administrator account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Create Initial Admin Account
            </CardTitle>
            <CardDescription className="text-xs">
              This one-time wizard securely establishes your root administrator
              credentials. Once created, this setup is permanently locked.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {errorMessage && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Ramesh Patel"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    placeholder="e.g. 9876543210"
                    {...register("phone")}
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="username">Admin Username *</Label>
                <Input
                  id="username"
                  placeholder="e.g. admin"
                  {...register("username")}
                />
                {errors.username && (
                  <p className="text-xs text-destructive">
                    {errors.username.message}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  You will sign in with this username (e.g. admin).
                </p>
              </div>

              {/* Password & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 chars with number"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowPassword((p) => !p)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter password"
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Business Name & UPI ID */}
              <div className="pt-2 border-t space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="businessName">
                    Property / Business Name *
                  </Label>
                  <Input
                    id="businessName"
                    placeholder="e.g. Sunrise Residency"
                    {...register("businessName")}
                  />
                  {errors.businessName && (
                    <p className="text-xs text-destructive">
                      {errors.businessName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="upiId">Landlord UPI ID / VPA *</Label>
                  <Input
                    id="upiId"
                    placeholder="e.g. landlord@okaxis or 9876543210@paytm"
                    {...register("upiId")}
                  />
                  {errors.upiId && (
                    <p className="text-xs text-destructive">
                      {errors.upiId.message}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Tenants will send rent to this UPI address via QR code.
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full mt-4"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Initializing Portal...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Initialize Admin & Launch RentEase
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
