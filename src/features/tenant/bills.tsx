import { DataNotice } from "@/components/shared/data-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useCollectionRealtime } from "@/hooks/use-firestore";
import { BILL_STATUSES } from "@/lib/constants";
import { formatDate, formatMonth } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import type { BillDoc, BillStatus } from "@/lib/types";
import { where } from "firebase/firestore";
import { ArrowRight, CheckCircle2, CreditCard, FileText } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export function TenantBills() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");

  const billsQuery = user?.uid ? [where("tenantUid", "==", user.uid)] : [];

  const {
    data: unsortedBills,
    loading,
    error,
  } = useCollectionRealtime<BillDoc>("bills", billsQuery, Boolean(user?.uid));

  const bills = [...unsortedBills].sort((a, b) =>
    b.month.localeCompare(a.month),
  );

  const filteredBills = bills.filter((bill) => {
    if (filter === "pending") {
      return (
        bill.status === "unpaid" ||
        bill.status === "overdue" ||
        bill.status === "submitted"
      );
    }
    if (filter === "paid") {
      return bill.status === "paid";
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Your Bills</h1>
          <p className="text-xs text-muted-foreground">
            View and pay your monthly rent invoices
          </p>
        </div>
      </div>

      <Tabs
        value={filter}
        onValueChange={(val) => setFilter(val as typeof filter)}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="all">All ({bills.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending (
            {
              bills.filter((b) => b.status !== "paid" && b.status !== "void")
                .length
            }
            )
          </TabsTrigger>
          <TabsTrigger value="paid">
            Paid ({bills.filter((b) => b.status === "paid").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {error ? (
        <DataNotice error={error} />
      ) : loading ? (
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse h-28" />
          ))}
        </div>
      ) : filteredBills.length === 0 ? (
        <div className="empty-panel py-16 text-center text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">No bills found</p>
          <p className="text-xs mt-1">
            You have no invoices matching this filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {filteredBills.map((bill) => {
            const statusConfig =
              BILL_STATUSES[bill.status as BillStatus] || BILL_STATUSES.unpaid;
            const isActionable =
              bill.status === "unpaid" || bill.status === "overdue";

            return (
              <Card
                key={bill.id}
                className="overflow-hidden transition-shadow hover:shadow-sm"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-base">
                        {formatMonth(bill.month)}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Due:{" "}
                        {formatDate(
                          bill.dueDate?.toDate
                            ? bill.dueDate.toDate()
                            : new Date(),
                        )}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusConfig.color}>
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {/* Items summary */}
                  <div className="mt-3 py-2 px-3 bg-muted/40 rounded-md text-xs space-y-1">
                    {(bill.items ?? []).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between text-muted-foreground"
                      >
                        <span className="truncate pr-2">{item.label}</span>
                        <span className="font-medium text-foreground">
                          {formatMoney(item.amount)}
                        </span>
                      </div>
                    ))}
                    {bill.lateFee > 0 && (
                      <div className="flex justify-between text-destructive">
                        <span>Late Fee</span>
                        <span className="font-medium">
                          {formatMoney(bill.lateFee)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">
                        Total Amount
                      </span>
                      <span className="text-lg font-bold">
                        {formatMoney(bill.total)}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/t/bills/${bill.id}`}>
                          Details
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                      </Button>
                      {isActionable && (
                        <Button asChild size="sm">
                          <Link to={`/t/bills/${bill.id}/pay`}>
                            <CreditCard className="w-3.5 h-3.5 mr-1" />
                            Pay
                          </Link>
                        </Button>
                      )}
                      {bill.status === "paid" && (
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="text-emerald-600"
                        >
                          <Link to={`/t/bills/${bill.id}`}>
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Receipt
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
