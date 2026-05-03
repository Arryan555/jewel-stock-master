import { useMemo, useState, useCallback, useRef, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Printer,
  Save,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const BILL_TYPES = [
  { code: "JB", label: "Retail Sale",   prefix: "JB-", path: "/billing/retail/new" },
  { code: "WS", label: "Wholesale",     prefix: "WS-", path: "/billing/wholesale/new" },
  { code: "GD", label: "Gold Bill",     prefix: "GD-", path: "/billing/gold/new" },
  { code: "DM", label: "Diamond Bill",  prefix: "DM-", path: "/billing/diamond/new" },
  { code: "EX", label: "Exchange",      prefix: "EX-", path: "/billing/exchange/new" },
  { code: "RP", label: "Repair Bill",   prefix: "RP-", path: "/billing/repair/new" },
] as const;

const ITEM_SUGGESTIONS = [
  "Ring", "Bangle", "Necklace", "Chain", "Earring", "Pendant",
  "Bracelet", "Mangalsutra", "Anklet", "Nosering", "Tikka", "Haar",
  "Jhumka", "Kangan", "Payal", "Nath", "Mang Tikka", "Bajuband",
  "Kada", "Finger Ring", "Nose Ring", "Toe Ring", "Waist Belt",
  "Coins", "Bar", "Thali", "Tops", "Jhalar", "Hath Phool",
];

const MAKING_TYPES = ["/P", "/G", "/%"] as const;
type MakingType = (typeof MAKING_TYPES)[number];

const PAYMENT_MODES = [
  "Cash", "UPI", "NEFT/RTGS", "Card", "Cheque", "Credit",
  "Gold Payment", "Silver Payment",
] as const;
type PaymentMode = (typeof PAYMENT_MODES)[number];

// ─── Types ───────────────────────────────────────────────────────────────────

interface BillRow {
  key: string;
  tagNo: string;
  itemName: string;
  metal: "Gold" | "Silver";
  purity: string;      // manual text: "22K", "91.67", "999" etc.
  grossGrams: number;
  lessGrams: number;
  tunch: number;       // fineness %, e.g. 91.67
  waste: number;       // wastage %, e.g. 2.0
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rk() { return Math.random().toString(36).slice(2, 8); }

function netGrams(row: BillRow): number {
  return Math.max(0, row.grossGrams - row.lessGrams);
}

function fineGrams(row: BillRow): number {
  const net = netGrams(row);
  const eff = Math.max(0, row.tunch - row.waste);
  return net * eff / 100;
}

function makingAmt(row: BillRow): number {
  const net = netGrams(row);
  const fine = fineGrams(row);
  const metalVal = fine * row.ratePerGram;
  if (row.makingType === "/P") return row.makingValue;
  if (row.makingType === "/G") return row.makingValue * net;
  return row.makingValue / 100 * metalVal;
}

function rowAmount(row: BillRow): number {
  return fineGrams(row) * row.ratePerGram + makingAmt(row);
}

function g(n: number, dec = 3): string {
  return n.toFixed(dec);
}

function newRow(metal: "Gold" | "Silver" = "Gold"): BillRow {
  return {
    key: rk(), tagNo: "", itemName: "", metal,
    purity: metal === "Gold" ? "22K" : "999",
    grossGrams: 0, lessGrams: 0,
    tunch: metal === "Gold" ? 91.67 : 99.9,
    waste: 0, makingValue: 0, makingType: "/G", ratePerGram: 0,
  };
}

// ─── ItemNameInput (combobox with search + down arrow) ───────────────────────

function ItemNameInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setSearch(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = ITEM_SUGGESTIONS.filter(s =>
    !search.trim() || s.toLowerCase().startsWith(search.toLowerCase())
  );
  const all = search.trim() ? filtered : ITEM_SUGGESTIONS;

  return (
    <div ref={ref} className="relative">
      <div className="flex">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}
          placeholder="Item name"
          className="h-7 text-xs flex-1 w-full min-w-0 border rounded-l-md px-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary/60"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen(v => !v)}
          className="h-7 w-6 border border-l-0 rounded-r-md bg-background hover:bg-secondary/80 flex items-center justify-center shrink-0"
        >
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
      {open && all.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-0.5 w-44 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
          {all.map(s => (
            <button
              key={s}
              type="button"
              className="w-full text-left px-2 py-1 text-xs hover:bg-secondary"
              onMouseDown={e => { e.preventDefault(); setSearch(s); onChange(s); setOpen(false); }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── BillRowComp ──────────────────────────────────────────────────────────────

const TD = "px-1 py-[3px] align-middle";
const INP = "h-7 text-[11px] font-mono text-right px-1 w-full";
const RO  = "text-[11px] font-mono text-right tabular-nums block pr-0.5";

function BillRowComp({
  row, idx, total, onChange, onRemove, onMoveUp, onMoveDown, isExchange,
}: {
  row: BillRow;
  idx: number;
  total: number;
  onChange: (key: string, field: string, value: unknown) => void;
  onRemove: (key: string) => void;
  onMoveUp: (key: string) => void;
  onMoveDown: (key: string) => void;
  isExchange?: boolean;
}) {
  const net    = netGrams(row);
  const fine   = fineGrams(row);
  const making = makingAmt(row);
  const amount = rowAmount(row);

  const set = (field: string, value: unknown) => onChange(row.key, field, value);
  const num = (e: React.ChangeEvent<HTMLInputElement>) => parseFloat(e.target.value) || 0;

  return (
    <tr className={cn("border-b hover:bg-secondary/10 group", isExchange && "bg-sky-50/40 hover:bg-sky-50/60")}>
      {/* # + reorder */}
      <td className={cn(TD, "w-9 text-center")}>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-muted-foreground font-mono leading-none mb-0.5">{idx + 1}</span>
          <button
            type="button"
            disabled={idx === 0}
            onClick={() => onMoveUp(row.key)}
            className="text-muted-foreground hover:text-foreground disabled:opacity-20 leading-none"
          >
            <ChevronUp className="h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            disabled={idx === total - 1}
            onClick={() => onMoveDown(row.key)}
            className="text-muted-foreground hover:text-foreground disabled:opacity-20 leading-none"
          >
            <ChevronDown className="h-2.5 w-2.5" />
          </button>
        </div>
      </td>

      {/* Tag No */}
      <td className={cn(TD, "w-[60px]")}>
        <Input
          value={row.tagNo}
          onChange={e => set("tagNo", e.target.value)}
          placeholder="Tag#"
          className="h-7 text-[11px] px-1 w-full text-center"
        />
      </td>

      {/* Item Name */}
      <td className={cn(TD, "w-[148px]")}>
        <ItemNameInput value={row.itemName} onChange={v => set("itemName", v)} />
      </td>

      {/* Metal */}
      <td className={cn(TD, "w-[68px]")}>
        <Select value={row.metal} onValueChange={v => set("metal", v as "Gold" | "Silver")}>
          <SelectTrigger className="h-7 text-[11px] px-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Gold">Gold</SelectItem>
            <SelectItem value="Silver">Silver</SelectItem>
          </SelectContent>
        </Select>
      </td>

      {/* Purity (manual text) */}
      <td className={cn(TD, "w-[56px]")}>
        <Input
          value={row.purity}
          onChange={e => set("purity", e.target.value)}
          placeholder="22K"
          className="h-7 text-[11px] px-1 w-full text-center"
        />
      </td>

      {/* Gross (max 7 sig digits = toFixed(3) up to 9999g) */}
      <td className={cn(TD, "w-[76px]")}>
        <Input
          type="number" step="0.001"
          value={row.grossGrams || ""}
          onChange={e => set("grossGrams", num(e))}
          className={INP} placeholder="0.000"
        />
      </td>

      {/* Less */}
      <td className={cn(TD, "w-[70px]")}>
        <Input
          type="number" step="0.001"
          value={row.lessGrams || ""}
          onChange={e => set("lessGrams", num(e))}
          className={INP} placeholder="0.000"
        />
      </td>

      {/* Net (read-only) */}
      <td className={cn(TD, "w-[64px]")}>
        <span className={cn(RO, "text-muted-foreground")}>{g(net)}</span>
      </td>

      {/* Tunch% */}
      <td className={cn(TD, "w-[64px]")}>
        <Input
          type="number" step="0.01"
          value={row.tunch || ""}
          onChange={e => set("tunch", num(e))}
          className={INP} placeholder="91.67"
        />
      </td>

      {/* Waste% */}
      <td className={cn(TD, "w-[60px]")}>
        <Input
          type="number" step="0.01"
          value={row.waste || ""}
          onChange={e => set("waste", num(e))}
          className={INP} placeholder="0.00"
        />
      </td>

      {/* Making: value + type */}
      <td className={cn(TD, "w-[118px]")}>
        <div className="flex gap-0.5">
          <Input
            type="number" step="0.01"
            value={row.makingValue || ""}
            onChange={e => set("makingValue", num(e))}
            className={cn(INP, "flex-1 min-w-0")} placeholder="0"
          />
          <Select value={row.makingType} onValueChange={v => set("makingType", v as MakingType)}>
            <SelectTrigger className="h-7 w-[40px] text-[10px] px-0.5 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="/P">/Pc</SelectItem>
              <SelectItem value="/G">/G</SelectItem>
              <SelectItem value="/%">/%</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </td>

      {/* Fine Wt (read-only) — Fine Wt = Net × (Tunch − Waste) / 100 */}
      <td className={cn(TD, "w-[72px]")}>
        <span className={cn(RO, "text-amber-700 font-semibold")}>{g(fine, 4)}</span>
      </td>

      {/* Rate/g */}
      <td className={cn(TD, "w-[76px]")}>
        <Input
          type="number" step="0.01"
          value={row.ratePerGram || ""}
          onChange={e => set("ratePerGram", num(e))}
          className={INP} placeholder="0"
        />
      </td>

      {/* Amount */}
      <td className={cn(TD, "w-[90px] text-right")}>
        <div className="text-[11px] font-semibold font-mono tabular-nums">
          ₹{g(amount, 2)}
        </div>
        {making > 0 && (
          <div className="text-[9px] text-muted-foreground leading-none">
            Labour: ₹{g(making, 2)}
          </div>
        )}
      </td>

      {/* Delete */}
      <td className={cn(TD, "w-7")}>
        <button
          type="button"
          onClick={() => onRemove(row.key)}
          className="text-destructive/60 hover:text-destructive p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ─── TotalsFooterRow ──────────────────────────────────────────────────────────

function TotalsFooterRow({ rows }: { rows: BillRow[] }) {
  if (rows.length === 0) return null;

  const au  = rows.filter(r => r.metal === "Gold");
  const ag  = rows.filter(r => r.metal === "Silver");
  const sum = (rs: BillRow[], fn: (r: BillRow) => number) => rs.reduce((s, r) => s + fn(r), 0);

  const grossAu = sum(au, r => r.grossGrams);
  const lessAu  = sum(au, r => r.lessGrams);
  const netAu   = sum(au, netGrams);
  const fineAu  = sum(au, fineGrams);
  const grossAg = sum(ag, r => r.grossGrams);
  const lessAg  = sum(ag, r => r.lessGrams);
  const netAg   = sum(ag, netGrams);
  const fineAg  = sum(ag, fineGrams);
  const labour  = sum(rows, makingAmt);
  const total   = sum(rows, rowAmount);

  const MetalPair = ({ au: a, ag: b, dec = 3 }: { au: number; ag: number; dec?: number }) => (
    <div className="text-right leading-[1.1]">
      {a > 0 && <div className="text-[10px] font-mono text-amber-700">{g(a, dec)}</div>}
      {b > 0 && <div className="text-[10px] font-mono text-sky-700">{g(b, dec)}</div>}
      {a === 0 && b === 0 && <div className="text-[10px] font-mono text-muted-foreground">—</div>}
    </div>
  );

  return (
    <tr className="border-t-2 border-primary/30 bg-secondary/40">
      <td colSpan={2} className="px-1 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground text-center">
        TOTAL
      </td>
      <td className="px-1 py-1">
        <div className="text-[9px] leading-tight">
          <span className="text-amber-700 font-semibold">■ Gold</span>
          {(grossAg > 0 || lessAg > 0) && <> / <span className="text-sky-700 font-semibold">■ Silv</span></>}
        </div>
      </td>
      <td colSpan={2} />
      {/* Gross */}
      <td className="px-1 py-1"><MetalPair au={grossAu} ag={grossAg} /></td>
      {/* Less */}
      <td className="px-1 py-1"><MetalPair au={lessAu} ag={lessAg} /></td>
      {/* Net */}
      <td className="px-1 py-1"><MetalPair au={netAu} ag={netAg} /></td>
      {/* Tunch, Waste */}
      <td colSpan={2} />
      {/* Making / Labour */}
      <td className="px-1 py-1 text-right">
        <div className="text-[9px] text-muted-foreground leading-none">Labour</div>
        <div className="text-[11px] font-mono font-semibold">₹{g(labour, 2)}</div>
      </td>
      {/* Fine Wt */}
      <td className="px-1 py-1"><MetalPair au={fineAu} ag={fineAg} dec={4} /></td>
      {/* Rate */}
      <td />
      {/* Total Amount */}
      <td className="px-1 py-1 text-right">
        <div className="text-[11px] font-bold font-mono text-primary">₹{g(total, 2)}</div>
      </td>
      <td />
    </tr>
  );
}

// ─── ItemsTable ───────────────────────────────────────────────────────────────

const TH = "text-[9px] font-bold uppercase tracking-wide text-muted-foreground px-1 py-1.5 whitespace-nowrap";

function ItemsTable({
  rows,
  setRows,
  title,
  isExchange,
}: {
  rows: BillRow[];
  setRows: React.Dispatch<React.SetStateAction<BillRow[]>>;
  title: string;
  isExchange?: boolean;
}) {
  const addRow = useCallback(() => {
    setRows(prev => [...prev, newRow("Gold")]);
  }, [setRows]);

  const updateRow = useCallback((key: string, field: string, value: unknown) => {
    setRows(prev => prev.map(r => r.key === key ? { ...r, [field]: value } : r));
  }, [setRows]);

  const removeRow = useCallback((key: string) => {
    setRows(prev => prev.filter(r => r.key !== key));
  }, [setRows]);

  const moveRow = useCallback((key: string, dir: -1 | 1) => {
    setRows(prev => {
      const idx = prev.findIndex(r => r.key === key);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, [setRows]);

  return (
    <Card className={cn("shadow-sm", isExchange && "border-sky-200")}>
      <CardHeader className={cn(
        "pb-2 border-b flex flex-row items-center justify-between py-2",
        isExchange && "bg-sky-50/50"
      )}>
        <div className="flex items-center gap-2">
          {isExchange && <RefreshCw className="h-3.5 w-3.5 text-sky-600" />}
          <CardTitle className={cn("text-sm font-serif", isExchange && "text-sky-700")}>
            {title}
          </CardTitle>
          {isExchange && (
            <span className="text-[10px] text-sky-600 bg-sky-100 px-1.5 py-0.5 rounded">
              Old metal / return
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant={isExchange ? "outline" : "outline"}
          onClick={addRow}
          className="h-7 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" /> Add Row
        </Button>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 1020 }}>
          <thead>
            <tr className={cn("border-b", isExchange ? "bg-sky-50/70" : "bg-secondary/40")}>
              <th className={cn(TH, "w-9 text-center")}>#</th>
              <th className={cn(TH, "w-[60px] text-center")}>Tag No</th>
              <th className={cn(TH, "w-[148px] text-left pl-1")}>Item Name ▾</th>
              <th className={cn(TH, "w-[68px] text-center")}>Metal</th>
              <th className={cn(TH, "w-[56px] text-center")}>Purity</th>
              <th className={cn(TH, "w-[76px] text-right")}>Gross (g)</th>
              <th className={cn(TH, "w-[70px] text-right")}>Less (g)</th>
              <th className={cn(TH, "w-[64px] text-right")}>Net (g)</th>
              <th className={cn(TH, "w-[64px] text-right")}>Tunch%</th>
              <th className={cn(TH, "w-[60px] text-right")}>Waste%</th>
              <th className={cn(TH, "w-[118px] text-center")}>Making</th>
              <th className={cn(TH, "w-[72px] text-right text-amber-700")}>Fine Wt</th>
              <th className={cn(TH, "w-[76px] text-right")}>Rate/g (₹)</th>
              <th className={cn(TH, "w-[90px] text-right")}>Amount (₹)</th>
              <th className="w-7" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={15} className="text-center py-8 text-muted-foreground text-sm">
                  <div className="space-y-2">
                    <p className="text-sm">
                      {isExchange ? "No exchange items — add old metal brought by customer" : "No items added yet"}
                    </p>
                    <Button size="sm" variant="outline" onClick={addRow}>
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      {isExchange ? "Add Exchange Item" : "Add First Item"}
                    </Button>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <BillRowComp
                  key={row.key}
                  row={row} idx={idx} total={rows.length}
                  onChange={updateRow} onRemove={removeRow}
                  onMoveUp={k => moveRow(k, -1)}
                  onMoveDown={k => moveRow(k, 1)}
                  isExchange={isExchange}
                />
              ))
            )}
          </tbody>
          <tfoot>
            <TotalsFooterRow rows={rows} />
          </tfoot>
        </table>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function JewelBill() {
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const currentType = BILL_TYPES.find(t => t.path === location) ?? BILL_TYPES[0];
  const [billType, setBillType] = useState(currentType);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState(0);

  // Sale rows (JB / WS)
  const [rows, setRows] = useState<BillRow[]>([]);
  // Exchange / old metal return rows (JB / WS)
  const [exchangeRows, setExchangeRows] = useState<BillRow[]>([]);

  // Payments
  const [payments, setPayments] = useState<PaymentRow[]>([
    { key: rk(), mode: "Cash", amount: 0, metalGrams: 0 },
  ]);

  const { data: customers } = useListCustomers({ type: "all" });
  const create = useCreateInvoice();

  const isJewelBill = billType.code === "JB" || billType.code === "WS";

  // ─── Totals ───────────────────────────────────────────────────────────────

  const totals = useMemo(() => {
    const saleTotal = rows.reduce((s, r) => s + rowAmount(r), 0);
    const exchTotal = exchangeRows.reduce((s, r) => s + rowAmount(r), 0);
    const netPayable = Math.max(0, saleTotal - exchTotal - discount);

    // Fine weight breakdown by metal for balance tracking
    const goldFine   = rows.filter(r => r.metal === "Gold").reduce((s, r) => s + fineGrams(r), 0);
    const silverFine = rows.filter(r => r.metal === "Silver").reduce((s, r) => s + fineGrams(r), 0);
    const goldExch   = exchangeRows.filter(r => r.metal === "Gold").reduce((s, r) => s + fineGrams(r), 0);
    const silverExch = exchangeRows.filter(r => r.metal === "Silver").reduce((s, r) => s + fineGrams(r), 0);

    const cashPaid   = payments.filter(p => !["Gold Payment", "Silver Payment"].includes(p.mode)).reduce((s, p) => s + p.amount, 0);
    const goldPaid   = payments.filter(p => p.mode === "Gold Payment").reduce((s, p) => s + p.metalGrams, 0);
    const silverPaid = payments.filter(p => p.mode === "Silver Payment").reduce((s, p) => s + p.metalGrams, 0);

    return {
      saleTotal, exchTotal, netPayable, cashPaid,
      goldBalance:   goldFine   - goldExch   - goldPaid,
      silverBalance: silverFine - silverExch - silverPaid,
      cashBalance:   netPayable - cashPaid,
    };
  }, [rows, exchangeRows, discount, payments]);

  // ─── Payment handlers ─────────────────────────────────────────────────────

  const addPayment = () => setPayments(prev => [...prev, { key: rk(), mode: "Cash", amount: 0, metalGrams: 0 }]);
  const updatePayment = (key: string, field: string, value: unknown) =>
    setPayments(prev => prev.map(p => p.key === key ? { ...p, [field]: value } : p));
  const removePayment = (key: string) =>
    setPayments(prev => prev.filter(p => p.key !== key));

  // ─── Submit ───────────────────────────────────────────────────────────────

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
        data: {
          customerId,
          type: billType.code.toLowerCase() as "retail" | "wholesale",
          date,
          discount,
          paidAmount: totals.cashPaid,
          notes,
          items: rows.map(row => ({
            tagNo: row.tagNo,
            description: [row.tagNo, row.itemName, row.purity].filter(Boolean).join(" | "),
            metal: row.metal.toLowerCase(),
            purity: row.purity,
            tunch: row.tunch,
            grossWeight: row.grossGrams,
            lessWeight: row.lessGrams,
            weightGrams: netGrams(row),
            fineWeight: fineGrams(row),
            wastagePercent: row.waste,
            ratePerGram: row.ratePerGram,
            makingType: row.makingType,
            makingValue: row.makingValue,
            makingChargePercent: row.makingType === "/%" ? row.makingValue : 0,
            stoneCharges: 0,
            gstRate: 0,
          })),
        },
      });

      qc.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      toast({ title: `${billType.label} saved — ${billType.prefix}${res.id?.slice(0, 6) ?? "****"}` });
      setLocation(`/invoices/${res.id}`);
    } catch {
      toast({ title: "Error saving bill", variant: "destructive" });
    }
  };

  const isMetalPayment = (mode: PaymentMode) =>
    mode === "Gold Payment" || mode === "Silver Payment";

  // ─── Render ───────────────────────────────────────────────────────────────

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
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">{billType.label}</Badge>
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
          <Button size="sm" onClick={onSave} disabled={create.isPending || !isJewelBill}>
            <Save className="h-4 w-4 mr-2" />
            {create.isPending ? "Saving…" : "Save Bill"}
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

      {/* Customer + Date */}
      <Card className="shadow-sm">
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

      {isJewelBill ? (
        <>
          {/* ── Sale Items Table ── */}
          <ItemsTable rows={rows} setRows={setRows} title="Sale Items" />

          {/* ── Totals summary strip ── */}
          {rows.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-1">
              {[
                { label: "Sale Total", value: `₹${g(totals.saleTotal, 2)}`, accent: "text-primary" },
                { label: "Exchange Value", value: `− ₹${g(totals.exchTotal, 2)}`, accent: "text-sky-700" },
                { label: "Discount", value: `− ₹${g(discount, 2)}`, accent: "text-muted-foreground" },
                { label: "Net Payable", value: `₹${g(totals.netPayable, 2)}`, accent: "text-emerald-700 text-base font-bold" },
              ].map(({ label, value, accent }) => (
                <div key={label} className="bg-secondary/30 rounded-lg px-3 py-2 border">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
                  <div className={cn("font-mono font-semibold mt-0.5", accent)}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Exchange / Old Metal Return Table ── */}
          <ItemsTable
            rows={exchangeRows}
            setRows={setExchangeRows}
            title="Exchange / Old Metal Return"
            isExchange
          />

          {/* ── Payments + Summary ── */}
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
                          type="number" step="0.001"
                          value={p.metalGrams || ""}
                          onChange={e => updatePayment(p.key, "metalGrams", parseFloat(e.target.value) || 0)}
                          placeholder="Grams" className="h-8 text-right font-mono text-sm flex-1"
                        />
                        <span className="text-xs text-muted-foreground flex-shrink-0">g</span>
                      </>
                    ) : (
                      <Input
                        type="number" step="0.01"
                        value={p.amount || ""}
                        onChange={e => updatePayment(p.key, "amount", parseFloat(e.target.value) || 0)}
                        placeholder="Amount ₹" className="h-8 text-right font-mono text-sm flex-1"
                      />
                    )}
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-destructive flex-shrink-0"
                      onClick={() => removePayment(p.key)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Summary & Balance */}
            <Card className="shadow-sm border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="pb-2 border-b border-primary/20">
                <CardTitle className="text-sm font-serif">Summary & Balance</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sale Total</span>
                    <span className="font-mono">{formatCurrency(totals.saleTotal)}</span>
                  </div>
                  {totals.exchTotal > 0 && (
                    <div className="flex justify-between text-sky-700">
                      <span>Exchange Value</span>
                      <span className="font-mono">− {formatCurrency(totals.exchTotal)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Discount (₹)</span>
                    <Input
                      type="number" step="0.01"
                      value={discount || ""}
                      onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                      className="w-28 h-7 text-right font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-between border-t border-primary/30 pt-2">
                  <span className="font-serif text-base font-semibold">Net Payable</span>
                  <span className="font-serif text-xl font-bold text-primary">
                    {formatCurrency(totals.netPayable)}
                  </span>
                </div>

                {/* 3-way balance */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: "Cash Bal",
                      val: totals.cashBalance,
                      fmt: (v: number) => formatCurrency(Math.abs(v)),
                      warn: (v: number) => v > 0.01,
                      colors: { warn: "border-red-300 bg-red-50 text-red-700", ok: "border-green-300 bg-green-50 text-green-700" },
                    },
                    {
                      label: "Gold Bal(g)",
                      val: totals.goldBalance,
                      fmt: (v: number) => v.toFixed(3),
                      warn: (v: number) => Math.abs(v) > 0.001,
                      colors: { warn: "border-amber-300 bg-amber-50 text-amber-700", ok: "border-green-300 bg-green-50 text-green-700" },
                    },
                    {
                      label: "Silver Bal(g)",
                      val: totals.silverBalance,
                      fmt: (v: number) => v.toFixed(3),
                      warn: (v: number) => Math.abs(v) > 0.001,
                      colors: { warn: "border-sky-300 bg-sky-50 text-sky-700", ok: "border-green-300 bg-green-50 text-green-700" },
                    },
                  ].map(({ label, val, fmt, warn, colors }) => (
                    <div
                      key={label}
                      className={`rounded-lg border p-2 text-center ${warn(val) ? colors.warn : colors.ok}`}
                    >
                      <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>
                      <div className="font-bold font-mono text-xs">{fmt(val)}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <Input
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Internal notes…"
                    className="mt-1 h-8 text-sm"
                  />
                </div>

                <Button className="w-full" onClick={onSave} disabled={create.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {create.isPending ? "Saving…" : "Save & Finalize Bill"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        /* Placeholder for GD / DM / EX / RP */
        <Card className="shadow-sm">
          <CardContent className="py-16 text-center text-muted-foreground space-y-2">
            <div className="text-3xl">🔨</div>
            <p className="font-medium">{billType.label} form coming soon</p>
            <p className="text-xs">This voucher type uses a specialised entry form.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
