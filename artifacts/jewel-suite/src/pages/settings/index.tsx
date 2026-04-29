import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetShopSettings,
  useUpdateShopSettings,
  getGetShopSettingsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings as SettingsIcon, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { data } = useGetShopSettings();
  const qc = useQueryClient();
  const update = useUpdateShopSettings();
  const { toast } = useToast();

  const [form, setForm] = useState({
    shopName: "",
    tagline: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    gstin: "",
    pan: "",
    upiId: "",
    bankName: "",
    bankAccount: "",
    bankIfsc: "",
    invoiceTerms: "",
  });

  useEffect(() => {
    if (data) {
      setForm({
        shopName: data.shopName ?? "",
        tagline: data.tagline ?? "",
        address: data.address ?? "",
        city: data.city ?? "",
        phone: data.phone ?? "",
        email: data.email ?? "",
        gstin: data.gstin ?? "",
        pan: data.pan ?? "",
        upiId: data.upiId ?? "",
        bankName: data.bankName ?? "",
        bankAccount: data.bankAccount ?? "",
        bankIfsc: data.bankIfsc ?? "",
        invoiceTerms: data.invoiceTerms ?? "",
      });
    }
  }, [data]);

  async function onSave() {
    if (!form.shopName) {
      toast({ title: "Shop name required", variant: "destructive" });
      return;
    }
    await update.mutateAsync({
      data: {
        shopName: form.shopName,
        tagline: form.tagline || null,
        address: form.address || null,
        city: form.city || null,
        phone: form.phone || null,
        email: form.email || null,
        gstin: form.gstin || null,
        pan: form.pan || null,
        upiId: form.upiId || null,
        bankName: form.bankName || null,
        bankAccount: form.bankAccount || null,
        bankIfsc: form.bankIfsc || null,
        invoiceTerms: form.invoiceTerms || null,
      },
    });
    await qc.invalidateQueries({ queryKey: getGetShopSettingsQueryKey() });
    toast({ title: "Settings saved" });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
          <SettingsIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-serif text-3xl font-bold">Shop Settings</h1>
          <p className="text-muted-foreground text-sm mt-0.5">These appear on invoices, estimates and customer messages</p>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b"><CardTitle className="text-base">Shop identity</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
          <Field label="Shop name" full><Input value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} /></Field>
          <Field label="Tagline" full><Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Address" full><Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b"><CardTitle className="text-base">Tax & compliance</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
          <Field label="GSTIN"><Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} /></Field>
          <Field label="PAN"><Input value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value })} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b"><CardTitle className="text-base">Payment details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
          <Field label="UPI ID" full><Input placeholder="business@bank" value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} /></Field>
          <Field label="Bank name"><Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} /></Field>
          <Field label="IFSC"><Input value={form.bankIfsc} onChange={(e) => setForm({ ...form, bankIfsc: e.target.value })} /></Field>
          <Field label="Account number" full><Input value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b"><CardTitle className="text-base">Invoice terms</CardTitle></CardHeader>
        <CardContent className="pt-6">
          <Textarea rows={5} value={form.invoiceTerms} onChange={(e) => setForm({ ...form, invoiceTerms: e.target.value })} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={update.isPending}>
          <Save className="h-4 w-4 mr-2" /> Save settings
        </Button>
      </div>
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${full ? "md:col-span-2" : ""}`}>
      <Label className="text-xs uppercase text-muted-foreground tracking-wider">{label}</Label>
      {children}
    </div>
  );
}
