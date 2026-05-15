import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck, Plus, Pencil, Trash2, Store, Phone, MapPin, User, Check, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

const STORAGE_KEY = "jewel-admin-branches";

function loadBranches(): Branch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Branch[];
  } catch { /* ignore */ }
  return [
    { id: "branch-1", name: "Main Branch",    location: "Head Office",   phone: "", manager: "", isConsolidation: false, active: true },
    { id: "branch-2", name: "Branch 2",        location: "",              phone: "", manager: "", isConsolidation: false, active: true },
    { id: "branch-3", name: "Branch 3",        location: "",              phone: "", manager: "", isConsolidation: false, active: true },
    { id: "branch-4", name: "Branch 4",        location: "",              phone: "", manager: "", isConsolidation: false, active: true },
    { id: "branch-5", name: "Branch 5",        location: "",              phone: "", manager: "", isConsolidation: false, active: true },
    { id: "branch-all", name: "All Branches",  location: "Consolidated",  phone: "", manager: "", isConsolidation: true,  active: true },
  ];
}

function saveBranches(branches: Branch[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(branches));
}

function rk() { return Math.random().toString(36).slice(2, 10); }

// ─── Inline editor row ────────────────────────────────────────────────────────

function BranchRow({
  branch,
  onSave,
  onDelete,
}: {
  branch: Branch;
  onSave: (b: Branch) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(branch.name === "" && !branch.isConsolidation);
  const [draft, setDraft] = useState(branch);

  const commit = () => {
    if (!draft.name.trim()) return;
    onSave(draft);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(branch);
    setEditing(false);
  };

  if (editing) {
    return (
      <tr className="bg-amber-50/60 border-b">
        <td className="px-3 py-2">
          <Input
            value={draft.name}
            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            className="h-7 text-sm"
            placeholder="Branch name"
            autoFocus
          />
        </td>
        <td className="px-3 py-2">
          <Input
            value={draft.location}
            onChange={e => setDraft(d => ({ ...d, location: e.target.value }))}
            className="h-7 text-sm"
            placeholder="City / Location"
          />
        </td>
        <td className="px-3 py-2">
          <Input
            value={draft.phone}
            onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))}
            className="h-7 text-sm"
            placeholder="+91…"
          />
        </td>
        <td className="px-3 py-2">
          <Input
            value={draft.manager}
            onChange={e => setDraft(d => ({ ...d, manager: e.target.value }))}
            className="h-7 text-sm"
            placeholder="Manager name"
          />
        </td>
        <td className="px-3 py-2 text-center">
          <Select
            value={draft.active ? "active" : "inactive"}
            onValueChange={v => setDraft(d => ({ ...d, active: v === "active" }))}
          >
            <SelectTrigger className="h-7 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </td>
        <td className="px-3 py-2 text-right">
          <div className="flex gap-1 justify-end">
            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-700" onClick={commit}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={cancel}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`border-b hover:bg-secondary/30 ${!branch.active ? "opacity-50" : ""}`}>
      <td className="px-3 py-2.5 font-medium text-sm flex items-center gap-2">
        {branch.isConsolidation ? (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">Consolidated</Badge>
        ) : (
          <Store className="h-3.5 w-3.5 text-primary flex-shrink-0" />
        )}
        {branch.name}
      </td>
      <td className="px-3 py-2.5 text-sm text-muted-foreground">
        {branch.location || <span className="italic text-muted-foreground/50">—</span>}
      </td>
      <td className="px-3 py-2.5 text-sm text-muted-foreground">
        {branch.phone || <span className="italic text-muted-foreground/50">—</span>}
      </td>
      <td className="px-3 py-2.5 text-sm text-muted-foreground">
        {branch.manager || <span className="italic text-muted-foreground/50">—</span>}
      </td>
      <td className="px-3 py-2.5 text-center">
        <Badge variant={branch.active ? "default" : "secondary"} className="text-[10px]">
          {branch.active ? "Active" : "Inactive"}
        </Badge>
      </td>
      <td className="px-3 py-2.5 text-right">
        {!branch.isConsolidation && (
          <div className="flex gap-1 justify-end">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon" variant="ghost"
              className="h-7 w-7 text-destructive"
              onClick={() => onDelete(branch.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Super Admin Page ─────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>(loadBranches);
  const [adminPin, setAdminPin] = useState("");
  const [pinVerified, setPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState("");

  const ADMIN_PIN = "1234"; // default pin — user should change this in production

  const verifyPin = () => {
    if (pinInput === ADMIN_PIN) {
      setPinVerified(true);
    } else {
      toast({ title: "Incorrect PIN", variant: "destructive" });
    }
  };

  const saveBranch = (b: Branch) => {
    const updated = branches.map(br => br.id === b.id ? b : br);
    setBranches(updated);
    saveBranches(updated);
    toast({ title: `Branch "${b.name}" saved` });
  };

  const deleteBranch = (id: string) => {
    const updated = branches.filter(b => b.id !== id);
    setBranches(updated);
    saveBranches(updated);
    toast({ title: "Branch removed" });
  };

  const addBranch = () => {
    const regularCount = branches.filter(b => !b.isConsolidation).length;
    if (regularCount >= 10) {
      toast({ title: "Maximum 10 branches reached", variant: "destructive" });
      return;
    }
    const nb: Branch = {
      id: rk(),
      name: "",
      location: "",
      phone: "",
      manager: "",
      isConsolidation: false,
      active: true,
    };
    const consolidated = branches.filter(b => b.isConsolidation);
    const regular = branches.filter(b => !b.isConsolidation);
    const newList = [...regular, nb, ...consolidated];
    setBranches(newList);
    saveBranches(newList);
  };

  const regularBranches   = branches.filter(b => !b.isConsolidation);
  const consolidatedBranch = branches.find(b => b.isConsolidation);

  // ── PIN gate ──────────────────────────────────────────────────────────────
  if (!pinVerified) {
    return (
      <div className="max-w-sm mx-auto mt-20 space-y-4">
        <div className="text-center">
          <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-3" />
          <h2 className="text-2xl font-serif font-bold">Super Admin</h2>
          <p className="text-muted-foreground text-sm mt-1">Enter your admin PIN to continue</p>
        </div>
        <Card>
          <CardContent className="pt-5 space-y-3">
            <div>
              <Label>Admin PIN</Label>
              <Input
                type="password"
                placeholder="Enter PIN"
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && verifyPin()}
                className="mt-1 text-center tracking-widest text-lg"
                maxLength={8}
              />
            </div>
            <Button className="w-full" onClick={verifyPin}>
              <ShieldCheck className="h-4 w-4 mr-2" />
              Verify & Enter
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">Default PIN: 1234</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main admin UI ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-serif font-bold">Super Admin</h1>
          <p className="text-muted-foreground text-sm">Branch management and system controls</p>
        </div>
        <Badge className="ml-auto bg-amber-100 text-amber-800 border-amber-300">Admin Session</Badge>
      </div>

      {/* ── Branch Management ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-serif">Branch Management</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {regularBranches.length} / 10 branches active
              {consolidatedBranch && " + 1 consolidated view"}
            </p>
          </div>
          <Button size="sm" onClick={addBranch} disabled={regularBranches.length >= 10}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Branch
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-secondary/30 text-xs text-muted-foreground uppercase tracking-wide border-b">
                  <th className="px-3 py-2 font-semibold">
                    <span className="flex items-center gap-1"><Store className="h-3 w-3" /> Branch Name</span>
                  </th>
                  <th className="px-3 py-2 font-semibold">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</span>
                  </th>
                  <th className="px-3 py-2 font-semibold">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</span>
                  </th>
                  <th className="px-3 py-2 font-semibold">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> Manager</span>
                  </th>
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
          </div>
        </CardContent>
      </Card>

      {/* ── Admin PIN Change ── */}
      <Card className="shadow-sm max-w-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-serif">Change Admin PIN</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">New PIN</Label>
            <Input
              type="password"
              placeholder="Enter new PIN"
              value={adminPin}
              onChange={e => setAdminPin(e.target.value)}
              className="mt-1 tracking-widest"
              maxLength={8}
            />
          </div>
          <Button
            size="sm" className="w-full"
            onClick={() => {
              if (adminPin.length < 4) {
                toast({ title: "PIN must be at least 4 digits", variant: "destructive" });
                return;
              }
              toast({ title: "PIN updated — note: PIN resets on page reload in this demo" });
              setAdminPin("");
            }}
          >
            Update PIN
          </Button>
        </CardContent>
      </Card>

      {/* ── System Info ── */}
      <Card className="shadow-sm border-amber-200/60 bg-amber-50/20">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { label: "Total Branches",   value: String(regularBranches.length) },
              { label: "Active Branches",  value: String(regularBranches.filter(b => b.active).length) },
              { label: "Consolidated",     value: consolidatedBranch ? "Yes" : "No" },
              { label: "Admin Role",       value: "Super Admin" },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-2xl font-bold text-primary font-mono">{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
