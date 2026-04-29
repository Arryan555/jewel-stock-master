import { useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCustomers,
  useListProducts,
  useCreateInvoice,
  getListInvoicesQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetSalesTrendQueryKey,
  getGetRecentActivityQueryKey,
  getListProductsQueryKey,
  getGetTopCustomersQueryKey,
  getGetLedgerBalancesQueryKey,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Receipt, FileSpreadsheet, Coins } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { computeRowAmount } from "@/lib/calc";
import { useToast } from "@/hooks/use-toast";

interface Row {
  rowKey: string;
  productId: string;
  grossWeight: number;
  lessWeight: number;
  weightGrams: number;
  wastagePercent: number;
  ratePerGram: number;
  makingChargePercent: number;
  stoneCharges: number;
  gstRate: number;
}

interface OldGoldRow {
  rowKey: string;
  description: string;
  metal: "gold" | "silver";
  grossWeight: number;
  purityPercent: number;
  ratePerGram: number;
}

const k = () => Math.random().toString(36).slice(2, 9);

function oldGoldValue(o: OldGoldRow): number {
  const fine = o.grossWeight * (o.purityPercent / 100);
  return fine * o.ratePerGram;
}

export default function InvoiceNew() {
  const [, paramsRetail] = useRoute("/billing/retail/new");
  const type: "retail" | "wholesale" = paramsRetail ? "retail" : "wholesale";
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [discount, setDiscount] = useState("0");
  const [paidAmount, setPaidAmount] = useState("0");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [oldGold, setOldGold] = useState<OldGoldRow[]>([]);

  const { data: customers, isLoading: loadingC } = useListCustomers({ type: "all" });
  const { data: products, isLoading: loadingP } = useListProducts({});
  const create = useCreateInvoice();

  const totals = useMemo(() => {
    let subtotal = 0;
    let gst = 0;
    for (const r of rows) {
      const c = computeRowAmount(r);
      subtotal += c.base;
      gst += c.gst;
    }
    const oldGoldTotal = oldGold.reduce((s, o) => s + oldGoldValue(o), 0);
    const total = Math.max(
      0,
      subtotal + gst - (parseFloat(discount) || 0) - oldGoldTotal,
    );
    return { subtotal, gst, oldGoldTotal, total };
  }, [rows, discount, oldGold]);

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        rowKey: k(),
        productId: "",
        grossWeight: 0,
        lessWeight: 0,
        weightGrams: 0,
        wastagePercent: 0,
        ratePerGram: 0,
        makingChargePercent: 0,
        stoneCharges: 0,
        gstRate: 3,
      },
    ]);
  }

  function setRow(idx: number, patch: Partial<Row>) {
    setRows((prev) => {
      const c = [...prev];
      const next = { ...c[idx], ...patch };
      if ("grossWeight" in patch || "lessWeight" in patch) {
        next.weightGrams = Math.max(0, next.grossWeight - next.lessWeight);
      }
      c[idx] = next;
      return c;
    });
  }

  function pickProduct(idx: number, productId: string) {
    const p = (products ?? []).find((x) => x.id === productId);
    if (!p) return;
    setRows((prev) => {
      const c = [...prev];
      c[idx] = {
        ...c[idx],
        productId,
        grossWeight: p.weightGrams,
        lessWeight: 0,
        weightGrams: p.weightGrams,
        wastagePercent: 0,
        ratePerGram: p.ratePerGram,
        makingChargePercent: p.makingChargePercent,
        stoneCharges: p.stoneCharges,
        gstRate: p.gstRate,
      };
      return c;
    });
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function addOldGold() {
    setOldGold((p) => [
      ...p,
      { rowKey: k(), description: "", metal: "gold", grossWeight: 0, purityPercent: 91.6, ratePerGram: 0 },
    ]);
  }

  function setOldGoldRow(idx: number, patch: Partial<OldGoldRow>) {
    setOldGold((p) => {
      const c = [...p];
      c[idx] = { ...c[idx], ...patch };
      return c;
    });
  }

  function removeOldGold(idx: number) {
    setOldGold((p) => p.filter((_, i) => i !== idx));
  }

  async function onSubmit() {
    if (!customerId) {
      toast({ title: "Pick a customer", variant: "destructive" });
      return;
    }
    if (rows.length === 0 || rows.some((r) => !r.productId)) {
      toast({ title: "Add at least one item with a selected product", variant: "destructive" });
      return;
    }
    if (oldGold.some((o) => !o.description || o.grossWeight <= 0)) {
      toast({ title: "Fill description and gross weight on every old-gold row", variant: "destructive" });
      return;
    }
    try {
      const inv = await create.mutateAsync({
        data: {
          type,
          customerId,
          date: new Date(date).toISOString(),
          discount: parseFloat(discount) || 0,
          paidAmount: parseFloat(paidAmount) || 0,
          paymentMode,
          notes: notes || undefined,
          items: rows.map((r) => ({
            productId: r.productId,
            grossWeight: r.grossWeight,
            lessWeight: r.lessWeight,
            weightGrams: r.weightGrams,
            wastagePercent: r.wastagePercent,
            ratePerGram: r.ratePerGram,
            makingChargePercent: r.makingChargePercent,
            stoneCharges: r.stoneCharges,
            gstRate: r.gstRate,
          })),
          oldGoldItems: oldGold.map((o) => ({
            description: o.description,
            metal: o.metal,
            grossWeight: o.grossWeight,
            purityPercent: o.purityPercent,
            ratePerGram: o.ratePerGram,
          })),
        },
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: getListInvoicesQueryKey() }),
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
        qc.invalidateQueries({ queryKey: getGetSalesTrendQueryKey() }),
        qc.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() }),
        qc.invalidateQueries({ queryKey: getListProductsQueryKey() }),
        qc.invalidateQueries({ queryKey: getGetTopCustomersQueryKey() }),
        qc.invalidateQueries({ queryKey: getGetLedgerBalancesQueryKey() }),
      ]);
      toast({ title: `Invoice ${inv.invoiceNumber} created` });
      setLocation(`/invoices/${inv.id}`);
    } catch (err) {
      toast({
        title: "Could not create invoice",
        description: String((err as Error).message),
        variant: "destructive",
      });
    }
  }

  const accent = type === "retail" ? "primary" : "accent";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl bg-${accent}/15 border border-${accent}/30 flex items-center justify-center`}>
          {type === "retail" ? <Receipt className={`h-5 w-5 text-${accent}`} /> : <FileSpreadsheet className={`h-5 w-5 text-${accent}`} />}
        </div>
        <div>
          <h1 className="font-serif text-3xl font-bold capitalize">New {type} Invoice</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {type === "retail" ? "Standard counter sale with GST split" : "Wholesale dispatch with bulk pricing"}
          </p>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b"><CardTitle className="text-base">Customer & Date</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger data-testid="select-invoice-customer"><SelectValue placeholder={loadingC ? "Loading..." : "Select a customer"} /></SelectTrigger>
              <SelectContent>
                {(customers ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} — {c.phone} <span className="ml-2 text-xs text-muted-foreground capitalize">({c.type})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Invoice Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-invoice-date" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b flex flex-row items-center justify-between">
          <CardTitle className="text-base">Line Items</CardTitle>
          <Button size="sm" onClick={addRow} data-testid="button-add-row"><Plus className="h-4 w-4 mr-2" /> Add item</Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[1100px]">
            <TableHeader className="bg-secondary/20">
              <TableRow>
                <TableHead className="min-w-[200px]">Item</TableHead>
                <TableHead className="text-right">Gross (g)</TableHead>
                <TableHead className="text-right">Less (g)</TableHead>
                <TableHead className="text-right">Net (g)</TableHead>
                <TableHead className="text-right">Wastage %</TableHead>
                <TableHead className="text-right">Rate/g</TableHead>
                <TableHead className="text-right">Making %</TableHead>
                <TableHead className="text-right">Stones</TableHead>
                <TableHead className="text-right">GST %</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="h-28 text-center text-muted-foreground">Click "Add item" to start the invoice</TableCell></TableRow>
              ) : rows.map((r, idx) => {
                const c = computeRowAmount(r);
                return (
                  <TableRow key={r.rowKey}>
                    <TableCell>
                      <Select value={r.productId} onValueChange={(v) => pickProduct(idx, v)}>
                        <SelectTrigger data-testid={`select-product-${idx}`}><SelectValue placeholder={loadingP ? "Loading..." : "Pick a product"} /></SelectTrigger>
                        <SelectContent>
                          {(products ?? []).map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              <span className="font-mono text-xs text-muted-foreground mr-2">{p.sku}</span>{p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right"><Input type="number" step="0.001" className="text-right h-9 w-24" value={r.grossWeight} onChange={(e) => setRow(idx, { grossWeight: parseFloat(e.target.value) || 0 })} /></TableCell>
                    <TableCell className="text-right"><Input type="number" step="0.001" className="text-right h-9 w-20" value={r.lessWeight} onChange={(e) => setRow(idx, { lessWeight: parseFloat(e.target.value) || 0 })} /></TableCell>
                    <TableCell className="text-right font-mono text-sm">{r.weightGrams.toFixed(3)}</TableCell>
                    <TableCell className="text-right"><Input type="number" step="0.01" className="text-right h-9 w-20" value={r.wastagePercent} onChange={(e) => setRow(idx, { wastagePercent: parseFloat(e.target.value) || 0 })} /></TableCell>
                    <TableCell className="text-right"><Input type="number" step="0.01" className="text-right h-9 w-24" value={r.ratePerGram} onChange={(e) => setRow(idx, { ratePerGram: parseFloat(e.target.value) || 0 })} /></TableCell>
                    <TableCell className="text-right"><Input type="number" step="0.01" className="text-right h-9 w-20" value={r.makingChargePercent} onChange={(e) => setRow(idx, { makingChargePercent: parseFloat(e.target.value) || 0 })} /></TableCell>
                    <TableCell className="text-right"><Input type="number" step="0.01" className="text-right h-9 w-24" value={r.stoneCharges} onChange={(e) => setRow(idx, { stoneCharges: parseFloat(e.target.value) || 0 })} /></TableCell>
                    <TableCell className="text-right"><Input type="number" step="0.01" className="text-right h-9 w-16" value={r.gstRate} onChange={(e) => setRow(idx, { gstRate: parseFloat(e.target.value) || 0 })} /></TableCell>
                    <TableCell className="text-right font-semibold" data-testid={`text-row-amount-${idx}`}>{formatCurrency(c.amount)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeRow(idx)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-amber-200 shadow-sm bg-gradient-to-br from-amber-50/30 to-transparent">
        <CardHeader className="border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-600" />
            <CardTitle className="text-base">Old Gold Exchange</CardTitle>
          </div>
          <Button size="sm" variant="outline" onClick={addOldGold}>
            <Plus className="h-4 w-4 mr-2" /> Add old item
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {oldGold.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No old gold being exchanged</p>
          ) : (
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow>
                  <TableHead className="min-w-[200px]">Description</TableHead>
                  <TableHead>Metal</TableHead>
                  <TableHead className="text-right">Gross (g)</TableHead>
                  <TableHead className="text-right">Purity %</TableHead>
                  <TableHead className="text-right">Fine (g)</TableHead>
                  <TableHead className="text-right">Rate/g</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {oldGold.map((o, i) => {
                  const fine = o.grossWeight * (o.purityPercent / 100);
                  const value = oldGoldValue(o);
                  return (
                    <TableRow key={o.rowKey}>
                      <TableCell><Input value={o.description} placeholder="22K bangle, ring..." onChange={(e) => setOldGoldRow(i, { description: e.target.value })} /></TableCell>
                      <TableCell>
                        <Select value={o.metal} onValueChange={(v) => setOldGoldRow(i, { metal: v as "gold" | "silver" })}>
                          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gold">Gold</SelectItem>
                            <SelectItem value="silver">Silver</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right"><Input type="number" step="0.001" className="text-right h-9 w-24" value={o.grossWeight} onChange={(e) => setOldGoldRow(i, { grossWeight: parseFloat(e.target.value) || 0 })} /></TableCell>
                      <TableCell className="text-right"><Input type="number" step="0.01" className="text-right h-9 w-20" value={o.purityPercent} onChange={(e) => setOldGoldRow(i, { purityPercent: parseFloat(e.target.value) || 0 })} /></TableCell>
                      <TableCell className="text-right font-mono text-sm">{fine.toFixed(3)}</TableCell>
                      <TableCell className="text-right"><Input type="number" step="0.01" className="text-right h-9 w-24" value={o.ratePerGram} onChange={(e) => setOldGoldRow(i, { ratePerGram: parseFloat(e.target.value) || 0 })} /></TableCell>
                      <TableCell className="text-right font-semibold text-amber-700">{formatCurrency(value)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeOldGold(i)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border/50 shadow-sm lg:col-span-2">
          <CardHeader className="border-b"><CardTitle className="text-base">Notes & Payment</CardTitle></CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Payment mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank">Bank transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes..." data-testid="input-notes" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/30 shadow-md bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="border-b border-primary/20"><CardTitle className="text-base font-serif">Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-6">
            <SumRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
            <SumRow label="GST (CGST + SGST)" value={formatCurrency(totals.gst)} />
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">Discount (₹)</Label>
              <Input type="number" step="0.01" className="w-32 h-9 text-right" value={discount} onChange={(e) => setDiscount(e.target.value)} data-testid="input-discount" />
            </div>
            {totals.oldGoldTotal > 0 ? (
              <div className="flex items-center justify-between text-amber-700">
                <span className="text-sm">Old gold credit</span>
                <span className="font-medium">- {formatCurrency(totals.oldGoldTotal)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between border-t border-primary/30 pt-3">
              <span className="font-serif text-lg">Total</span>
              <span className="font-serif text-2xl font-bold text-primary" data-testid="text-total">{formatCurrency(totals.total)}</span>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">Paid (₹)</Label>
              <Input type="number" step="0.01" className="w-32 h-9 text-right" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} data-testid="input-paid" />
            </div>
            <Button className="w-full" size="lg" onClick={onSubmit} disabled={create.isPending} data-testid="button-save-invoice">
              {create.isPending ? "Saving..." : "Save & view invoice"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
