import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Scale,
  BookOpen,
  BarChart3,
  LogOut,
  Menu,
  Receipt,
  FileSpreadsheet,
  ClipboardList,
  Hammer,
  Wrench,
  PiggyBank,
  Settings as SettingsIcon,
  CalendarDays,
  ShoppingCart,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/command-palette";
import { useGetAmcSettings } from "@workspace/api-client-react";
import { Link as WouterLink } from "wouter";

const NAV_ITEMS = [
  { group: "Overview", items: [{ name: "Dashboard", href: "/", icon: LayoutDashboard }] },
  {
    group: "Sales",
    items: [
      { name: "All Invoices", href: "/invoices", icon: FileText },
      { name: "New Retail", href: "/billing/retail/new", icon: Receipt },
      { name: "New Wholesale", href: "/billing/wholesale/new", icon: FileSpreadsheet },
      { name: "Estimates", href: "/estimates", icon: ClipboardList },
    ],
  },
  {
    group: "Purchase",
    items: [
      { name: "Purchase Vouchers", href: "/purchases", icon: ShoppingCart },
    ],
  },
  { group: "Inventory", items: [{ name: "Products", href: "/products", icon: Package }] },
  {
    group: "Workshop",
    items: [
      { name: "Karigars", href: "/karigars", icon: Hammer },
      { name: "Job Cards", href: "/karigar-jobs", icon: FileSpreadsheet },
      { name: "Repairs", href: "/repairs", icon: Wrench },
    ],
  },
  {
    group: "Finance",
    items: [
      { name: "Girvi Loans", href: "/girvi", icon: Scale },
      { name: "Cr/Dr Notebook", href: "/ledger", icon: BookOpen },
      { name: "Saving Schemes", href: "/schemes", icon: PiggyBank },
    ],
  },
  {
    group: "Reports",
    items: [
      { name: "Daybook", href: "/reports/daybook", icon: CalendarDays },
      { name: "Sales Report", href: "/reports/sales", icon: BarChart3 },
      { name: "GST Report", href: "/reports/gst", icon: BarChart3 },
      { name: "Stock Report", href: "/reports/stock", icon: BarChart3 },
      { name: "Girvi Report", href: "/reports/girvi", icon: BarChart3 },
    ],
  },
  {
    group: "Settings & AMC",
    items: [
      { name: "Customers", href: "/customers", icon: Users },
      { name: "Shop Settings", href: "/settings", icon: SettingsIcon },
      { name: "AMC", href: "/amc", icon: ShieldCheck },
    ],
  },
];

function AmcBanner() {
  const { data } = useGetAmcSettings();
  if (!data || (!data.isExpired && !data.isExpiringSoon)) return null;

  return (
    <WouterLink href="/amc">
      <div
        className={cn(
          "mx-3 mb-2 rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 cursor-pointer border transition-colors",
          data.isExpired
            ? "bg-red-50 border-red-200 text-red-800 hover:bg-red-100"
            : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100",
        )}
      >
        {data.isExpired
          ? <ShieldOff className="h-3.5 w-3.5 shrink-0" />
          : <ShieldAlert className="h-3.5 w-3.5 shrink-0" />}
        <span>
          {data.isExpired
            ? "AMC Expired — renew now"
            : `AMC expiring in ${data.daysRemaining}d`}
        </span>
      </div>
    </WouterLink>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <CommandPalette />
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b bg-card z-50 flex items-center px-4">
        <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(!isMobileOpen)}>
          <Menu className="h-6 w-6 text-foreground" />
        </Button>
        <span className="ml-4 font-serif text-xl font-bold text-primary">Jewel Suite</span>
      </div>

      <aside
        className={cn(
          "fixed md:relative z-40 h-full w-64 bg-card border-r flex flex-col transition-transform duration-300 ease-in-out shadow-sm",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="h-16 flex items-center px-6 border-b bg-primary/5">
          <span className="font-serif text-2xl font-bold text-primary tracking-tight">
            Jewel Suite
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5 scrollbar-thin">
          <div className="px-3">
            <kbd className="inline-flex items-center gap-1 rounded border bg-secondary/40 px-2 py-1 text-[10px] font-medium text-muted-foreground">
              <span>⌘</span>K
            </kbd>
            <span className="ml-2 text-xs text-muted-foreground">Quick search</span>
          </div>

          <AmcBanner />

          {NAV_ITEMS.map((group) => (
            <div key={group.group}>
              <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {group.group}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    location === item.href ||
                    (item.href !== "/" && location.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm font-medium",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-foreground hover:bg-secondary/80 hover:text-foreground",
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t bg-muted/20">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <main className="flex-1 flex flex-col h-full overflow-hidden relative pt-16 md:pt-0 bg-background/50">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
