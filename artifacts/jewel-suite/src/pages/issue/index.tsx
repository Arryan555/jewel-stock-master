import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, ClipboardList, CheckCircle2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatWeight } from "@/lib/format";

interface IssueEntry {
  id: string;
  issueNumber: string;
  karigarName: string;
  metal: string;
  purity: string;
  grossGrams: string;
  netGrams: string;
  ratePerGram: string;
  description: string;
  issueDate: string;
  dueDate: string | null;
  returnDate: string | null;
  status: string;
  remarks: string;
}

const METALS = ["Gold", "Silver", "Diamond", "Platinum"];
const PURITIES: Record<string, string[]> = {
  Gold: ["24K", "22K", "18K", "14K"],
  Silver: ["925", "999", "Plain"],
  Diamond: ["18K", "14K"],
  Platinum: ["950", "900"],
};

function IssueDialog({
  open, onOpenChange,
  nextNumber,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nextNumber: string;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    issueNumber: nextNumber,
    karigarName: "",
    metal: "Gold",
    purity: "22K",
    grossGrams: "",
    netGrams: "",
    ratePerGram: "",
    description: "",
    issueDate: today,
    dueDate: "",
    remarks: "",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const create = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, issueNumber: nextNumber }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issue"] });
      toast({ title: "Issue entry created" });
      onOpenChange(false);
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">New Issue — {nextNumber}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Karigar Name *</Label>
            <Input value={form.karigarName} onChange={e => set("karigarName", e.target.value)} placeholder="Karigar name" />
          </div>
          <div>
            <Label>Metal</Label>
            <Select value={form.metal} onValueChange={v => { set("metal", v); set("purity", PURITIES[v]?.[0] ?? ""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{METALS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Purity</Label>
            <Select value={form.purity} onValueChange={v => set("purity", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(PURITIES[form.metal] ?? []).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Gross (g)</Label>
            <Input type="number" step="0.001" value={form.grossGrams} onChange={e => set("grossGrams", e.target.value)} placeholder="0.000" />
          </div>
          <div>
            <Label>Net (g)</Label>
            <Input type="number" step="0.001" value={form.netGrams} onChange={e => set("netGrams", e.target.value)} placeholder="0.000" />
          </div>
          <div>
            <Label>Rate/g (₹)</Label>
            <Input type="number" step="0.01" value={form.ratePerGram} onChange={e => set("ratePerGram", e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>Issue Date</Label>
            <Input type="date" value={form.issueDate} onChange={e => set("issueDate", e.target.value)} />
          </div>
          <div>
            <Label>Due Date</Label>
            <Input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Item description" />
          </div>
          <div className="col-span-2">
            <Label>Remarks</Label>
            <Input value={form.remarks} onChange={e => set("remarks", e.target.value)} placeholder="Any remarks" />
          </div>
          <div className="col-span-2 pt-2">
            <Button className="w-full" onClick={() => create.mutate()} disabled={create.isPending || !form.karigarName}>
              {create.isPending ? "Saving..." : "Create Issue Entry"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function IssueIndex() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: entries = [], isLoading } = useQuery<IssueEntry[]>({
    queryKey: ["issue"],
    queryFn: () => fetch("/api/issue").then(r => r.json()),
  });

  const { data: nextData } = useQuery<{ issueNumber: string }>({
    queryKey: ["issue-next"],
    queryFn: () => fetch("/api/issue/next-number").then(r => r.json()),
  });

  const markReturn = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/issue/${id}/return`, { method: "PATCH" }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issue"] });
      toast({ title: "Marked as returned" });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => fetch(`/api/issue/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["issue"] });
      toast({ title: "Entry deleted" });
    },
  });

  const filtered = entries.filter(e =>
    e.karigarName.toLowerCase().includes(search.toLowerCase()) ||
    e.issueNumber.toLowerCase().includes(search.toLowerCase())
  );

  const pending = entries.filter(e => e.status === "pending");
  const totalGoldPending = pending
    .filter(e => e.metal === "Gold")
    .reduce((s, e) => s + parseFloat(e.netGrams || "0"), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif font-bold">Issue Register</h1>
          <p className="text-muted-foreground mt-1">Track metal issued to karigars and returns</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Issue
        </Button>
      </div>

      <IssueDialog open={open} onOpenChange={setOpen} nextNumber={nextData?.issueNumber ?? "ISS-0001"} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-800">{pending.length}</div>
            <div className="text-sm text-muted-foreground">Pending Returns</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-800">{formatWeight(totalGoldPending)}</div>
            <div className="text-sm text-muted-foreground">Gold Pending (g)</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-800">
              {entries.filter(e => e.status === "returned").length}
            </div>
            <div className="text-sm text-muted-foreground">Returned</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by karigar or issue number..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">No issue entries found</p>
              <Button variant="outline" className="mt-4" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> New Issue
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow>
                  <TableHead>Issue #</TableHead>
                  <TableHead>Karigar</TableHead>
                  <TableHead>Metal / Purity</TableHead>
                  <TableHead className="text-right">Gross (g)</TableHead>
                  <TableHead className="text-right">Net (g)</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono font-semibold">{e.issueNumber}</TableCell>
                    <TableCell className="font-medium">{e.karigarName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{e.metal} {e.purity}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{parseFloat(e.grossGrams).toFixed(3)}</TableCell>
                    <TableCell className="text-right font-mono">{parseFloat(e.netGrams).toFixed(3)}</TableCell>
                    <TableCell>{new Date(e.issueDate).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell>
                      {e.dueDate ? new Date(e.dueDate).toLocaleDateString("en-IN") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        e.status === "returned"
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-800"
                      }>
                        {e.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {e.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-600 h-8 w-8"
                            title="Mark returned"
                            onClick={() => markReturn.mutate(e.id)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive h-8 w-8"
                          onClick={() => remove.mutate(e.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
