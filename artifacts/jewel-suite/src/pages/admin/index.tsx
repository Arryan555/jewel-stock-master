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
  User, Check, X, Users, CalendarDays, Building2, KeyRound,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type UserRole = "super_admin" | "admin" | "manager" | "user";

interface AdminUser {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  branchId: string;
  pin: string;
  amcStart: string;
  amcEnd: string;
  active: boolean;
}

interface Branch {
  id: string;
  name: string;
  location: string;
  phone: string;
  manager: string;
  isConsolidation: boolean;
  active: boolean;
}

const BRANCHES_KEY = "jewel-admin-branches";
const USERS_KEY    = "jewel-admin-users";
const MASTER_PIN   = "jewel-admin-pin";

function rk() { return Math.random().toString(36).slice(2, 10); }

function today() { return new Date().toISOString().slice(0, 10); }
function addMonths(dateStr: string, months: number) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function amcStatus(endDate: string): { label: string; color: string; days: number } {
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
  if (diff < 0)  return { label: "Expired",    color: "text-red-600",    days: diff };
  if (diff < 30) return { label: "Expiring",   color: "text-amber-600",  days: diff };
  return            { label: "Active",      color: "text-emerald-600", days: diff };
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin:       "Admin",
  manager:     "Manager",
  user:        "User",
};

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: "bg-amber-100 text-amber-800 border-amber-300",
  admin:       "bg-blue-100 text-blue-800 border-blue-300",
  manager:     "bg-purple-100 text-purple-800 border-purple-300",
  user:        "bg-secondary text-muted-foreground",
};

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

function loadUsers(): AdminUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw) as AdminUser[];
  } catch { /* ignore */ }
  return [
    {
      id: "user-1", name: "Super Admin", phone: "", role: "super_admin",
      branchId: "branch-all", pin: "1234",
      amcStart: today(), amcEnd: addMonths(today(), 12), active: true,
    },
  ];
}

function loadMasterPin(): string {
  return localStorage.getItem(MASTER_PIN) ?? "1234";
}

