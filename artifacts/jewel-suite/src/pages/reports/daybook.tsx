import { useState } from "react";
import { useGetDaybook } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarDays, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCurrency } from "@/lib/format";

const KIND_LABEL: Record<string, string> = {
  sale: "Retail / Wholesale sale",
  payment_in: "Payment received",
  payment_out: "Payment paid out",
  girvi_loan: "Girvi loan disbursed",
  girvi_payment: "Girvi repayment",
  repair_collected: "Repair collection",
  scheme_installment: "Scheme installment",
};

const KIND_COLOR: Record<string, string> = {
  sale: "bg-emerald-100 text-emerald-800",
  payment_in: "bg-emerald-100 text-emerald-800",
  payment_out: "bg-destructive/15 text-destructive",
  girvi_loan: "bg-destructive/15 text-destructive",
  girvi_payment: "bg-blue-100 text-blue-800",
  repair_collected: "bg-violet-100 text-violet-800",
  scheme_installment: "bg-amber-100 text-amber-800",
};

export default function DaybookReport() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const { data } = useGetDaybook({ date });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold">Daybook</h1>
            <p className="text-muted-foreground text-sm mt-0.5">All cash, UPI, card, bank movements for one day</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase text-muted-foreground tracking-wider">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Stat label="Net Sales" value={formatCurrency(data?.netSales ?? 0)} accent />
        <Stat label="Cash In" value={formatCurrency(data?.cashIn ?? 0)} positive />
        <Stat label="Cash Out" value={formatCurrency(data?.cashOut ?? 0)} negative />
        <Stat label="UPI" value={formatCurrency(data?.upiIn ?? 0)} />
        <Stat label="Card" value={formatCurrency(data?.cardIn ?? 0)} />
        <Stat label="Bank" value={formatCurrency(data?.bankIn ?? 0)} />
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base">Movements ({data?.entries.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data || data.entries.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No movements on this date</TableCell></TableRow>
              ) : data.entries.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {new Date(e.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                  <TableCell><Badge className={KIND_COLOR[e.kind]}>{KIND_LABEL[e.kind]}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{e.reference}</TableCell>
                  <TableCell>{e.party}</TableCell>
                  <TableCell className="text-muted-foreground capitalize">{e.mode}</TableCell>
                  <TableCell className={`text-right font-semibold ${e.amount < 0 ? "text-destructive" : "text-emerald-700"}`}>
                    <span className="inline-flex items-center gap-1">
                      {e.amount < 0 ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                      {formatCurrency(Math.abs(e.amount))}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, accent, positive, negative }: { label: string; value: string; accent?: boolean; positive?: boolean; negative?: boolean }) {
  return (
    <Card className={accent ? "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent" : ""}>
      <CardContent className="pt-5 pb-4">
        <div className="text-xs uppercase text-muted-foreground tracking-wider">{label}</div>
        <div className={`mt-1 font-serif text-xl font-bold ${accent ? "text-primary" : positive ? "text-emerald-700" : negative ? "text-destructive" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
