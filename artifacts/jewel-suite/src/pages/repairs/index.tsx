import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListRepairs,
  useListCustomers,
  useCreateRepair,
  useUpdateRepair,
  useDeleteRepair,
  getListRepairsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Wrench, Plus, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, formatWeight } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLOR: Record<string, string> = {
  received: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  ready: "bg-violet-100 text-violet-800",
  delivered: "bg-emerald-100 text-emerald-800",
};

export default function RepairsIndex() {
  const [status, setStatus] = useState<"all" | "received" | "in_progress" | "ready" | "delivered">("all");
  const { data, isLoading } = useListRepairs({ status });
  const { data: customers } = useListCustomers({ type: "all" });
  const qc = useQueryClient();
  const create = useCreateRepair();
  const update = useUpdateRepair();
  const del = useDeleteRepair();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    customerId: "",
    itemDescription: "",
    metal: "gold" as "gold" | "silver" | "platinum" | "diamond",
    purity: "22K",
    weightGrams: "",
    issue: "",
    estimatedCost: "",
    receivedDate: new Date().toISOString().slice(0, 10),
    promisedDate: "",
    notes: "",
  });

  async function onSave() {
    if (!form.customerId || !form.itemDescription || !form.issue || !form.weightGrams) {
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }
    await create.mutateAsync({
      data: {
        customerId: form.customerId,
        itemDescription: form.itemDescription,
        metal: form.metal,
        purity: form.purity || null,
        weightGrams: parseFloat(form.weightGrams),
        issue: form.issue,
        estimatedCost: parseFloat(form.estimatedCost) || 0,
        receivedDate: new Date(form.receivedDate).toISOString(),
        promisedDate: form.promisedDate ? new Date(form.promisedDate).toISOString() : null,
        notes: form.notes || null,
      },
    });
    await qc.invalidateQueries({ queryKey: getListRepairsQueryKey() });
    setOpen(false);
    toast({ title: "Repair ticket created" });
  }

  async function changeStatus(id: string, next: typeof status) {
    if (next === "all") return;
    await update.mutateAsync({ id, data: { status: next } });
    await qc.invalidateQueries({ queryKey: getListRepairsQueryKey() });
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this repair?")) return;
    await del.mutateAsync({ id });
    await qc.invalidateQueries({ queryKey: getListRepairsQueryKey() });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif font-bold">Repairs</h1>
          <p className="text-muted-foreground mt-1">Track customer items received for polishing, soldering and resizing</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Repair</Button>
      </div>

      <Tabs value={status} onValueChange={(v) => setStatus(v as typeof status)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="received">Received</TabsTrigger>
          <TabsTrigger value="in_progress">In progress</TabsTrigger>
          <TabsTrigger value="ready">Ready</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3 border-b text-sm text-muted-foreground">
          {data?.length ?? 0} ticket(s)
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead className="text-right">Wt</TableHead>
                <TableHead className="text-right">Quote</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5" /></TableCell>)}</TableRow>
              )) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Wrench className="h-8 w-8 text-muted-foreground/50" />
                      <span>No repair tickets</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.ticketNumber}</TableCell>
                  <TableCell>{r.customerName}</TableCell>
                  <TableCell>
                    <div className="font-medium">{r.itemDescription}</div>
                    <div className="text-xs text-muted-foreground capitalize">{r.metal} {r.purity} • Recv {formatDate(r.receivedDate)}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.issue}</TableCell>
                  <TableCell className="text-right font-mono">{formatWeight(r.weightGrams)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(r.estimatedCost)}</TableCell>
                  <TableCell>
                    <Select value={r.status} onValueChange={(v) => changeStatus(r.id, v as typeof status)}>
                      <SelectTrigger className="h-8 w-32">
                        <Badge className={STATUS_COLOR[r.status]}>{r.status.replace("_", " ")}</Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="received">Received</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="ready">Ready</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => onDelete(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>New repair ticket</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Customer" full>
              <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {(customers ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name} — {c.phone}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Item description" full>
              <Input value={form.itemDescription} onChange={(e) => setForm({ ...form, itemDescription: e.target.value })} placeholder="22K bangle, broken clasp..." />
            </Field>
            <Field label="Metal">
              <Select value={form.metal} onValueChange={(v) => setForm({ ...form, metal: v as typeof form.metal })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                  <SelectItem value="diamond">Diamond</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Purity"><Input value={form.purity} onChange={(e) => setForm({ ...form, purity: e.target.value })} /></Field>
            <Field label="Weight (g)"><Input type="number" step="0.001" value={form.weightGrams} onChange={(e) => setForm({ ...form, weightGrams: e.target.value })} /></Field>
            <Field label="Estimated cost ₹"><Input type="number" step="0.01" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })} /></Field>
            <Field label="Received on"><Input type="date" value={form.receivedDate} onChange={(e) => setForm({ ...form, receivedDate: e.target.value })} /></Field>
            <Field label="Promised by"><Input type="date" value={form.promisedDate} onChange={(e) => setForm({ ...form, promisedDate: e.target.value })} /></Field>
            <Field label="Issue / work needed" full><Textarea rows={2} value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} placeholder="Polish, solder broken link..." /></Field>
            <Field label="Notes" full><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </div>
          <DialogFooter><Button onClick={onSave} disabled={create.isPending}>Create ticket</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${full ? "col-span-2" : ""}`}>
      <Label className="text-xs uppercase text-muted-foreground tracking-wider">{label}</Label>
      {children}
    </div>
  );
}
