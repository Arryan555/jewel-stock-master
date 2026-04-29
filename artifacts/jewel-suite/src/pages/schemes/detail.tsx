import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSchemeAccount,
  usePaySchemeInstallment,
  useRedeemSchemeAccount,
  getListSchemeAccountsQueryKey,
  getGetSchemeAccountQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { PiggyBank, IndianRupee, Trophy } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

export default function SchemeAccountDetail() {
  const [, params] = useRoute("/schemes/:id");
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useGetSchemeAccount(params?.id ?? "");
  const pay = usePaySchemeInstallment();
  const redeem = useRedeemSchemeAccount();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");

  if (isLoading || !data) return <div className="text-muted-foreground">Loading...</div>;

  async function onPay() {
    if (!data) return;
    if (!amount) return;
    await pay.mutateAsync({
      id: data.id,
      data: { paidAmount: parseFloat(amount) },
    });
    await Promise.all([
      qc.invalidateQueries({ queryKey: getGetSchemeAccountQueryKey(data.id) }),
      qc.invalidateQueries({ queryKey: getListSchemeAccountsQueryKey() }),
    ]);
    setOpen(false);
    setAmount("");
    toast({ title: "Installment recorded" });
  }

  async function onRedeem() {
    if (!data) return;
    if (!confirm("Redeem this account? This issues the bonus and closes the scheme.")) return;
    await redeem.mutateAsync({ id: data.id });
    await Promise.all([
      qc.invalidateQueries({ queryKey: getGetSchemeAccountQueryKey(data.id) }),
      qc.invalidateQueries({ queryKey: getListSchemeAccountsQueryKey() }),
    ]);
    toast({ title: "Account redeemed" });
  }

  const matured = data.installmentsPaid >= data.totalInstallments;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <PiggyBank className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold">{data.accountNumber}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{data.customerName} • {data.planName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className={data.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}>{data.status}</Badge>
          <Button variant="outline" onClick={() => setLocation("/schemes")}>Back</Button>
          {data.status === "active" ? (
            <>
              <Button variant="outline" onClick={() => setOpen(true)}>
                <IndianRupee className="h-4 w-4 mr-2" /> Pay installment
              </Button>
              <Button onClick={onRedeem} disabled={redeem.isPending || !matured}>
                <Trophy className="h-4 w-4 mr-2" />
                Redeem {matured ? "" : "(not matured)"}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SumCard label="Installments" value={`${data.installmentsPaid} / ${data.totalInstallments}`} />
        <SumCard label="Accumulated" value={formatCurrency(data.accumulatedAmount)} />
        <SumCard label="Bonus on maturity" value={formatCurrency(data.bonusAmount)} highlight />
        <SumCard label="Redeemable" value={formatCurrency(data.redeemableAmount)} highlight />
      </div>

      <Card>
        <CardHeader className="border-b"><CardTitle className="text-base">Installment history</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.installments.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No installments paid yet</TableCell></TableRow>
              ) : data.installments.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono">{i.installmentNumber}</TableCell>
                  <TableCell>{formatDate(i.paidAt)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(i.paidAmount)}</TableCell>
                  <TableCell className="text-muted-foreground">{i.note ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record installment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground tracking-wider">Amount ₹</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
            </div>
          </div>
          <DialogFooter><Button onClick={onPay} disabled={pay.isPending}>Save payment</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SumCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent" : ""}>
      <CardContent className="pt-6">
        <div className="text-xs uppercase text-muted-foreground tracking-wider">{label}</div>
        <div className={`mt-1 font-serif text-2xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
