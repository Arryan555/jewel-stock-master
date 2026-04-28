import { useGetLedgerBalances, useListCustomers } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BookOpen, Plus } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { LedgerEntryDialog } from "@/components/forms/ledger-entry-dialog";

export default function LedgerIndex() {
  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [chosenCustomerId, setChosenCustomerId] = useState<string>("");
  const [entryOpen, setEntryOpen] = useState(false);
  const { data: balances, isLoading } = useGetLedgerBalances();
  const { data: customers } = useListCustomers({ type: "all" });

  const filteredBalances = balances?.filter(b => 
    !search || b.customerName.toLowerCase().includes(search.toLowerCase())
  );

  function openEntryFor(id: string) {
    setChosenCustomerId(id);
    setPickerOpen(false);
    setEntryOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold">Credit/Debit Ledger</h1>
          <p className="text-muted-foreground mt-1">Track customer outstanding balances and payments</p>
        </div>
        <Button onClick={() => setPickerOpen(true)} data-testid="button-new-entry">
          <Plus className="h-4 w-4 mr-2" /> Add Entry
        </Button>
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-[420px]" data-testid="dialog-customer-picker">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Choose customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Customer
            </Label>
            <Select value={chosenCustomerId} onValueChange={setChosenCustomerId}>
              <SelectTrigger data-testid="select-picker-customer">
                <SelectValue placeholder="Pick a customer" />
              </SelectTrigger>
              <SelectContent>
                {(customers ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} — {c.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPickerOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!chosenCustomerId}
              onClick={() => openEntryFor(chosenCustomerId)}
              data-testid="button-picker-continue"
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {chosenCustomerId && (
        <LedgerEntryDialog
          open={entryOpen}
          onOpenChange={setEntryOpen}
          customerId={chosenCustomerId}
        />
      )}

      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search customers..." 
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
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Balance Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredBalances?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-40 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <p>No ledger balances found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBalances?.map((balance) => (
                  <TableRow key={balance.customerId} className="hover:bg-secondary/20 transition-colors cursor-pointer">
                    <TableCell className="font-medium">
                      <Link href={`/customers/${balance.customerId}?tab=ledger`} className="hover:underline flex items-center gap-2">
                        {balance.customerName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-secondary/50">
                        {balance.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {balance.balance === 0 ? (
                        <span className="text-muted-foreground">Settled</span>
                      ) : balance.balance > 0 ? (
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-transparent">Receivable (Dr)</Badge>
                      ) : (
                        <Badge variant="destructive" className="bg-destructive/10 text-destructive border-transparent">Payable (Cr)</Badge>
                      )}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${balance.balance > 0 ? 'text-primary' : balance.balance < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {formatCurrency(Math.abs(balance.balance))}
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
