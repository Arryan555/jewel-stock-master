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
  FileSpreadsheet
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { group: "Overview", items: [{ name: "Dashboard", href: "/", icon: LayoutDashboard }] },
  { group: "Sales", items: [
    { name: "All Invoices", href: "/invoices", icon: FileText },
    { name: "New Retail", href: "/billing/retail/new", icon: Receipt },
    { name: "New Wholesale", href: "/billing/wholesale/new", icon: FileSpreadsheet },
  ]},
  { group: "Inventory", items: [{ name: "Products", href: "/products", icon: Package }] },
  { group: "Girvi", items: [{ name: "Loans", href: "/girvi", icon: Scale }] },
  { group: "Ledger", items: [{ name: "Cr/Dr Notebook", href: "/ledger", icon: BookOpen }] },
  { group: "Reports", items: [
    { name: "Sales Report", href: "/reports/sales", icon: BarChart3 },
    { name: "GST Report", href: "/reports/gst", icon: BarChart3 },
    { name: "Stock Report", href: "/reports/stock", icon: BarChart3 },
    { name: "Girvi Report", href: "/reports/girvi", icon: BarChart3 },
  ]},
  { group: "Masters", items: [{ name: "Customers", href: "/customers", icon: Users }] },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Mobile Sidebar Toggle */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b bg-card z-50 flex items-center px-4">
        <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(!isMobileOpen)}>
          <Menu className="h-6 w-6 text-foreground" />
        </Button>
        <span className="ml-4 font-serif text-xl font-bold text-primary">Jewel Suite</span>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:relative z-40 h-full w-64 bg-card border-r flex flex-col transition-transform duration-300 ease-in-out shadow-sm",
        isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="h-16 flex items-center px-6 border-b bg-primary/5">
          <span className="font-serif text-2xl font-bold text-primary tracking-tight">Jewel Suite</span>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin">
          {NAV_ITEMS.map((group) => (
            <div key={group.group}>
              <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {group.group}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                  return (
                    <Link key={item.name} href={item.href} onClick={() => setIsMobileOpen(false)}>
                      <div className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm font-medium",
                        isActive 
                          ? "bg-primary text-primary-foreground shadow-sm" 
                          : "text-foreground hover:bg-secondary/80 hover:text-foreground"
                      )}>
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
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Main Content */}
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
