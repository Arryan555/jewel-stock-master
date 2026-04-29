import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListKarigars,
  useCreateKarigar,
  useDeleteKarigar,
  getListKarigarsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Hammer, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function KarigarsIndex() {
  const { data, isLoading } = useListKarigars();
  const qc = useQueryClient();
  const create = useCreateKarigar();
  const del = useDeleteKarigar();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", speciality: "", address: "", notes: "" });

  async function onSave() {
    if (!form.name || !form.phone) return;
    await create.mutateAsync({
      data: {
        name: form.name,
        phone: form.phone,
        speciality: form.speciality || null,
        address: form.address || null,
        notes: form.notes || null,
      },
    });
    await qc.invalidateQueries({ queryKey: getListKarigarsQueryKey() });
    setOpen(false);
    setForm({ name: "", phone: "", speciality: "", address: "", notes: "" });
    toast({ title: "Karigar added" });
  }

  async function onDelete(id: string) {
    if (!confirm("Remove this karigar?")) return;
    await del.mutateAsync({ id });
    await qc.invalidateQueries({ queryKey: getListKarigarsQueryKey() });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif font-bold">Karigars</h1>
          <p className="text-muted-foreground mt-1">Goldsmiths and craftsmen working on consignment</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Karigar</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New karigar</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label="Speciality"><Input placeholder="Necklaces, repairs, kundan..." value={form.speciality} onChange={(e) => setForm({ ...form, speciality: e.target.value })} /></Field>
              <Field label="Address"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
              <Field label="Notes"><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            </div>
            <DialogFooter>
              <Button onClick={onSave} disabled={create.isPending}>Save karigar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3 border-b text-sm text-muted-foreground">
          {data?.length ?? 0} karigar(s) registered
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Speciality</TableHead>
                <TableHead className="text-right">Active jobs</TableHead>
                <TableHead className="text-right">Total jobs</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-24" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Hammer className="h-8 w-8 text-muted-foreground/50" />
                      <span>No karigars yet</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell className="text-muted-foreground">{k.phone}</TableCell>
                    <TableCell className="text-muted-foreground">{k.speciality || "—"}</TableCell>
                    <TableCell className="text-right">
                      {k.activeJobs > 0 ? (
                        <Badge className="bg-amber-100 text-amber-800">{k.activeJobs}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{k.totalJobs}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(k.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase text-muted-foreground tracking-wider">{label}</Label>
      {children}
    </div>
  );
}
