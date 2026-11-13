import { DataNotice } from "@/components/shared/data-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useCollectionRealtime } from "@/hooks/use-firestore";
import { useToast } from "@/hooks/use-toast";
import { PAYMENT_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import type { BillDoc, PaymentDoc, UserDoc, WithId } from "@/lib/types";
import { approvePayment, rejectPayment } from "@/services/payment-service";
import { orderBy } from "firebase/firestore";
import { Check, CreditCard, Eye, Loader2, X } from "lucide-react";
import { useState } from "react";

export function PaymentReviewQueue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState<
    "pending" | "approved" | "rejected" | "all"
  >("pending");

  const { data: payments, loading, error } = useCollectionRealtime<PaymentDoc>(
    "payments",
    [orderBy("paidOn", "desc")],
  );
  const { data: tenants } = useCollectionRealtime<UserDoc>("users");
  const { data: bills } = useCollectionRealtime<BillDoc>("bills");

  // Review modal state
  const [selectedPayment, setSelectedPayment] =
    useState<WithId<PaymentDoc> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const filteredPayments = payments.filter((p) => {
    if (filter === "all") return true;
    return p.status === filter;
  });

  const handleApprove = async (payment: WithId<PaymentDoc>) => {
    if (!user) return;
    setIsProcessing(true);
    try {
      await approvePayment({
        paymentId: payment.id,
        billId: payment.billId,
        reviewedBy: user.uid,
      });

      toast({
        title: "Payment Approved!",
        description: "Payment recorded, bill balance updated, and tenant notified.",
      });

      setSelectedPayment(null);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Approval Failed",
        description: "Could not approve payment",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (payment: WithId<PaymentDoc>) => {
    if (!user) return;
    if (!rejectReason.trim()) {
      toast({
        variant: "destructive",
        title: "Reason Required",
        description: "Please specify reason for rejection.",
      });
      return;
    }

    setIsProcessing(true);
    try {
      await rejectPayment({
        paymentId: payment.id,
        billId: payment.billId,
        reason: rejectReason.trim(),
        reviewedBy: user.uid,
      });

      toast({
        title: "Payment Rejected",
        description: "Payment marked as rejected and tenant notified.",
      });

      setSelectedPayment(null);
      setShowRejectInput(false);
      setRejectReason("");
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Rejection Failed",
        description: "Could not reject payment",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (error) return <DataNotice error={error} />;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Payment Verification Queue
        </h1>
        <p className="text-sm text-muted-foreground">
          Review tenant UPI receipts, verify bank UTRs, and approve rent
          collections
        </p>
      </div>

      <Tabs
        value={filter}
        onValueChange={(val) => setFilter(val as typeof filter)}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-auto max-w-md">
          <TabsTrigger value="pending">
            Pending ({payments.filter((p) => p.status === "pending").length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({payments.filter((p) => p.status === "approved").length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({payments.filter((p) => p.status === "rejected").length})
          </TabsTrigger>
          <TabsTrigger value="all">All ({payments.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse h-28" />
          ))}
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border rounded-xl bg-card">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-base">No payments in this queue</p>
          <p className="text-xs mt-1">
            Pending submissions will appear here for verification.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPayments.map((payment) => {
            const tenant = tenants.find((t) => t.id === payment.tenantUid);
            const bill = bills.find((b) => b.id === payment.billId);
            const statusConfig =
              PAYMENT_STATUSES[payment.status] || PAYMENT_STATUSES.pending;

            return (
              <Card
                key={payment.id}
                className="hover:border-primary/50 transition-colors"
              >
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">
                        {tenant?.name || "Tenant"}
                      </span>
                      <Badge variant="outline" className={statusConfig.color}>
                        {statusConfig.label}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Bill:{" "}
                      <span className="font-medium text-foreground">
                        {bill?.month || "—"}
                      </span>{" "}
                      • Paid On:{" "}
                      {payment.paidOn
                        ? formatDate(
                            payment.paidOn.toDate
                              ? payment.paidOn.toDate()
                              : new Date(payment.paidOn as unknown as string),
                          )
                        : "—"}
                    </p>

                    <div className="flex items-center gap-3 text-xs pt-0.5">
                      <span className="font-mono bg-muted/60 px-2 py-0.5 rounded text-foreground">
                        UTR: {payment.utr}
                      </span>
                    </div>

                    {payment.status === "rejected" && payment.rejectReason && (
                      <p className="text-xs text-destructive pt-1">
                        Reason: {payment.rejectReason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-0 pt-2 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-muted-foreground block">
                        Amount
                      </span>
                      <span className="text-lg font-bold text-primary">
                        {formatMoney(payment.amount)}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant={
                        payment.status === "pending" ? "default" : "outline"
                      }
                      onClick={() => {
                        setSelectedPayment(payment);
                        setShowRejectInput(false);
                        setRejectReason("");
                      }}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      {payment.status === "pending"
                        ? "Review & Verify"
                        : "View Proof"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog
        open={Boolean(selectedPayment)}
        onOpenChange={() => setSelectedPayment(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">
              Payment Review & Verification
            </DialogTitle>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center text-sm p-3 bg-muted/40 rounded-lg">
                <div>
                  <span className="text-xs text-muted-foreground block">
                    UTR Number
                  </span>
                  <span className="font-mono font-bold text-base">
                    {selectedPayment.utr}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">
                    Amount
                  </span>
                  <span className="font-bold text-lg text-primary">
                    {formatMoney(selectedPayment.amount)}
                  </span>
                </div>
              </div>

              {/* Screenshot image */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">
                  Payment Screenshot
                </span>
                <div className="flex justify-center p-2 bg-black/5 dark:bg-white/5 rounded-lg border max-h-80 overflow-y-auto">
                  {selectedPayment.proofUrl ? (
                    <img
                      src={selectedPayment.proofUrl}
                      alt="Proof"
                      className="max-h-72 object-contain rounded"
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground py-10">
                      No image attached
                    </p>
                  )}
                </div>
              </div>

              {/* Rejection input */}
              {showRejectInput && (
                <div className="space-y-1.5 p-3 border border-destructive/30 bg-destructive/5 rounded-lg">
                  <Label
                    htmlFor="rejectReason"
                    className="text-xs text-destructive font-semibold"
                  >
                    Reason for Rejection *
                  </Label>
                  <Input
                    id="rejectReason"
                    placeholder="e.g. UTR not reflected in landlord account / wrong amount"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRejectInput(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleReject(selectedPayment)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      ) : null}
                      Confirm Rejection
                    </Button>
                  </div>
                </div>
              )}

              {/* Action buttons (only if pending) */}
              {selectedPayment.status === "pending" && !showRejectInput && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-destructive hover:bg-destructive/10"
                    onClick={() => setShowRejectInput(true)}
                    disabled={isProcessing}
                  >
                    <X className="w-4 h-4 mr-1.5" />
                    Reject
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleApprove(selectedPayment)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    ) : (
                      <Check className="w-4 h-4 mr-1.5" />
                    )}
                    Approve Payment
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
