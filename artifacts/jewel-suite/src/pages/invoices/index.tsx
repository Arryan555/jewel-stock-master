import { useListInvoices, ListInvoicesType } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, FileText, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";

export default function InvoicesIndex() {
  const [typeFilter, setTypeFilter] = useState<ListInvoicesType>("all");
  const [customerSearch, setCustomerSearch] = useState("");
  
  const { data: invoices, isLoading } = useListInvoices({ 
    type: typeFilter,
    // Add debounced search logic later if needed
  });

  const filteredInvoices = invoices?.filter(inv => 
    !customerSearch || inv.customerName.toLowerCase().includes(customerSearch.toLowerCase()) || inv.invoiceNumber.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold">Invoices</h1>
          <p className="text-muted-foreground mt-1">Retail and wholesale billing</p>
        </div>
        <div className="flex gap-2">
          <Link href="/billing/wholesale/new">
            <Button variant="outline" className="border-primary text-primary hover:bg-primary/5">
              <Plus className="mr-2 h-4 w-4" /> Wholesale
            </Button>
          </Link>
          <Link href="/billing/retail/new">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
              <Plus className="mr-2 h-4 w-4" /> Retail
            </Button>
          </Link>
        </div>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3 border-b flex flex-row items-center gap-4 space-y-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by customer or invoice #" 
              className="pl-9 bg-secondary/50 border-border/50"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
          </div>
          <div className="w-[180px]">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ListInvoicesType)}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="All Types" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Invoices</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="wholesale">Wholesale</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredInvoices?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                        <FileText className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <p>No invoices found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices?.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-secondary/20 transition-colors cursor-pointer">
                    <TableCell className="font-mono text-sm font-medium">
                      <Link href={`/invoices/${invoice.id}`} className="hover:text-primary hover:underline">
                        {invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(invoice.date)}</TableCell>
                    <TableCell>
                      <Link href={`/customers/${invoice.customerId}`} className="font-medium hover:underline">
                        {invoice.customerName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={invoice.type === 'retail' ? 'bg-primary/5' : 'bg-accent/5'}>
                        {invoice.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(invoice.total)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {invoice.balance > 0 ? formatCurrency(invoice.balance) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={
                        invoice.status === 'paid' ? 'default' : 
                        invoice.status === 'partial' ? 'secondary' : 
                        'destructive'
                      } className={invoice.status === 'paid' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
                        {invoice.status}
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
