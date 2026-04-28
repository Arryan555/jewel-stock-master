import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetGirviLoan,
  getGetGirviLoanQueryKey,
  useRecordGirviPayment,
  useCloseGirviLoan,
  useDeleteGirviLoan,
  getListGirviLoansQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetGirviSummaryQueryKey,
  getGetRecentActivityQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Wallet,
  Lock,
  Trash2,
  CalendarDays,
  Scale as ScaleIcon,
  Coins,
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime, formatWeight } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

export default function GirviDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const { data: loan, isLoading } = useGetGirviLoan(id, {
    query: { enabled: !!id, queryKey: getGetGirviLoanQueryKey(id) },
  });
  const recordPayment = useRecordGirviPayment();
  const close = useCloseGirviLoan();
  const del = useDeleteGirviLoan();

  if (isLoading || !loan) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  async function invalidateAll() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: getGetGirviLoanQueryKey(id) }),
      qc.invalidateQueries({ queryKey: getListGirviLoansQueryKey() }),
      qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
      qc.invalidateQueries({ queryKey: getGetGirviSummaryQueryKey() }),
      qc.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() }),
    ]);
  }

  async function onPay() {
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) {
      toast({ title: "Enter a positive amount", variant: "destructive" });
      return;
    }
    try {
      await recordPayment.mutateAsync({
        id,
        data: { amount: amt, note: note || undefined },
      });
      await invalidateAll();
      toast({ title: "Payment recorded" });
      setPayOpen(false);
      setAmount("");
      setNote("");
    } catch (err) {
      toast({
        title: "Could not record payment",
        description: String((err as Error).message),
        variant: "destructive",
      });
    }
  }

  async function onClose() {
    if (!loan) return;
    if (
      loan.outstanding > 0.01 &&
      !confirm(
        `Outstanding is ${formatCurrency(loan.outstanding)}. Close anyway?`,
      )
    )
      return;
    try {
      await close.mutateAsync({ id });
      await invalidateAll();
      toast({ title: "Loan closed" });
    } catch (err) {
      toast({
        title: "Could not close loan",
        description: String((err as Error).message),
        variant: "destructive",
      });
    }
  }

  async function onDelete() {
    if (!confirm("Delete this loan permanently?")) return;
    try {
      await del.mutateAsync({ id });
      await invalidateAll();
      toast({ title: "Loan deleted" });
      setLocation("/girvi");
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
      <div className="flex justify-between items-center">
        <Link
          href="/girvi"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          data-testid="link-back-girvi"
        >
          <ArrowLeft className="h-4 w-4" />
          All loans
        </Link>
        <div className="flex gap-2">
          {loan.status !== "closed" && (
            <>
              <Button
                onClick={() => setPayOpen(true)}
                data-testid="button-record-payment"
              >
                <Wallet className="h-4 w-4 mr-2" /> Record Payment
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                data-testid="button-close-loan"
              >
                <Lock className="h-4 w-4 mr-2" /> Close Loan
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
            data-testid="button-delete-loan"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 border-b">
          <div className="flex justify-between items-start gap-6 flex-wrap">
            <div>
              <Badge
                className={
                  loan.status === "closed"
                    ? "bg-secondary text-secondary-foreground"
                    : loan.status === "overdue"
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-primary text-primary-foreground"
                }
                data-testid="badge-loan-status"
              >
                {loan.status}
              </Badge>
              <p
                className="font-mono text-3xl font-bold mt-3"
                data-testid="text-loan-number"
              >
                {loan.loanNumber}
              </p>
              <Link
                href={`/customers/${loan.customerId}`}
                className="text-sm text-primary hover:underline"
              >
                {loan.customerName} →
              </Link>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Collateral
              </p>
              <p className="font-medium text-foreground mt-1">
                {loan.itemDescription}
              </p>
              <p className="text-xs text-muted-foreground capitalize mt-1">
                {loan.metal} • {loan.purity} • {formatWeight(loan.weightGrams)}
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border/60">
            <Stat
              icon={Coins}
              label="Principal"
              value={formatCurrency(loan.loanAmount)}
            />
            <Stat
              icon={ScaleIcon}
              label="Interest"
              value={formatCurrency(loan.accruedInterest)}
              hint={`${loan.interestRatePct}%/month`}
            />
            <Stat
              icon={Wallet}
              label="Paid"
              value={formatCurrency(loan.paidAmount)}
            />
            <Stat
              icon={CalendarDays}
              label="Outstanding"
              value={formatCurrency(loan.outstanding)}
              tone="primary"
              hint={`Due ${formatDate(loan.dueDate)}`}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border/50 shadow-sm lg:col-span-2">
          <div className="border-b p-4">
            <h2 className="font-serif text-lg font-bold">Payment History</h2>
            <p className="text-xs text-muted-foreground">
              Issued {formatDate(loan.loanDate)} • Due {formatDate(loan.dueDate)}
            </p>
          </div>
          <CardContent className="p-6">
            {loan.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No payments recorded yet.
              </p>
            ) : (
              <div className="relative">
                <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
                <div className="space-y-5">
                  {loan.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex gap-4 relative"
                      data-testid={`row-payment-${p.id}`}
                    >
                      <div className="h-6 w-6 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0 z-10">
                        <Wallet className="h-3 w-3 text-primary" />
                      </div>
                      <div className="flex-1 flex justify-between items-start">
                        <div>
                          <p className="font-semibold">
                            {formatCurrency(p.amount)}
                          </p>
                          {p.note && (
                            <p className="text-xs text-muted-foreground">
                              {p.note}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(p.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <div className="border-b p-4">
            <h2 className="font-serif text-lg font-bold">Loan Card</h2>
          </div>
          <CardContent className="p-6 space-y-3 text-sm">
            <Row label="Loan Number" value={loan.loanNumber} mono />
            <Row label="Issued On" value={formatDate(loan.loanDate)} />
            <Row label="Due On" value={formatDate(loan.dueDate)} />
            <Row
              label="Interest Rate"
              value={`${loan.interestRatePct}% per month`}
            />
            <Row label="Metal" value={loan.metal} capitalize />
            <Row label="Purity" value={loan.purity} />
            <Row label="Weight" value={formatWeight(loan.weightGrams)} />
          </CardContent>
        </Card>
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-[420px]" data-testid="dialog-loan-payment">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              Record Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Outstanding:{" "}
              <span className="font-bold text-foreground">
                {formatCurrency(loan.outstanding)}
              </span>
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Amount (₹)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-testid="input-loan-payment-amount"
              />
              <button
                type="button"
                className="text-xs text-primary hover:underline mt-1"
                onClick={() => setAmount(String(loan.outstanding))}
                data-testid="button-loan-pay-full"
              >
                Pay full outstanding
              </button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Note (optional)
              </Label>
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                data-testid="input-loan-payment-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPayOpen(false)}
              data-testid="button-cancel-loan-payment"
            >
              Cancel
            </Button>
            <Button
              onClick={onPay}
              disabled={recordPayment.isPending}
              data-testid="button-confirm-loan-payment"
            >
              {recordPayment.isPending ? "Saving..." : "Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "primary";
}) {
  return (
    <div className="p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p
        className={`text-2xl font-serif font-bold mt-1 ${
          tone === "primary" ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  capitalize,
}: {
  label: string;
  value: string;
  mono?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-medium ${mono ? "font-mono" : ""} ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
