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
import { Plus, Search, Hammer, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Karigar {
  id: string;
  name: string;
  mobile: string;
  specialization: string;
  rateType: string;
  rate: string;
  address: string;
  status: string;
}

function KarigarDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "", mobile: "", specialization: "All Work",
    rateType: "Per Gram", rate: "", address: ""
  });

  const create = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/karigar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["karigar"] });
      toast({ title: "Karigar added" });
      onOpenChange(false);
      setForm({ name: "", mobile: "", specialization: "All Work", rateType: "Per Gram", rate: "", address: "" });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Add Karigar</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name" />
          </div>
          <div>
            <Label>Mobile</Label>
            <Input value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} placeholder="10-digit mobile" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Specialization</Label>
              <Select value={form.specialization} onValueChange={v => setForm(p => ({ ...p, specialization: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["All Work","Gold","Silver","Diamond","Repair","Polishing"].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rate Type</Label>
              <Select value={form.rateType} onValueChange={v => setForm(p => ({ ...p, rateType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Per Gram","Per Piece","Fixed"].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Rate (₹)</Label>
            <Input type="number" value={form.rate} onChange={e => setForm(p => ({ ...p, rate: e.target.value }))} placeholder="0" />
          </div>
          <div>
            <Label>Address</Label>
            <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Optional address" />
          </div>
          <Button className="w-full" onClick={() => create.mutate()} disabled={create.isPending || !form.name}>
            {create.isPending ? "Saving..." : "Add Karigar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function KarigarIndex() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: karigars = [], isLoading } = useQuery<Karigar[]>({
    queryKey: ["karigar"],
    queryFn: () => fetch("/api/karigar").then(r => r.json()),
  });

  const remove = useMutation({
    mutationFn: (id: string) => fetch(`/api/karigar/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["karigar"] });
      toast({ title: "Karigar removed" });
    },
  });

  const filtered = karigars.filter(k =>
    k.name.toLowerCase().includes(search.toLowerCase()) ||
    k.mobile.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif font-bold">Karigar</h1>
          <p className="text-muted-foreground mt-1">Manage craftsmen and their work rates</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Karigar
        </Button>
      </div>

      <KarigarDialog open={open} onOpenChange={setOpen} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-800">{karigars.length}</div>
            <div className="text-sm text-muted-foreground">Total Karigar</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-800">
              {karigars.filter(k => k.status === "active").length}
            </div>
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-800">
              {[...new Set(karigars.map(k => k.specialization))].length}
            </div>
            <div className="text-sm text-muted-foreground">Specializations</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or mobile..."
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
              <Hammer className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">No karigar found</p>
              <Button variant="outline" className="mt-4" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add First Karigar
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Rate Type</TableHead>
                  <TableHead className="text-right">Rate (₹)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((k, i) => (
                  <TableRow key={k.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-semibold">{k.name}</TableCell>
                    <TableCell>{k.mobile || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{k.specialization}</Badge>
                    </TableCell>
                    <TableCell>{k.rateType}</TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{parseFloat(k.rate).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <Badge className={k.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                        {k.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => remove.mutate(k.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
