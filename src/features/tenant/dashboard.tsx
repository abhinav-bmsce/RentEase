import { DataNotice } from "@/components/shared/data-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import {
  useCollectionRealtime,
  useDocumentRealtime,
} from "@/hooks/use-firestore";
import { BILL_STATUSES } from "@/lib/constants";
import { formatDate, formatMonth, getDaysUntilDue } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { roomLabel } from "@/lib/rooms";
import type { BillDoc, PropertyDoc, RoomDoc, TenancyDoc } from "@/lib/types";
import { where } from "firebase/firestore";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Home,
  Shield,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

export function TenantDashboard() {
  const { user, userDoc } = useAuth();

  // Realtime bills for this tenant
  const billsQuery = user?.uid ? [where("tenantUid", "==", user.uid)] : [];
  const {
    data: unsortedBills,
    loading: billsLoading,
    error: billsError,
  } = useCollectionRealtime<BillDoc>("bills", billsQuery, Boolean(user?.uid));

  const bills = [...unsortedBills].sort((a, b) =>
    b.month.localeCompare(a.month),
  );

  // Tenancy details
  const { data: tenancy } = useDocumentRealtime<TenancyDoc>(
    "tenancies",
    userDoc?.tenancyId,
  );

  // Room details
  const { data: room } = useDocumentRealtime<RoomDoc>("rooms", tenancy?.roomId);

  // Property details
  const { data: property } = useDocumentRealtime<PropertyDoc>(
    "properties",
    room?.propertyId,
  );

  const latestBill = bills[0];
  const pendingBill = bills.find(
    (b) => b.status === "unpaid" || b.status === "overdue",
  );
  const activeBill = pendingBill || latestBill;

  const daysUntilDue = activeBill?.dueDate
    ? getDaysUntilDue(
        activeBill.dueDate.toDate
          ? activeBill.dueDate.toDate()
          : new Date(activeBill.dueDate as unknown as string),
      )
    : null;

  return (
    <div className="space-y-6 pb-6">
      {/* Greeting Header */}
      <div className="portal-hero flex flex-col justify-center gap-2">
        <span className="hero-eyebrow">Your space. Your peace of mind.</span>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome home, {userDoc?.name?.split(" ")[0] || "Tenant"}.
        </h1>
        <p className="text-sm text-muted-foreground">
          {property?.name
            ? `${property.name} • ${room ? roomLabel(room) : "Room"}`
            : "Welcome to your rental portal"}
        </p>
      </div>

      {billsError && <DataNotice error={billsError} />}
      {/* Active Bill Alert / Summary Card */}
      {activeBill ? (
        <Card
          className={
            activeBill.status === "overdue"
              ? "border-destructive/50 bg-destructive/5"
              : activeBill.status === "unpaid"
                ? "border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10"
                : activeBill.status === "submitted"
                  ? "border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/10"
                  : "border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/10"
          }
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className={BILL_STATUSES[activeBill.status]?.color}
              >
                {BILL_STATUSES[activeBill.status]?.label || activeBill.status}
              </Badge>
              <span className="text-xs font-medium text-muted-foreground">
                {formatMonth(activeBill.month)}
              </span>
            </div>
            <CardTitle className="text-2xl font-bold mt-2">
              {formatMoney(activeBill.total)}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {activeBill.status === "paid" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Paid in full. Receipt available.</span>
                </>
              ) : activeBill.status === "submitted" ? (
                <>
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Payment verification in progress by landlord.</span>
                </>
              ) : activeBill.status === "overdue" ? (
                <>
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span className="text-destructive font-medium">
                    Overdue by {Math.abs(daysUntilDue ?? 0)} days
                  </span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>
                    Due on{" "}
                    {formatDate(
                      activeBill.dueDate?.toDate
                        ? activeBill.dueDate.toDate()
                        : new Date(),
                    )}
                    {daysUntilDue !== null && daysUntilDue >= 0
                      ? ` (${daysUntilDue} days left)`
                      : ""}
                  </span>
                </>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              {(activeBill.status === "unpaid" ||
                activeBill.status === "overdue") && (
                <Button asChild className="flex-1">
                  <Link to={`/t/bills/${activeBill.id}/pay`}>
                    <CreditCard className="w-4 h-4 mr-1.5" />
                    Pay Now
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" className="flex-1">
                <Link to={`/t/bills/${activeBill.id}`}>
                  View Details
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : billsError ? null : billsLoading ? (
        <Card className="animate-pulse h-40" />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No rent bills generated yet.
          </CardContent>
        </Card>
      )}

      {/* Quick Overview Widgets */}
      <div className="grid grid-cols-2 gap-3">
        {/* Room & Rent info */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <Home className="w-4 h-4 text-primary" />
              Monthly Rent
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-lg font-bold">
              {room ? formatMoney(room.monthlyRent) : "—"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Due on day {tenancy?.rentDueDay ?? 5}th
            </p>
          </CardContent>
        </Card>

        {/* Electricity Rate */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <Zap className="w-4 h-4 text-amber-500" />
              Electricity
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-lg font-bold">
              {room ? `${formatMoney(room.electricityRate)}/u` : "—"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Last meter: {room?.lastMeterReading ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Deposit Badge */}
      <Card className="bg-muted/40">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Security Deposit</p>
              <p className="text-sm font-semibold">
                {tenancy ? formatMoney(tenancy.securityDeposit) : "—"}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="capitalize text-xs">
            {tenancy?.depositStatus
              ? tenancy.depositStatus.replace("_", " ")
              : "Held"}
          </Badge>
        </CardContent>
      </Card>

      {/* Quick Links Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" className="justify-start h-12">
            <Link to="/t/bills">
              <FileText className="w-4 h-4 mr-2 text-primary" />
              All Bills
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start h-12">
            <Link to="/t/history">
              <Clock className="w-4 h-4 mr-2 text-blue-500" />
              Payment History
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
