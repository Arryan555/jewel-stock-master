import { useMemo } from "react";
import {
  useGetSalesTrend,
  useListInvoices,
  useGetTopCustomers,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, BarChart3, IndianRupee, Receipt } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

export default function SalesReport() {
  const { data: trend, isLoading: lt } = useGetSalesTrend();
  const { data: invoices, isLoading: li } = useListInvoices({ type: "all" });
  const { data: topCustomers, isLoading: lc } = useGetTopCustomers();

  const totals = useMemo(() => {
    let retail = 0;
    let wholesale = 0;
    let count = 0;
    let avgTicket = 0;
    if (invoices) {
      for (const inv of invoices) {
        if (inv.type === "retail") retail += inv.total;
        else wholesale += inv.total;
        count++;
      }
      avgTicket = count > 0 ? (retail + wholesale) / count : 0;
    }
    return { retail, wholesale, total: retail + wholesale, count, avgTicket };
  }, [invoices]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-primary" />
          Sales Report
        </h1>
        <p className="text-muted-foreground mt-1">
          Trend, channel mix, and top buyers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Total Revenue"
          value={formatCurrency(totals.total)}
          icon={IndianRupee}
          loading={li}
        />
        <Kpi
          label="Retail Sales"
          value={formatCurrency(totals.retail)}
          icon={Receipt}
          loading={li}
        />
        <Kpi
          label="Wholesale Sales"
          value={formatCurrency(totals.wholesale)}
          icon={TrendingUp}
          loading={li}
        />
        <Kpi
          label="Avg Ticket Size"
          value={formatCurrency(totals.avgTicket)}
          icon={IndianRupee}
          loading={li}
        />
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-base">30-Day Sales Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px] pt-6">
          {lt ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend ?? []}>
                <defs>
                  <linearGradient id="rep-retail" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="rep-wholesale" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--accent))"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--accent))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })
                  }
                  fontSize={12}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  fontSize={12}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  labelFormatter={(l) => formatDate(String(l))}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="retail"
                  stroke="hsl(var(--primary))"
                  fill="url(#rep-retail)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="wholesale"
                  stroke="hsl(var(--accent))"
                  fill="url(#rep-wholesale)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Top Customers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Invoices</TableHead>
                <TableHead className="text-right">Total Purchases</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lc ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (topCustomers ?? []).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No customer data yet
                  </TableCell>
                </TableRow>
              ) : (
                topCustomers!.map((c, idx) => (
                  <TableRow
                    key={c.customerId}
                    data-testid={`row-top-${idx}`}
                  >
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {c.customerName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {c.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {c.invoiceCount}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatCurrency(c.totalPurchases)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  loading: boolean;
}) {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-2xl font-bold font-serif">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
