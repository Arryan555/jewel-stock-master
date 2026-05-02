import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetAmcSettings,
  useUpdateAmcSettings,
  getGetAmcSettingsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, ShieldOff, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PLANS = [
  { value: "3m", label: "3 Months" },
  { value: "6m", label: "6 Months" },
  { value: "1y", label: "1 Year" },
  { value: "2y", label: "2 Years" },
];

function addPlan(startDate: string, plan: string): string {
  const d = new Date(startDate);
  if (plan === "3m") d.setMonth(d.getMonth() + 3);
  else if (plan === "6m") d.setMonth(d.getMonth() + 6);
  else if (plan === "1y") d.setFullYear(d.getFullYear() + 1);
  else if (plan === "2y") d.setFullYear(d.getFullYear() + 2);
  return d.toISOString().slice(0, 10);
}

export default function AmcPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useGetAmcSettings();
  const update = useUpdateAmcSettings();

  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    plan: "1y",
    vendorName: "",
    warnBeforeDays: "30",
    notes: "",
  });

  useEffect(() => {
    if (data) {
      setForm({
        startDate: data.startDate ? data.startDate.slice(0, 10) : "",
        endDate: data.endDate ? data.endDate.slice(0, 10) : "",
        plan: data.plan ?? "1y",
        vendorName: data.vendorName ?? "",
        warnBeforeDays: String(data.warnBeforeDays ?? 30),
        notes: data.notes ?? "",
      });
    }
  }, [data]);

  function applyPlan(plan: string) {
    const start = form.startDate || new Date().toISOString().slice(0, 10);
    setForm((f) => ({ ...f, plan, startDate: start, endDate: addPlan(start, plan) }));
  }

  async function onSave() {
    try {
      await update.mutateAsync({
        data: {
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          plan: form.plan,
          vendorName: form.vendorName.trim() || null,
          warnBeforeDays: parseInt(form.warnBeforeDays) || 30,
          notes: form.notes.trim() || null,
        },
      });
      await qc.invalidateQueries({ queryKey: getGetAmcSettingsQueryKey() });
      toast({ title: "AMC settings saved" });
    } catch (err) {
      toast({ title: "Could not save AMC", description: String((err as Error).message), variant: "destructive" });
    }
  }

  const daysRemaining = data?.daysRemaining ?? null;
  const isExpired = data?.isExpired ?? false;
  const isExpiringSoon = data?.isExpiringSoon ?? false;
  const isActive = !isExpired && daysRemaining !== null && daysRemaining > 0;

  const progressPct = (() => {
    if (!data?.startDate || !data?.endDate || !daysRemaining) return 0;
    const total = (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / 86400000;
    if (total <= 0) return 0;
    return Math.min(100, Math.round((daysRemaining / total) * 100));
  })();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${isExpired ? "bg-red-50 border-red-200" : isExpiringSoon ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
          {isExpired
            ? <ShieldOff className="h-5 w-5 text-red-600" />
            : isExpiringSoon
            ? <ShieldAlert className="h-5 w-5 text-amber-600" />
            : <ShieldCheck className="h-5 w-5 text-emerald-600" />}
        </div>
        <div>
          <h1 className="font-serif text-3xl font-bold">AMC — Annual Maintenance Contract</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your software subscription with your Jewel Suite vendor</p>
        </div>
      </div>

      <Card className={`border-2 shadow-sm overflow-hidden ${isExpired ? "border-red-200" : isExpiringSoon ? "border-amber-200" : "border-emerald-200"}`}>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              {isLoading ? (
                <div className="h-20 w-20 rounded-full bg-secondary animate-pulse" />
              ) : (
                <div className={`text-6xl font-serif font-black tabular-nums ${isExpired ? "text-red-600" : isExpiringSoon ? "text-amber-600" : "text-emerald-600"}`}>
                  {daysRemaining !== null ? daysRemaining : "—"}
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-1 font-medium">
                {isExpired ? "AMC Expired" : isActive ? "Days Remaining — AMC Active" : "Not configured"}
              </p>
            </div>
            <div className="text-right space-y-1">
              {isExpired ? (
                <Badge className="bg-red-100 text-red-800 border-red-200 text-sm">EXPIRED</Badge>
              ) : isExpiringSoon ? (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-sm">EXPIRING SOON</Badge>
              ) : isActive ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-sm">ACTIVE</Badge>
              ) : (
                <Badge variant="secondary">NOT SET</Badge>
              )}
              {data?.startDate && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-2">
                  <Calendar className="h-3 w-3" />
                  {data.startDate.slice(0, 10)} → {data.endDate?.slice(0, 10) ?? "?"}
                </p>
              )}
              {data?.vendorName && (
                <p className="text-xs text-muted-foreground">Vendor: {data.vendorName}</p>
              )}
            </div>
          </div>
          {daysRemaining !== null && !isExpired && (
            <div className="space-y-1">
              <div className="h-3 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isExpiringSoon ? "bg-amber-400" : "bg-emerald-500"}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">{progressPct}% of contract remaining</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b"><CardTitle className="text-base">AMC Settings</CardTitle></CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Quick plan</Label>
            <div className="flex gap-2 flex-wrap">
              {PLANS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => applyPlan(p.value)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    form.plan === p.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-secondary/50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">AMC Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value, endDate: addPlan(e.target.value, f.plan) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">AMC End Date</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Vendor / Software Provider</Label>
              <Input
                value={form.vendorName}
                onChange={(e) => setForm((f) => ({ ...f, vendorName: e.target.value }))}
                placeholder="e.g. Arryan Technologies"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Warn before expiry (days)</Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={form.warnBeforeDays}
                onChange={(e) => setForm((f) => ({ ...f, warnBeforeDays: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Any renewal notes or contact details..."
            />
          </div>

          <Button onClick={onSave} disabled={update.isPending} className="w-full md:w-auto">
            {update.isPending ? "Saving..." : "Save AMC Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
