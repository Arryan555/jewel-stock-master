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
import { Shield, Settings as SettingsIcon, Save, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ── AMC helpers ──────────────────────────────────────────────────────────────

interface AMCSettings {
  startDate: string;
  endDate: string;
  warnDays: number;
  vendorName: string;
  note: string;
}

const AMC_KEY = "jewel-amc-settings";

function daysRemaining(endDate: string): number {
  if (!endDate) return 0;
  const end = new Date(endDate);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function addMonths(dateStr: string, months: number): string {
  if (!dateStr) dateStr = new Date().toISOString().split("T")[0];
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

// ── Main component ───────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data } = useGetShopSettings();
  const qc = useQueryClient();
  const update = useUpdateShopSettings();
  const { toast } = useToast();

  // Shop settings (backend-persisted)
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

  // AMC (localStorage)
  const [amc, setAmc] = useState<AMCSettings>({
    startDate: new Date().toISOString().split("T")[0],
    endDate: addMonths(new Date().toISOString().split("T")[0], 12),
    warnDays: 30,
    vendorName: "Arryan",
    note: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem(AMC_KEY);
    if (saved) setAmc(JSON.parse(saved));
  }, []);

  const days = daysRemaining(amc.endDate);
  const isActive = days > 0;
  const isWarning = days > 0 && days <= amc.warnDays;

  const daysBetween = Math.ceil(
    (new Date(amc.endDate).getTime() - new Date(amc.startDate).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const progressPct =
    daysBetween > 0 ? Math.max(0, Math.min(100, (days / daysBetween) * 100)) : 0;

  const setAmcField = (k: keyof AMCSettings, v: string | number) =>
    setAmc((p) => ({ ...p, [k]: v }));

  const saveAmc = () => {
    localStorage.setItem(AMC_KEY, JSON.stringify(amc));
    toast({ title: "AMC settings saved" });
  };

  const quickPlan = (months: number) => {
    const end = addMonths(
      amc.startDate || new Date().toISOString().split("T")[0],
      months,
    );
    setAmc((p) => ({ ...p, endDate: end }));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
          <SettingsIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-serif text-3xl font-bold">Settings & AMC</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Shop identity, payment details, and Annual Maintenance Contract
          </p>
        </div>
      </div>

      {/* ── AMC Panel ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          className={cn(
            "shadow-sm border-2",
            isActive && !isWarning
              ? "border-green-300"
              : isWarning
                ? "border-amber-300"
                : "border-red-300",
          )}
        >
          <CardHeader
            className={cn(
              "border-b",
              isActive && !isWarning
                ? "bg-green-50"
                : isWarning
                  ? "bg-amber-50"
                  : "bg-red-50",
            )}
          >
            <CardTitle className="flex items-center gap-2 font-serif text-sm tracking-wider uppercase">
              <Shield
                className={cn(
                  "h-4 w-4",
                  isActive && !isWarning
                    ? "text-green-700"
                    : isWarning
                      ? "text-amber-700"
                      : "text-red-700",
                )}
              />
              AMC — Annual Maintenance Contract
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            <div
              className={cn(
                "rounded-xl border-2 p-6 text-center",
                isActive && !isWarning
                  ? "border-green-300 bg-green-50/50"
                  : isWarning
                    ? "border-amber-300 bg-amber-50/50"
                    : "border-red-300 bg-red-50/50",
              )}
            >
              <div
                className={cn(
                  "text-7xl font-bold tabular-nums",
                  isActive && !isWarning
                    ? "text-green-600"
                    : isWarning
                      ? "text-amber-600"
                      : "text-red-600",
                )}
              >
                {Math.max(0, days)}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Days remaining —{" "}
                {isActive && !isWarning
                  ? "AMC Active"
                  : isWarning
                    ? "AMC Expiring Soon!"
                    : "AMC Expired"}
              </div>
              <div className="mt-4 h-3 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    isActive && !isWarning
                      ? "bg-green-500"
                      : isWarning
                        ? "bg-amber-500"
                        : "bg-red-500",
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  AMC Start Date
                </Label>
                <Input
                  type="date"
                  value={amc.startDate}
                  onChange={(e) => setAmcField("startDate", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  AMC End Date
                </Label>
                <Input
                  type="date"
                  value={amc.endDate}
                  onChange={(e) => setAmcField("endDate", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Quick Plan
              </Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {[
                  { label: "3 Months", months: 3 },
                  { label: "6 Months", months: 6 },
                  { label: "1 Year", months: 12 },
                  { label: "2 Years", months: 24 },
                ].map(({ label, months }) => (
                  <Button
                    key={label}
                    variant="outline"
                    size="sm"
                    className="border-amber-300 text-amber-800 hover:bg-amber-50"
                    onClick={() => quickPlan(months)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Warn Before (Days)
                </Label>
                <Input
                  type="number"
                  value={amc.warnDays}
                  onChange={(e) =>
                    setAmcField("warnDays", parseInt(e.target.value) || 30)
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Vendor Name
                </Label>
                <Input
                  value={amc.vendorName}
                  onChange={(e) => setAmcField("vendorName", e.target.value)}
                  className="mt-1"
                  placeholder="Vendor"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Note
              </Label>
              <Input
                value={amc.note}
                onChange={(e) => setAmcField("note", e.target.value)}
                placeholder="Any note..."
                className="mt-1"
              />
            </div>

            <Button className="w-full" onClick={saveAmc}>
              <Save className="h-4 w-4 mr-2" />
              Save AMC Settings
            </Button>
          </CardContent>
        </Card>

        {/* ── Shop identity quick card ─────────────────────────────────────── */}
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-primary/5">
            <CardTitle className="flex items-center gap-2 font-serif text-sm tracking-wider uppercase">
              <Store className="h-4 w-4 text-primary" />
              Shop Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 pt-6">
            <Field label="Shop name" full>
              <Input
                value={form.shopName}
                onChange={(e) => setForm({ ...form, shopName: e.target.value })}
              />
            </Field>
            <Field label="Tagline" full>
              <Input
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="GSTIN">
              <Input
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value })}
              />
            </Field>
            <Field label="PAN">
              <Input
                value={form.pan}
                onChange={(e) => setForm({ ...form, pan: e.target.value })}
              />
            </Field>
            <Button
              onClick={onSave}
              disabled={update.isPending}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" /> Save Shop Info
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Full shop settings ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base">Address & contact</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
          <Field label="Email">
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="City">
            <Input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </Field>
          <Field label="Address" full>
            <Textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base">Payment details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
          <Field label="UPI ID" full>
            <Input
              placeholder="business@bank"
              value={form.upiId}
              onChange={(e) => setForm({ ...form, upiId: e.target.value })}
            />
          </Field>
          <Field label="Bank name">
            <Input
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
            />
          </Field>
          <Field label="IFSC">
            <Input
              value={form.bankIfsc}
              onChange={(e) => setForm({ ...form, bankIfsc: e.target.value })}
            />
          </Field>
          <Field label="Account number" full>
            <Input
              value={form.bankAccount}
              onChange={(e) =>
                setForm({ ...form, bankAccount: e.target.value })
              }
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base">Invoice terms</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Textarea
            rows={5}
            value={form.invoiceTerms}
            onChange={(e) =>
              setForm({ ...form, invoiceTerms: e.target.value })
            }
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={update.isPending}>
          <Save className="h-4 w-4 mr-2" /> Save all settings
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${full ? "md:col-span-2" : ""}`}>
      <Label className="text-xs uppercase text-muted-foreground tracking-wider">
        {label}
      </Label>
      {children}
    </div>
  );
}
