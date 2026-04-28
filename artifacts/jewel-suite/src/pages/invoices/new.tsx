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
import { Plus, Trash2, Receipt, FileSpreadsheet } from "lucide-react";
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

function rowKey() {
  return Math.random().toString(36).slice(2, 9);
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
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

  const { data: customers, isLoading: loadingC } = useListCustomers({
    type: "all",
  });
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
    const total = Math.max(0, subtotal + gst - (parseFloat(discount) || 0));
    return { subtotal, gst, total };
  }, [rows, discount]);

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        rowKey: rowKey(),
        productId: "",
        weightGrams: 0,
        ratePerGram: 0,
        makingChargePercent: 0,
        stoneCharges: 0,
        gstRate: 3,
      },
    ]);
  }

  function updateRow<K extends keyof Row>(idx: number, key: K, val: Row[K]) {
    setRows((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [key]: val };
      return copy;
    });
  }

  function pickProduct(idx: number, productId: string) {
    const p = (products ?? []).find((x) => x.id === productId);
    if (!p) return;
    setRows((prev) => {
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        productId,
        weightGrams: p.weightGrams,
        ratePerGram: p.ratePerGram,
        makingChargePercent: p.makingChargePercent,
        stoneCharges: p.stoneCharges,
        gstRate: p.gstRate,
      };
      return copy;
    });
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit() {
    if (!customerId) {
      toast({ title: "Pick a customer", variant: "destructive" });
      return;
    }
    if (rows.length === 0 || rows.some((r) => !r.productId)) {
      toast({
        title: "Add at least one item with a selected product",
        variant: "destructive",
      });
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
          notes: notes || undefined,
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
        <div
          className={`h-10 w-10 rounded-xl bg-${accent}/15 border border-${accent}/30 flex items-center justify-center`}
        >
          {type === "retail" ? (
            <Receipt className={`h-5 w-5 text-${accent}`} />
          ) : (
            <FileSpreadsheet className={`h-5 w-5 text-${accent}`} />
          )}
        </div>
        <div>
          <h1 className="font-serif text-3xl font-bold capitalize">
            New {type} Invoice
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {type === "retail"
              ? "Standard counter sale with GST split"
              : "Wholesale dispatch with bulk pricing"}
          </p>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Customer & Date</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Customer
            </Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger data-testid="select-invoice-customer">
                <SelectValue
                  placeholder={
                    loadingC ? "Loading..." : "Select a customer"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {(customers ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} — {c.phone}{" "}
                    <span className="ml-2 text-xs text-muted-foreground capitalize">
                      ({c.type})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Invoice Date
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              data-testid="input-invoice-date"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b flex flex-row items-center justify-between">
          <CardTitle className="text-base">Line Items</CardTitle>
          <Button size="sm" onClick={addRow} data-testid="button-add-row">
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
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-28 text-center text-muted-foreground"
                  >
                    Click "Add item" to start the invoice
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r, idx) => {
                  const c = computeRowAmount(r);
                  return (
                    <TableRow key={r.rowKey}>
                      <TableCell>
                        <Select
                          value={r.productId}
                          onValueChange={(v) => pickProduct(idx, v)}
                        >
                          <SelectTrigger
                            data-testid={`select-product-${idx}`}
                          >
                            <SelectValue
                              placeholder={
                                loadingP ? "Loading..." : "Pick a product"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {(products ?? []).map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                <span className="font-mono text-xs text-muted-foreground mr-2">
                                  {p.sku}
                                </span>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.001"
                          className="text-right h-9"
                          value={r.weightGrams}
                          onChange={(e) =>
                            updateRow(
                              idx,
                              "weightGrams",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          data-testid={`input-weight-${idx}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          className="text-right h-9"
                          value={r.ratePerGram}
                          onChange={(e) =>
                            updateRow(
                              idx,
                              "ratePerGram",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          data-testid={`input-rate-${idx}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          className="text-right h-9"
                          value={r.makingChargePercent}
                          onChange={(e) =>
                            updateRow(
                              idx,
                              "makingChargePercent",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          data-testid={`input-making-${idx}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          className="text-right h-9"
                          value={r.stoneCharges}
                          onChange={(e) =>
                            updateRow(
                              idx,
                              "stoneCharges",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          data-testid={`input-stones-${idx}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          className="text-right h-9"
                          value={r.gstRate}
                          onChange={(e) =>
                            updateRow(
                              idx,
                              "gstRate",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          data-testid={`input-gst-${idx}`}
                        />
                      </TableCell>
                      <TableCell
                        className="text-right font-semibold"
                        data-testid={`text-row-amount-${idx}`}
                      >
                        {formatCurrency(c.amount)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(idx)}
                          className="text-destructive"
                          data-testid={`button-remove-row-${idx}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border/50 shadow-sm lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes for this invoice..."
              data-testid="input-notes"
            />
          </CardContent>
        </Card>

        <Card className="border-primary/30 shadow-md bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="border-b border-primary/20">
            <CardTitle className="text-base font-serif">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            <Row label="Subtotal" value={formatCurrency(totals.subtotal)} />
            <Row label="GST (CGST + SGST)" value={formatCurrency(totals.gst)} />
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">Discount (₹)</Label>
              <Input
                type="number"
                step="0.01"
                className="w-32 h-9 text-right"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                data-testid="input-discount"
              />
            </div>
            <div className="flex items-center justify-between border-t border-primary/30 pt-3">
              <span className="font-serif text-lg">Total</span>
              <span
                className="font-serif text-2xl font-bold text-primary"
                data-testid="text-total"
              >
                {formatCurrency(totals.total)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">Paid (₹)</Label>
              <Input
                type="number"
                step="0.01"
                className="w-32 h-9 text-right"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                data-testid="input-paid"
              />
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={onSubmit}
              disabled={create.isPending}
              data-testid="button-save-invoice"
            >
              {create.isPending ? "Saving..." : "Save & view invoice"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
