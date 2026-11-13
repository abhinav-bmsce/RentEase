import { DataNotice } from "@/components/shared/data-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCollectionRealtime } from "@/hooks/use-firestore";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date";
import { db } from "@/lib/firebase";
import { formatMoney } from "@/lib/money";
import type {
  DepositStatus,
  RoomDoc,
  TenancyDoc,
  UserDoc,
  WithId,
} from "@/lib/types";
import { doc, updateDoc } from "firebase/firestore";
import { CheckCircle2, Loader2, RotateCcw, Shield } from "lucide-react";
import { useState } from "react";

export function DepositTracker() {
  const { toast } = useToast();
  const { data: tenancies, loading, error } =
    useCollectionRealtime<TenancyDoc>("tenancies");
  const { data: tenants } = useCollectionRealtime<UserDoc>("users");
  const { data: rooms } = useCollectionRealtime<RoomDoc>("rooms");

  const [selectedTenancy, setSelectedTenancy] =
    useState<WithId<TenancyDoc> | null>(null);
  const [newStatus, setNewStatus] = useState<DepositStatus>("held");
  const [isUpdating, setIsUpdating] = useState(false);

  const totalHeld = tenancies
    .filter((t) => t.depositStatus === "held")
    .reduce((sum, t) => sum + t.securityDeposit, 0);

  const totalRefunded = tenancies
    .filter((t) => t.depositStatus === "refunded")
    .reduce((sum, t) => sum + t.securityDeposit, 0);

  const handleUpdateStatus = async () => {
    if (!selectedTenancy) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "tenancies", selectedTenancy.id), {
        depositStatus: newStatus,
      });
      toast({
        title: "Deposit Updated",
        description: `Deposit status marked as ${newStatus.replace("_", " ")}.`,
      });
      setSelectedTenancy(null);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update deposit status",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (error) return <DataNotice error={error} />;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Security Deposit Tracker
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitor held tenant security deposits, refunds, and deductions upon
          vacating
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Deposits Held
            </CardTitle>
            <Shield className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totalHeld)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently held in escrow across active leases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Refunded
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatMoney(totalRefunded)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Refunded to past tenants upon move-out
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tenancies deposit table */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base">Tenant Security Deposits</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-muted rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : tenancies.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">
              No tenancies or deposits recorded yet.
            </p>
          ) : (
            <div className="divide-y text-xs sm:text-sm">
              {tenancies.map((tenancy) => {
                const tenant = tenants.find((t) => t.id === tenancy.tenantUid);
                const room = rooms.find((r) => r.id === tenancy.roomId);

                return (
                  <div
                    key={tenancy.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {tenant?.name || "Tenant"}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            tenancy.depositStatus === "held"
                              ? "bg-primary/10 text-primary border-primary/20 text-[10px]"
                              : tenancy.depositStatus === "refunded"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                                : "bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                          }
                        >
                          {tenancy.depositStatus.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Room: {room?.name || "Room"} • Lease Started:{" "}
                        {tenancy.startDate
                          ? formatDate(
                              tenancy.startDate.toDate
                                ? tenancy.startDate.toDate()
                                : new Date(
                                    tenancy.startDate as unknown as string,
                                  ),
                            )
                          : "—"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-muted-foreground block">
                          Deposit
                        </span>
                        <span className="font-bold text-foreground">
                          {formatMoney(tenancy.securityDeposit)}
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTenancy(tenancy);
                          setNewStatus(tenancy.depositStatus);
                        }}
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Update
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Deposit Status Dialog */}
      <Dialog
        open={Boolean(selectedTenancy)}
        onOpenChange={() => setSelectedTenancy(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Deposit Status</DialogTitle>
          </DialogHeader>

          {selectedTenancy && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                <span className="text-muted-foreground">Deposit Amount:</span>
                <span className="font-bold text-sm block text-primary">
                  {formatMoney(selectedTenancy.securityDeposit)}
                </span>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold">New Status</span>
                <Select
                  value={newStatus}
                  onValueChange={(val) => setNewStatus(val as DepositStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="held">Held (in escrow)</SelectItem>
                    <SelectItem value="partially_refunded">
                      Partially Refunded (with deductions)
                    </SelectItem>
                    <SelectItem value="refunded">
                      Fully Refunded (move-out cleared)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={handleUpdateStatus}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : null}
                Save Deposit Status
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
