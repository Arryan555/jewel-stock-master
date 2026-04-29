import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCustomers,
  useListProducts,
  useCreateEstimate,
  getListEstimatesQueryKey,
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
import { Plus, Trash2, ClipboardList } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { computeRowAmount } from "@/lib/calc";
import { useToast } from "@/hooks/use-toast";

interface Row {
  rowKey: string;
  productId: string;
  weightGrams: number;
  ratePerGram: number;
  makingChargePercent: number;
  stoneCharges: number;
  gstRate: number;
}

const k = () => Math.random().toString(36).slice(2, 9);

export default function EstimateNew() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState("");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

  const { data: customers } = useListCustomers({ type: "all" });
  const { data: products } = useListProducts({});
  const create = useCreateEstimate();

  const totals = useMemo(() => {
    let subtotal = 0;
    let gst = 0;
    for (const r of rows) {
      const c = computeRowAmount(r);
      subtotal += c.base;
      gst += c.gst;
    }
    return {
      subtotal,
      gst,
      total: Math.max(0, subtotal + gst - (parseFloat(discount) || 0)),
    };
  }, [rows, discount]);

  function pickProduct(idx: number, productId: string) {
    const p = (products ?? []).find((x) => x.id === productId);
    if (!p) return;
    setRows((prev) => {
      const c = [...prev];
      c[idx] = {
        ...c[idx],
        productId,
        weightGrams: p.weightGrams,
        ratePerGram: p.ratePerGram,
        makingChargePercent: p.makingChargePercent,
        stoneCharges: p.stoneCharges,
        gstRate: p.gstRate,
      };
      return c;
    });
  }

  async function onSubmit() {
    if (!customerId) {
      toast({ title: "Pick a customer", variant: "destructive" });
      return;
    }
    if (rows.length === 0 || rows.some((r) => !r.productId)) {
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }
    try {
      const est = await create.mutateAsync({
        data: {
          customerId,
          date: new Date(date).toISOString(),
          validUntil: validUntil ? new Date(validUntil).toISOString() : null,
          discount: parseFloat(discount) || 0,
          notes: notes || null,
          items: rows.map((r) => ({
            productId: r.productId,
            weightGrams: r.weightGrams,
            ratePerGram: r.ratePerGram,
            makingChargePercent: r.makingChargePercent,
            stoneCharges: r.stoneCharges,
            gstRate: r.gstRate,
          })),
        },
      });
      await qc.invalidateQueries({ queryKey: getListEstimatesQueryKey() });
      toast({ title: `Estimate ${est.estimateNumber} created` });
      setLocation(`/estimates/${est.id}`);
    } catch (err) {
      toast({
        title: "Could not create estimate",
        description: String((err as Error).message),
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
          <ClipboardList className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-serif text-3xl font-bold">New Estimate</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Quote that can be converted to a retail invoice in one click
          </p>
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader className="border-b"><CardTitle className="text-base">Customer & Validity</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground tracking-wider">Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {(customers ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} — {c.phone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground tracking-wider">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground tracking-wider">Valid Until</Label>
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="border-b flex flex-row items-center justify-between">
          <CardTitle className="text-base">Line Items</CardTitle>
          <Button size="sm" onClick={() => setRows((r) => [...r, { rowKey: k(), productId: "", weightGrams: 0, ratePerGram: 0, makingChargePercent: 0, stoneCharges: 0, gstRate: 3 }])}>
            <Plus className="h-4 w-4 mr-2" /> Add item
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow>
                <TableHead className="min-w-[220px]">Item</TableHead>
                <TableHead className="text-right">Wt (g)</TableHead>
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
                <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">Add an item to begin</TableCell></TableRow>
              ) : rows.map((r, idx) => {
                const c = computeRowAmount(r);
                return (
                  <TableRow key={r.rowKey}>
                    <TableCell>
                      <Select value={r.productId} onValueChange={(v) => pickProduct(idx, v)}>
                        <SelectTrigger><SelectValue placeholder="Pick a product" /></SelectTrigger>
                        <SelectContent>
                          {(products ?? []).map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              <span className="font-mono text-xs text-muted-foreground mr-2">{p.sku}</span>{p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {(["weightGrams","ratePerGram","makingChargePercent","stoneCharges","gstRate"] as const).map((field) => (
                      <TableCell key={field} className="text-right">
                        <Input type="number" step="0.01" className="text-right h-9"
                          value={r[field]}
                          onChange={(e) => setRows((prev) => {
                            const cp = [...prev];
                            cp[idx] = { ...cp[idx], [field]: parseFloat(e.target.value) || 0 };
                            return cp;
                          })} />
                      </TableCell>
                    ))}
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
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader className="border-b"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent className="pt-6">
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Quote remarks (e.g. valid for 7 days, hallmarked, etc.)" />
          </CardContent>
        </Card>

        <Card className="border-primary/30 shadow-md bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="border-b border-primary/20"><CardTitle className="text-base font-serif">Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-6">
            <SumRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
            <SumRow label="GST" value={formatCurrency(totals.gst)} />
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">Discount (₹)</Label>
              <Input type="number" step="0.01" className="w-32 h-9 text-right" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div className="flex items-center justify-between border-t border-primary/30 pt-3">
              <span className="font-serif text-lg">Total</span>
              <span className="font-serif text-2xl font-bold text-primary">{formatCurrency(totals.total)}</span>
            </div>
            <Button className="w-full" size="lg" onClick={onSubmit} disabled={create.isPending}>
              {create.isPending ? "Saving..." : "Save estimate"}
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
