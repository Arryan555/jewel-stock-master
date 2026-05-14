import { Link } from "wouter";
import {
  useGetDashboardSummary,
  useGetMetalRates,
  useGetRecentActivity,
  useGetSalesTrend,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  TrendingUp, ArrowUpRight, ArrowDownRight, IndianRupee, Scale, Coins,
  Activity, FileText, BookOpen, Plus, Receipt, Users, UserCog, Wrench,
  BarChart3, Package, ShieldCheck, User, ChevronRight, Gem, RefreshCw,
  ShoppingCart, Repeat2, PenLine, Store, Landmark,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

// ─── Bill type quick-create ───────────────────────────────────────────────────
const CREATE_INVOICE_TYPES = [
  { label: "Purchase",  path: "/billing/purchase/new",  icon: ShoppingCart, cls: "bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100" },
  { label: "Retail",    path: "/billing/retail/new",    icon: Store,        cls: "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100" },
  { label: "Wholesale", path: "/billing/wholesale/new", icon: Landmark,     cls: "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100" },
  { label: "Karigar",   path: "/billing/karigar/new",   icon: UserCog,      cls: "bg-green-50 border-green-200 text-green-800 hover:bg-green-100" },
  { label: "Exchange",  path: "/billing/exchange/new",  icon: Repeat2,      cls: "bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100" },
  { label: "Repair",    path: "/billing/repair/new",    icon: Wrench,       cls: "bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100" },
] as const;

// ─── Key module navigation ────────────────────────────────────────────────────
const KEY_MODULES = [
  { label: "All Vouchers",    path: "/invoices",    icon: Receipt,   desc: "View all bills & invoices" },
  { label: "Girvi Loans",     path: "/girvi",       icon: Scale,     desc: "Pawn / gold loans" },
  { label: "Cr/Dr Ledger",    path: "/ledger",      icon: BookOpen,  desc: "Customer account ledger" },
  { label: "Saving Schemes",  path: "/schemes",     icon: Coins,     desc: "Gold/silver saving plans" },
  { label: "Stocks",          path: "/products",    icon: Package,   desc: "Jewellery stock register" },
  { label: "All Reports",     path: "/reports/daybook", icon: BarChart3, desc: "Daybook, GST, sales & more" },
] as const;

// ─── Party types ──────────────────────────────────────────────────────────────
const PARTY_TYPES = [
  { label: "Retail Customer",    path: "/customers",  icon: Users,       cls: "bg-amber-50  border-amber-200  text-amber-800  hover:bg-amber-100",  badge: "Retail" },
  { label: "Wholesale Party",    path: "/customers",  icon: Landmark,    cls: "bg-blue-50   border-blue-200   text-blue-800   hover:bg-blue-100",   badge: "Wholesale" },
  { label: "Supplier",           path: "/customers",  icon: ShoppingCart,cls: "bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100", badge: "Supplier" },
  { label: "Karigar",            path: "/karigar",    icon: UserCog,     cls: "bg-green-50  border-green-200  text-green-800  hover:bg-green-100",  badge: "Karigar" },
  { label: "Girvi Client",       path: "/girvi",      icon: Scale,       cls: "bg-rose-50   border-rose-200   text-rose-800   hover:bg-rose-100",   badge: "Girvi" },
] as const;

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: rates,   isLoading: isLoadingRates }   = useGetMetalRates();
  const { data: activity }                              = useGetRecentActivity();
  const { data: salesTrend, isLoading: isLoadingTrend } = useGetSalesTrend();

  return (
    <div className="space-y-6">
      {/* ── Page title ── */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">Welcome back — here's today's quick view</p>
      </div>

      {/* ═══ SECTION 1: Gold & Silver Rate Today ═══ */}
      <section>
        <SectionLabel icon={TrendingUp} label="Gold & Silver Rate Today" />
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-wrap gap-6 items-center shadow-sm">
          {isLoadingRates ? (
            <div className="flex gap-4"><Skeleton className="h-7 w-36" /><Skeleton className="h-7 w-36" /></div>
          ) : rates?.length ? (
            rates.map((rate) => (
              <div key={`${rate.metal}-${rate.purity}`} className="flex items-center gap-3">
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold",
                  rate.metal === "gold" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-700"
                )}>
                  {rate.metal === "gold" ? "Au" : "Ag"}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground capitalize">{rate.metal} {rate.purity}</div>
                  <div className="font-bold text-primary text-sm">{formatCurrency(rate.ratePerGram)}<span className="text-xs text-muted-foreground font-normal">/g</span></div>
                </div>
              </div>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">No rates set today — <Link href="/rates" className="text-primary underline-offset-2 hover:underline">add rates</Link></span>
          )}
          <Link href="/rates" className="ml-auto">
            <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/5">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Update Rates
            </Button>
          </Link>
        </div>
      </section>

      {/* ═══ SECTION 2: Create Invoice ═══ */}
      <section>
        <SectionLabel icon={Plus} label="Create Invoice" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CREATE_INVOICE_TYPES.map(({ label, path, icon: Icon, cls }) => (
            <Link key={label} href={path}>
              <div className={cn("border rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all hover:shadow-md", cls)}>
                <Icon className="h-6 w-6" />
                <span className="text-xs font-semibold text-center leading-tight">{label}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ SECTION 3: Key Modules ═══ */}
      <section>
        <SectionLabel icon={Receipt} label="Modules" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {KEY_MODULES.map(({ label, path, icon: Icon, desc }) => (
            <Link key={label} href={path}>
              <div className="border rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all hover:shadow-sm bg-card">
                <Icon className="h-6 w-6 text-primary" />
                <span className="text-xs font-semibold text-center">{label}</span>
                <span className="text-[10px] text-muted-foreground text-center leading-snug">{desc}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ SECTION 4: Create Parties ═══ */}
      <section>
        <SectionLabel icon={Users} label="Create Party" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {PARTY_TYPES.map(({ label, path, icon: Icon, cls, badge }) => (
            <Link key={label} href={path}>
              <div className={cn("border rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all hover:shadow-md", cls)}>
                <Icon className="h-5 w-5" />
                <span className="text-xs font-semibold text-center">{label}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-current/40">{badge}</Badge>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ SECTION 5: KPI Cards ═══ */}
      <section>
        <SectionLabel icon={Activity} label="Key Metrics" />
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Today's Sales"   value={summary?.todaySales}        icon={IndianRupee}   isLoading={isLoadingSummary} trend="+12% from yesterday" />
          <KPICard title="Month Sales"     value={summary?.monthSales}        icon={TrendingUp}    isLoading={isLoadingSummary} trend="+5% from last month" />
          <KPICard title="Receivables"     value={summary?.receivable}        icon={ArrowDownRight} isLoading={isLoadingSummary} alert />
          <KPICard title="Payables"        value={summary?.payable}           icon={ArrowUpRight}   isLoading={isLoadingSummary} />
          <KPICard title="Active Loans"    value={summary?.activeLoans}       icon={Scale}          isLoading={isLoadingSummary} isCurrency={false} />
          <KPICard title="Stock Valuation" value={summary?.stockValuation}    icon={Coins}          isLoading={isLoadingSummary} />
          <KPICard title="GST Collected"   value={summary?.gstCollectedMonth} icon={Activity}       isLoading={isLoadingSummary} />
          <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Retail vs Wholesale</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-8 w-24" /> : (
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Retail</span>
                    <span className="font-bold">{summary?.retailShare ?? 0}%</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full" style={{ width: `${summary?.retailShare ?? 0}%` }} />
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-muted-foreground">Wholesale</span>
                    <span className="font-bold">{summary?.wholesaleShare ?? 0}%</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ═══ SECTION 6: Admin ═══ */}
      <section>
        <SectionLabel icon={ShieldCheck} label="Administration" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Super Admin — AMC Settings */}
          <Link href="/settings">
            <Card className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all border-amber-200 bg-amber-50/40">
              <CardContent className="flex items-center gap-4 pt-5 pb-5">
                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="h-6 w-6 text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-amber-800">Super Admin — AMC Settings</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage Annual Maintenance Contract, shop identity & system config</p>
                </div>
                <ChevronRight className="h-5 w-5 text-amber-600 flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>

          {/* Individual Party AMC View */}
          <Link href="/amc">
            <Card className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all border-blue-200 bg-blue-50/40">
              <CardContent className="flex items-center gap-4 pt-5 pb-5">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User className="h-6 w-6 text-blue-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-blue-800">Individual Party AMC</p>
                  <p className="text-xs text-muted-foreground mt-0.5">View your own AMC status, expiry and renewal details</p>
                </div>
                <ChevronRight className="h-5 w-5 text-blue-600 flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* ═══ SECTION 7: Charts + Activity ═══ */}
      <section>
        <SectionLabel icon={BarChart3} label="Analytics" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 30-Day Sales Trend */}
          <Card className="col-span-1 lg:col-span-2 shadow-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-serif">30-Day Sales Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-[220px]">
              {isLoadingTrend ? <Skeleton className="w-full h-full" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrend ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRetail" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorWholesale" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => new Date(label).toLocaleDateString("en-IN")}
                      contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", boxShadow: "var(--shadow-md)" }}
                    />
                    <Area type="monotone" dataKey="retail" stackId="1" stroke="hsl(var(--primary))" fill="url(#colorRetail)" strokeWidth={2} />
                    <Area type="monotone" dataKey="wholesale" stackId="1" stroke="hsl(var(--accent))" fill="url(#colorWholesale)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-serif">Recent Activity</CardTitle>
              <Link href="/invoices">
                <Button variant="ghost" size="sm" className="text-xs h-7 text-primary">
                  View all <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activity?.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 border border-border">
                      {item.kind === "invoice" && <FileText className="h-4 w-4 text-primary" />}
                      {item.kind.startsWith("girvi") && <Scale className="h-4 w-4 text-accent" />}
                      {item.kind === "ledger" && <BookOpen className="h-4 w-4 text-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground">{formatDateTime(item.date)}</p>
                    </div>
                    {item.amount && (
                      <div className="text-xs font-bold text-foreground whitespace-nowrap">{formatCurrency(item.amount)}</div>
                    )}
                  </div>
                ))}
                {!activity?.length && (
                  <p className="text-xs text-muted-foreground text-center py-4">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-sm font-semibold text-foreground uppercase tracking-wide">{label}</span>
      <div className="flex-1 border-t border-border/50" />
    </div>
  );
}

function KPICard({
  title, value, icon: Icon, isLoading, isCurrency = true, alert = false, trend,
}: {
  title: string; value?: number; icon: React.ElementType; isLoading: boolean;
  isCurrency?: boolean; alert?: boolean; trend?: string;
}) {
  return (
    <Card className="shadow-sm border-border/50 hover:border-primary/20 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${alert ? "text-destructive" : "text-primary"}`} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className={`text-2xl font-bold ${alert ? "text-destructive" : "text-foreground"}`}>
              {value === undefined ? "—" : isCurrency ? formatCurrency(value) : value.toLocaleString("en-IN")}
            </div>
            {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
