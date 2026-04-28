import { useGetDashboardSummary, getGetDashboardSummaryQueryKey, useGetMetalRates, getGetMetalRatesQueryKey, useGetRecentActivity, getGetRecentActivityQueryKey, useGetSalesTrend, getGetSalesTrendQueryKey, useGetTopCustomers, getGetTopCustomersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatWeight, formatDateTime } from "@/lib/format";
import { TrendingUp, ArrowUpRight, ArrowDownRight, IndianRupee, Scale, Coins, Activity, TrendingDown, FileText, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: rates, isLoading: isLoadingRates } = useGetMetalRates();
  const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity();
  const { data: salesTrend, isLoading: isLoadingTrend } = useGetSalesTrend();
  const { data: topCustomers, isLoading: isLoadingCustomers } = useGetTopCustomers();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-1">Today's snapshot and key metrics</p>
      </div>

      {/* Metal Rates Strip */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex gap-8 items-center overflow-x-auto whitespace-nowrap shadow-sm">
        <div className="flex items-center gap-2 text-primary font-medium border-r border-primary/20 pr-4">
          <TrendingUp className="h-5 w-5" />
          <span>Live Rates</span>
        </div>
        {isLoadingRates ? (
          <div className="flex gap-4"><Skeleton className="h-6 w-32" /><Skeleton className="h-6 w-32" /></div>
        ) : (
          rates?.map((rate) => (
            <div key={`${rate.metal}-${rate.purity}`} className="flex items-center gap-2">
              <span className="font-semibold text-foreground capitalize">{rate.metal} {rate.purity}</span>
              <span className="text-primary font-bold">{formatCurrency(rate.ratePerGram)}/g</span>
            </div>
          ))
        )}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Today's Sales" value={summary?.todaySales} icon={IndianRupee} isLoading={isLoadingSummary} trend="+12% from yesterday" />
        <KPICard title="Month Sales" value={summary?.monthSales} icon={TrendingUp} isLoading={isLoadingSummary} trend="+5% from last month" />
        <KPICard title="Receivables" value={summary?.receivable} icon={ArrowDownRight} isLoading={isLoadingSummary} alert />
        <KPICard title="Payables" value={summary?.payable} icon={ArrowUpRight} isLoading={isLoadingSummary} />
        
        <KPICard title="Active Loans" value={summary?.activeLoans} icon={Scale} isLoading={isLoadingSummary} isCurrency={false} />
        <KPICard title="Stock Valuation" value={summary?.stockValuation} icon={Coins} isLoading={isLoadingSummary} />
        <KPICard title="GST Collected" value={summary?.gstCollectedMonth} icon={Activity} isLoading={isLoadingSummary} />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Trend Chart */}
        <Card className="col-span-1 lg:col-span-2 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>30-Day Sales Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoadingTrend ? <Skeleton className="w-full h-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRetail" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorWholesale" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('en-IN')}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: 'var(--shadow-md)' }}
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
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingActivity ? (
              <div className="space-y-4">
                {[1,2,3,4,5].map(i => <div key={i} className="flex gap-3"><Skeleton className="h-10 w-10 rounded-full"/><div className="space-y-2"><Skeleton className="h-4 w-32"/><Skeleton className="h-3 w-20"/></div></div>)}
              </div>
            ) : (
              <div className="space-y-6">
                {activity?.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 border border-border">
                      {item.kind === 'invoice' && <FileText className="h-5 w-5 text-primary" />}
                      {item.kind.startsWith('girvi') && <Scale className="h-5 w-5 text-accent" />}
                      {item.kind === 'ledger' && <BookOpen className="h-5 w-5 text-foreground" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.subtitle} • {formatDateTime(item.date)}</p>
                    </div>
                    {item.amount && (
                      <div className="text-sm font-bold text-foreground text-right">
                        {formatCurrency(item.amount)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon: Icon, isLoading, isCurrency = true, alert = false, trend }: { title: string, value?: number, icon: any, isLoading: boolean, isCurrency?: boolean, alert?: boolean, trend?: string }) {
  return (
    <Card className="shadow-sm border-border/50 hover:border-primary/20 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${alert ? 'text-destructive' : 'text-primary'}`} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className={`text-2xl font-bold ${alert ? 'text-destructive' : 'text-foreground'}`}>
              {value === undefined ? '-' : isCurrency ? formatCurrency(value) : value.toLocaleString('en-IN')}
            </div>
            {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
