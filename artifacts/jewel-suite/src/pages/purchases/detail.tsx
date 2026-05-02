import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPurchase,
  useDeletePurchase,
  useRecordPurchasePayment,
  getGetPurchaseQueryKey,
  getListPurchasesQueryKey,
  useGetShopSettings,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Printer, Wallet, Trash2, ShoppingCart } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-600 hover:bg-emerald-700 text-white",
  partial: "bg-amber-500 hover:bg-amber-600 text-white",
  unpaid: "bg-red-600 hover:bg-red-700 text-white",
};

export default function PurchaseDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");

  const { data: v, isLoading } = useGetPurchase(id, {
    query: { enabled: !!id, queryKey: getGetPurchaseQueryKey(id) },
  });
  const { data: shop } = useGetShopSettings();
  const recordPayment = useRecordPurchasePayment();
  const del = useDeletePurchase();

  if (isLoading || !v) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  async function onPay() {
    const amt = parseFloat(payAmount) || 0;
    if (amt <= 0) { toast({ title: "Enter a positive amount", variant: "destructive" }); return; }
    try {
      await recordPayment.mutateAsync({ id, data: { amount: amt } });
      await qc.invalidateQueries({ queryKey: getGetPurchaseQueryKey(id) });
      await qc.invalidateQueries({ queryKey: getListPurchasesQueryKey() });
      toast({ title: "Payment recorded" });
      setPayOpen(false); setPayAmount("");
    } catch (err) {
      toast({ title: "Error", description: String((err as Error).message), variant: "destructive" });
    }
  }

  async function onDelete() {
    if (!confirm("Delete this voucher? This cannot be undone.")) return;
    await del.mutateAsync({ id });
    await qc.invalidateQueries({ queryKey: getListPurchasesQueryKey() });
    toast({ title: "Voucher deleted" });
    setLocation("/purchases");
  }

  const totalFine = v.items.reduce((s, it) => s + it.fineWeight, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <Link href="/purchases" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All purchases
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          {v.balance > 0 && (
            <Button onClick={() => setPayOpen(true)}>
              <Wallet className="h-4 w-4 mr-2" /> Record Payment
            </Button>
          )}
          <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent p-6 border-b">
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="font-serif text-3xl font-bold text-violet-700">{shop?.shopName ?? "Jewel Suite"}</p>
              {shop?.tagline ? <p className="text-sm text-muted-foreground mt-0.5">{shop.tagline}</p> : null}
              <p className="text-xs text-muted-foreground mt-2">
                {[shop?.address, shop?.city].filter(Boolean).join(", ")}
                {shop?.gstin ? ` | GSTIN: ${shop.gstin}` : ""}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <ShoppingCart className="h-4 w-4 text-violet-600" />
                <span className="text-sm text-muted-foreground uppercase tracking-wider">Purchase Voucher</span>
              </div>
              <Badge className={`mt-2 text-sm uppercase tracking-wide ${STATUS_STYLES[v.status] ?? ""}`}>{v.status}</Badge>
              <p className="font-mono text-2xl font-bold mt-2">{v.voucherNumber}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatDate(v.date)}</p>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">Mode: {v.paymentMode.replace("_", " ")}</p>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Purchased from</p>
              <p className="font-serif text-xl font-bold mt-1">{v.vendorName}</p>
              {v.vendorPhone ? <p className="text-sm text-muted-foreground">{v.vendorPhone}</p> : null}
            </div>
            {(v.goldPayWeight > 0 || v.silverPayWeight > 0) ? (
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Metal payment</p>
                {v.goldPayWeight > 0 ? <p className="text-sm font-semibold text-amber-700 mt-1">Gold: {v.goldPayWeight.toFixed(3)} g</p> : null}
                {v.silverPayWeight > 0 ? <p className="text-sm font-semibold text-slate-600">Silver: {v.silverPayWeight.toFixed(3)} g</p> : null}
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-border/60 overflow-hidden">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Metal / Purity</TableHead>
                  <TableHead className="text-right">Gross (g)</TableHead>
                  <TableHead className="text-right">Less (g)</TableHead>
                  <TableHead className="text-right">Net (g)</TableHead>
                  <TableHead className="text-right">Fine (g)</TableHead>
                  <TableHead className="text-right">Rate/g</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {v.items.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{it.description}</TableCell>
                    <TableCell className="text-sm">
                      <span className="capitalize">{it.metal}</span>
                      <span className="ml-2 text-muted-foreground">{it.purity} ({it.purityPercent.toFixed(2)}%)</span>
                    </TableCell>
                    <TableCell className="text-right font-mono">{it.grossWeight.toFixed(3)}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{it.lessWeight.toFixed(3)}</TableCell>
                    <TableCell className="text-right font-mono">{it.netWeight.toFixed(3)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-amber-700">{it.fineWeight.toFixed(3)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(it.ratePerGram)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(it.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-secondary/20 font-semibold">
                  <TableCell colSpan={5}>Total</TableCell>
                  <TableCell className="text-right text-amber-700 font-mono">{totalFine.toFixed(3)}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">{formatCurrency(v.subtotal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-xs text-muted-foreground">
              {v.notes ? (
                <>
                  <p className="font-medium text-foreground uppercase tracking-wider mb-2">Notes</p>
                  <p className="whitespace-pre-line">{v.notes}</p>
                </>
              ) : null}
            </div>
            <Card className="border-violet-200 bg-violet-50/30">
              <CardContent className="pt-6 space-y-2">
                <Row label="Subtotal" value={formatCurrency(v.subtotal)} />
                {v.discount > 0 && <Row label="Discount" value={`- ${formatCurrency(v.discount)}`} />}
                <div className="flex justify-between border-t border-violet-200 pt-2 mt-2">
                  <span className="font-serif text-lg">Total</span>
                  <span className="font-serif text-2xl font-bold text-violet-700">{formatCurrency(v.total)}</span>
                </div>
                <Row label="Paid" value={formatCurrency(v.paidAmount)} muted />
                <Row label="Balance" value={formatCurrency(v.balance)} bold />
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Outstanding: <span className="font-bold text-foreground">{formatCurrency(v.balance)}</span>
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Amount (₹)</Label>
              <Input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" />
              <button type="button" className="text-xs text-violet-700 hover:underline mt-1" onClick={() => setPayAmount(String(v.balance))}>
                Pay full balance
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button className="bg-violet-600 hover:bg-violet-700" onClick={onPay} disabled={recordPayment.isPending}>
              {recordPayment.isPending ? "Saving..." : "Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${muted ? "text-muted-foreground" : ""} ${bold ? "font-bold" : ""}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
