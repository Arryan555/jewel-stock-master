import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Save, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";

interface MetalRate {
  id: string;
  date: string;
  gold24k: string;
  gold22k: string;
  gold18k: string;
  silver: string;
  makingPct: string;
  wastagePct: string;
}

export default function RatesIndex() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: todayRate } = useQuery<MetalRate | null>({
    queryKey: ["rates-today"],
    queryFn: () => fetch("/api/rates/today").then(r => r.json()),
  });

  const { data: history = [] } = useQuery<MetalRate[]>({
    queryKey: ["rates-history"],
    queryFn: () => fetch("/api/rates").then(r => r.json()),
  });

  const [form, setForm] = useState({
    gold24k: "", gold22k: "", gold18k: "", silver: "",
    makingPct: "10", wastagePct: "5",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleTodayLoad = () => {
    if (todayRate) {
      setForm({
        gold24k: todayRate.gold24k,
        gold22k: todayRate.gold22k,
        gold18k: todayRate.gold18k,
        silver: todayRate.silver,
        makingPct: todayRate.makingPct,
        wastagePct: todayRate.wastagePct,
      });
    }
  };

  const calcDerived = (g24: string) => {
    const v24 = parseFloat(g24) || 0;
    return {
      gold22k: (v24 * 22 / 24).toFixed(2),
      gold18k: (v24 * 18 / 24).toFixed(2),
    };
  };

  const handleGold24Change = (v: string) => {
    const derived = calcDerived(v);
    setForm(p => ({ ...p, gold24k: v, ...derived }));
  };

  const save = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, ...form }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rates-today"] });
      qc.invalidateQueries({ queryKey: ["rates-history"] });
      toast({ title: "Rates saved for today" });
    },
    onError: () => toast({ title: "Error saving rates", variant: "destructive" }),
  });

  const g24 = parseFloat(form.gold24k) || 0;
  const g22 = parseFloat(form.gold22k) || 0;
  const g18 = parseFloat(form.gold18k) || 0;
  const silv = parseFloat(form.silver) || 0;
  const makingPct = parseFloat(form.makingPct) || 10;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Au / Ag Rates</h1>
        <p className="text-muted-foreground mt-1">Today's gold and silver rates — {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rate Input Card */}
        <Card className="shadow-sm border-amber-200">
          <CardHeader className="border-b bg-amber-50/50">
            <CardTitle className="text-base font-serif flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-700" />
              Set Today's Rates
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {todayRate && (
              <Button variant="outline" size="sm" className="w-full text-amber-700 border-amber-300" onClick={handleTodayLoad}>
                <RefreshCw className="h-3 w-3 mr-2" />
                Load saved today's rates
              </Button>
            )}

            <div>
              <Label className="text-amber-800 font-semibold">Gold 24K (₹/g) *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.gold24k}
                onChange={e => handleGold24Change(e.target.value)}
                placeholder="e.g. 7200"
                className="text-right font-mono text-lg border-amber-300 focus:border-amber-500"
              />
              <p className="text-xs text-muted-foreground mt-1">Auto-calculates 22K and 18K</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Gold 22K (₹/g)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.gold22k}
                  onChange={e => set("gold22k", e.target.value)}
                  placeholder="0"
                  className="text-right font-mono"
                />
              </div>
              <div>
                <Label>Gold 18K (₹/g)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.gold18k}
                  onChange={e => set("gold18k", e.target.value)}
                  placeholder="0"
                  className="text-right font-mono"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-700 font-semibold">Silver (₹/g)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.silver}
                onChange={e => set("silver", e.target.value)}
                placeholder="e.g. 85"
                className="text-right font-mono border-slate-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Making (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.makingPct}
                  onChange={e => set("makingPct", e.target.value)}
                  placeholder="10"
                  className="text-right font-mono"
                />
              </div>
              <div>
                <Label>Wastage (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.wastagePct}
                  onChange={e => set("wastagePct", e.target.value)}
                  placeholder="5"
                  className="text-right font-mono"
                />
              </div>
            </div>

            <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending || !form.gold24k}>
              <Save className="h-4 w-4 mr-2" />
              {save.isPending ? "Saving..." : "Save Today's Rates"}
            </Button>
          </CardContent>
        </Card>

        {/* Preview Card */}
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-primary/5">
            <CardTitle className="text-base font-serif">Rate Preview</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Gold 24K", value: g24, color: "text-amber-700" },
                { label: "Gold 22K", value: g22, color: "text-amber-600" },
                { label: "Gold 18K", value: g18, color: "text-amber-500" },
                { label: "Silver", value: silv, color: "text-slate-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="border rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className={`text-xl font-bold font-mono ${color}`}>
                    {value > 0 ? formatCurrency(value) : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">per gram</div>
                </div>
              ))}
            </div>

            {g24 > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <div className="text-sm font-semibold text-amber-800">Sample: 10g 22K with {makingPct}% making</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Metal value (10g @ {formatCurrency(g22)}/g)</span>
                    <span className="font-mono">{formatCurrency(g22 * 10)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Making ({makingPct}%)</span>
                    <span className="font-mono">{formatCurrency(g22 * 10 * makingPct / 100)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>Total</span>
                    <span className="font-mono">{formatCurrency(g22 * 10 * (1 + makingPct / 100))}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History */}
      {history.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-base font-serif">Rate History (Last 30 days)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Gold 24K</TableHead>
                  <TableHead className="text-right">Gold 22K</TableHead>
                  <TableHead className="text-right">Gold 18K</TableHead>
                  <TableHead className="text-right">Silver</TableHead>
                  <TableHead className="text-right">Making %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{new Date(r.date).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell className="text-right font-mono text-amber-700">{formatCurrency(parseFloat(r.gold24k))}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(parseFloat(r.gold22k))}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(parseFloat(r.gold18k))}</TableCell>
                    <TableCell className="text-right font-mono text-slate-600">{formatCurrency(parseFloat(r.silver))}</TableCell>
                    <TableCell className="text-right font-mono">{parseFloat(r.makingPct).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
