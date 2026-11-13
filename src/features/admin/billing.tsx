import { DataNotice } from "@/components/shared/data-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCollectionRealtime } from "@/hooks/use-firestore";
import { useToast } from "@/hooks/use-toast";
import { generateBillItems } from "@/lib/bill-calculator";
import { BILL_STATUSES } from "@/lib/constants";
import { formatDate, formatMonth, getCurrentMonth } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import type { BillDoc, RoomDoc, TenancyDoc, UserDoc } from "@/lib/types";
import { createBill } from "@/services/bill-service";
import { orderBy } from "firebase/firestore";
import { ArrowRight, Loader2, Receipt, Zap } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export function BillingPage() {
  const { toast } = useToast();
  const currentMonth = getCurrentMonth();

  // All bills
  const { data: bills, loading: billsLoading, error } = useCollectionRealtime<BillDoc>(
    "bills",
    [orderBy("month", "desc")],
  );

  // Active tenancies, rooms, tenants for generation
  const { data: tenancies } = useCollectionRealtime<TenancyDoc>("tenancies");
  const { data: rooms } = useCollectionRealtime<RoomDoc>("rooms");
  const { data: tenants } = useCollectionRealtime<UserDoc>("users");

  // Generation state
  const [targetMonth, setTargetMonth] = useState(currentMonth);
  const [dueDateString, setDueDateString] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0]!;
  });
  const [meterReadings, setMeterReadings] = useState<Record<string, number>>(
    {},
  );
  const [extraCharges] = useState<Record<string, number>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Active occupied tenancies
  const activeTenancies = tenancies.filter((t) => t.active);

  const handleMeterChange = (roomId: string, val: string) => {
    const num = parseFloat(val);
    setMeterReadings((prev) => ({
      ...prev,
      [roomId]: isNaN(num) ? 0 : num,
    }));
  };

  const handleGenerateBatch = async () => {
    if (activeTenancies.length === 0) {
      toast({
        variant: "destructive",
        title: "No Active Tenancies",
        description: "Cannot generate bills.",
      });
      return;
    }

    setIsGenerating(true);
    let createdCount = 0;

    try {
      for (const tenancy of activeTenancies) {
        const room = rooms.find((r) => r.id === tenancy.roomId);
        if (!room) continue;

        // Check if bill already exists for this room & month
        const existing = bills.find(
          (b) =>
            b.roomId === room.id &&
            b.month === targetMonth &&
            b.status !== "void",
        );
        if (existing) continue;

        const currReading = meterReadings[room.id] ?? room.lastMeterReading;
        const extra = extraCharges[room.id];
        const extraList =
          extra && extra > 0
            ? [{ label: "Other / Maintenance", amount: extra * 100 }]
            : undefined;

        const items = generateBillItems(
          room,
          room.lastMeterReading,
          currReading,
          extraList,
        );

        await createBill({
          tenancyId: tenancy.id,
          tenantUid: tenancy.tenantUid,
          roomId: room.id,
          month: targetMonth,
          items,
          dueDate: new Date(dueDateString),
          notes: `Rent & electricity invoice for ${formatMonth(targetMonth)}`,
        });

        createdCount++;
      }

      toast({
        title: "Bills Generated!",
        description: `Successfully generated ${createdCount} invoice(s) for ${formatMonth(targetMonth)}.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Billing Error",
        description: "Failed to generate all bills.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (error) return <DataNotice error={error} />;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Billing & Invoices
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage monthly rent invoices, power readings, and payment
          reconciliation
        </p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid grid-cols-2 max-w-sm">
          <TabsTrigger value="all">Invoices List ({bills.length})</TabsTrigger>
          <TabsTrigger value="wizard">Generate Bills</TabsTrigger>
        </TabsList>

        {/* Tab 1: Invoices List */}
        <TabsContent value="all" className="space-y-4 pt-3">
          {billsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse h-24" />
              ))}
            </div>
          ) : bills.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground border rounded-xl bg-card">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-base">No bills found</p>
              <p className="text-xs mt-1">
                Switch to "Generate Bills" tab to issue invoices.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bills.map((bill) => {
                const room = rooms.find((r) => r.id === bill.roomId);
                const tenant = tenants.find((t) => t.id === bill.tenantUid);
                const statusConfig =
                  BILL_STATUSES[bill.status] || BILL_STATUSES.unpaid;

                return (
                  <Card
                    key={bill.id}
                    className="hover:border-primary/50 transition-colors"
                  >
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base">
                            {formatMonth(bill.month)}
                          </h3>
                          <Badge
                            variant="outline"
                            className={statusConfig.color}
                          >
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Tenant:{" "}
                          <span className="font-medium text-foreground">
                            {tenant?.name || "Tenant"}
                          </span>{" "}
                          • Room:{" "}
                          <span className="font-medium text-foreground">
                            {room?.name || "Room"}
                          </span>
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Due Date:{" "}
                          {formatDate(
                            bill.dueDate?.toDate
                              ? bill.dueDate.toDate()
                              : new Date(),
                          )}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-0 pt-2 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-muted-foreground block">
                            Total Amount
                          </span>
                          <span className="text-lg font-bold">
                            {formatMoney(bill.total)}
                          </span>
                        </div>

                        <Button asChild variant="outline" size="sm">
                          <Link to={`/a/billing/${bill.id}`}>
                            Details
                            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Generation Wizard */}
        <TabsContent value="wizard" className="space-y-6 pt-3">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                Monthly Billing Generation Wizard
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-4 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="targetMonth">Billing Month (YYYY-MM)</Label>
                  <Input
                    id="targetMonth"
                    type="month"
                    value={targetMonth}
                    onChange={(e) => setTargetMonth(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dueDate">Payment Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDateString}
                    onChange={(e) => setDueDateString(e.target.value)}
                  />
                </div>
              </div>

              {/* Occupied rooms list for meter entry */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">
                  Active Tenants & Meter Readings
                </h3>

                {activeTenancies.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">
                    No active tenants or occupied rooms to bill.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activeTenancies.map((tenancy) => {
                      const room = rooms.find((r) => r.id === tenancy.roomId);
                      const tenant = tenants.find(
                        (t) => t.id === tenancy.tenantUid,
                      );
                      if (!room) return null;

                      const prevReading = room.lastMeterReading;
                      const currReading = meterReadings[room.id] ?? prevReading;
                      const unitsConsumed = Math.max(
                        0,
                        currReading - prevReading,
                      );
                      const powerCost = unitsConsumed * room.electricityRate;
                      const estimatedTotal = room.monthlyRent + powerCost;

                      return (
                        <div
                          key={tenancy.id}
                          className="p-4 border rounded-lg bg-card space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <div>
                              <span className="font-semibold text-sm">
                                {room.name}
                              </span>
                              <span className="text-xs text-muted-foreground ml-2">
                                ({tenant?.name || "Tenant"})
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-primary">
                              Estimated Bill: {formatMoney(estimatedTotal)}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div className="p-2.5 bg-muted/40 rounded-md">
                              <span className="text-muted-foreground block text-[10px]">
                                Monthly Rent
                              </span>
                              <span className="font-semibold">
                                {formatMoney(room.monthlyRent)}
                              </span>
                            </div>

                            <div className="p-2.5 bg-muted/40 rounded-md">
                              <span className="text-muted-foreground block text-[10px]">
                                Previous Meter
                              </span>
                              <span className="font-semibold">
                                {prevReading} units
                              </span>
                            </div>

                            <div className="space-y-1">
                              <Label
                                htmlFor={`meter-${room.id}`}
                                className="text-[11px] flex items-center gap-1"
                              >
                                <Zap className="w-3 h-3 text-amber-500" />
                                Current Meter Reading
                              </Label>
                              <Input
                                id={`meter-${room.id}`}
                                type="number"
                                min={prevReading}
                                defaultValue={prevReading}
                                onChange={(e) =>
                                  handleMeterChange(room.id, e.target.value)
                                }
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                          </div>

                          {unitsConsumed > 0 && (
                            <p className="text-[11px] text-muted-foreground">
                              Power: {unitsConsumed} units consumed ×{" "}
                              {formatMoney(room.electricityRate)}/u ={" "}
                              <strong className="text-foreground">
                                {formatMoney(powerCost)}
                              </strong>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Button
                size="lg"
                className="w-full"
                onClick={handleGenerateBatch}
                disabled={isGenerating || activeTenancies.length === 0}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Invoices...
                  </>
                ) : (
                  <>
                    <Receipt className="w-4 h-4 mr-2" />
                    Generate & Dispatch Invoices
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
