import { useState } from "react";
import { useGetGstReport } from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, Download, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/format";

function defaultRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: start.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

export default function GstReport() {
  const init = defaultRange();
  const [from, setFrom] = useState(init.from);
  const [to, setTo] = useState(init.to);
  const { data, isLoading, refetch } = useGetGstReport({ from, to });

  function exportCsv() {
    if (!data) return;
    const lines = [
      ["GST Report"],
      [`Period: ${data.from} to ${data.to}`],
      [],
      ["GST Rate", "Taxable", "CGST", "SGST", "Total Tax", "Invoices"],
      ...data.slabs.map((s) => [
        `${s.gstRate}%`,
        s.taxableAmount,
        s.cgst,
        s.sgst,
        s.totalTax,
        s.invoiceCount,
      ]),
      [],
      ["Totals", data.totalTaxable, data.totalCgst, data.totalSgst, data.totalTax],
    ];
    const csv = lines.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gst-report-${data.from}-${data.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
            <FileText className="h-7 w-7 text-primary" />
            GST Report
          </h1>
          <p className="text-muted-foreground mt-1">
            CGST/SGST split by slab
          </p>
        </div>
        <Button
          variant="outline"
          onClick={exportCsv}
          disabled={!data}
          data-testid="button-export-csv"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              From
            </Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              data-testid="input-from"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              To
            </Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              data-testid="input-to"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={() => refetch()} data-testid="button-refresh">
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Kpi
          label="Taxable Value"
          value={data ? formatCurrency(data.totalTaxable) : "—"}
          loading={isLoading}
        />
        <Kpi
          label="CGST"
          value={data ? formatCurrency(data.totalCgst) : "—"}
          loading={isLoading}
        />
        <Kpi
          label="SGST"
          value={data ? formatCurrency(data.totalSgst) : "—"}
          loading={isLoading}
        />
        <Kpi
          label="Total Tax"
          value={data ? formatCurrency(data.totalTax) : "—"}
          loading={isLoading}
          accent
        />
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-base">By GST Slab</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow>
                <TableHead>GST Rate</TableHead>
                <TableHead className="text-center">Invoices</TableHead>
                <TableHead className="text-right">Taxable Amount</TableHead>
                <TableHead className="text-right">CGST</TableHead>
                <TableHead className="text-right">SGST</TableHead>
                <TableHead className="text-right">Total Tax</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (data?.slabs ?? []).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No taxable invoices in this period
                  </TableCell>
                </TableRow>
              ) : (
                data!.slabs.map((s, idx) => (
                  <TableRow key={s.gstRate} data-testid={`row-slab-${idx}`}>
                    <TableCell className="font-bold text-primary">
                      {s.gstRate}%
                    </TableCell>
                    <TableCell className="text-center">
                      {s.invoiceCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(s.taxableAmount)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(s.cgst)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(s.sgst)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(s.totalTax)}
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
  loading,
  accent,
}: {
  label: string;
  value: string;
  loading: boolean;
  accent?: boolean;
}) {
  return (
    <Card
      className={`border-border/50 shadow-sm ${
        accent ? "bg-primary/5 border-primary/30" : ""
      }`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p
            className={`font-serif text-2xl font-bold ${
              accent ? "text-primary" : ""
            }`}
          >
            {value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
