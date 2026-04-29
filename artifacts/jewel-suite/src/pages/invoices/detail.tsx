import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetInvoice,
  getGetInvoiceQueryKey,
  useRecordInvoicePayment,
  useDeleteInvoice,
  getListInvoicesQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetLedgerBalancesQueryKey,
  useGetShopSettings,
} from "@workspace/api-client-react";
import { QRCodeSVG } from "qrcode.react";
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
import {
  ArrowLeft, Printer, Wallet, Trash2, Share2, QrCode, Coins,
} from "lucide-react";
import { formatCurrency, formatDate, formatWeight } from "@/lib/format";
import { computeRowAmount } from "@/lib/calc";
import { useToast } from "@/hooks/use-toast";

export default function InvoiceDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [qrOpen, setQrOpen] = useState(false);

  const { data: inv, isLoading } = useGetInvoice(id, {
    query: { enabled: !!id, queryKey: getGetInvoiceQueryKey(id) },
  });
  const { data: shop } = useGetShopSettings();
  const recordPayment = useRecordInvoicePayment();
  const del = useDeleteInvoice();

  if (isLoading || !inv) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const cgst = inv.gstAmount / 2;
  const sgst = inv.gstAmount / 2;

  async function onPay() {
    const amt = parseFloat(payAmount) || 0;
    if (amt <= 0) {
      toast({ title: "Enter a positive amount", variant: "destructive" });
      return;
    }
    try {
      await recordPayment.mutateAsync({ id, data: { amount: amt } });
      await qc.invalidateQueries({ queryKey: getGetInvoiceQueryKey(id) });
      await qc.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      await qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      await qc.invalidateQueries({ queryKey: getGetLedgerBalancesQueryKey() });
      toast({ title: "Payment recorded" });
      setPayOpen(false);
      setPayAmount("");
    } catch (err) {
      toast({ title: "Could not record payment", description: String((err as Error).message), variant: "destructive" });
    }
  }

  async function onDelete() {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    try {
      await del.mutateAsync({ id });
      await qc.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      toast({ title: "Invoice deleted" });
      setLocation("/invoices");
    } catch (err) {
      toast({ title: "Could not delete", description: String((err as Error).message), variant: "destructive" });
    }
  }

  function shareWhatsApp() {
    if (!inv) return;
    const shopName = shop?.shopName ?? "Jewel Suite";
    const lines = [
      `*${shopName}* — Invoice ${inv.invoiceNumber}`,
      `Date: ${formatDate(inv.date)}`,
      `Customer: ${inv.customerName}`,
      "",
      ...inv.items.map((it) => `• ${it.productName} (${formatWeight(it.weightGrams)}) — ${formatCurrency(it.amount)}`),
      "",
      `Subtotal: ${formatCurrency(inv.subtotal)}`,
      `GST: ${formatCurrency(inv.gstAmount)}`,
      inv.discount > 0 ? `Discount: - ${formatCurrency(inv.discount)}` : "",
      inv.oldGoldValue > 0 ? `Old gold credit: - ${formatCurrency(inv.oldGoldValue)}` : "",
      `*Total: ${formatCurrency(inv.total)}*`,
      `Paid: ${formatCurrency(inv.paidAmount)}`,
      inv.balance > 0 ? `Balance due: ${formatCurrency(inv.balance)}` : "Fully paid — thank you!",
      "",
      shop?.upiId ? `Pay via UPI: ${shop.upiId}` : "",
    ].filter(Boolean).join("\n");
    const url = `https://wa.me/?text=${encodeURIComponent(lines)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const upiPayload = shop?.upiId && inv.balance > 0
    ? `upi://pay?pa=${encodeURIComponent(shop.upiId)}&pn=${encodeURIComponent(shop.shopName ?? "Jewel Suite")}&am=${inv.balance.toFixed(2)}&cu=INR&tn=${encodeURIComponent(inv.invoiceNumber)}`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <Link href="/invoices" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-invoices">
          <ArrowLeft className="h-4 w-4" />
          All invoices
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={shareWhatsApp} data-testid="button-share-wa">
            <Share2 className="h-4 w-4 mr-2" /> WhatsApp
          </Button>
          {upiPayload ? (
            <Button variant="outline" onClick={() => setQrOpen(true)} data-testid="button-upi-qr">
              <QrCode className="h-4 w-4 mr-2" /> UPI QR
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => window.print()} data-testid="button-print">
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          {inv.balance > 0 && (
            <Button onClick={() => setPayOpen(true)} data-testid="button-record-payment">
              <Wallet className="h-4 w-4 mr-2" /> Record Payment
            </Button>
          )}
          <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete} data-testid="button-delete-invoice">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 border-b">
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="font-serif text-3xl font-bold text-primary">{shop?.shopName ?? "Jewel Suite"}</p>
              {shop?.tagline ? <p className="text-sm text-muted-foreground mt-0.5">{shop.tagline}</p> : null}
              <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line">
                {[shop?.address, shop?.city].filter(Boolean).join(", ")}
                {shop?.phone ? `\n${shop.phone}` : ""}
                {shop?.gstin ? `\nGSTIN: ${shop.gstin}` : ""}
              </p>
            </div>
            <div className="text-right">
              <Badge
                className={
                  inv.status === "paid"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white text-sm uppercase tracking-wide"
                    : inv.status === "partial"
                    ? "bg-amber-500 hover:bg-amber-600 text-white text-sm uppercase tracking-wide"
                    : "bg-destructive text-destructive-foreground text-sm uppercase tracking-wide"
                }
                data-testid="badge-invoice-status"
              >
                {inv.status}
              </Badge>
              <p className="font-mono text-2xl font-bold mt-2" data-testid="text-invoice-number">{inv.invoiceNumber}</p>
              <p className="text-xs text-muted-foreground mt-1 capitalize">{inv.type} invoice • {formatDate(inv.date)}</p>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">Mode: {inv.paymentMode}</p>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Billed to</p>
              <p className="font-serif text-xl font-bold mt-1" data-testid="text-customer-name">{inv.customerName}</p>
              <Link href={`/customers/${inv.customerId}`} className="text-xs text-primary hover:underline">View customer profile →</Link>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Notes</p>
              <p className="text-sm mt-1">{inv.notes || <span className="text-muted-foreground italic">None</span>}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 overflow-hidden">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>HSN</TableHead>
                  <TableHead className="text-right">Wt (g)</TableHead>
                  <TableHead className="text-right">Rate/g</TableHead>
                  <TableHead className="text-right">Making</TableHead>
                  <TableHead className="text-right">Stones</TableHead>
                  <TableHead className="text-right">Taxable</TableHead>
                  <TableHead className="text-right">CGST</TableHead>
                  <TableHead className="text-right">SGST</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inv.items.map((it, idx) => {
                  const c = computeRowAmount(it);
                  const making = it.weightGrams * it.ratePerGram * (it.makingChargePercent / 100);
                  return (
                    <TableRow key={idx} data-testid={`row-item-${idx}`}>
                      <TableCell>
                        <p className="font-medium">{it.productName}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {it.metal} • {it.purity}
                          {it.grossWeight > 0 && it.grossWeight !== it.weightGrams ? ` • Gross ${it.grossWeight.toFixed(3)}g − Less ${it.lessWeight.toFixed(3)}g` : ""}
                          {it.wastagePercent > 0 ? ` • Wastage ${it.wastagePercent.toFixed(2)}%` : ""}
                        </p>
                      </TableCell>
                      <TableCell className="font-mono text-xs">7113</TableCell>
                      <TableCell className="text-right">{formatWeight(it.weightGrams)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(it.ratePerGram)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(making)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(it.stoneCharges)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.base)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(c.gst / 2)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(c.gst / 2)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(c.amount)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {inv.oldGoldItems && inv.oldGoldItems.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/30 overflow-hidden">
              <div className="px-4 py-2 border-b border-amber-200 bg-amber-50/60 flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-700" />
                <span className="font-medium text-amber-900 text-sm uppercase tracking-wider">Old gold exchanged</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Metal</TableHead>
                    <TableHead className="text-right">Gross (g)</TableHead>
                    <TableHead className="text-right">Purity</TableHead>
                    <TableHead className="text-right">Fine (g)</TableHead>
                    <TableHead className="text-right">Rate/g</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inv.oldGoldItems.map((o, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{o.description}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">{o.metal}</TableCell>
                      <TableCell className="text-right font-mono">{o.grossWeight.toFixed(3)}</TableCell>
                      <TableCell className="text-right font-mono">{o.purityPercent.toFixed(2)}%</TableCell>
                      <TableCell className="text-right font-mono">{o.fineWeight.toFixed(3)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(o.ratePerGram)}</TableCell>
                      <TableCell className="text-right font-semibold text-amber-700">- {formatCurrency(o.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-xs text-muted-foreground space-y-1.5">
              <p className="font-medium text-foreground uppercase tracking-wider mb-2">Terms</p>
              <p className="whitespace-pre-line">{shop?.invoiceTerms || "• Hallmarked metal as per BIS standards.\n• Goods once sold can be exchanged within 30 days.\n• Subject to local jurisdiction."}</p>
              {shop?.upiId ? (
                <p className="pt-3 text-xs"><span className="font-medium text-foreground">UPI:</span> {shop.upiId}</p>
              ) : null}
              {shop?.bankName ? (
                <p className="text-xs"><span className="font-medium text-foreground">Bank:</span> {shop.bankName} • A/c {shop.bankAccount} • IFSC {shop.bankIfsc}</p>
              ) : null}
            </div>
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6 space-y-2">
                <Row label="Subtotal" value={formatCurrency(inv.subtotal)} />
                <Row label="CGST" value={formatCurrency(cgst)} />
                <Row label="SGST" value={formatCurrency(sgst)} />
                {inv.discount > 0 && <Row label="Discount" value={`- ${formatCurrency(inv.discount)}`} />}
                {inv.oldGoldValue > 0 && <Row label="Old gold credit" value={`- ${formatCurrency(inv.oldGoldValue)}`} />}
                <div className="flex justify-between items-center border-t border-primary/30 pt-2 mt-2">
                  <span className="font-serif text-lg">Total</span>
                  <span className="font-serif text-2xl font-bold text-primary" data-testid="text-invoice-total">{formatCurrency(inv.total)}</span>
                </div>
                <Row label="Paid" value={formatCurrency(inv.paidAmount)} muted />
                <Row label="Balance" value={formatCurrency(inv.balance)} bold />
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-[400px]" data-testid="dialog-payment">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Outstanding balance: <span className="font-bold text-foreground">{formatCurrency(inv.balance)}</span>
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Amount (₹)</Label>
              <Input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" data-testid="input-payment-amount" />
              <button type="button" className="text-xs text-primary hover:underline mt-1" onClick={() => setPayAmount(String(inv.balance))} data-testid="button-pay-full">
                Pay full balance
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayOpen(false)} data-testid="button-cancel-payment">Cancel</Button>
            <Button onClick={onPay} disabled={recordPayment.isPending} data-testid="button-confirm-payment">
              {recordPayment.isPending ? "Saving..." : "Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Pay {formatCurrency(inv.balance)}</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {upiPayload ? (
              <>
                <div className="bg-white p-4 rounded-xl border-2 border-primary/30 shadow-sm">
                  <QRCodeSVG value={upiPayload} size={220} level="M" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium">Scan with any UPI app</p>
                  <p className="text-xs text-muted-foreground font-mono">{shop?.upiId}</p>
                  <p className="text-xs text-muted-foreground">Reference: {inv.invoiceNumber}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No UPI ID configured. Add one in Shop Settings.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${muted ? "text-muted-foreground" : ""} ${bold ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
