import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useDocumentRealtime } from "@/hooks/use-firestore";
import { useToast } from "@/hooks/use-toast";
import { BILL_STATUSES } from "@/lib/constants";
import { formatDate, formatMonth } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import type {
  BillDoc,
  PropertyDoc,
  RoomDoc,
  SettingsDoc,
  UserDoc,
} from "@/lib/types";
import { updateBill } from "@/services/bill-service";
import { generateBillReceiptPdf } from "@/services/pdf-service";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Download,
  Home,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

export function AdminBillDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: bill, loading: billLoading } = useDocumentRealtime<BillDoc>(
    "bills",
    id,
  );
  const { data: room } = useDocumentRealtime<RoomDoc>("rooms", bill?.roomId);
  const { data: property } = useDocumentRealtime<PropertyDoc>(
    "properties",
    room?.propertyId,
  );
  const { data: tenant } = useDocumentRealtime<UserDoc>(
    "users",
    bill?.tenantUid,
  );
  const { data: settings } = useDocumentRealtime<SettingsDoc>(
    "settings",
    "general",
  );

  if (billLoading) {
    return (
      <div className="space-y-4 animate-pulse pt-4">
        <div className="h-48 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Bill not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/a/billing">Back to Billing</Link>
        </Button>
      </div>
    );
  }

  const statusConfig = BILL_STATUSES[bill.status] || BILL_STATUSES.unpaid;

  const handleMarkPaid = async () => {
    if (!id) return;
    setIsUpdating(true);
    try {
      await updateBill(id, {
        status: "paid",
        paidAmount: bill.total,
      });
      toast({
        title: "Bill Marked Paid",
        description: "Bill status updated successfully.",
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update bill",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkVoid = async () => {
    if (!id) return;
    setIsUpdating(true);
    try {
      await updateBill(id, { status: "void" });
      toast({ title: "Bill Voided", description: "Bill marked as void." });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to void bill",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadPdf = () => {
    generateBillReceiptPdf({
      bill,
      room: room ?? undefined,
      property: property ?? undefined,
      tenant: tenant ?? undefined,
      settings: settings ?? undefined,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/a/billing">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Billing
          </Link>
        </Button>
        <Badge variant="outline" className={statusConfig.color}>
          {statusConfig.label}
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Invoice Details
              </span>
              <CardTitle className="text-2xl font-bold mt-1">
                {formatMonth(bill.month)}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tenant: {tenant?.name} • {property?.name} ({room?.name})
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">
                Total Amount
              </span>
              <span className="text-2xl font-bold text-primary">
                {formatMoney(bill.total)}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-5">
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
              <span className="text-muted-foreground block">Paid Amount</span>
              <span className="font-semibold text-sm">
                {formatMoney(bill.paidAmount)}
              </span>
            </div>
          </div>

          <Separator />

          {/* Line items */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Line Items
            </h4>

            <div className="space-y-2.5">
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

          <div className="flex justify-between text-base font-bold pt-1">
            <span>Total</span>
            <span className="text-primary">{formatMoney(bill.total)}</span>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleDownloadPdf}
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF Invoice
            </Button>

            {bill.status !== "paid" && bill.status !== "void" && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="lg"
                  onClick={handleMarkPaid}
                  disabled={isUpdating}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Mark as Paid
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleMarkVoid}
                  disabled={isUpdating}
                  className="text-muted-foreground"
                >
                  <Ban className="w-4 h-4 mr-1.5" />
                  Void Bill
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
