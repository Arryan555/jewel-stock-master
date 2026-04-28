import { useState } from "react";
import { Link, useParams } from "wouter";
import {
  useGetCustomer,
  getGetCustomerQueryKey,
  useListInvoices,
  getListInvoicesQueryKey,
  useListGirviLoans,
  useListLedgerEntries,
  getListLedgerEntriesQueryKey,
  useDeleteCustomer,
  getListCustomersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Mail,
  MapPin,
  Phone,
  Pencil,
  Plus,
  ReceiptText,
  Scale,
  BookOpen,
  Trash2,
  Building2,
} from "lucide-react";
import { formatCurrency, formatDate, formatWeight } from "@/lib/format";
import { CustomerDialog } from "@/components/forms/customer-dialog";
import { LedgerEntryDialog } from "@/components/forms/ledger-entry-dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function CustomerDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [editOpen, setEditOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);

  const { data: customer, isLoading } = useGetCustomer(id, {
    query: { enabled: !!id, queryKey: getGetCustomerQueryKey(id) },
  });
  const invoiceParams = { customerId: id, type: "all" as const };
  const { data: invoices } = useListInvoices(invoiceParams, {
    query: {
      enabled: !!id,
      queryKey: getListInvoicesQueryKey(invoiceParams),
    },
  });
  const { data: allLoans } = useListGirviLoans({ status: "all" });
  const loans = (allLoans ?? []).filter((l) => l.customerId === id);
  const ledgerParams = { customerId: id };
  const { data: ledger } = useListLedgerEntries(ledgerParams, {
    query: {
      enabled: !!id,
      queryKey: getListLedgerEntriesQueryKey(ledgerParams),
    },
  });
  const del = useDeleteCustomer();

  if (isLoading || !customer) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Build running balance for ledger entries (chronological asc)
  const sorted = [...(ledger ?? [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  let running = customer.openingBalance ?? 0;
  const ledgerWithBalance = sorted.map((e) => {
    const delta = e.type === "debit" ? e.amount : -e.amount;
    running += delta;
    return { ...e, running };
  });

  async function onDelete() {
    if (!customer) return;
    if (!confirm(`Delete customer "${customer.name}"? This cannot be undone.`))
      return;
    try {
      await del.mutateAsync({ id });
      await qc.invalidateQueries({ queryKey: getListCustomersQueryKey() });
      toast({ title: "Customer deleted" });
      setLocation("/customers");
    } catch (err) {
      toast({
        title: "Could not delete",
        description: String((err as Error).message),
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/customers"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          data-testid="link-back-customers"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to customers
        </Link>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setEditOpen(true)}
            data-testid="button-edit-customer"
          >
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
            data-testid="button-delete-customer"
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
          <div className="flex items-start gap-5">
            <div className="h-16 w-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-3xl font-serif text-primary">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1
                  className="font-serif text-3xl font-bold text-foreground"
                  data-testid="text-customer-name"
                >
                  {customer.name}
                </h1>
                <Badge
                  variant={customer.type === "wholesale" ? "default" : "secondary"}
                  className={
                    customer.type === "wholesale"
                      ? "bg-accent text-accent-foreground"
                      : ""
                  }
                  data-testid="badge-customer-type"
                >
                  {customer.type}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 text-sm text-muted-foreground">
                <Info icon={Phone}>{customer.phone}</Info>
                {customer.email && <Info icon={Mail}>{customer.email}</Info>}
                {customer.city && <Info icon={MapPin}>{customer.city}</Info>}
                {customer.gstNumber && (
                  <Info icon={Building2}>GSTIN: {customer.gstNumber}</Info>
                )}
              </div>
            </div>
          </div>
        </div>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border/60">
            <Stat
              label="Outstanding Balance"
              value={formatCurrency(Math.abs(customer.balance))}
              hint={
                customer.balance > 0.01
                  ? "Receivable (Dr)"
                  : customer.balance < -0.01
                  ? "Payable (Cr)"
                  : "Settled"
              }
              tone={
                customer.balance > 0.01
                  ? "primary"
                  : customer.balance < -0.01
                  ? "danger"
                  : "muted"
              }
              testid="stat-balance"
            />
            <Stat
              label="Total Purchases"
              value={formatCurrency(customer.totalPurchases)}
              testid="stat-purchases"
            />
            <Stat
              label="Invoices"
              value={String(customer.invoiceCount)}
              testid="stat-invoices"
            />
            <Stat
              label="Active Girvi"
              value={String(customer.activeGirviCount)}
              testid="stat-girvi"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="invoices">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="invoices" data-testid="tab-invoices">
            <ReceiptText className="h-4 w-4 mr-2" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="girvi" data-testid="tab-girvi">
            <Scale className="h-4 w-4 mr-2" /> Girvi Loans
          </TabsTrigger>
          <TabsTrigger value="ledger" data-testid="tab-ledger">
            <BookOpen className="h-4 w-4 mr-2" /> Ledger
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(invoices ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-32 text-center text-muted-foreground"
                      >
                        No invoices yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices!.map((inv) => (
                      <TableRow
                        key={inv.id}
                        data-testid={`row-invoice-${inv.id}`}
                      >
                        <TableCell className="font-mono text-sm">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="hover:text-primary hover:underline"
                          >
                            {inv.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(inv.date)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {inv.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(inv.total)}
                        </TableCell>
                        <TableCell className="text-right">
                          {inv.balance > 0
                            ? formatCurrency(inv.balance)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={
                              inv.status === "paid"
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : inv.status === "partial"
                                ? "bg-amber-500 hover:bg-amber-600 text-white"
                                : "bg-destructive text-destructive-foreground"
                            }
                          >
                            {inv.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="girvi" className="mt-4">
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead>Loan #</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-32 text-center text-muted-foreground"
                      >
                        No girvi loans
                      </TableCell>
                    </TableRow>
                  ) : (
                    loans.map((loan) => (
                      <TableRow key={loan.id} data-testid={`row-loan-${loan.id}`}>
                        <TableCell className="font-mono text-sm">
                          <Link
                            href={`/girvi/${loan.id}`}
                            className="hover:text-primary hover:underline"
                          >
                            {loan.loanNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">
                            {loan.itemDescription}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {loan.metal} • {loan.purity}
                          </p>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatWeight(loan.weightGrams)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(loan.loanAmount)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {formatCurrency(loan.outstanding)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={
                              loan.status === "closed"
                                ? "bg-secondary text-secondary-foreground"
                                : loan.status === "overdue"
                                ? "bg-destructive text-destructive-foreground"
                                : "bg-primary text-primary-foreground"
                            }
                          >
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
        </TabsContent>

        <TabsContent value="ledger" className="mt-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <CardTitle className="text-base">Ledger Entries</CardTitle>
              <Button
                size="sm"
                onClick={() => setLedgerOpen(true)}
                data-testid="button-add-ledger"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Entry
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerWithBalance.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-32 text-center text-muted-foreground"
                      >
                        No ledger entries
                      </TableCell>
                    </TableRow>
                  ) : (
                    ledgerWithBalance
                      .slice()
                      .reverse()
                      .map((e) => (
                        <TableRow key={e.id} data-testid={`row-ledger-${e.id}`}>
                          <TableCell className="text-muted-foreground">
                            {formatDate(e.date)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {e.description}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {e.reference || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {e.type === "debit" ? formatCurrency(e.amount) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {e.type === "credit"
                              ? formatCurrency(e.amount)
                              : "—"}
                          </TableCell>
                          <TableCell
                            className={`text-right font-bold ${
                              e.running > 0
                                ? "text-primary"
                                : e.running < 0
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }`}
                          >
                            {formatCurrency(Math.abs(e.running))}{" "}
                            <span className="text-xs font-normal text-muted-foreground">
                              {e.running > 0
                                ? "Dr"
                                : e.running < 0
                                ? "Cr"
                                : ""}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CustomerDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={{
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email ?? "",
          address: customer.address ?? "",
          city: customer.city ?? "",
          type: customer.type as "retail" | "wholesale",
          gstNumber: customer.gstNumber ?? "",
          openingBalance: String(customer.openingBalance ?? 0),
        }}
      />
      <LedgerEntryDialog
        open={ledgerOpen}
        onOpenChange={setLedgerOpen}
        customerId={customer.id}
      />
    </div>
  );
}

function Info({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      {children}
    </span>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = "default",
  testid,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "primary" | "danger" | "muted";
  testid?: string;
}) {
  const color =
    tone === "primary"
      ? "text-primary"
      : tone === "danger"
      ? "text-destructive"
      : tone === "muted"
      ? "text-muted-foreground"
      : "text-foreground";
  return (
    <div className="p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </p>
      <p
        className={`text-2xl font-serif font-bold mt-1 ${color}`}
        data-testid={testid}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