function saveBranches(b: Branch[]) { localStorage.setItem(BRANCHES_KEY, JSON.stringify(b)); }
function saveUsers(u: AdminUser[])  { localStorage.setItem(USERS_KEY,    JSON.stringify(u)); }
function saveMasterPin(p: string)   { localStorage.setItem(MASTER_PIN,   p); }

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

  if (editing) {
    return (
      <tr className="bg-amber-50/60 border-b">
        {(["name","location","phone","manager"] as const).map(f => (
          <td key={f} className="px-3 py-2">
            <Input value={draft[f]} onChange={e => setDraft(d => ({ ...d, [f]: e.target.value }))}
              className="h-7 text-sm" placeholder={f.charAt(0).toUpperCase() + f.slice(1)} autoFocus={f === "name"} />
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
  }

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

// ─── User Row ────────────────────────────────────────────────────────────────

function UserRow({ user, branches, onSave, onDelete }: {
  user: AdminUser;
  branches: Branch[];
  onSave: (u: AdminUser) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(!user.name);
  const [draft, setDraft]     = useState(user);
  const [showPin, setShowPin] = useState(false);

  const commit = () => { if (!draft.name.trim()) return; onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(user); setEditing(false); };
  const status = amcStatus(user.amcEnd);

  if (editing) {
    return (
      <tr className="bg-amber-50/60 border-b align-top">
        <td className="px-3 py-2">
          <Input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            className="h-7 text-sm" placeholder="Full name" autoFocus />
        </td>
        <td className="px-3 py-2">
          <Input value={draft.phone} onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))}
            className="h-7 text-sm" placeholder="+91…" />
        </td>
        <td className="px-3 py-2">
          <Select value={draft.role} onValueChange={v => setDraft(d => ({ ...d, role: v as UserRole }))}>
            <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="px-3 py-2">
          <Select value={draft.branchId} onValueChange={v => setDraft(d => ({ ...d, branchId: v }))}>
            <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </td>
        <td className="px-3 py-2">
          <Input type={showPin ? "text" : "password"} value={draft.pin}
            onChange={e => setDraft(d => ({ ...d, pin: e.target.value }))}
            className="h-7 text-sm w-24 tracking-widest" placeholder="PIN" maxLength={8}
            onClick={() => setShowPin(true)} onBlur={() => setShowPin(false)} />
        </td>
        <td className="px-3 py-2">
          <Input type="date" value={draft.amcStart} onChange={e => setDraft(d => ({ ...d, amcStart: e.target.value }))}
            className="h-7 text-xs w-32" />
        </td>
        <td className="px-3 py-2">
          <Input type="date" value={draft.amcEnd} onChange={e => setDraft(d => ({ ...d, amcEnd: e.target.value }))}
            className="h-7 text-xs w-32" />
        </td>
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
  }

  const branchName = branches.find(b => b.id === user.branchId)?.name ?? "—";

  return (
    <tr className={cn("border-b hover:bg-secondary/30", !user.active && "opacity-50")}>
      <td className="px-3 py-2.5 font-medium text-sm">
        <span className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          {user.name}
        </span>
      </td>
      <td className="px-3 py-2.5 text-sm text-muted-foreground">{user.phone || "—"}</td>
      <td className="px-3 py-2.5">
        <Badge className={cn("text-[10px] border", ROLE_COLORS[user.role])}>{ROLE_LABELS[user.role]}</Badge>
      </td>
      <td className="px-3 py-2.5 text-sm text-muted-foreground">{branchName}</td>
      <td className="px-3 py-2.5 text-sm font-mono text-muted-foreground">{"•".repeat(user.pin.length)}</td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground">{user.amcStart}</td>
      <td className="px-3 py-2.5 text-xs">
        <span className={cn("font-semibold", status.color)}>{user.amcEnd}</span>
        <span className="text-[10px] text-muted-foreground ml-1">
          ({status.days >= 0 ? `${status.days}d left` : `${Math.abs(status.days)}d ago`})
        </span>
      </td>
      <td className="px-3 py-2.5 text-center">
        <Badge variant={user.active ? "default" : "secondary"} className="text-[10px]">{user.active ? "Active" : "Inactive"}</Badge>
      </td>
      <td className="px-3 py-2.5 text-right">
        <div className="flex gap-1 justify-end">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(user.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </td>
    </tr>
  );
}

// ─── AMC Quick-extend buttons ─────────────────────────────────────────────────

function AmcQuickSet({ onSet }: { onSet: (start: string, end: string) => void }) {
  const options = [
    { label: "3 Months", months: 3 },
    { label: "6 Months", months: 6 },
    { label: "1 Year",   months: 12 },
    { label: "2 Years",  months: 24 },
  ];
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(o => (
        <Button key={o.label} size="sm" variant="outline" className="text-xs h-7"
          onClick={() => { const s = today(); onSet(s, addMonths(s, o.months)); }}>
          {o.label}
        </Button>
      ))}
    </div>
  );
}

// ─── Super Admin Page ─────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>(loadBranches);
  const [users, setUsers]       = useState<AdminUser[]>(loadUsers);
  const [masterPin]             = useState(loadMasterPin);
  const [pinVerified, setPinVerified] = useState(false);
  const [pinInput, setPinInput]       = useState("");
  const [newMasterPin, setNewMasterPin] = useState("");

  const verify = () => {
    if (pinInput === masterPin) { setPinVerified(true); }
    else { toast({ title: "Incorrect PIN", variant: "destructive" }); }
  };

  // ── Branch helpers ─────────────────────────────────────────────────────────
  const saveBranch = (b: Branch) => {
    const updated = branches.map(br => br.id === b.id ? b : br);
    setBranches(updated); saveBranches(updated);
    toast({ title: `Branch "${b.name}" saved` });
  };
  const deleteBranch = (id: string) => {
    const updated = branches.filter(b => b.id !== id);
    setBranches(updated); saveBranches(updated);
    toast({ title: "Branch removed" });
  };
  const addBranch = () => {
    const count = branches.filter(b => !b.isConsolidation).length;
    if (count >= 10) { toast({ title: "Maximum 10 branches reached", variant: "destructive" }); return; }
    const nb: Branch = { id: rk(), name: "", location: "", phone: "", manager: "", isConsolidation: false, active: true };
    const next = [...branches.filter(b => !b.isConsolidation), nb, ...branches.filter(b => b.isConsolidation)];
    setBranches(next); saveBranches(next);
  };

  // ── User helpers ───────────────────────────────────────────────────────────
  const saveUser = (u: AdminUser) => {
    const updated = users.map(x => x.id === u.id ? u : x);
    setUsers(updated); saveUsers(updated);
    toast({ title: `User "${u.name}" saved` });
  };
  const deleteUser = (id: string) => {
    const updated = users.filter(u => u.id !== id);
    setUsers(updated); saveUsers(updated);
    toast({ title: "User removed" });
  };
  const addUser = () => {
    const nu: AdminUser = {
      id: rk(), name: "", phone: "", role: "user",
      branchId: branches[0]?.id ?? "",
      pin: "1234",
      amcStart: today(), amcEnd: addMonths(today(), 12),
      active: true,
    };
    const next = [...users, nu];
    setUsers(next); saveUsers(next);
  };

  const regularBranches    = branches.filter(b => !b.isConsolidation);
  const consolidatedBranch = branches.find(b => b.isConsolidation);

  const expiringSoon = users.filter(u => u.active && amcStatus(u.amcEnd).days < 30 && amcStatus(u.amcEnd).days >= 0);
  const expired      = users.filter(u => u.active && amcStatus(u.amcEnd).days < 0);

  // ── PIN Gate ───────────────────────────────────────────────────────────────
  if (!pinVerified) {
    return (
      <div className="max-w-sm mx-auto mt-20 space-y-4">
        <div className="text-center">
          <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-3" />
          <h2 className="text-2xl font-serif font-bold">Super Admin</h2>
          <p className="text-muted-foreground text-sm mt-1">Enter your master PIN to continue</p>
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

  // ── Main Admin UI ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-serif font-bold">Super Admin</h1>
          <p className="text-muted-foreground text-sm">Users, branches, AMC and system controls</p>
        </div>
        <Badge className="ml-auto bg-amber-100 text-amber-800 border-amber-300">Admin Session</Badge>
      </div>

      {/* ── AMC Alerts ── */}
      {(expiringSoon.length > 0 || expired.length > 0) && (
        <div className="space-y-2">
          {expired.map(u => (
            <div key={u.id} className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm">
              <CalendarDays className="h-4 w-4 text-red-600 flex-shrink-0" />
              <span className="font-medium text-red-700">{u.name}</span>
              <span className="text-red-600">— AMC expired {Math.abs(amcStatus(u.amcEnd).days)} days ago ({u.amcEnd})</span>
            </div>
          ))}
          {expiringSoon.map(u => (
            <div key={u.id} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm">
              <CalendarDays className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span className="font-medium text-amber-700">{u.name}</span>
              <span className="text-amber-600">— AMC expiring in {amcStatus(u.amcEnd).days} days ({u.amcEnd})</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Users",   value: users.length,                          icon: Users },
          { label: "Active Users",  value: users.filter(u => u.active).length,    icon: User },
          { label: "Branches",      value: regularBranches.length,                icon: Building2 },
          { label: "AMC Alerts",    value: expiringSoon.length + expired.length,  icon: CalendarDays },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="shadow-sm border-border/50">
            <CardContent className="pt-3 pb-3 flex items-center gap-3">
              <Icon className="h-6 w-6 text-primary/60" />
              <div>
                <div className="text-xl font-bold text-primary font-mono">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users"><Users className="h-3.5 w-3.5 mr-1.5" />Users & AMC</TabsTrigger>
          <TabsTrigger value="branches"><Building2 className="h-3.5 w-3.5 mr-1.5" />Branches</TabsTrigger>
          <TabsTrigger value="security"><KeyRound className="h-3.5 w-3.5 mr-1.5" />Security</TabsTrigger>
        </TabsList>

        {/* ── Users & AMC tab ── */}
        <TabsContent value="users" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-serif">Users &amp; AMC Dates</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Each user has their own role, branch access, login PIN and AMC validity
                </p>
              </div>
              <Button size="sm" onClick={addUser}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add User
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead>
                  <tr className="bg-secondary/30 text-xs text-muted-foreground uppercase tracking-wide border-b">
                    {["Name","Phone","Role","Branch","PIN","AMC Start","AMC End","Status",""].map(h => (
                      <th key={h} className="px-3 py-2 font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground text-sm">No users yet — click Add User</td></tr>
                  ) : (
                    users.map(u => (
                      <UserRow key={u.id} user={u} branches={branches} onSave={saveUser} onDelete={deleteUser} />
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* ── Quick AMC renewal panel ── */}
          {users.length > 0 && (
            <Card className="shadow-sm mt-4">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-serif flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Quick AMC Renewal
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Select a user then click a plan to set their AMC validity from today</p>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {users.filter(u => u.active).map(u => {
                  const s = amcStatus(u.amcEnd);
                  return (
                    <div key={u.id} className="flex flex-wrap items-center gap-3 pb-3 border-b last:border-0 last:pb-0">
                      <div className="min-w-[180px]">
                        <div className="font-medium text-sm">{u.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Badge className={cn("text-[10px] border", ROLE_COLORS[u.role])}>{ROLE_LABELS[u.role]}</Badge>
                          <span className={cn("font-medium", s.color)}>{s.label}</span>
                          <span>· expires {u.amcEnd}</span>
                        </div>
                      </div>
                      <AmcQuickSet onSet={(start, end) => saveUser({ ...u, amcStart: start, amcEnd: end })} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Branches tab ── */}
        <TabsContent value="branches" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-serif">Branch Management</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {regularBranches.length} / 10 branches{consolidatedBranch ? " + 1 consolidated view" : ""}
                </p>
              </div>
              <Button size="sm" onClick={addBranch} disabled={regularBranches.length >= 10}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Branch
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-secondary/30 text-xs text-muted-foreground uppercase tracking-wide border-b">
                    {[
                      { label: "Branch Name", icon: Store },
                      { label: "Location",    icon: MapPin },
                      { label: "Phone",       icon: Phone },
                      { label: "Manager",     icon: User },
                    ].map(({ label, icon: Icon }) => (
                      <th key={label} className="px-3 py-2 font-semibold">
                        <span className="flex items-center gap-1"><Icon className="h-3 w-3" />{label}</span>
                      </th>
                    ))}
                    <th className="px-3 py-2 font-semibold text-center">Status</th>
                    <th className="px-3 py-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {regularBranches.map(b => (
                    <BranchRow key={b.id} branch={b} onSave={saveBranch} onDelete={deleteBranch} />
                  ))}
                  {consolidatedBranch && (
                    <>
                      <tr>
                        <td colSpan={6} className="px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wide bg-secondary/20 font-semibold">
                          Consolidation View
                        </td>
                      </tr>
                      <BranchRow key={consolidatedBranch.id} branch={consolidatedBranch} onSave={saveBranch} onDelete={deleteBranch} />
                    </>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security tab ── */}
        <TabsContent value="security" className="mt-4">
          <Card className="shadow-sm max-w-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-serif flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                Change Master PIN
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                This PIN protects entry to the Super Admin section
              </p>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">New Master PIN (min 4 digits)</Label>
                <Input type="password" placeholder="Enter new PIN" value={newMasterPin}
                  onChange={e => setNewMasterPin(e.target.value)}
                  className="mt-1 tracking-widest" maxLength={8} />
              </div>
              <Button size="sm" className="w-full" onClick={() => {
                if (newMasterPin.length < 4) {
                  toast({ title: "PIN must be at least 4 digits", variant: "destructive" });
                  return;
                }
                saveMasterPin(newMasterPin);
                toast({ title: "Master PIN updated — takes effect on next login" });
                setNewMasterPin("");
              }}>
                Update Master PIN
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
