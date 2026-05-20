import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck, Plus, Pencil, Trash2, Store, Phone, MapPin,
  User, Check, X, Building2, KeyRound, Eye, EyeOff,
  CalendarDays, AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  loadSubscribers, saveSubscribers, type Subscriber,
  getAdminCreds, saveAdminCreds,
} from "@/context/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Branch {
  id: string;
  name: string;
  location: string;
  phone: string;
  manager: string;
  isConsolidation: boolean;
  active: boolean;
}

const BRANCHES_KEY  = "jewel-admin-branches";
const MASTER_PIN    = "jewel-admin-pin";

function rk() { return Math.random().toString(36).slice(2, 10); }
function today() { return new Date().toISOString().slice(0, 10); }

function addMonths(dateStr: string, months: number) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function amcDays(endDate: string) {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
}

function amcBadge(endDate: string) {
  const d = amcDays(endDate);
  if (d < 0)  return { label: "Expired",   cls: "bg-red-100 text-red-800 border-red-300" };
  if (d < 30) return { label: `${d}d left`, cls: "bg-amber-100 text-amber-800 border-amber-300" };
  return         { label: "Active",    cls: "bg-green-100 text-green-800 border-green-300" };
}

const PLAN_OPTS: { value: Subscriber["plan"]; label: string; months: number }[] = [
  { value: "monthly",     label: "Monthly",     months: 1  },
  { value: "quarterly",   label: "Quarterly",   months: 3  },
  { value: "half-yearly", label: "Half-Yearly", months: 6  },
  { value: "annual",      label: "Annual",      months: 12 },
  { value: "biennial",    label: "2 Years",     months: 24 },
];

function planMonths(plan: Subscriber["plan"]) {
  return PLAN_OPTS.find(p => p.value === plan)?.months ?? 12;
}

