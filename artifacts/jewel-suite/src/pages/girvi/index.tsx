import { useListGirviLoans, ListGirviLoansStatus } from "@workspace/api-client-react";
import { formatCurrency, formatWeight, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Scale, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";

export default function GirviIndex() {
  const [statusFilter, setStatusFilter] = useState<ListGirviLoansStatus>("all");
  
  const { data: loans, isLoading } = useListGirviLoans({ status: statusFilter });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold">Girvi Loans</h1>
          <p className="text-muted-foreground mt-1">Manage gold and silver pawn loans</p>
        </div>
        <Link href="/girvi/new">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> New Loan
          </Button>
        </Link>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
          <div className="w-[180px]">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ListGirviLoansStatus)}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="All Status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Loans</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow>
                <TableHead>Loan #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Collateral</TableHead>
                <TableHead className="text-right">Principal</TableHead>
                <TableHead className="text-right">Interest</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : loans?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                        <Scale className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <p>No girvi loans found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                loans?.map((loan) => (
                  <TableRow key={loan.id} className="hover:bg-secondary/20 transition-colors cursor-pointer">
                    <TableCell className="font-mono text-sm font-medium">
                      <Link href={`/girvi/${loan.id}`} className="hover:text-primary hover:underline">
                        {loan.loanNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/customers/${loan.customerId}`} className="font-medium hover:underline">
                        {loan.customerName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground">{loan.itemDescription}</p>
                      <p className="text-xs text-muted-foreground">{loan.metal} • {loan.purity} • {formatWeight(loan.weightGrams)}</p>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(loan.loanAmount)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{loan.interestRatePct}%/mo</TableCell>
                    <TableCell className={new Date(loan.dueDate) < new Date() && loan.status !== 'closed' ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                      {formatDate(loan.dueDate)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatCurrency(loan.outstanding)}
                      <p className="text-[10px] text-muted-foreground font-normal">incl. {formatCurrency(loan.accruedInterest)} int.</p>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={
                        loan.status === 'closed' ? 'secondary' : 
                        loan.status === 'overdue' ? 'destructive' : 
                        'default'
                      } className={loan.status === 'active' ? 'bg-primary text-primary-foreground' : ''}>
                        {loan.status}
                      </Badge>
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
