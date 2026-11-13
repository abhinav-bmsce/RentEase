import { DataNotice } from "@/components/shared/data-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useDocumentRealtime } from "@/hooks/use-firestore";
import { useToast } from "@/hooks/use-toast";
import { formatMonth } from "@/lib/date";
import { formatMoney, paiseToRupees } from "@/lib/money";
import type { BillDoc, RoomDoc, SettingsDoc } from "@/lib/types";
import { submitPayment } from "@/services/payment-service";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

const paymentFormSchema = z.object({
  utr: z
    .string()
    .min(6, "UTR / Transaction ID must be at least 6 characters")
    .max(30, "Invalid transaction ID format"),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export function PaymentSubmission() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const {
    data: bill,
    loading: billLoading,
    error: billError,
  } = useDocumentRealtime<BillDoc>("bills", id);
  const { data: room } = useDocumentRealtime<RoomDoc>("rooms", bill?.roomId);
  const { data: settings } = useDocumentRealtime<SettingsDoc>(
    "settings",
    "general",
  );

  const [copied, setCopied] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: { utr: "" },
  });

  if (billLoading) {
    return (
      <div className="space-y-4 animate-pulse pt-4">
        <div className="h-48 bg-muted rounded-xl" />
      </div>
    );
  }

  if (billError) return <DataNotice error={billError} />;

  if (!bill) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Bill not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/t/bills">Back to Bills</Link>
        </Button>
      </div>
    );
  }

  const upiId =
    settings?.upiId || import.meta.env.VITE_DEFAULT_UPI_ID || "owner@upi";
  const businessName = settings?.businessName || "RentEase";
  const remainingPaise = Math.max(0, bill.total - (bill.paidAmount || 0));
  const amountRupees = paiseToRupees(remainingPaise);
  const transactionNote = `Rent_${bill.month}_${room?.name || "Room"}`;

  // Standard UPI URI format
  const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(businessName)}&am=${amountRupees}&tn=${encodeURIComponent(transactionNote)}&cu=INR`;

  const copyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied!", description: "UPI ID copied to clipboard" });
    } catch {
      toast({
        variant: "destructive",
        title: "Could not copy",
        description: "Select and copy the UPI ID manually.",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFileError("Please upload an image file (PNG, JPG, or WEBP)");
      return;
    }

    setProofFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setProofPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: PaymentFormValues) => {
    if (!proofFile) {
      setFileError("Payment screenshot proof is required");
      return;
    }

    if (!user) return;

    setIsSubmitting(true);
    try {
      await submitPayment({
        billId: bill.id,
        tenantUid: user.uid,
        amount: remainingPaise,
        utr: data.utr,
        proofFile,
      });

      toast({
        title: "Payment Submitted!",
        description:
          "Your payment proof has been submitted for landlord verification.",
      });

      navigate(`/t/bills/${bill.id}`);
    } catch (err) {
      console.error(err);
      const msg =
        err instanceof Error
          ? err.message
          : "Could not upload payment proof. Please try again.";
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Back button */}
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={`/t/bills/${bill.id}`}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Bill
          </Link>
        </Button>
      </div>

      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Make Payment</h1>
        <p className="text-xs text-muted-foreground">
          {formatMonth(bill.month)} Bill • {room?.name || "Room"}
        </p>
        <div className="text-3xl font-extrabold text-primary pt-2">
          {formatMoney(remainingPaise)}
        </div>
      </div>

      {/* UPI QR Code Section */}
      <Card>
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-sm font-semibold">
            Step 1: Scan & Pay via UPI
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Use GPay, PhonePe, Paytm, or any UPI app to scan and transfer
          </p>
        </CardHeader>

        <CardContent className="flex flex-col items-center space-y-4 pt-2">
          {/* QR Code Container */}
          <div className="p-4 bg-white rounded-2xl shadow-sm border flex items-center justify-center">
            <QRCodeSVG
              value={upiUri}
              size={180}
              level="M"
              includeMargin={false}
            />
          </div>

          {/* UPI ID display & copy */}
          <div className="w-full flex items-center justify-between p-2.5 bg-muted/50 rounded-lg text-xs">
            <div className="truncate pr-2">
              <span className="text-muted-foreground block text-[10px]">
                UPI ID
              </span>
              <span className="font-mono font-medium">{upiId}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyUpiId}
              className="h-8 shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>

          {/* Direct UPI App Intent Link (on mobile) */}
          <a
            href={upiUri}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            Open in UPI App
            <ExternalLink className="w-3 h-3" />
          </a>
        </CardContent>
      </Card>

      {/* Verification submission form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Step 2: Submit Verification Details
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Provide the UTR and payment screenshot for review by your
            property owner
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* UTR Number */}
            <div className="space-y-1.5">
              <Label htmlFor="utr">UPI Reference / UTR Number</Label>
              <Input
                id="utr"
                placeholder="e.g. 431289102938"
                autoComplete="off"
                {...register("utr")}
                aria-invalid={!!errors.utr}
              />
              {errors.utr && (
                <p className="text-xs text-destructive">{errors.utr.message}</p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Found in your payment receipt from Google Pay, PhonePe, or
                Paytm.
              </p>
            </div>

            {/* Proof screenshot upload */}
            <div className="space-y-1.5">
              <Label htmlFor="proof">Payment Screenshot</Label>
              <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/40 transition-colors">
                {proofPreview ? (
                  <div className="relative w-full max-h-48 overflow-hidden rounded-md flex justify-center">
                    <img
                      src={proofPreview}
                      alt="Proof preview"
                      className="object-contain max-h-48 rounded"
                    />
                  </div>
                ) : (
                  <label
                    htmlFor="proof"
                    className="flex flex-col items-center cursor-pointer"
                  >
                    <Upload className="w-7 h-7 text-muted-foreground mb-1" />
                    <span className="text-xs font-medium">
                      Click to upload screenshot
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      JPG, PNG, or WEBP (compressed automatically)
                    </span>
                  </label>
                )}
                <input
                  id="proof"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {proofPreview && (
                <div className="flex justify-end">
                  <label
                    htmlFor="proof"
                    className="text-xs text-primary cursor-pointer hover:underline"
                  >
                    Change Screenshot
                  </label>
                </div>
              )}

              {fileError && (
                <p className="text-xs text-destructive">{fileError}</p>
              )}
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              size="lg"
              className="w-full mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Compressing & Submitting...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Submit Payment Proof
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
