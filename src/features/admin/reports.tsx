import { DataNotice } from "@/components/shared/data-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCollectionRealtime } from "@/hooks/use-firestore";
import { formatMonth } from "@/lib/date";
import { formatMoney, paiseToRupees } from "@/lib/money";
import type { BillDoc } from "@/lib/types";
import { orderBy } from "firebase/firestore";
import { BarChart3, FileSpreadsheet, TrendingUp, Zap } from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function ReportsPage() {
  const { data: bills, error } = useCollectionRealtime<BillDoc>("bills", [
    orderBy("month", "asc"),
  ]);

  // Group by month
  const monthlyData = useMemo(() => {
    const map = new Map<
      string,
      {
        month: string;
        expected: number;
        collected: number;
        electricityUnits: number;
      }
    >();

    for (const bill of bills) {
      if (bill.status === "void") continue;

      const current = map.get(bill.month) || {
        month: bill.month,
        expected: 0,
        collected: 0,
        electricityUnits: 0,
      };

      current.expected += paiseToRupees(bill.total);
      if (bill.status === "paid") {
        current.collected += paiseToRupees(bill.total);
      }

      // Sum electricity units
      for (const item of bill.items) {
        if (item.type === "electricity" && item.units) {
          current.electricityUnits += item.units;
        }
      }

      map.set(bill.month, current);
    }

    return Array.from(map.values()).slice(-6); // Last 6 months
  }, [bills]);

  const totalCollectedAllTime = bills
    .filter((b) => b.status === "paid")
    .reduce((sum, b) => sum + b.total, 0);

  const totalUnpaidAllTime = bills
    .filter((b) => b.status === "unpaid" || b.status === "overdue")
    .reduce((sum, b) => sum + b.total, 0);

  const handleExportCsv = () => {
    if (bills.length === 0) return;

    const headers = ["Bill ID", "Month", "Total (INR)", "Paid (INR)", "Status"];
    const rows = bills.map((b) => [
      b.id,
      b.month,
      (b.total / 100).toFixed(2),
      (b.paidAmount / 100).toFixed(2),
      b.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `RentEase_Financial_Report_${Date.now()}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) return <DataNotice error={error} />;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Financial Reports & Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Revenue trends, electricity consumption metrics, and collection
            performance
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={bills.length === 0}
        >
          <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
          Export CSV Report
        </Button>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Revenue Collected
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatMoney(totalCollectedAllTime)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all historical invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Outstanding Dues
            </CardTitle>
            <BarChart3 className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatMoney(totalUnpaidAllTime)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unpaid and overdue balances
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Invoices Issued
            </CardTitle>
            <Zap className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bills.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total active billing cycles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Revenue: Expected vs Collected (₹)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {monthlyData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-xs">
              No billing data available to render charts.
            </div>
          ) : (
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: number) =>
                      `₹${val.toLocaleString("en-IN")}`
                    }
                    labelFormatter={(label: string) => formatMonth(label)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Bar
                    dataKey="expected"
                    name="Expected (₹)"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="collected"
                    name="Collected (₹)"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
