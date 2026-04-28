import {
  useGetGirviSummary,
  useListGirviLoans,
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
import { Scale, AlertTriangle, Coins, Calculator } from "lucide-react";
import { formatCurrency, formatDate, formatWeight } from "@/lib/format";
import { Link } from "wouter";

export default function GirviReport() {
  const { data: summary, isLoading: ls } = useGetGirviSummary();
  const { data: overdueLoans, isLoading: lo } = useListGirviLoans({
    status: "overdue",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
          <Scale className="h-7 w-7 text-primary" />
          Girvi Report
        </h1>
        <p className="text-muted-foreground mt-1">
          Active loan book and overdue exposure
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          icon={Coins}
          label="Active Loans"
          value={summary ? String(summary.activeCount) : "—"}
          loading={ls}
        />
        <Kpi
          icon={AlertTriangle}
          label="Overdue"
          value={summary ? String(summary.overdueCount) : "—"}
          loading={ls}
          danger={(summary?.overdueCount ?? 0) > 0}
        />
        <Kpi
          icon={Calculator}
          label="Outstanding Principal"
          value={summary ? formatCurrency(summary.totalPrincipal) : "—"}
          loading={ls}
        />
        <Kpi
          icon={Scale}
          label="Total Outstanding"
          value={summary ? formatCurrency(summary.totalOutstanding) : "—"}
          loading={ls}
          accent
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border/50 shadow-sm lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle className="text-base">Book Composition</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-6">
            <Mini
              label="Closed Loans"
              value={summary ? String(summary.closedCount) : "—"}
              loading={ls}
            />
            <Mini
              label="Accrued Interest"
              value={
                summary ? formatCurrency(summary.totalAccruedInterest) : "—"
              }
              loading={ls}
            />
            <Mini
              label="Collateral Weight"
              value={
                summary ? formatWeight(summary.totalCollateralWeight) : "—"
              }
              loading={ls}
            />
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent shadow-md">
          <CardHeader className="border-b border-primary/20">
            <CardTitle className="text-base font-serif">Risk Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Active</span>
              <span className="font-semibold">
                {summary?.activeCount ?? 0}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overdue</span>
              <span
                className={`font-semibold ${
                  (summary?.overdueCount ?? 0) > 0 ? "text-destructive" : ""
                }`}
              >
                {summary?.overdueCount ?? 0}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Closed</span>
              <span className="font-semibold">
                {summary?.closedCount ?? 0}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t border-primary/30 pt-2 mt-2">
              <span className="font-medium">Outstanding</span>
              <span className="font-bold text-primary">
                {summary
                  ? formatCurrency(summary.totalOutstanding)
                  : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Overdue Loans
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow>
                <TableHead>Loan #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Principal</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lo ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (overdueLoans ?? []).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                      No overdue loans
                    </Badge>
                  </TableCell>
                </TableRow>
              ) : (
                overdueLoans!.map((l) => (
                  <TableRow key={l.id} data-testid={`row-overdue-${l.id}`}>
                    <TableCell className="font-mono text-sm">
                      <Link
                        href={`/girvi/${l.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {l.loanNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      {l.customerName}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{l.itemDescription}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {l.metal} • {l.purity}
                      </p>
                    </TableCell>
                    <TableCell className="text-destructive font-medium">
                      {formatDate(l.dueDate)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(l.loanAmount)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatCurrency(l.outstanding)}
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
  icon: Icon,
  label,
  value,
  loading,
  accent,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  loading: boolean;
  accent?: boolean;
  danger?: boolean;
}) {
  const tone = danger
    ? "bg-destructive/5 border-destructive/30"
    : accent
    ? "bg-primary/5 border-primary/30"
    : "";
  const valueColor = danger
    ? "text-destructive"
    : accent
    ? "text-primary"
    : "";
  return (
    <Card className={`border-border/50 shadow-sm ${tone}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className={`font-serif text-2xl font-bold ${valueColor}`}>
            {value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Mini({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </p>
      {loading ? (
        <Skeleton className="h-7 w-20" />
      ) : (
        <p className="text-xl font-bold">{value}</p>
      )}
    </div>
  );
}
