import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/auth";
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
  TrendingUp,
  Hammer,
  ClipboardList,
  Settings,
  ShoppingBag,
  Diamond,
  ArrowLeftRight,
  Wrench,
  ChevronDown,
  ChevronRight,
  PiggyBank,
  ShoppingCart,
  CalendarDays,
  ShieldAlert,
  ShieldOff,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/command-palette";
import { useGetAmcSettings } from "@workspace/api-client-react";
import { Link as WouterLink } from "wouter";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  group: string;
  collapsible?: boolean;
  items: NavItem[];
}

const NAV_ITEMS: NavGroup[] = [
  {
    group: "Overview",
    items: [{ name: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    group: "Billing",
    collapsible: true,
    items: [
      { name: "All Invoices",  href: "/invoices",               icon: FileText },
      { name: "Create Invoice",href: "/billing/retail/new",     icon: Receipt },
      { name: "Purchase Bill", href: "/billing/purchase/new",   icon: ShoppingCart },
      { name: "Karigar Bill",  href: "/billing/karigar/new",    icon: Hammer },
      { name: "Exchange",      href: "/billing/exchange/new",   icon: ArrowLeftRight },
      { name: "Repair",        href: "/billing/repair/new",     icon: Wrench },
      { name: "Estimates",     href: "/estimates",              icon: ClipboardList },
    ],
  },
  {
    group: "Workshop",
    items: [
      { name: "Issue Register", href: "/issue",        icon: ClipboardList },
      { name: "Karigar",        href: "/karigar",      icon: Hammer },
      { name: "Karigar Jobs",   href: "/karigar-jobs", icon: FileSpreadsheet },
      { name: "Repairs",        href: "/repairs",      icon: Wrench },
    ],
  },
  {
    group: "Finance",
    items: [
      { name: "Girvi Loans",   href: "/girvi",   icon: Scale },
      { name: "Cr/Dr Ledger",  href: "/ledger",  icon: BookOpen },
      { name: "Saving Schemes",href: "/schemes", icon: PiggyBank },
    ],
  },
  {
    group: "Inventory",
    items: [{ name: "Stock", href: "/products", icon: Package }],
  },
  {
    group: "Reports",
    collapsible: true,
    items: [
      { name: "Daybook",       href: "/reports/daybook", icon: CalendarDays },
      { name: "Sales Report",  href: "/reports/sales",   icon: BarChart3 },
      { name: "GST Report",    href: "/reports/gst",     icon: BarChart3 },
      { name: "Stock Report",  href: "/reports/stock",   icon: BarChart3 },
      { name: "Girvi Report",  href: "/reports/girvi",   icon: BarChart3 },
    ],
  },
  {
    group: "Masters",
    items: [
      { name: "Customers",  href: "/customers", icon: Users },
      { name: "Au/Ag Rates",href: "/rates",     icon: TrendingUp },
    ],
  },
  {
    group: "System",
    items: [
      { name: "Settings & AMC", href: "/settings",    icon: Settings },
      { name: "AMC",            href: "/amc",          icon: ShieldCheck },
      { name: "Super Admin",    href: "/admin",        icon: ShieldCheck },
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
          "mx-1 mb-2 rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 cursor-pointer border transition-colors",
          data.isExpired
            ? "bg-red-50 border-red-200 text-red-800 hover:bg-red-100"
            : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100",
        )}
      >
        {data.isExpired ? (
          <ShieldOff className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
        )}
        <span>
          {data.isExpired
            ? "AMC Expired — renew now"
            : `AMC expiring in ${data.daysRemaining}d`}
        </span>
      </div>
    </WouterLink>
  );
}

function NavGroupComp({
  group,
  items,
  collapsible,
  location,
  onNavigate,
}: NavGroup & { location: string; onNavigate: () => void }) {
  const hasActive = items.some(
    (item) =>
      location === item.href ||
      (item.href !== "/" && location.startsWith(item.href)),
  );
  const [open, setOpen] = useState(!collapsible || hasActive);

  return (
    <div>
      <button
        className={cn(
          "w-full flex items-center justify-between px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
          collapsible ? "cursor-pointer hover:text-foreground" : "cursor-default",
        )}
        onClick={() => collapsible && setOpen((v) => !v)}
      >
        <span>{group}</span>
        {collapsible &&
          (open ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          ))}
      </button>
      {open && (
        <div className="space-y-0.5">
          {items.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href} onClick={onNavigate}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm font-medium",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground/80 hover:bg-secondary/80 hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleSignOut = () => {
    logout();
    setLocation("/login");
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <CommandPalette />

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b bg-card z-50 flex items-center px-4 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="ml-3 font-serif text-xl font-bold text-primary">
          Jewel Suite
        </span>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:relative z-40 h-full w-60 bg-card border-r flex flex-col transition-transform duration-300 ease-in-out shadow-sm",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="h-14 flex items-center px-5 border-b bg-primary/5 flex-shrink-0">
          <span className="font-serif text-xl font-bold text-primary tracking-tight">
            ✦ Jewel Suite
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          <div className="px-3">
            <kbd className="inline-flex items-center gap-1 rounded border bg-secondary/40 px-2 py-1 text-[10px] font-medium text-muted-foreground">
              <span>⌘</span>K
            </kbd>
            <span className="ml-2 text-xs text-muted-foreground">Quick search</span>
          </div>

          <AmcBanner />

          {NAV_ITEMS.map((group) => (
            <NavGroupComp
              key={group.group}
              {...group}
              location={location}
              onNavigate={() => setIsMobileOpen(false)}
            />
          ))}
        </div>

        <div className="p-3 border-t bg-muted/20 flex-shrink-0 space-y-1.5">
          {user && (
            <div className="px-1 mb-1.5">
              <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {user.role === "super_admin" ? "Super Admin" : `ID: ${user.id}`}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground text-sm"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative pt-14 md:pt-0 bg-background/50">
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl animate-in fade-in duration-300">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
