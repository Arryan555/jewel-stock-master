import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreatePurchase,
  getListPurchasesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, ShoppingCart, ChevronUp, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

interface Row {
  rowKey: string;
  description: string;
  metal: string;
  purity: string;
  purityPercent: number;
  grossWeight: number;
  lessWeight: number;
  ratePerGram: number;
}

const k = () => Math.random().toString(36).slice(2, 9);

const PURITY_OPTIONS: { label: string; metal: string; pct: number }[] = [
  { label: "24K (99.9%)", metal: "gold", pct: 99.9 },
  { label: "22K (91.6%)", metal: "gold", pct: 91.6 },
  { label: "18K (75.0%)", metal: "gold", pct: 75.0 },
  { label: "14K (58.5%)", metal: "gold", pct: 58.5 },
  { label: "Sterling 92.5%", metal: "silver", pct: 92.5 },
  { label: "Silver 80%", metal: "silver", pct: 80 },
];

function computeRow(r: Row) {
  const net = Math.max(0, r.grossWeight - r.lessWeight);
  const fine = net * (r.purityPercent / 100);
  const amount = fine * r.ratePerGram;
  return { net, fine, amount };
}

export default function PurchaseNew() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [vendorName, setVendorName] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [discount, setDiscount] = useState("0");
  const [paidAmount, setPaidAmount] = useState("0");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [goldPayWeight, setGoldPayWeight] = useState("0");
  const [silverPayWeight, setSilverPayWeight] = useState("0");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

  const create = useCreatePurchase();

  const totals = useMemo(() => {
    let subtotal = 0;
    let totalFine = 0;
    for (const r of rows) {
      const c = computeRow(r);
      subtotal += c.amount;
      totalFine += c.fine;
    }
    const total = Math.max(0, subtotal - (parseFloat(discount) || 0));
    return { subtotal, total, totalFine };
  }, [rows, discount]);

  function addRow() {
    setRows((p) => [
      ...p,
      { rowKey: k(), description: "", metal: "gold", purity: "22K", purityPercent: 91.6, grossWeight: 0, lessWeight: 0, ratePerGram: 0 },
    ]);
  }

  function setRow(idx: number, patch: Partial<Row>) {
    setRows((p) => {
      const c = [...p];
      c[idx] = { ...c[idx], ...patch };
      return c;
    });
  }

  function moveRow(idx: number, dir: -1 | 1) {
    setRows((p) => {
      const next = [...p];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return p;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function pickPurity(idx: number, label: string) {
    const opt = PURITY_OPTIONS.find((o) => o.label === label);
    if (!opt) return;
    setRow(idx, { purity: label, purityPercent: opt.pct, metal: opt.metal });
  }

  async function onSubmit() {
    if (!vendorName.trim()) {
      toast({ title: "Enter vendor name", variant: "destructive" });
      return;
    }
    if (rows.length === 0 || rows.some((r) => !r.description)) {
      toast({ title: "Add at least one item with a description", variant: "destructive" });
      return;
    }
    try {
      const v = await create.mutateAsync({
        data: {
          vendorName: vendorName.trim(),
          vendorPhone: vendorPhone.trim() || undefined,
          date: new Date(date).toISOString(),
          discount: parseFloat(discount) || 0,
          paidAmount: parseFloat(paidAmount) || 0,
          paymentMode,
          goldPayWeight: parseFloat(goldPayWeight) || 0,
          silverPayWeight: parseFloat(silverPayWeight) || 0,
          notes: notes.trim() || undefined,
          items: rows.map((r) => ({
            description: r.description,
            metal: r.metal,
            purity: r.purity,
            purityPercent: r.purityPercent,
            grossWeight: r.grossWeight,
            lessWeight: r.lessWeight,
            ratePerGram: r.ratePerGram,
          })),
        },
      });
      await qc.invalidateQueries({ queryKey: getListPurchasesQueryKey() });
      toast({ title: `Purchase ${v.voucherNumber} saved` });
      setLocation(`/purchases/${v.id}`);
    } catch (err) {
      toast({ title: "Could not save purchase", description: String((err as Error).message), variant: "destructive" });
    }
  }

  const showGoldPay = paymentMode === "gold_payment" || paymentMode === "mixed";
  const showSilverPay = paymentMode === "silver_payment" || paymentMode === "mixed";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-violet-500/15 border border-violet-300/50 flex items-center justify-center">
          <ShoppingCart className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h1 className="font-serif text-3xl font-bold">New Purchase Voucher</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Buy gold, silver or diamonds from a vendor or customer</p>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b"><CardTitle className="text-base">Vendor Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Vendor / Seller Name</Label>
            <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="e.g. Ramesh Soni or walk-in customer" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone</Label>
            <Input value={vendorPhone} onChange={(e) => setVendorPhone(e.target.value)} placeholder="+91 98765 00000" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b flex flex-row items-center justify-between">
          <CardTitle className="text-base">Items Purchased</CardTitle>
          <Button size="sm" onClick={addRow}><Plus className="h-4 w-4 mr-2" /> Add item</Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[960px]">
            <TableHeader className="bg-secondary/20">
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead className="min-w-[220px]">Description</TableHead>
                <TableHead className="min-w-[180px]">Purity</TableHead>
                <TableHead className="text-right">Gross (g)</TableHead>
                <TableHead className="text-right">Less (g)</TableHead>
                <TableHead className="text-right">Net (g)</TableHead>
                <TableHead className="text-right">Fine (g)</TableHead>
                <TableHead className="text-right">Rate/g (₹)</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-28 text-center text-muted-foreground">
                    Click "Add item" to start entering purchased goods
                  </TableCell>
                </TableRow>
              ) : rows.map((r, idx) => {
                const c = computeRow(r);
                return (
                  <TableRow key={r.rowKey}>
                    <TableCell className="w-12 pr-1">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-muted-foreground font-mono leading-none">{idx + 1}</span>
                        <Button variant="ghost" size="icon"
                          className="h-5 w-5 text-muted-foreground hover:text-foreground disabled:opacity-20"
                          disabled={idx === 0}
                          onClick={() => moveRow(idx, -1)}>
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon"
                          className="h-5 w-5 text-muted-foreground hover:text-foreground disabled:opacity-20"
                          disabled={idx === rows.length - 1}
                          onClick={() => moveRow(idx, 1)}>
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={r.description}
                        onChange={(e) => setRow(idx, { description: e.target.value })}
                        placeholder="e.g. 22K bangle, old ring..."
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={r.purity} onValueChange={(v) => pickPurity(idx, v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PURITY_OPTIONS.map((o) => (
                            <SelectItem key={o.label} value={o.label}>{o.label}</SelectItem>
                          ))}
                          <SelectItem value="custom">Custom…</SelectItem>
                        </SelectContent>
                      </Select>
                      {r.purity === "custom" ? (
                        <Input
                          type="number"
                          step="0.01"
                          className="h-8 mt-1"
                          placeholder="Purity %"
                          value={r.purityPercent}
                          onChange={(e) => setRow(idx, { purityPercent: parseFloat(e.target.value) || 0 })}
                        />
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input type="number" step="0.001" className="text-right h-9 w-24" value={r.grossWeight} onChange={(e) => setRow(idx, { grossWeight: parseFloat(e.target.value) || 0 })} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input type="number" step="0.001" className="text-right h-9 w-20" value={r.lessWeight} onChange={(e) => setRow(idx, { lessWeight: parseFloat(e.target.value) || 0 })} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{c.net.toFixed(3)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-amber-700 font-semibold">{c.fine.toFixed(3)}</TableCell>
                    <TableCell className="text-right">
                      <Input type="number" step="0.01" className="text-right h-9 w-28" value={r.ratePerGram} onChange={(e) => setRow(idx, { ratePerGram: parseFloat(e.target.value) || 0 })} />
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(c.amount)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setRows((p) => p.filter((_, i) => i !== idx))}>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="border-b"><CardTitle className="text-base">Payment Details</CardTitle></CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Payment mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="neft">NEFT</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="credit">Credit (Pay later)</SelectItem>
                  <SelectItem value="gold_payment">Gold Payment</SelectItem>
                  <SelectItem value="silver_payment">Silver Payment</SelectItem>
                  <SelectItem value="mixed">Mixed (Cash + Metal)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {showGoldPay ? (
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-amber-700">Gold paid (grams)</Label>
                <Input type="number" step="0.001" className="max-w-xs border-amber-200 focus-visible:ring-amber-400" value={goldPayWeight} onChange={(e) => setGoldPayWeight(e.target.value)} />
              </div>
            ) : null}
            {showSilverPay ? (
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-slate-600">Silver paid (grams)</Label>
                <Input type="number" step="0.001" className="max-w-xs" value={silverPayWeight} onChange={(e) => setSilverPayWeight(e.target.value)} />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes, tag numbers..." />
            </div>
          </CardContent>
        </Card>

        <Card className="border-violet-200 shadow-md bg-gradient-to-br from-violet-50/40 to-transparent">
          <CardHeader className="border-b border-violet-200">
            <CardTitle className="text-base font-serif">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total fine weight</span>
              <span className="font-mono font-semibold text-amber-700">{totals.totalFine.toFixed(3)} g</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">Discount (₹)</Label>
              <Input type="number" step="0.01" className="w-32 h-9 text-right" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div className="flex justify-between border-t border-violet-200 pt-3">
              <span className="font-serif text-lg">Total</span>
              <span className="font-serif text-2xl font-bold text-violet-700">{formatCurrency(totals.total)}</span>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">Amount paid (₹)</Label>
              <Input type="number" step="0.01" className="w-32 h-9 text-right" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
            </div>
            <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white" size="lg" onClick={onSubmit} disabled={create.isPending}>
              {create.isPending ? "Saving..." : "Save Purchase Voucher"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
