import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCustomers,
  useCreateGirviLoan,
  getListGirviLoansQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetGirviSummaryQueryKey,
  getGetRecentActivityQueryKey,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Scale } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { projectedOutstanding } from "@/lib/calc";
import { useToast } from "@/hooks/use-toast";

export default function GirviNew() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [customerId, setCustomerId] = useState("");
  const [item, setItem] = useState("");
  const [metal, setMetal] = useState<"gold" | "silver">("gold");
  const [purity, setPurity] = useState("22K");
  const [weight, setWeight] = useState("0");
  const [amount, setAmount] = useState("0");
  const [rate, setRate] = useState("2");
  const [loanDate, setLoanDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().slice(0, 10);
  });

  const { data: customers } = useListCustomers({ type: "all" });
  const create = useCreateGirviLoan();

  const projection = useMemo(() => {
    const principal = parseFloat(amount) || 0;
    const monthlyPct = parseFloat(rate) || 0;
    const ld = new Date(loanDate);
    const dd = new Date(dueDate);
    if (isNaN(ld.getTime()) || isNaN(dd.getTime())) return null;
    const due = projectedOutstanding(principal, monthlyPct, ld, dd);
    const interest = due - principal;
    return { due, interest };
  }, [amount, rate, loanDate, dueDate]);

  async function onSubmit() {
    if (!customerId) {
      toast({ title: "Pick a customer", variant: "destructive" });
      return;
    }
    if (!item.trim()) {
      toast({ title: "Describe the collateral", variant: "destructive" });
      return;
    }
    try {
      const loan = await create.mutateAsync({
        data: {
          customerId,
          itemDescription: item,
          metal,
          purity,
          weightGrams: parseFloat(weight) || 0,
          loanAmount: parseFloat(amount) || 0,
          interestRatePct: parseFloat(rate) || 0,
          loanDate: new Date(loanDate).toISOString(),
          dueDate: new Date(dueDate).toISOString(),
        },
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: getListGirviLoansQueryKey() }),
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
        qc.invalidateQueries({ queryKey: getGetGirviSummaryQueryKey() }),
        qc.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() }),
      ]);
      toast({ title: `Loan ${loan.loanNumber} created` });
      setLocation(`/girvi/${loan.id}`);
    } catch (err) {
      toast({
        title: "Could not create loan",
        description: String((err as Error).message),
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
          <Scale className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-serif text-3xl font-bold">New Girvi Loan</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Issue a pawn loan against gold or silver collateral
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border/50 shadow-sm lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle className="text-base">Loan Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 pt-6">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Customer
              </Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger data-testid="select-loan-customer">
                  <SelectValue placeholder="Select a customer" />
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
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Item Description
              </Label>
              <Textarea
                rows={2}
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder="Gold haar — 32g 22K with kundan work..."
                data-testid="input-loan-item"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Metal
              </Label>
              <Select
                value={metal}
                onValueChange={(v) => setMetal(v as "gold" | "silver")}
              >
                <SelectTrigger data-testid="select-loan-metal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Purity
              </Label>
              <Input
                value={purity}
                onChange={(e) => setPurity(e.target.value)}
                data-testid="input-loan-purity"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Weight (g)
              </Label>
              <Input
                type="number"
                step="0.001"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                data-testid="input-loan-weight"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Loan Amount (₹)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-testid="input-loan-amount"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Interest %/month
              </Label>
              <Input
                type="number"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                data-testid="input-loan-rate"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Loan Date
              </Label>
              <Input
                type="date"
                value={loanDate}
                onChange={(e) => setLoanDate(e.target.value)}
                data-testid="input-loan-date"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Due Date
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                data-testid="input-loan-due"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/30 shadow-md bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="border-b border-primary/20">
            <CardTitle className="text-base font-serif">
              Outstanding on Due Date
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {projection ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Principal</span>
                  <span className="font-medium">
                    {formatCurrency(parseFloat(amount) || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Interest accrued
                  </span>
                  <span className="font-medium">
                    {formatCurrency(projection.interest)}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-primary/30 pt-3">
                  <span className="font-serif text-lg">Total due</span>
                  <span
                    className="font-serif text-2xl font-bold text-primary"
                    data-testid="text-projected-due"
                  >
                    {formatCurrency(projection.due)}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Fill the dates to see the projection.
              </p>
            )}
            <Button
              className="w-full mt-4"
              size="lg"
              onClick={onSubmit}
              disabled={create.isPending}
              data-testid="button-create-loan"
            >
              {create.isPending ? "Creating..." : "Issue loan"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
