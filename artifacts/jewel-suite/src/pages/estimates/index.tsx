import { Link } from "wouter";
import { useListEstimates } from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ClipboardList } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

const STATUS_VARIANT: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-emerald-100 text-emerald-800",
  converted: "bg-primary/15 text-primary",
  expired: "bg-destructive/15 text-destructive",
};

export default function EstimatesIndex() {
  const { data, isLoading } = useListEstimates();
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif font-bold">Estimates</h1>
          <p className="text-muted-foreground mt-1">
            Quotations to share with customers before billing
          </p>
        </div>
        <Link href="/estimates/new">
          <Button data-testid="button-new-estimate">
            <Plus className="mr-2 h-4 w-4" /> New Estimate
          </Button>
        </Link>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3 border-b">
          <div className="text-sm text-muted-foreground">
            {data?.length ?? 0} estimate(s) on file
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
                      <span>No estimates yet</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((e) => (
                  <TableRow key={e.id} className="hover:bg-secondary/20">
                    <TableCell className="font-mono">
                      <Link href={`/estimates/${e.id}`} className="text-primary hover:underline">
                        {e.estimateNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{e.customerName}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(e.date)}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_VARIANT[e.status]}>{e.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(e.total)}
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
