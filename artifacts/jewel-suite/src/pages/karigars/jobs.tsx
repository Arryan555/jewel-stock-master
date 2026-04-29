import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListKarigarJobs,
  useListKarigars,
  useCreateKarigarJob,
  useReceiveKarigarJob,
  useDeleteKarigarJob,
  getListKarigarJobsQueryKey,
  getListKarigarsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FileSpreadsheet, Plus, PackageCheck, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { formatCurrency, formatDate, formatWeight } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

export default function KarigarJobsIndex() {
  const [status, setStatus] = useState<"all" | "issued" | "received">("issued");
  const { data, isLoading } = useListKarigarJobs({ status });
  const { data: karigars } = useListKarigars();
  const qc = useQueryClient();
  const create = useCreateKarigarJob();
  const receive = useReceiveKarigarJob();
  const del = useDeleteKarigarJob();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [recOpenId, setRecOpenId] = useState<string | null>(null);
  const [recWeight, setRecWeight] = useState("");

  const [form, setForm] = useState({
    karigarId: "",
    itemDescription: "",
    metal: "gold" as "gold" | "silver" | "platinum",
    purity: "22K",
    issuedWeight: "",
    expectedWastagePct: "2",
    laborCharge: "",
    issuedDate: new Date().toISOString().slice(0, 10),
    expectedDate: "",
    notes: "",
  });

  async function onSave() {
    if (!form.karigarId || !form.itemDescription || !form.issuedWeight) {
      toast({ title: "Fill required fields", variant: "destructive" });
      return;
    }
    await create.mutateAsync({
      data: {
        karigarId: form.karigarId,
        itemDescription: form.itemDescription,
        metal: form.metal,
        purity: form.purity,
        issuedWeight: parseFloat(form.issuedWeight),
        expectedWastagePct: parseFloat(form.expectedWastagePct) || 0,
        laborCharge: parseFloat(form.laborCharge) || 0,
        issuedDate: new Date(form.issuedDate).toISOString(),
        expectedDate: form.expectedDate ? new Date(form.expectedDate).toISOString() : null,
        notes: form.notes || null,
      },
    });
    await Promise.all([
      qc.invalidateQueries({ queryKey: getListKarigarJobsQueryKey() }),
      qc.invalidateQueries({ queryKey: getListKarigarsQueryKey() }),
    ]);
    setOpen(false);
    toast({ title: "Job card created" });
  }

  async function onReceive(id: string) {
    if (!recWeight) return;
    await receive.mutateAsync({
      id,
      data: { receivedWeight: parseFloat(recWeight), receivedDate: new Date().toISOString() },
    });
    await qc.invalidateQueries({ queryKey: getListKarigarJobsQueryKey() });
    setRecOpenId(null);
    setRecWeight("");
    toast({ title: "Marked as received" });
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this job?")) return;
    await del.mutateAsync({ id });
    await qc.invalidateQueries({ queryKey: getListKarigarJobsQueryKey() });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif font-bold">Karigar Job Cards</h1>
          <p className="text-muted-foreground mt-1">Track gold issued for crafting and wastage on return</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Issue Gold</Button>
      </div>

      <Tabs value={status} onValueChange={(v) => setStatus(v as typeof status)}>
        <TabsList>
          <TabsTrigger value="issued">Open</TabsTrigger>
          <TabsTrigger value="received">Closed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3 border-b text-sm text-muted-foreground">
          {data?.length ?? 0} job card(s)
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow>
                <TableHead>Job #</TableHead>
                <TableHead>Karigar</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Issued</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Wastage</TableHead>
                <TableHead className="text-right">Labor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5" /></TableCell>)}</TableRow>
              )) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileSpreadsheet className="h-8 w-8 text-muted-foreground/50" />
                      <span>No job cards in this view</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="font-mono">{j.jobNumber}</TableCell>
                  <TableCell>{j.karigarName}</TableCell>
                  <TableCell>
                    <div className="font-medium">{j.itemDescription}</div>
                    <div className="text-xs text-muted-foreground capitalize">{j.metal} {j.purity} • {formatDate(j.issuedDate)}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatWeight(j.issuedWeight)}</TableCell>
                  <TableCell className="text-right font-mono">{j.receivedWeight != null ? formatWeight(j.receivedWeight) : "—"}</TableCell>
                  <TableCell className="text-right font-mono">
                    {j.actualWastagePct != null ? `${j.actualWastagePct.toFixed(2)}%` : `~${j.expectedWastagePct.toFixed(2)}%`}
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(j.laborCharge)}</TableCell>
                  <TableCell>
                    <Badge className={j.status === "received" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                      {j.status === "received" ? "Closed" : "Open"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {j.status === "issued" && (
                      <Button size="sm" variant="outline" onClick={() => { setRecOpenId(j.id); setRecWeight(String(j.issuedWeight - (j.issuedWeight * j.expectedWastagePct / 100))); }}>
                        <PackageCheck className="h-3.5 w-3.5 mr-1" /> Receive
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => onDelete(j.id)}>
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
          <DialogHeader><DialogTitle>Issue gold to karigar</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Karigar" full>
              <Select value={form.karigarId} onValueChange={(v) => setForm({ ...form, karigarId: v })}>
                <SelectTrigger><SelectValue placeholder="Select karigar" /></SelectTrigger>
                <SelectContent>
                  {(karigars ?? []).map((k) => <SelectItem key={k.id} value={k.id}>{k.name} — {k.phone}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Item description" full>
              <Input value={form.itemDescription} onChange={(e) => setForm({ ...form, itemDescription: e.target.value })} />
            </Field>
            <Field label="Metal">
              <Select value={form.metal} onValueChange={(v) => setForm({ ...form, metal: v as typeof form.metal })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Purity"><Input value={form.purity} onChange={(e) => setForm({ ...form, purity: e.target.value })} /></Field>
            <Field label="Issued weight (g)"><Input type="number" step="0.001" value={form.issuedWeight} onChange={(e) => setForm({ ...form, issuedWeight: e.target.value })} /></Field>
            <Field label="Expected wastage %"><Input type="number" step="0.01" value={form.expectedWastagePct} onChange={(e) => setForm({ ...form, expectedWastagePct: e.target.value })} /></Field>
            <Field label="Labor charge ₹"><Input type="number" step="0.01" value={form.laborCharge} onChange={(e) => setForm({ ...form, laborCharge: e.target.value })} /></Field>
            <Field label="Issued on"><Input type="date" value={form.issuedDate} onChange={(e) => setForm({ ...form, issuedDate: e.target.value })} /></Field>
            <Field label="Expected by"><Input type="date" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} /></Field>
            <Field label="Notes" full><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          </div>
          <DialogFooter><Button onClick={onSave} disabled={create.isPending}>Issue gold</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!recOpenId} onOpenChange={(o) => !o && setRecOpenId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Receive finished item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Received weight (g)" full>
              <Input type="number" step="0.001" value={recWeight} onChange={(e) => setRecWeight(e.target.value)} autoFocus />
            </Field>
            <p className="text-xs text-muted-foreground">Wastage will be calculated automatically as the difference from issued weight.</p>
          </div>
          <DialogFooter><Button onClick={() => recOpenId && onReceive(recOpenId)} disabled={receive.isPending}>Mark received</Button></DialogFooter>
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
