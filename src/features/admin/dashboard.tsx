import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCollectionRealtime } from "@/hooks/use-firestore";
import { formatDate, formatMonth, getCurrentMonth } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import type {
  BillDoc,
  PaymentDoc,
  PropertyDoc,
  RoomDoc,
  UserDoc,
} from "@/lib/types";
import { orderBy, where } from "firebase/firestore";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Clock,
  CreditCard,
  Receipt,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

export function AdminDashboard() {
  const currentMonth = getCurrentMonth();
  const {
    data: properties,
    loading: propertiesLoading,
    error: propertiesError,
  } = useCollectionRealtime<PropertyDoc>("properties");
  const {
    data: tenants,
    loading: tenantsLoading,
    error: tenantsError,
  } = useCollectionRealtime<UserDoc>("users", [where("role", "==", "tenant")]);

  // Fetch current month bills
  const { data: monthBills } = useCollectionRealtime<BillDoc>("bills", [
    where("month", "==", currentMonth),
  ]);

  // Fetch pending payments
  const { data: pendingPayments } = useCollectionRealtime<PaymentDoc>(
    "payments",
    [where("status", "==", "pending"), orderBy("paidOn", "desc")],
  );

  // Fetch rooms for occupancy
  const { data: rooms } = useCollectionRealtime<RoomDoc>("rooms");

  // Calculations
  const expectedTotal = monthBills.reduce((sum, b) => sum + b.total, 0);
  const collectedTotal = monthBills.reduce(
    (sum, b) => sum + (b.paidAmount || 0),
    0,
  );
  const pendingTotal = monthBills
    .filter((b) => b.status === "unpaid" || b.status === "submitted")
    .reduce((sum, b) => sum + b.total, 0);
  const overdueTotal = monthBills
    .filter((b) => b.status === "overdue")
    .reduce((sum, b) => sum + b.total, 0);

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status === "occupied").length;
  const occupancyPercent =
    totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.18em] text-primary font-semibold">
            Your property, at a glance
          </span>
          <h1 className="text-2xl font-bold tracking-tight mt-2">
            A little clarity. A lot of ease.
          </h1>
          <p className="text-sm text-muted-foreground">
            Financial and occupancy overview for {formatMonth(currentMonth)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to="/a/billing">
              <Receipt className="w-4 h-4 mr-2" />
              Generate Bills
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/a/tenants/new">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Tenant
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          [
            "Properties",
            propertiesLoading || propertiesError ? "—" : properties.length,
          ],
          ["Total rooms", rooms.length],
          ["Vacant rooms", rooms.filter((r) => r.status === "vacant").length],
          [
            "Registered tenants",
            tenantsLoading || tenantsError ? "—" : tenants.length,
          ],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground mb-2">{label}</p>
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expected */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Expected Revenue
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMoney(expectedTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              For {formatMonth(currentMonth)} ({monthBills.length} bills)
            </p>
          </CardContent>
        </Card>

        {/* Collected */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Collected
            </CardTitle>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatMoney(collectedTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {expectedTotal > 0
                ? `${Math.round((collectedTotal / expectedTotal) * 100)}% of expected`
                : "0%"}
            </p>
          </CardContent>
        </Card>

        {/* Pending & Overdue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Pending / Overdue
            </CardTitle>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatMoney(pendingTotal + overdueTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {overdueTotal > 0
                ? `${formatMoney(overdueTotal)} overdue`
                : "No overdue bills"}
            </p>
          </CardContent>
        </Card>

        {/* Occupancy Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Occupancy Rate
            </CardTitle>
            <Building2 className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancyPercent}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {occupiedRooms} of {totalRooms} rooms occupied
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payment Submissions Alert Banner */}
      {pendingPayments.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {pendingPayments.length} Payment Verification Request
                  {pendingPayments.length > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Tenants have submitted UPI payment proofs awaiting review.
                </p>
              </div>
            </div>
            <Button asChild size="sm">
              <Link to="/a/payments">
                Review Queue
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Tenants
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Manage leases, security deposits, and tenant user accounts.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/a/tenants">View Tenants Directory</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Properties & Rooms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Configure properties, room rents, and electricity meter rates.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/a/properties">Manage Properties</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              Billing & Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Calculate electricity consumption, batch generate bills & export
              PDFs.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/a/billing">Manage Billing</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bills Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Bills Generated</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/a/billing">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {monthBills.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No bills generated for {formatMonth(currentMonth)} yet.
            </p>
          ) : (
            <div className="divide-y text-sm">
              {monthBills.slice(0, 5).map((bill) => (
                <div
                  key={bill.id}
                  className="py-2.5 flex items-center justify-between"
                >
                  <div>
                    <span className="font-medium text-xs sm:text-sm">
                      {bill.notes || `Bill #${bill.id.slice(0, 6)}`}
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      Due:{" "}
                      {formatDate(
                        bill.dueDate?.toDate
                          ? bill.dueDate.toDate()
                          : new Date(),
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-xs sm:text-sm">
                      {formatMoney(bill.total)}
                    </span>
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {bill.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
