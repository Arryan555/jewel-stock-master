import { useMemo, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCustomers,
  useCreateInvoice,
  getListInvoicesQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Printer, Save, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

// ─── Constants ───────────────────────────────────────────────────────────────

const BILL_TYPES = [
  { code: "JB", label: "Retail Sale", prefix: "JB-", path: "/billing/retail/new" },
  { code: "WS", label: "Wholesale", prefix: "WS-", path: "/billing/wholesale/new" },
  { code: "GD", label: "Gold Bill", prefix: "GD-", path: "/billing/gold/new" },
  { code: "DM", label: "Diamond Bill", prefix: "DM-", path: "/billing/diamond/new" },
  { code: "EX", label: "Exchange", prefix: "EX-", path: "/billing/exchange/new" },
  { code: "RP", label: "Repair Bill", prefix: "RP-", path: "/billing/repair/new" },
] as const;

const METALS = ["Gold", "Silver", "Diamond", "Platinum", "Other"];

const PURITIES: Record<string, string[]> = {
  Gold: ["24K", "22K", "18K", "14K", "10K"],
  Silver: ["999", "925", "Plain"],
  Diamond: ["18K", "14K"],
  Platinum: ["950", "900"],
  Other: ["N/A"],
};

const PURITY_FACTOR: Record<string, number> = {
  "24K": 1,
  "22K": 22 / 24,
  "18K": 18 / 24,
  "14K": 14 / 24,
  "10K": 10 / 24,
  "999": 0.999,
  "925": 0.925,
  Plain: 0.8,
  "950": 0.95,
  "900": 0.9,
  "N/A": 1,
};

const MAKING_TYPES = ["%", "₹/g", "₹/pc"] as const;
type MakingType = (typeof MAKING_TYPES)[number];

const PAYMENT_MODES = [
  "Cash",
  "UPI",
  "NEFT/RTGS",
  "Card",
  "Cheque",
  "Credit",
  "Gold Payment",
  "Silver Payment",
] as const;
type PaymentMode = (typeof PAYMENT_MODES)[number];

// ─── Types ────────────────────────────────────────────────────────────────────

interface BillRow {
  key: string;
  itemName: string;
  metal: string;
  purity: string;
  grossGrams: number;
  lessGrams: number;
  makingValue: number;
  makingType: MakingType;
  ratePerGram: number;
}

interface PaymentRow {
  key: string;
  mode: PaymentMode;
  amount: number;
  metalGrams: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rk() {
  return Math.random().toString(36).slice(2, 8);
}

function netGrams(row: BillRow) {
  return Math.max(0, row.grossGrams - row.lessGrams);
}

function fineGrams(row: BillRow) {
  const factor = PURITY_FACTOR[row.purity] ?? 1;
  return netGrams(row) * factor;
}

function makingAmount(row: BillRow, metalValue: number) {
  if (row.makingType === "%") return (metalValue * row.makingValue) / 100;
  if (row.makingType === "₹/g") return row.makingValue * netGrams(row);
  return row.makingValue; // ₹/pc
}

function rowAmount(row: BillRow, fineMode: boolean) {
  const net = netGrams(row);
  const fine = fineGrams(row);
  const metalValue = (fineMode ? fine : net) * row.ratePerGram;
  const making = makingAmount(row, metalValue);
  return metalValue + making;
}

// ─── Row Component ────────────────────────────────────────────────────────────

function BillRowComp({
  row,
  idx,
  fineMode,
  onChange,
  onRemove,
}: {
  row: BillRow;
  idx: number;
  fineMode: boolean;
  onChange: (key: string, field: string, value: unknown) => void;
  onRemove: (key: string) => void;
}) {
  const net = netGrams(row);
  const fine = fineGrams(row);
  const metalValue = (fineMode ? fine : net) * row.ratePerGram;
  const making = makingAmount(row, metalValue);
  const amount = metalValue + making;

  const set = (field: string, value: unknown) => onChange(row.key, field, value);

  return (
    <TableRow>
      <TableCell className="text-muted-foreground w-8">{idx + 1}</TableCell>
      <TableCell className="min-w-[140px]">
        <Input
          value={row.itemName}
          onChange={e => set("itemName", e.target.value)}
          placeholder="Item name"
          className="h-8 text-sm"
        />
      </TableCell>
      <TableCell className="w-[100px]">
        <Select value={row.metal} onValueChange={v => set("metal", v)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METALS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="w-[80px]">
        <Select
          value={row.purity}
          onValueChange={v => set("purity", v)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(PURITIES[row.metal] ?? ["N/A"]).map(p => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="w-[90px]">
        <Input
          type="number"
          step="0.001"
          value={row.grossGrams || ""}
          onChange={e => set("grossGrams", parseFloat(e.target.value) || 0)}
          className="h-8 text-right text-sm font-mono"
          placeholder="0.000"
        />
      </TableCell>
      <TableCell className="w-[80px]">
        <Input
          type="number"
          step="0.001"
          value={row.lessGrams || ""}
          onChange={e => set("lessGrams", parseFloat(e.target.value) || 0)}
          className="h-8 text-right text-sm font-mono"
          placeholder="0.000"
        />
      </TableCell>
      <TableCell className="w-[70px] text-right font-mono text-sm text-muted-foreground">
        {net.toFixed(3)}
      </TableCell>
      {fineMode && (
        <TableCell className="w-[70px] text-right font-mono text-sm text-amber-700 font-semibold">
          {fine.toFixed(3)}
        </TableCell>
      )}
      <TableCell className="w-[150px]">
        <div className="flex gap-1 items-center">
          <Input
            type="number"
            step="0.01"
            value={row.makingValue || ""}
            onChange={e => set("makingValue", parseFloat(e.target.value) || 0)}
            className="h-8 text-right text-sm font-mono flex-1 min-w-0"
            placeholder="0"
          />
          <Select value={row.makingType} onValueChange={v => set("makingType", v as MakingType)}>
            <SelectTrigger className="h-8 w-[62px] text-xs px-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MAKING_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </TableCell>
      <TableCell className="w-[100px]">
        <Input
          type="number"
          step="0.01"
          value={row.ratePerGram || ""}
          onChange={e => set("ratePerGram", parseFloat(e.target.value) || 0)}
          className="h-8 text-right text-sm font-mono"
          placeholder="0"
        />
      </TableCell>
      <TableCell className="text-right font-semibold font-mono text-sm w-[110px]">
        ₹{amount.toFixed(2)}
      </TableCell>
      <TableCell className="w-8">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={() => onRemove(row.key)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function JewelBill() {
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  // Detect bill type from route
  const currentType = BILL_TYPES.find(t => t.path === location) ?? BILL_TYPES[0];
  const [billType, setBillType] = useState(currentType);

  // Header state
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [fineMode, setFineMode] = useState(false);
  const [discount, setDiscount] = useState(0);

  // Rows
  const [rows, setRows] = useState<BillRow[]>([]);

  // Payments
  const [payments, setPayments] = useState<PaymentRow[]>([
    { key: rk(), mode: "Cash", amount: 0, metalGrams: 0 },
  ]);

  const { data: customers } = useListCustomers({ type: "all" });
  const create = useCreateInvoice();

  // ─── Row CRUD ───────────────────────────────────────────────────────────────

  const addRow = useCallback(() => {
    setRows(prev => [
      ...prev,
      {
        key: rk(),
        itemName: "",
        metal: "Gold",
        purity: "22K",
        grossGrams: 0,
        lessGrams: 0,
        makingValue: 10,
        makingType: "%",
        ratePerGram: 0,
      },
    ]);
  }, []);

  const updateRow = useCallback((key: string, field: string, value: unknown) => {
    setRows(prev =>
      prev.map(r => {
        if (r.key !== key) return r;
        const updated = { ...r, [field]: value } as BillRow;
        if (field === "metal") {
          updated.purity = PURITIES[value as string]?.[0] ?? "N/A";
        }
        return updated;
      })
    );
  }, []);

  const removeRow = useCallback((key: string) => {
    setRows(prev => prev.filter(r => r.key !== key));
  }, []);

  // ─── Payment CRUD ───────────────────────────────────────────────────────────

  const addPayment = () => {
    setPayments(prev => [
      ...prev,
      { key: rk(), mode: "Cash", amount: 0, metalGrams: 0 },
    ]);
  };

  const updatePayment = (key: string, field: string, value: unknown) => {
    setPayments(prev => prev.map(p => p.key === key ? { ...p, [field]: value } : p));
  };

  const removePayment = (key: string) => {
    setPayments(prev => prev.filter(p => p.key !== key));
  };

  // ─── Totals ─────────────────────────────────────────────────────────────────

  const totals = useMemo(() => {
    let subtotal = 0;
    let totalFine = 0;
    let goldFine = 0;
    let silverFine = 0;

    for (const row of rows) {
      const amt = rowAmount(row, fineMode);
      subtotal += amt;
      const fine = fineGrams(row);
      totalFine += fine;
      if (row.metal === "Gold") goldFine += fine;
      if (row.metal === "Silver") silverFine += fine;
    }

    const grandTotal = Math.max(0, subtotal - discount);

    const cashPaid = payments
      .filter(p => !["Gold Payment", "Silver Payment"].includes(p.mode))
      .reduce((s, p) => s + p.amount, 0);

    const goldPaid = payments
      .filter(p => p.mode === "Gold Payment")
      .reduce((s, p) => s + p.metalGrams, 0);

    const silverPaid = payments
      .filter(p => p.mode === "Silver Payment")
      .reduce((s, p) => s + p.metalGrams, 0);

    return {
      subtotal,
      grandTotal,
      totalFine,
      cashBalance: grandTotal - cashPaid,
      goldBalance: goldFine - goldPaid,
      silverBalance: silverFine - silverPaid,
      cashPaid,
      goldPaid,
      silverPaid,
    };
  }, [rows, discount, payments, fineMode]);

  // ─── Submit ─────────────────────────────────────────────────────────────────

  const onSave = async () => {
    if (!customerId) {
      toast({ title: "Please select a customer", variant: "destructive" });
      return;
    }
    if (rows.length === 0) {
      toast({ title: "Please add at least one item", variant: "destructive" });
      return;
    }

    try {
      const res = await create.mutateAsync({
        customerId,
        type: billType.code.toLowerCase() as "retail" | "wholesale",
        date,
        discount: String(discount),
        paidAmount: String(totals.cashPaid),
        notes,
        items: rows.map(row => ({
          productId: undefined,
          description: `${row.itemName} (${row.metal} ${row.purity})`,
          weightGrams: String(netGrams(row)),
          ratePerGram: String(row.ratePerGram),
          makingChargePercent: row.makingType === "%" ? String(row.makingValue) : "0",
          stoneCharges: "0",
          gstRate: "0",
        })),
      });

      qc.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });

      toast({ title: `Bill ${billType.prefix}saved successfully` });
      setLocation(`/invoices/${res.id}`);
    } catch {
      toast({ title: "Error saving bill", variant: "destructive" });
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  const isMetalPayment = (mode: PaymentMode) =>
    mode === "Gold Payment" || mode === "Silver Payment";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/invoices">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-serif font-bold">Jewar Bill</h1>
            <Badge className="bg-amber-100 text-amber-800 text-xs">{billType.label}</Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5 ml-10">
            Create a new {billType.label.toLowerCase()} — {billType.prefix}****
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button size="sm" onClick={onSave} disabled={create.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {create.isPending ? "Saving..." : "Save Bill"}
          </Button>
        </div>
      </div>

      {/* Bill Type Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit flex-wrap">
        {BILL_TYPES.map(t => (
          <button
            key={t.code}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              billType.code === t.code
                ? "bg-white shadow text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setBillType(t)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Top row: customer + date + fine mode */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm col-span-2">
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select customer…" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Fine Mode</div>
                <div className="text-xs text-muted-foreground">Calculate on fine weight</div>
              </div>
              <Switch checked={fineMode} onCheckedChange={setFineMode} />
            </div>
            {fineMode && (
              <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800">
                ✦ Rate applied on fine (pure) grams after purity conversion
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-serif">Bill Items</CardTitle>
          <Button size="sm" variant="outline" onClick={addRow}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Item
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Metal</TableHead>
                <TableHead>Purity</TableHead>
                <TableHead className="text-right">Gross (g)</TableHead>
                <TableHead className="text-right">Less (g)</TableHead>
                <TableHead className="text-right">Net (g)</TableHead>
                {fineMode && <TableHead className="text-right text-amber-700">Fine (g)</TableHead>}
                <TableHead>Making</TableHead>
                <TableHead className="text-right">Rate/g (₹)</TableHead>
                <TableHead className="text-right">Amount (₹)</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={fineMode ? 12 : 11} className="text-center py-10 text-muted-foreground">
                    <div className="space-y-2">
                      <p>No items added yet</p>
                      <Button size="sm" variant="outline" onClick={addRow}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add First Item
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, idx) => (
                  <BillRowComp
                    key={row.key}
                    row={row}
                    idx={idx}
                    fineMode={fineMode}
                    onChange={updateRow}
                    onRemove={removeRow}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payments + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Modes */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-serif">Payment Received</CardTitle>
            <Button size="sm" variant="outline" onClick={addPayment}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Mode
            </Button>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {payments.map(p => (
              <div key={p.key} className="flex gap-2 items-center">
                <Select
                  value={p.mode}
                  onValueChange={v => updatePayment(p.key, "mode", v as PaymentMode)}
                >
                  <SelectTrigger className="h-8 w-[160px] text-sm flex-shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {isMetalPayment(p.mode) ? (
                  <>
                    <Input
                      type="number"
                      step="0.001"
                      value={p.metalGrams || ""}
                      onChange={e => updatePayment(p.key, "metalGrams", parseFloat(e.target.value) || 0)}
                      placeholder="Grams"
                      className="h-8 text-right font-mono text-sm flex-1"
                    />
                    <span className="text-xs text-muted-foreground flex-shrink-0">g</span>
                  </>
                ) : (
                  <Input
                    type="number"
                    step="0.01"
                    value={p.amount || ""}
                    onChange={e => updatePayment(p.key, "amount", parseFloat(e.target.value) || 0)}
                    placeholder="Amount ₹"
                    className="h-8 text-right font-mono text-sm flex-1"
                  />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive flex-shrink-0"
                  onClick={() => removePayment(p.key)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 3-way Balance Summary */}
        <Card className="shadow-sm border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-2 border-b border-primary/20">
            <CardTitle className="text-sm font-serif">Summary & Balance</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {/* Subtotal */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono font-medium">{formatCurrency(totals.subtotal)}</span>
            </div>

            {/* Discount */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Discount (₹)</span>
              <Input
                type="number"
                step="0.01"
                value={discount || ""}
                onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-28 h-7 text-right font-mono text-sm"
              />
            </div>

            {/* Grand Total */}
            <div className="flex justify-between border-t border-primary/30 pt-2">
              <span className="font-serif text-base font-semibold">Grand Total</span>
              <span className="font-serif text-xl font-bold text-primary">
                {formatCurrency(totals.grandTotal)}
              </span>
            </div>

            {/* 3-way balance */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className={`rounded-lg border p-2 text-center ${
                totals.cashBalance > 0.01 ? "border-red-300 bg-red-50" :
                totals.cashBalance < -0.01 ? "border-green-300 bg-green-50" :
                "border-green-300 bg-green-50"
              }`}>
                <div className="text-xs text-muted-foreground mb-0.5">Cash Balance</div>
                <div className={`font-bold font-mono text-sm ${
                  totals.cashBalance > 0.01 ? "text-red-700" : "text-green-700"
                }`}>
                  {totals.cashBalance > 0.01 ? "−" : ""}
                  {formatCurrency(Math.abs(totals.cashBalance))}
                </div>
              </div>

              <div className={`rounded-lg border p-2 text-center ${
                Math.abs(totals.goldBalance) > 0.001 ? "border-amber-300 bg-amber-50" : "border-green-300 bg-green-50"
              }`}>
                <div className="text-xs text-muted-foreground mb-0.5">Gold Bal (g)</div>
                <div className={`font-bold font-mono text-sm ${
                  Math.abs(totals.goldBalance) > 0.001 ? "text-amber-700" : "text-green-700"
                }`}>
                  {totals.goldBalance.toFixed(3)}
                </div>
              </div>

              <div className={`rounded-lg border p-2 text-center ${
                Math.abs(totals.silverBalance) > 0.001 ? "border-blue-300 bg-blue-50" : "border-green-300 bg-green-50"
              }`}>
                <div className="text-xs text-muted-foreground mb-0.5">Silver Bal (g)</div>
                <div className={`font-bold font-mono text-sm ${
                  Math.abs(totals.silverBalance) > 0.001 ? "text-blue-700" : "text-green-700"
                }`}>
                  {totals.silverBalance.toFixed(3)}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Internal notes..."
                className="mt-1 h-8 text-sm"
              />
            </div>

            <Button className="w-full" onClick={onSave} disabled={create.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {create.isPending ? "Saving..." : "Save & Finalize Bill"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
