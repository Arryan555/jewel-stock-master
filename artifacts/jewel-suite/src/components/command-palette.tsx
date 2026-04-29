import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Receipt,
  FileSpreadsheet,
  ClipboardList,
  Hammer,
  Wrench,
  PiggyBank,
  Scale,
  BookOpen,
  CalendarDays,
  Settings as SettingsIcon,
  BarChart3,
} from "lucide-react";

interface Cmd {
  label: string;
  href: string;
  icon: typeof Users;
  group: string;
  hint?: string;
}

const COMMANDS: Cmd[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, group: "Navigation" },
  { label: "All Invoices", href: "/invoices", icon: FileText, group: "Sales" },
  { label: "New Retail Invoice", href: "/billing/retail/new", icon: Receipt, group: "Sales", hint: "GST split sale" },
  { label: "New Wholesale Invoice", href: "/billing/wholesale/new", icon: FileSpreadsheet, group: "Sales" },
  { label: "Estimates / Quotations", href: "/estimates", icon: ClipboardList, group: "Sales" },
  { label: "Products", href: "/products", icon: Package, group: "Inventory" },
  { label: "Karigars", href: "/karigars", icon: Hammer, group: "Workshop" },
  { label: "Job Cards", href: "/karigar-jobs", icon: FileSpreadsheet, group: "Workshop" },
  { label: "Repairs", href: "/repairs", icon: Wrench, group: "Workshop" },
  { label: "Girvi Loans", href: "/girvi", icon: Scale, group: "Finance" },
  { label: "Cr/Dr Notebook", href: "/ledger", icon: BookOpen, group: "Finance" },
  { label: "Saving Schemes", href: "/schemes", icon: PiggyBank, group: "Finance" },
  { label: "Daybook", href: "/reports/daybook", icon: CalendarDays, group: "Reports" },
  { label: "Sales Report", href: "/reports/sales", icon: BarChart3, group: "Reports" },
  { label: "GST Report", href: "/reports/gst", icon: BarChart3, group: "Reports" },
  { label: "Stock Report", href: "/reports/stock", icon: BarChart3, group: "Reports" },
  { label: "Girvi Report", href: "/reports/girvi", icon: BarChart3, group: "Reports" },
  { label: "Customers", href: "/customers", icon: Users, group: "Masters" },
  { label: "Shop Settings", href: "/settings", icon: SettingsIcon, group: "Masters" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const groups = COMMANDS.reduce<Record<string, Cmd[]>>((acc, c) => {
    (acc[c.group] ??= []).push(c);
    return acc;
  }, {});

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search invoices, customers, screens..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {Object.entries(groups).map(([group, items], gi) => (
          <div key={group}>
            {gi > 0 ? <CommandSeparator /> : null}
            <CommandGroup heading={group}>
              {items.map((c) => (
                <CommandItem
                  key={c.href}
                  value={`${c.label} ${c.href}`}
                  onSelect={() => {
                    setOpen(false);
                    setLocation(c.href);
                  }}
                >
                  <c.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{c.label}</span>
                  {c.hint ? (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {c.hint}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