function nextSubId(list: Subscriber[]) {
  const nums = list.map(s => parseInt(s.id.replace("JS-", ""), 10)).filter(n => !isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `JS-${String(next).padStart(3, "0")}`;
}

// ─── Persistence ─────────────────────────────────────────────────────────────

function loadBranches(): Branch[] {
  try {
    const raw = localStorage.getItem(BRANCHES_KEY);
    if (raw) return JSON.parse(raw) as Branch[];
  } catch { /* ignore */ }
  return [
    { id: "branch-main", name: "Main Branch", location: "Head Office", phone: "", manager: "", isConsolidation: false, active: true },
    { id: "branch-all",  name: "All Branches", location: "Consolidated", phone: "", manager: "", isConsolidation: true, active: true },
  ];
}
function saveBranchesLS(b: Branch[]) { localStorage.setItem(BRANCHES_KEY, JSON.stringify(b)); }

// ─── Branch Row ───────────────────────────────────────────────────────────────

function BranchRow({ branch, onSave, onDelete }: {
  branch: Branch;
  onSave: (b: Branch) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(!branch.name);
  const [draft, setDraft]     = useState(branch);
  const commit = () => { if (!draft.name.trim()) return; onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(branch); setEditing(false); };

  if (editing) return (
    <tr className="bg-amber-50/60 border-b">
      {(["name","location","phone","manager"] as const).map(f => (
        <td key={f} className="px-3 py-2">
          <Input value={draft[f]} onChange={e => setDraft(d => ({ ...d, [f]: e.target.value }))}
            className="h-7 text-sm" placeholder={f} autoFocus={f === "name"} />
        </td>
      ))}
      <td className="px-3 py-2 text-center">
        <Select value={draft.active ? "active" : "inactive"} onValueChange={v => setDraft(d => ({ ...d, active: v === "active" }))}>
          <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex gap-1 justify-end">
          <Button size="icon" variant="ghost" className="h-7 w-7 text-green-700" onClick={commit}><Check className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={cancel}><X className="h-3.5 w-3.5" /></Button>
        </div>
      </td>
    </tr>
  );

  return (
    <tr className={cn("border-b hover:bg-secondary/30", !branch.active && "opacity-50")}>
      <td className="px-3 py-2.5 font-medium text-sm">
        <span className="flex items-center gap-2">
          {branch.isConsolidation
            ? <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">Consolidated</Badge>
            : <Store className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
          {branch.name}
        </span>
      </td>
      <td className="px-3 py-2.5 text-sm text-muted-foreground">{branch.location || "—"}</td>
      <td className="px-3 py-2.5 text-sm text-muted-foreground">{branch.phone || "—"}</td>
      <td className="px-3 py-2.5 text-sm text-muted-foreground">{branch.manager || "—"}</td>
      <td className="px-3 py-2.5 text-center">
        <Badge variant={branch.active ? "default" : "secondary"} className="text-[10px]">{branch.active ? "Active" : "Inactive"}</Badge>
      </td>
      <td className="px-3 py-2.5 text-right">
        {!branch.isConsolidation && (
          <div className="flex gap-1 justify-end">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(branch.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Add Subscriber Form ──────────────────────────────────────────────────────

function AddSubscriberForm({ existing, onAdd, onCancel }: {
  existing: Subscriber[];
  onAdd: (s: Subscriber) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    shopName: "", ownerName: "", phone: "",
    plan: "annual" as Subscriber["plan"],
    loginId: "", password: "",
    amcStart: today(),
    amcEnd: addMonths(today(), 12),
  });
  const [showPw, setShowPw] = useState(false);
  const { toast } = useToast();

  const f = <K extends keyof typeof form>(k: K, v: typeof form[K]) => {
    setForm(prev => {
      const next = { ...prev, [k]: v };
      if (k === "plan" || k === "amcStart") {
        next.amcEnd = addMonths(next.amcStart, planMonths(next.plan));
      }
      return next;
    });
  };

  const submit = () => {
    if (!form.shopName.trim()) { toast({ title: "Shop name required", variant: "destructive" }); return; }
    if (!form.loginId.trim())  { toast({ title: "Login ID required", variant: "destructive" }); return; }
    if (!form.password.trim()) { toast({ title: "Password required", variant: "destructive" }); return; }
    if (existing.some(s => s.loginId === form.loginId.trim())) {
      toast({ title: "Login ID already taken — choose another", variant: "destructive" }); return;
    }
    const sub: Subscriber = {
      id: nextSubId(existing),
      shopName: form.shopName.trim(),
      ownerName: form.ownerName.trim(),
      phone: form.phone.trim(),
      plan: form.plan,
      loginId: form.loginId.trim().toLowerCase(),
      password: form.password.trim(),
      amcStart: form.amcStart,
      amcEnd: form.amcEnd,
      active: true,
      createdAt: today(),
    };
    onAdd(sub);
  };

  return (
    <div className="border rounded-xl p-4 bg-amber-50/30 space-y-4">
      <h3 className="font-serif font-semibold text-sm">New Subscriber</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Shop Name *</Label>
          <Input value={form.shopName} onChange={e => f("shopName", e.target.value)} className="mt-1 h-8 text-sm" placeholder="Ram Jewellers" autoFocus />
        </div>
        <div>
          <Label className="text-xs">Owner Name</Label>
          <Input value={form.ownerName} onChange={e => f("ownerName", e.target.value)} className="mt-1 h-8 text-sm" placeholder="Ram Prasad" />
        </div>
        <div>
          <Label className="text-xs">Phone</Label>
          <Input value={form.phone} onChange={e => f("phone", e.target.value)} className="mt-1 h-8 text-sm" placeholder="+91…" />
        </div>
        <div>
          <Label className="text-xs">Plan *</Label>
          <Select value={form.plan} onValueChange={v => f("plan", v as Subscriber["plan"])}>
            <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PLAN_OPTS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">AMC Start</Label>
          <Input type="date" value={form.amcStart} onChange={e => f("amcStart", e.target.value)} className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">AMC End (auto)</Label>
          <Input type="date" value={form.amcEnd} onChange={e => f("amcEnd", e.target.value)} className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Login ID *</Label>
          <Input value={form.loginId} onChange={e => f("loginId", e.target.value.toLowerCase())} className="mt-1 h-8 text-sm font-mono" placeholder="ramjewellers" />
        </div>
        <div>
          <Label className="text-xs">Password *</Label>
          <div className="relative mt-1">
            <Input type={showPw ? "text" : "password"} value={form.password} onChange={e => f("password", e.target.value)}
              className="h-8 text-sm pr-8" placeholder="Set password" />
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPw(v => !v)}>
              {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={submit}><Check className="h-3.5 w-3.5 mr-1.5" /> Add Subscriber</Button>
        <Button size="sm" variant="outline" onClick={onCancel}><X className="h-3.5 w-3.5 mr-1.5" /> Cancel</Button>
      </div>
    </div>
  );
}

// ─── Subscriber Row ───────────────────────────────────────────────────────────

function SubscriberRow({ sub, onSave, onDelete, onRenew }: {
  sub: Subscriber;
  onSave: (s: Subscriber) => void;
  onDelete: (id: string) => void;
  onRenew: (id: string, plan: Subscriber["plan"]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sub);
  const [showPw, setShowPw] = useState(false);
  const badge = amcBadge(sub.amcEnd);
  const days  = amcDays(sub.amcEnd);

  const commit = () => { onSave(draft); setEditing(false); };

  if (editing) return (
    <tr className="bg-amber-50/40 border-b align-top">
      <td className="px-2 py-2 text-xs text-muted-foreground font-mono">{sub.id}</td>
      <td className="px-2 py-2"><Input value={draft.shopName} onChange={e => setDraft(d => ({ ...d, shopName: e.target.value }))} className="h-7 text-xs" autoFocus /></td>
      <td className="px-2 py-2"><Input value={draft.ownerName} onChange={e => setDraft(d => ({ ...d, ownerName: e.target.value }))} className="h-7 text-xs" /></td>
      <td className="px-2 py-2"><Input value={draft.phone} onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))} className="h-7 text-xs" /></td>
      <td className="px-2 py-2">
        <Select value={draft.plan} onValueChange={v => {
          const months = planMonths(v as Subscriber["plan"]);
          setDraft(d => ({ ...d, plan: v as Subscriber["plan"], amcEnd: addMonths(d.amcStart, months) }));
        }}>
          <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{PLAN_OPTS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="px-2 py-2"><Input type="date" value={draft.amcStart} onChange={e => setDraft(d => ({ ...d, amcStart: e.target.value }))} className="h-7 text-xs w-32" /></td>
      <td className="px-2 py-2"><Input type="date" value={draft.amcEnd} onChange={e => setDraft(d => ({ ...d, amcEnd: e.target.value }))} className="h-7 text-xs w-32" /></td>
      <td className="px-2 py-2"><Input value={draft.loginId} onChange={e => setDraft(d => ({ ...d, loginId: e.target.value }))} className="h-7 text-xs font-mono" /></td>
      <td className="px-2 py-2">
        <div className="relative">
          <Input type={showPw ? "text" : "password"} value={draft.password} onChange={e => setDraft(d => ({ ...d, password: e.target.value }))} className="h-7 text-xs pr-6" />
          <button type="button" className="absolute right-1.5 top-1/2 -translate-y-1/2" onClick={() => setShowPw(v => !v)}>
            {showPw ? <EyeOff className="h-3 w-3 text-muted-foreground" /> : <Eye className="h-3 w-3 text-muted-foreground" />}
          </button>
        </div>
      </td>
      <td className="px-2 py-2">
        <Select value={draft.active ? "active" : "inactive"} onValueChange={v => setDraft(d => ({ ...d, active: v === "active" }))}>
          <SelectTrigger className="h-7 text-xs w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-2 py-2">
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7 text-green-700" onClick={commit}><Check className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setEditing(false)}><X className="h-3.5 w-3.5" /></Button>
        </div>
      </td>
    </tr>
  );

  return (
    <tr className={cn("border-b hover:bg-secondary/20 text-sm", !sub.active && "opacity-50")}>
      <td className="px-2 py-2.5 font-mono text-xs text-muted-foreground">{sub.id}</td>
      <td className="px-2 py-2.5 font-medium">{sub.shopName}</td>
      <td className="px-2 py-2.5 text-muted-foreground">{sub.ownerName || "—"}</td>
      <td className="px-2 py-2.5 text-muted-foreground">{sub.phone || "—"}</td>
      <td className="px-2 py-2.5">
        <Badge variant="outline" className="text-[10px]">{PLAN_OPTS.find(p => p.value === sub.plan)?.label}</Badge>
      </td>
      <td className="px-2 py-2.5 text-xs text-muted-foreground">{sub.amcStart}</td>
      <td className="px-2 py-2.5">
        <div className="flex items-center gap-1.5">
          <Badge className={cn("text-[10px] border", badge.cls)}>{badge.label}</Badge>
          <span className="text-[10px] text-muted-foreground">{sub.amcEnd}</span>
        </div>
        {/* Quick renew buttons */}
        <div className="flex gap-1 mt-1">
          {PLAN_OPTS.map(p => (
            <button key={p.value} onClick={() => onRenew(sub.id, p.value)}
              className="text-[9px] px-1.5 py-0.5 rounded border border-border hover:border-primary hover:text-primary transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      </td>
      <td className="px-2 py-2.5 font-mono text-xs">{sub.loginId}</td>
      <td className="px-2 py-2.5 font-mono text-xs text-muted-foreground">{"•".repeat(Math.min(sub.password.length, 8))}</td>
      <td className="px-2 py-2.5">
        <Badge variant={sub.active ? "default" : "secondary"} className="text-[10px]">{sub.active ? "Active" : "Inactive"}</Badge>
      </td>
      <td className="px-2 py-2.5">
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(sub.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Super Admin Page ─────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const { toast } = useToast();
  const [branches,     setBranches]     = useState<Branch[]>(loadBranches);
  const [subscribers,  setSubscribers]  = useState<Subscriber[]>(loadSubscribers);
  const [pinVerified,  setPinVerified]  = useState(false);
  const [pinInput,     setPinInput]     = useState("");
  const [showAddForm,  setShowAddForm]  = useState(false);
  const [newAdminId,   setNewAdminId]   = useState("");
  const [newAdminPw,   setNewAdminPw]   = useState("");
  const [showNewPw,    setShowNewPw]    = useState(false);

  const MASTER_PIN_VAL = localStorage.getItem(MASTER_PIN) ?? "1234";

  const verify = () => {
    if (pinInput === MASTER_PIN_VAL) { setPinVerified(true); }
    else { toast({ title: "Incorrect PIN", variant: "destructive" }); }
  };

  // Branch helpers
  const saveBranch = (b: Branch) => {
    const u = branches.map(br => br.id === b.id ? b : br);
    setBranches(u); saveBranchesLS(u);
    toast({ title: `Branch "${b.name}" saved` });
  };
  const deleteBranch = (id: string) => {
    const u = branches.filter(b => b.id !== id);
    setBranches(u); saveBranchesLS(u);
    toast({ title: "Branch removed" });
  };
  const addBranch = () => {
    const count = branches.filter(b => !b.isConsolidation).length;
    if (count >= 10) { toast({ title: "Max 10 branches", variant: "destructive" }); return; }
    const nb: Branch = { id: rk(), name: "", location: "", phone: "", manager: "", isConsolidation: false, active: true };
    const next = [...branches.filter(b => !b.isConsolidation), nb, ...branches.filter(b => b.isConsolidation)];
    setBranches(next); saveBranchesLS(next);
  };

  // Subscriber helpers
  const addSub = (s: Subscriber) => {
    const next = [...subscribers, s];
    setSubscribers(next); saveSubscribers(next);
    setShowAddForm(false);
    toast({ title: `Subscriber "${s.shopName}" added (ID: ${s.id})` });
  };
  const saveSub = (s: Subscriber) => {
    const next = subscribers.map(x => x.id === s.id ? s : x);
    setSubscribers(next); saveSubscribers(next);
    toast({ title: `Subscriber "${s.shopName}" updated` });
  };
  const deleteSub = (id: string) => {
    const next = subscribers.filter(s => s.id !== id);
    setSubscribers(next); saveSubscribers(next);
    toast({ title: "Subscriber removed" });
  };
  const renewSub = (id: string, plan: Subscriber["plan"]) => {
    const start = today();
    const end   = addMonths(start, planMonths(plan));
    const next  = subscribers.map(s => s.id === id ? { ...s, plan, amcStart: start, amcEnd: end } : s);
    setSubscribers(next); saveSubscribers(next);
    toast({ title: `AMC renewed — ${PLAN_OPTS.find(p => p.value === plan)?.label}` });
  };

  const regularBranches    = branches.filter(b => !b.isConsolidation);
  const consolidatedBranch = branches.find(b => b.isConsolidation);
  const expiring = subscribers.filter(s => s.active && amcDays(s.amcEnd) < 30 && amcDays(s.amcEnd) >= 0);
  const expired  = subscribers.filter(s => s.active && amcDays(s.amcEnd) < 0);

  // ── PIN Gate ──────────────────────────────────────────────────────────────
  if (!pinVerified) {
    return (
      <div className="max-w-sm mx-auto mt-20 space-y-4">
        <div className="text-center">
          <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-3" />
          <h2 className="text-2xl font-serif font-bold">Super Admin</h2>
          <p className="text-muted-foreground text-sm mt-1">Enter master PIN to continue</p>
        </div>
        <Card>
          <CardContent className="pt-5 space-y-3">
            <div>
              <Label>Master PIN</Label>
              <Input type="password" placeholder="Enter PIN" value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && verify()}
                className="mt-1 text-center tracking-widest text-lg" maxLength={8} />
            </div>
            <Button className="w-full" onClick={verify}>
              <ShieldCheck className="h-4 w-4 mr-2" /> Verify & Enter
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">Default PIN: 1234</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-serif font-bold">Super Admin</h1>
          <p className="text-muted-foreground text-sm">Subscribers, branches and system controls</p>
        </div>
        <Badge className="ml-auto bg-amber-100 text-amber-800 border-amber-300">Admin Session</Badge>
      </div>

      {/* AMC alerts */}
      {(expired.length > 0 || expiring.length > 0) && (
        <div className="space-y-1.5">
          {expired.map(s => (
            <div key={s.id} className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <span className="font-medium text-red-700">{s.shopName} ({s.id})</span>
              <span className="text-red-600">— AMC expired {Math.abs(amcDays(s.amcEnd))} days ago</span>
            </div>
          ))}
          {expiring.map(s => (
            <div key={s.id} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm">
              <CalendarDays className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span className="font-medium text-amber-700">{s.shopName} ({s.id})</span>
              <span className="text-amber-600">— AMC expiring in {amcDays(s.amcEnd)} days</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Subscribers", value: subscribers.length },
          { label: "Active",            value: subscribers.filter(s => s.active).length },
          { label: "AMC Alerts",        value: expiring.length + expired.length },
          { label: "Branches",          value: regularBranches.length },
        ].map(({ label, value }) => (
          <Card key={label} className="shadow-sm border-border/50">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-2xl font-bold text-primary font-mono">{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="subscribers">
        <TabsList>
          <TabsTrigger value="subscribers"><Store className="h-3.5 w-3.5 mr-1.5" />Subscribers</TabsTrigger>
          <TabsTrigger value="branches"><Building2 className="h-3.5 w-3.5 mr-1.5" />Branches</TabsTrigger>
          <TabsTrigger value="security"><KeyRound className="h-3.5 w-3.5 mr-1.5" />Security</TabsTrigger>
        </TabsList>

        {/* ── Subscribers tab ── */}
        <TabsContent value="subscribers" className="mt-4 space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-serif">Jewellers / Subscribers</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Each subscriber gets a unique ID, login credentials and individual AMC plan
                </p>
              </div>
              <Button size="sm" onClick={() => setShowAddForm(v => !v)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Subscriber
              </Button>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {showAddForm && (
                <AddSubscriberForm
                  existing={subscribers}
                  onAdd={addSub}
                  onCancel={() => setShowAddForm(false)}
                />
              )}

              {subscribers.length === 0 && !showAddForm ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  <Store className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No subscribers yet — click Add Subscriber to get started
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[1000px]">
                    <thead>
                      <tr className="bg-secondary/30 text-[10px] text-muted-foreground uppercase tracking-wide border-b">
                        {["ID","Shop Name","Owner","Phone","Plan","AMC Start","AMC End / Renew","Login ID","Password","Status",""].map(h => (
                          <th key={h} className="px-2 py-2 font-semibold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {subscribers.map(s => (
                        <SubscriberRow key={s.id} sub={s} onSave={saveSub} onDelete={deleteSub} onRenew={renewSub} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Branches tab ── */}
        <TabsContent value="branches" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-serif">Branch Management</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{regularBranches.length} / 10 branches</p>
              </div>
              <Button size="sm" onClick={addBranch} disabled={regularBranches.length >= 10}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Branch
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-secondary/30 text-xs text-muted-foreground uppercase tracking-wide border-b">
                    {[{ l: "Branch Name", i: Store }, { l: "Location", i: MapPin }, { l: "Phone", i: Phone }, { l: "Manager", i: User }].map(({ l, i: Icon }) => (
                      <th key={l} className="px-3 py-2 font-semibold">
                        <span className="flex items-center gap-1"><Icon className="h-3 w-3" />{l}</span>
                      </th>
                    ))}
                    <th className="px-3 py-2 font-semibold text-center">Status</th>
                    <th className="px-3 py-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {regularBranches.map(b => <BranchRow key={b.id} branch={b} onSave={saveBranch} onDelete={deleteBranch} />)}
                  {consolidatedBranch && (
                    <>
                      <tr><td colSpan={6} className="px-3 py-1 text-[10px] text-muted-foreground uppercase bg-secondary/20 font-semibold">Consolidation View</td></tr>
                      <BranchRow key={consolidatedBranch.id} branch={consolidatedBranch} onSave={saveBranch} onDelete={deleteBranch} />
                    </>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security tab ── */}
        <TabsContent value="security" className="mt-4 space-y-4">
          <Card className="shadow-sm max-w-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-serif flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" /> Admin Login Credentials
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Change the login ID and password for the admin account
              </p>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div>
                <Label className="text-xs">New Login ID</Label>
                <Input value={newAdminId} onChange={e => setNewAdminId(e.target.value)}
                  className="mt-1 h-8 text-sm font-mono" placeholder="admin" />
              </div>
              <div>
                <Label className="text-xs">New Password</Label>
                <div className="relative mt-1">
                  <Input type={showNewPw ? "text" : "password"} value={newAdminPw}
                    onChange={e => setNewAdminPw(e.target.value)} className="h-8 text-sm pr-8" placeholder="••••••••" />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowNewPw(v => !v)}>
                    {showNewPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <Button size="sm" className="w-full" onClick={() => {
                if (!newAdminId.trim() || newAdminPw.length < 6) {
                  toast({ title: "Login ID and password (min 6 chars) required", variant: "destructive" }); return;
                }
                saveAdminCreds({ loginId: newAdminId.trim(), password: newAdminPw.trim() });
                toast({ title: "Admin credentials updated — takes effect on next login" });
                setNewAdminId(""); setNewAdminPw("");
              }}>
                Update Admin Credentials
              </Button>
              <p className="text-[11px] text-muted-foreground">Current login ID: {getAdminCreds().loginId}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm max-w-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-serif flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" /> Change Master PIN
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">PIN required to enter this Super Admin panel</p>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <ChangePinForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChangePinForm() {
  const { toast } = useToast();
  const [pin, setPin] = useState("");
  return (
    <>
      <div>
        <Label className="text-xs">New Master PIN (min 4 digits)</Label>
        <Input type="password" placeholder="••••" value={pin} onChange={e => setPin(e.target.value)} className="mt-1 tracking-widest" maxLength={8} />
      </div>
      <Button size="sm" className="w-full" onClick={() => {
        if (pin.length < 4) { toast({ title: "PIN must be at least 4 digits", variant: "destructive" }); return; }
        localStorage.setItem(MASTER_PIN, pin);
        toast({ title: "Master PIN updated" });
        setPin("");
      }}>
        Update PIN
      </Button>
    </>
  );
}
