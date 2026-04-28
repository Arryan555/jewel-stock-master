import { useGetStockReport } from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, Coins, Scale } from "lucide-react";
import { formatCurrency, formatWeight } from "@/lib/format";

export default function StockReport() {
  const { data, isLoading } = useGetStockReport();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
          <Package className="h-7 w-7 text-primary" />
          Stock Report
        </h1>
        <p className="text-muted-foreground mt-1">
          Inventory valuation by metal and category
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Kpi
          icon={Package}
          label="Total Items"
          value={data ? String(data.totalItems) : "—"}
          loading={isLoading}
        />
        <Kpi
          icon={Scale}
          label="Total Weight"
          value={data ? formatWeight(data.totalWeight) : "—"}
          loading={isLoading}
        />
        <Kpi
          icon={Coins}
          label="Total Valuation"
          value={data ? formatCurrency(data.totalValue) : "—"}
          loading={isLoading}
          accent
        />
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Stock By Group</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow>
                <TableHead>Metal</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-right">Weight</TableHead>
                <TableHead className="text-right">Valuation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (data?.groups ?? []).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No stock data
                  </TableCell>
                </TableRow>
              ) : (
                data!.groups.map((g, idx) => (
                  <TableRow key={idx} data-testid={`row-group-${idx}`}>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          g.metal === "gold"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : g.metal === "silver"
                            ? "border-slate-200 bg-slate-50 text-slate-700"
                            : ""
                        }
                      >
                        {g.metal}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{g.category}</TableCell>
                    <TableCell className="text-center">{g.items}</TableCell>
                    <TableCell className="text-right">
                      {formatWeight(g.totalWeight)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatCurrency(g.totalValue)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  loading,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  loading: boolean;
  accent?: boolean;
}) {
  return (
    <Card
      className={`border-border/50 shadow-sm ${
        accent ? "bg-primary/5 border-primary/30" : ""
      }`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p
            className={`font-serif text-2xl font-bold ${
              accent ? "text-primary" : ""
            }`}
          >
            {value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
