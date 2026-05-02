import { useState } from "react";
import { Link } from "wouter";
import {
  useListPurchases,
  useDeletePurchase,
  getListPurchasesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Trash2, ShoppingCart } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  partial: "bg-amber-100 text-amber-800 border-amber-200",
  unpaid: "bg-red-100 text-red-800 border-red-200",
};

export default function PurchasesIndex() {
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useListPurchases({});
  const del = useDeletePurchase();

  const rows = (data ?? []).filter(
    (r) =>
      !search ||
      r.vendorName.toLowerCase().includes(search.toLowerCase()) ||
      r.voucherNumber.toLowerCase().includes(search.toLowerCase()),
  );

  async function onDelete(id: string, num: string) {
    if (!confirm(`Delete voucher ${num}? This cannot be undone.`)) return;
    await del.mutateAsync({ id });
    await qc.invalidateQueries({ queryKey: getListPurchasesQueryKey() });
    toast({ title: `Voucher ${num} deleted` });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-500/15 border border-violet-300/50 flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold">Purchase Vouchers</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Record gold, silver and diamond purchases from vendors</p>
          </div>
        </div>
        <Link href="/purchases/new">
          <Button data-testid="button-new-purchase">
            <Plus className="h-4 w-4 mr-2" /> New Purchase
          </Button>
        </Link>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search vendor or voucher no..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow>
                  <TableHead>Voucher No.</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-28 text-center text-muted-foreground">
                      {search ? "No vouchers match your search" : "No purchase vouchers yet — create your first one"}
                    </TableCell>
                  </TableRow>
                ) : rows.map((r) => (
                  <TableRow key={r.id} className="group">
                    <TableCell>
                      <Link href={`/purchases/${r.id}`} className="font-mono font-semibold text-violet-700 hover:underline">
                        {r.voucherNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{r.vendorName}</p>
                      {r.vendorPhone ? <p className="text-xs text-muted-foreground">{r.vendorPhone}</p> : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(r.date)}</TableCell>
                    <TableCell>
                      <span className="capitalize text-xs font-medium bg-secondary/60 rounded-full px-2 py-0.5">
                        {r.paymentMode.replace("_", " ")}
                      </span>
                      {r.goldPayWeight > 0 ? (
                        <span className="ml-1 text-xs text-amber-700 bg-amber-50 rounded-full px-2 py-0.5 border border-amber-200">
                          +{r.goldPayWeight.toFixed(3)}g Au
                        </span>
                      ) : null}
                      {r.silverPayWeight > 0 ? (
                        <span className="ml-1 text-xs text-slate-600 bg-slate-50 rounded-full px-2 py-0.5 border border-slate-200">
                          +{r.silverPayWeight.toFixed(3)}g Ag
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(r.total)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(r.paidAmount)}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">{r.balance > 0 ? formatCurrency(r.balance) : "—"}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs capitalize ${STATUS_STYLES[r.status] ?? ""}`}>{r.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 text-destructive"
                        onClick={() => onDelete(r.id, r.voucherNumber)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
