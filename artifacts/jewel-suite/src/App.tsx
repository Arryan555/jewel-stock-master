import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/app-layout";

import Dashboard from "@/pages/dashboard";
import CustomersIndex from "@/pages/customers";
import CustomerDetail from "@/pages/customers/detail";
import ProductsIndex from "@/pages/products";
import InvoicesIndex from "@/pages/invoices";
import InvoiceDetail from "@/pages/invoices/detail";
import EstimatesIndex from "@/pages/estimates";
import EstimateNew from "@/pages/estimates/new";
import EstimateDetail from "@/pages/estimates/detail";
import GirviIndex from "@/pages/girvi";
import GirviNew from "@/pages/girvi/new";
import GirviDetail from "@/pages/girvi/detail";
import LedgerIndex from "@/pages/ledger";
import KarigarsIndex from "@/pages/karigars";
import KarigarJobsIndex from "@/pages/karigars/jobs";
import RepairsIndex from "@/pages/repairs";
import SchemesIndex from "@/pages/schemes";
import SchemeAccountDetail from "@/pages/schemes/detail";
import SettingsPage from "@/pages/settings";
import PurchasesIndex from "@/pages/purchases";
import PurchaseNew from "@/pages/purchases/new";
import PurchaseDetail from "@/pages/purchases/detail";
import AmcPage from "@/pages/amc";
import DaybookReport from "@/pages/reports/daybook";
import SalesReport from "@/pages/reports/sales";
import GstReport from "@/pages/reports/gst";
import StockReport from "@/pages/reports/stock";
import GirviReport from "@/pages/reports/girvi-report";
import KarigarIndex from "@/pages/karigar";
import IssueIndex from "@/pages/issue";
import RatesIndex from "@/pages/rates";
import JewelBill from "@/pages/billing/jewel-bill";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />

        <Route path="/customers" component={CustomersIndex} />
        <Route path="/customers/:id" component={CustomerDetail} />

        <Route path="/products" component={ProductsIndex} />

        <Route path="/invoices" component={InvoicesIndex} />
        <Route path="/invoices/:id" component={InvoiceDetail} />

        {/* Enhanced Jewar billing — all bill types use same form */}
        <Route path="/billing/retail/new" component={JewelBill} />
        <Route path="/billing/wholesale/new" component={JewelBill} />
        <Route path="/billing/purchase/new" component={JewelBill} />
        <Route path="/billing/karigar/new" component={JewelBill} />
        <Route path="/billing/gold/new" component={JewelBill} />
        <Route path="/billing/diamond/new" component={JewelBill} />
        <Route path="/billing/exchange/new" component={JewelBill} />
        <Route path="/billing/repair/new" component={JewelBill} />

        <Route path="/estimates" component={EstimatesIndex} />
        <Route path="/estimates/new" component={EstimateNew} />
        <Route path="/estimates/:id" component={EstimateDetail} />

        <Route path="/girvi" component={GirviIndex} />
        <Route path="/girvi/new" component={GirviNew} />
        <Route path="/girvi/:id" component={GirviDetail} />

        <Route path="/ledger" component={LedgerIndex} />

        {/* Workshop — full job tracking */}
        <Route path="/karigars" component={KarigarsIndex} />
        <Route path="/karigar-jobs" component={KarigarJobsIndex} />
        <Route path="/repairs" component={RepairsIndex} />

        {/* Workshop — simple issue register + karigar profile */}
        <Route path="/issue" component={IssueIndex} />
        <Route path="/karigar" component={KarigarIndex} />

        <Route path="/schemes" component={SchemesIndex} />
        <Route path="/schemes/:id" component={SchemeAccountDetail} />

        <Route path="/purchases" component={PurchasesIndex} />
        <Route path="/purchases/new" component={PurchaseNew} />
        <Route path="/purchases/:id" component={PurchaseDetail} />

        <Route path="/rates" component={RatesIndex} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/amc" component={AmcPage} />

        <Route path="/reports/daybook" component={DaybookReport} />
        <Route path="/reports/sales" component={SalesReport} />
        <Route path="/reports/gst" component={GstReport} />
        <Route path="/reports/stock" component={StockReport} />
        <Route path="/reports/girvi" component={GirviReport} />

        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
