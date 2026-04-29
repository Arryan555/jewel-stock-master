import { useRoute, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetEstimate,
  useConvertEstimate,
  useDeleteEstimate,
  getListEstimatesQueryKey,
  getListInvoicesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, FileCheck2, Trash2 } from "lucide-react";
import { formatCurrency, formatDate, formatWeight } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

export default function EstimateDetail() {
  const [, params] = useRoute("/estimates/:id");
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useGetEstimate(params?.id ?? "");
  const convert = useConvertEstimate();
  const del = useDeleteEstimate();

  if (isLoading || !data) {
    return <div className="text-muted-foreground">Loading estimate...</div>;
  }

  async function onConvert() {
    if (!data) return;
    if (data.convertedInvoiceId) {
      setLocation(`/invoices/${data.convertedInvoiceId}`);
      return;
    }
    try {
      const inv = await convert.mutateAsync({ id: data.id });
      await Promise.all([
        qc.invalidateQueries({ queryKey: getListEstimatesQueryKey() }),
        qc.invalidateQueries({ queryKey: getListInvoicesQueryKey() }),
      ]);
      toast({ title: `Converted to invoice ${inv.invoiceNumber}` });
      setLocation(`/invoices/${inv.id}`);
    } catch (err) {
      toast({ title: "Could not convert", description: String((err as Error).message), variant: "destructive" });
    }
  }

  async function onDelete() {
    if (!data) return;
    if (!confirm("Delete this estimate?")) return;
    await del.mutateAsync({ id: data.id });
    await qc.invalidateQueries({ queryKey: getListEstimatesQueryKey() });
    setLocation("/estimates");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold">{data.estimateNumber}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">For {data.customerName} • {formatDate(data.date)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className="capitalize">{data.status}</Badge>
          <Button onClick={onConvert} disabled={convert.isPending || data.status === "converted"}>
            <FileCheck2 className="h-4 w-4 mr-2" />
            {data.status === "converted" ? "View invoice" : "Convert to invoice"}
          </Button>
          <Button variant="outline" className="text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader className="border-b"><CardTitle className="text-base">Items</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Weight</TableHead>
                <TableHead className="text-right">Rate/g</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((it, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="font-medium">{it.productName}</div>
                    <div className="text-xs text-muted-foreground capitalize">{it.metal} • {it.purity}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatWeight(it.weightGrams)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(it.ratePerGram)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(it.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-primary/30 max-w-md ml-auto bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="space-y-2 pt-6">
          <RowI label="Subtotal" value={formatCurrency(data.subtotal)} />
          <RowI label="GST" value={formatCurrency(data.gstAmount)} />
          <RowI label="Discount" value={`- ${formatCurrency(data.discount)}`} />
          <div className="flex justify-between border-t border-primary/30 pt-2">
            <span className="font-serif text-lg">Total</span>
            <span className="font-serif text-2xl font-bold text-primary">{formatCurrency(data.total)}</span>
          </div>
          {data.notes ? <p className="text-xs text-muted-foreground pt-2 border-t">{data.notes}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function RowI({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
