import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSchemePlans,
  useCreateSchemePlan,
  useDeleteSchemePlan,
  useListSchemeAccounts,
  useCreateSchemeAccount,
  useListCustomers,
  getListSchemePlansQueryKey,
  getListSchemeAccountsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PiggyBank, Plus, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { formatCurrency, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

export default function SchemesIndex() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Saving Schemes</h1>
        <p className="text-muted-foreground mt-1">Monthly subscription schemes (e.g. 11+1) with bonus on maturity</p>
      </div>
      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
        </TabsList>
        <TabsContent value="accounts" className="mt-6"><AccountsTab /></TabsContent>
        <TabsContent value="plans" className="mt-6"><PlansTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function AccountsTab() {
  const [status, setStatus] = useState<"all" | "active" | "redeemed">("active");
  const { data } = useListSchemeAccounts({ status });
  const { data: plans } = useListSchemePlans();
  const { data: customers } = useListCustomers({ type: "all" });
  const qc = useQueryClient();
  const create = useCreateSchemeAccount();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ planId: "", customerId: "", startDate: new Date().toISOString().slice(0, 10) });

  async function onSave() {
    if (!form.planId || !form.customerId) {
      toast({ title: "Pick plan and customer", variant: "destructive" });
      return;
    }
    const r = await create.mutateAsync({
      data: {
        planId: form.planId,
        customerId: form.customerId,
        startDate: new Date(form.startDate).toISOString(),
      },
    });
    await qc.invalidateQueries({ queryKey: getListSchemeAccountsQueryKey() });
    setOpen(false);
    toast({ title: `Account ${r.accountNumber} opened` });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="redeemed">Redeemed</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Account</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Progress</TableHead>
                <TableHead className="text-right">Accumulated</TableHead>
                <TableHead className="text-right">Bonus</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <PiggyBank className="h-8 w-8 text-muted-foreground/50" />
                      <span>No scheme accounts</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono">
                    <Link href={`/schemes/${a.id}`} className="text-primary hover:underline">{a.accountNumber}</Link>
                  </TableCell>
                  <TableCell>{a.customerName}</TableCell>
                  <TableCell>{a.planName}</TableCell>
                  <TableCell className="text-right font-mono">{a.installmentsPaid} / {a.totalInstallments}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(a.accumulatedAmount)}</TableCell>
                  <TableCell className="text-right font-mono text-primary">{formatCurrency(a.bonusAmount)}</TableCell>
                  <TableCell>
                    <Badge className={a.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}>
                      {a.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Open scheme account</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Plan">
              <Select value={form.planId} onValueChange={(v) => setForm({ ...form, planId: v })}>
                <SelectTrigger><SelectValue placeholder="Select scheme plan" /></SelectTrigger>
                <SelectContent>
                  {(plans ?? []).filter(p => p.active).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {formatCurrency(p.monthlyAmount)} × {p.durationMonths}m</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Customer">
              <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {(customers ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name} — {c.phone}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Start date"><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
          </div>
          <DialogFooter><Button onClick={onSave} disabled={create.isPending}>Open account</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlansTab() {
  const { data } = useListSchemePlans();
  const qc = useQueryClient();
  const create = useCreateSchemePlan();
  const del = useDeleteSchemePlan();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    monthlyAmount: "5000",
    durationMonths: "11",
    bonusMonths: "1",
    description: "",
    active: true,
  });

  async function onSave() {
    if (!form.name) {
      toast({ title: "Plan name required", variant: "destructive" });
      return;
    }
    await create.mutateAsync({
      data: {
        name: form.name,
        monthlyAmount: parseFloat(form.monthlyAmount) || 0,
        durationMonths: parseInt(form.durationMonths) || 0,
        bonusMonths: parseInt(form.bonusMonths) || 0,
        description: form.description || null,
        active: form.active,
      },
    });
    await qc.invalidateQueries({ queryKey: getListSchemePlansQueryKey() });
    setOpen(false);
    toast({ title: "Plan created" });
  }

  async function onDelete(id: string) {
    if (!confirm("Delete plan?")) return;
    await del.mutateAsync({ id });
    await qc.invalidateQueries({ queryKey: getListSchemePlansQueryKey() });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> New plan</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(data ?? []).map((p) => (
          <Card key={p.id} className={`border-2 ${p.active ? "border-primary/30" : "border-border opacity-60"}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="font-serif">{p.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{p.accountCount} active account(s)</p>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif font-bold text-primary">{formatCurrency(p.monthlyAmount)}</div>
              <div className="text-sm text-muted-foreground">per month</div>
              <div className="mt-3 text-sm">
                <strong>{p.durationMonths}</strong> installments + <strong className="text-primary">{p.bonusMonths}</strong> bonus
              </div>
              {p.description ? <p className="text-xs text-muted-foreground mt-2">{p.description}</p> : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New scheme plan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Plan name"><Input placeholder="e.g. 11+1 Gold Saver" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Monthly ₹"><Input type="number" value={form.monthlyAmount} onChange={(e) => setForm({ ...form, monthlyAmount: e.target.value })} /></Field>
              <Field label="Duration (mo)"><Input type="number" value={form.durationMonths} onChange={(e) => setForm({ ...form, durationMonths: e.target.value })} /></Field>
              <Field label="Bonus (mo)"><Input type="number" value={form.bonusMonths} onChange={(e) => setForm({ ...form, bonusMonths: e.target.value })} /></Field>
            </div>
            <Field label="Description"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <div className="flex items-center justify-between">
              <Label>Active for new sign-ups</Label>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>
          </div>
          <DialogFooter><Button onClick={onSave} disabled={create.isPending}>Save plan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase text-muted-foreground tracking-wider">{label}</Label>
      {children}
    </div>
  );
}

// silence unused import
void formatDate;
