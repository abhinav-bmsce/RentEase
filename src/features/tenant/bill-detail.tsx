import { DataNotice } from "@/components/shared/data-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useDocumentRealtime } from "@/hooks/use-firestore";
import { BILL_STATUSES } from "@/lib/constants";
import { formatDate, formatMonth } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import type { BillDoc, PropertyDoc, RoomDoc, SettingsDoc } from "@/lib/types";
import { generateBillReceiptPdf } from "@/services/pdf-service";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Home,
  Zap,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

export function TenantBillDetail() {
  const { id } = useParams<{ id: string }>();
  const { userDoc } = useAuth();

  const {
    data: bill,
    loading: billLoading,
    error: billError,
  } = useDocumentRealtime<BillDoc>("bills", id);
  const { data: room } = useDocumentRealtime<RoomDoc>("rooms", bill?.roomId);
  const { data: property } = useDocumentRealtime<PropertyDoc>(
    "properties",
    room?.propertyId,
  );
  const { data: settings } = useDocumentRealtime<SettingsDoc>(
    "settings",
    "general",
  );

  if (billLoading) {
    return (
      <div className="space-y-4 animate-pulse pt-4">
        <div className="h-40 bg-muted rounded-xl" />
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

  const statusConfig = BILL_STATUSES[bill.status] || BILL_STATUSES.unpaid;
  const isPayable = bill.status === "unpaid" || bill.status === "overdue";

  const handleDownloadPdf = () => {
    generateBillReceiptPdf({
      bill,
      room: room ?? undefined,
      property: property ?? undefined,
      tenant: userDoc ?? undefined,
      settings: settings ?? undefined,
    });
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/t/bills">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </Button>
        <Badge variant="outline" className={statusConfig.color}>
          {statusConfig.label}
        </Badge>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Rent Invoice
              </span>
              <CardTitle className="text-2xl font-bold mt-1">
                {formatMonth(bill.month)}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {property?.name} • {room?.name}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">
                Amount Due
              </span>
              <span className="text-2xl font-bold text-primary">
                {formatMoney(bill.total)}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-5">
          {/* Status Message Banner */}
          {bill.status === "paid" && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Paid in full on{" "}
                {bill.updatedAt
                  ? formatDate(
                      bill.updatedAt.toDate
                        ? bill.updatedAt.toDate()
                        : new Date(),
                    )
                  : ""}
                .
              </span>
            </div>
          )}
          {bill.status === "submitted" && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 rounded-lg text-xs font-medium">
              <Clock className="w-4 h-4 shrink-0" />
              <span>
                Payment proof submitted! Verification in progress by owner.
              </span>
            </div>
          )}
          {bill.status === "overdue" && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 rounded-lg text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                This bill is past due. Please pay immediately to avoid late
                fees.
              </span>
            </div>
          )}

          {/* Due date info */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-muted/40 rounded-lg">
              <span className="text-muted-foreground block">Due Date</span>
              <span className="font-semibold text-sm">
                {formatDate(
                  bill.dueDate?.toDate ? bill.dueDate.toDate() : new Date(),
                )}
              </span>
            </div>
            <div className="p-3 bg-muted/40 rounded-lg">
              <span className="text-muted-foreground block">Bill Status</span>
              <span className="font-semibold text-sm capitalize">
                {bill.status}
              </span>
            </div>
          </div>

          <Separator />

          {/* Itemized Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Itemized Breakdown
            </h4>

            <div className="space-y-3">
              {(bill.items ?? []).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between text-sm"
                >
                  <div className="flex items-start gap-2">
                    {item.type === "rent" ? (
                      <Home className="w-4 h-4 text-primary mt-0.5" />
                    ) : item.type === "electricity" ? (
                      <Zap className="w-4 h-4 text-amber-500 mt-0.5" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px] mt-0.5">
                        •
                      </div>
                    )}
                    <div>
                      <p className="font-medium leading-none">{item.label}</p>
                      {item.type === "electricity" &&
                        item.units !== undefined && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Meter: {item.prevReading} → {item.currReading} (
                            {item.units} units @ {formatMoney(item.rate || 0)}
                            /u)
                          </p>
                        )}
                    </div>
                  </div>
                  <span className="font-semibold">
                    {formatMoney(item.amount)}
                  </span>
                </div>
              ))}

              {bill.lateFee > 0 && (
                <div className="flex justify-between text-sm text-destructive pt-1">
                  <span>Late Fee Applied</span>
                  <span className="font-semibold">
                    +{formatMoney(bill.lateFee)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Total & Paid */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(bill.total - bill.lateFee)}</span>
            </div>
            {bill.lateFee > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>Late Fee</span>
                <span>{formatMoney(bill.lateFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold pt-2 border-t">
              <span>Total Payable</span>
              <span className="text-primary">{formatMoney(bill.total)}</span>
            </div>
            {bill.paidAmount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600 font-medium">
                <span>Paid So Far</span>
                <span>-{formatMoney(bill.paidAmount)}</span>
              </div>
            )}
          </div>

          {bill.notes && (
            <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
              <span className="font-medium block text-foreground mb-0.5">
                Landlord Notes:
              </span>
              {bill.notes}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-2">
            {isPayable && (
              <Button asChild size="lg" className="w-full">
                <Link to={`/t/bills/${bill.id}/pay`}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Proceed to Pay {formatMoney(bill.total)}
                </Link>
              </Button>
            )}

            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleDownloadPdf}
            >
              <Download className="w-4 h-4 mr-2" />
              {bill.status === "paid" ? "Download Paid Receipt" : "Download Invoice"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
