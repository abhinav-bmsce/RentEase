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
import { useAuth } from "@/hooks/use-auth";
import { useCollectionRealtime } from "@/hooks/use-firestore";
import { PAYMENT_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import type { PaymentDoc } from "@/lib/types";
import { where } from "firebase/firestore";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
  XCircle,
} from "lucide-react";
import { useState } from "react";

export function PaymentHistory() {
  const { user } = useAuth();
  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  const paymentsQuery = user?.uid ? [where("tenantUid", "==", user.uid)] : [];

  const {
    data: unsortedPayments,
    loading,
    error,
  } = useCollectionRealtime<PaymentDoc>(
    "payments",
    paymentsQuery,
    Boolean(user?.uid),
  );

  const payments = [...unsortedPayments].sort(
    (a, b) => (b.paidOn?.seconds ?? 0) - (a.paidOn?.seconds ?? 0),
  );

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Payment History</h1>
        <p className="text-xs text-muted-foreground">
          Audit log of all your submitted UPI transactions & verification status
        </p>
      </div>

      {error ? (
        <DataNotice error={error} />
      ) : loading ? (
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse h-24" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="empty-panel py-16 text-center text-muted-foreground">
          <History className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">No payment records yet</p>
          <p className="text-xs mt-1">
            Submitted payment receipts will appear here with verification
            tracking.
          </p>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {payments.map((payment) => {
            const statusConfig =
              PAYMENT_STATUSES[payment.status] || PAYMENT_STATUSES.pending;

            return (
              <Card key={payment.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-base font-bold">
                        {formatMoney(payment.amount)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Paid on{" "}
                        {payment.paidOn
                          ? formatDate(
                              payment.paidOn.toDate
                                ? payment.paidOn.toDate()
                                : new Date(payment.paidOn as unknown as string),
                            )
                          : "—"}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusConfig.color}>
                      {payment.status === "approved" && (
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                      )}
                      {payment.status === "pending" && (
                        <Clock className="w-3 h-3 mr-1" />
                      )}
                      {payment.status === "rejected" && (
                        <XCircle className="w-3 h-3 mr-1" />
                      )}
                      {statusConfig.label}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t text-muted-foreground">
                    <span className="font-mono">UTR: {payment.utr}</span>
                    {payment.proofUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-primary"
                        onClick={() => setSelectedProof(payment.proofUrl)}
                      >
                        View Proof
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>

                  {payment.status === "rejected" && payment.rejectReason && (
                    <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive">
                      <span className="font-semibold block">
                        Rejection Reason:
                      </span>
                      {payment.rejectReason}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Proof Preview Modal */}
      <Dialog
        open={Boolean(selectedProof)}
        onOpenChange={() => setSelectedProof(null)}
      >
        <DialogContent className="max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Payment Screenshot Proof
            </DialogTitle>
          </DialogHeader>
          {selectedProof && (
            <div className="flex justify-center p-2">
              <img
                src={selectedProof}
                alt="Payment proof screenshot"
                className="max-h-[70vh] object-contain rounded"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
