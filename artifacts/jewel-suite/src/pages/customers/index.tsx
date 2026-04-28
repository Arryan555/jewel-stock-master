import { useListCustomers } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { CustomerDialog } from "@/components/forms/customer-dialog";

export default function CustomersIndex() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data: customers, isLoading } = useListCustomers({ search: search || undefined, type: "all" });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif font-bold">Customers</h1>
          <p className="text-muted-foreground mt-1">Manage retail and wholesale clients</p>
        </div>
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setOpen(true)}
          data-testid="button-new-customer"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Customer
        </Button>
      </div>

      <CustomerDialog open={open} onOpenChange={setOpen} />

      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, phone, city..." 
              className="pl-9 bg-secondary/50 border-border/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow>
                <TableHead className="w-[300px]">Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : customers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <User className="h-8 w-8 text-muted-foreground/50" />
                      <span>No customers found</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers?.map((customer) => (
                  <TableRow key={customer.id} className="hover:bg-secondary/20 cursor-pointer group transition-colors">
                    <TableCell className="font-medium">
                      <Link href={`/customers/${customer.id}`} className="hover:underline flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        {customer.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{customer.phone}</TableCell>
                    <TableCell>
                      <Badge variant={customer.type === 'retail' ? 'secondary' : 'default'} className={customer.type === 'wholesale' ? 'bg-accent/10 text-accent hover:bg-accent/20' : ''}>
                        {customer.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{customer.city || '-'}</TableCell>
                    <TableCell className={`text-right font-semibold ${customer.openingBalance > 0 ? 'text-primary' : customer.openingBalance < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {customer.openingBalance === 0
                        ? '—'
                        : `${formatCurrency(Math.abs(customer.openingBalance))} ${customer.openingBalance > 0 ? 'Dr' : 'Cr'}`}
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
