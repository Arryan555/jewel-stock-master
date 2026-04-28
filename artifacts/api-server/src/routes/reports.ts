import { Router, type IRouter } from "express";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import {
  db,
  invoicesTable,
  invoiceItemsTable,
  customersTable,
  productsTable,
  girviLoansTable,
  girviPaymentsTable,
  ledgerEntriesTable,
} from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetSalesTrendResponse,
  GetGstReportResponse,
  GetGstReportQueryParams,
  GetStockReportResponse,
  GetGirviSummaryResponse,
  GetTopCustomersResponse,
  GetRecentActivityResponse,
  GetMetalRatesResponse,
} from "@workspace/api-zod";
import { computeAccruedInterest, computeGirviStatus, n } from "../lib/calc";

const router: IRouter = Router();

router.get("/reports/dashboard", async (_req, res): Promise<void> => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayAgg] = await db
    .select({
      total: sql<string>`coalesce(sum(${invoicesTable.total}),0)`,
    })
    .from(invoicesTable)
    .where(gte(invoicesTable.date, startOfDay));

  const [monthAgg] = await db
    .select({
      total: sql<string>`coalesce(sum(${invoicesTable.total}),0)`,
      gst: sql<string>`coalesce(sum(${invoicesTable.gstAmount}),0)`,
      count: sql<number>`count(*)::int`,
      retail: sql<string>`coalesce(sum(case when ${invoicesTable.type}='retail' then ${invoicesTable.total} else 0 end),0)`,
      wholesale: sql<string>`coalesce(sum(case when ${invoicesTable.type}='wholesale' then ${invoicesTable.total} else 0 end),0)`,
    })
    .from(invoicesTable)
    .where(gte(invoicesTable.date, startOfMonth));

  // Receivable = sum of unpaid balances on invoices + ledger debits - credits per customer (positive only) + opening balances (positive only)
  const [receivableAgg] = await db
    .select({
      receivable: sql<string>`coalesce(sum(${invoicesTable.total} - ${invoicesTable.paidAmount}),0)`,
    })
    .from(invoicesTable);

  const [ledgerAgg] = await db
    .select({
      debit: sql<string>`coalesce(sum(case when ${ledgerEntriesTable.type}='debit' then ${ledgerEntriesTable.amount} else 0 end),0)`,
      credit: sql<string>`coalesce(sum(case when ${ledgerEntriesTable.type}='credit' then ${ledgerEntriesTable.amount} else 0 end),0)`,
    })
    .from(ledgerEntriesTable);

  const receivable = n(receivableAgg.receivable) + n(ledgerAgg.debit);
  const payable = n(ledgerAgg.credit);

  // Active loans
  const allLoanRows = await db
    .select({
      loan: girviLoansTable,
      paid: sql<string>`coalesce(sum(${girviPaymentsTable.amount}),0)`,
    })
    .from(girviLoansTable)
    .leftJoin(
      girviPaymentsTable,
      eq(girviPaymentsTable.loanId, girviLoansTable.id),
    )
    .groupBy(girviLoansTable.id);

  let activeLoans = 0;
  let loanPrincipal = 0;
  let overdueLoans = 0;
  for (const r of allLoanRows) {
    const principal = n(r.loan.loanAmount);
    const accrued = computeAccruedInterest(
      principal,
      n(r.loan.interestRatePct),
      r.loan.loanDate,
      r.loan.closedAt ?? now,
    );
    const outstanding = Math.max(0, principal + accrued - n(r.paid));
    const status = computeGirviStatus(
      r.loan.status,
      outstanding,
      r.loan.dueDate,
      now,
    );
    if (status !== "closed") {
      activeLoans++;
      loanPrincipal += principal;
      if (status === "overdue") overdueLoans++;
    }
  }

  // Stock valuation = sum(weight * rate) for in-stock items
  const products = await db.select().from(productsTable);
  let stockValuation = 0;
  for (const p of products) {
    if (p.stockQuantity > 0) {
      stockValuation +=
        p.stockQuantity *
        (n(p.weightGrams) * n(p.ratePerGram) + n(p.stoneCharges));
    }
  }

  const monthTotal = n(monthAgg.total);
  const retail = n(monthAgg.retail);
  const wholesale = n(monthAgg.wholesale);
  const denom = monthTotal > 0 ? monthTotal : 1;

  res.json(
    GetDashboardSummaryResponse.parse({
      todaySales: Number(n(todayAgg.total).toFixed(2)),
      monthSales: Number(monthTotal.toFixed(2)),
      receivable: Number(receivable.toFixed(2)),
      payable: Number(payable.toFixed(2)),
      activeLoans,
      loanPrincipal: Number(loanPrincipal.toFixed(2)),
      overdueLoans,
      stockValuation: Number(stockValuation.toFixed(2)),
      invoicesThisMonth: monthAgg.count ?? 0,
      retailShare: Number(((retail / denom) * 100).toFixed(2)),
      wholesaleShare: Number(((wholesale / denom) * 100).toFixed(2)),
      gstCollectedMonth: Number(n(monthAgg.gst).toFixed(2)),
    }),
  );
});

router.get("/reports/sales-trend", async (_req, res): Promise<void> => {
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      day: sql<string>`to_char(${invoicesTable.date}, 'YYYY-MM-DD')`,
      retail: sql<string>`coalesce(sum(case when ${invoicesTable.type}='retail' then ${invoicesTable.total} else 0 end),0)`,
      wholesale: sql<string>`coalesce(sum(case when ${invoicesTable.type}='wholesale' then ${invoicesTable.total} else 0 end),0)`,
    })
    .from(invoicesTable)
    .where(gte(invoicesTable.date, since))
    .groupBy(sql`to_char(${invoicesTable.date}, 'YYYY-MM-DD')`);

  const byDate = new Map(
    rows.map((r) => [r.day, { retail: n(r.retail), wholesale: n(r.wholesale) }]),
  );

  const result = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const v = byDate.get(key) ?? { retail: 0, wholesale: 0 };
    result.push({
      date: key,
      retail: Number(v.retail.toFixed(2)),
      wholesale: Number(v.wholesale.toFixed(2)),
      total: Number((v.retail + v.wholesale).toFixed(2)),
    });
  }
  res.json(GetSalesTrendResponse.parse(result));
});

router.get("/reports/gst", async (req, res): Promise<void> => {
  const parsed = GetGstReportQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const fromDate = parsed.data.from
    ? new Date(parsed.data.from)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const toDate = parsed.data.to ? new Date(parsed.data.to) : new Date();
  toDate.setHours(23, 59, 59, 999);

  // Pull invoice items joined with their invoices, filtered by date range
  const itemRows = await db
    .select({
      gstRate: invoiceItemsTable.gstRate,
      amount: invoiceItemsTable.amount,
      weight: invoiceItemsTable.weightGrams,
      rate: invoiceItemsTable.ratePerGram,
      making: invoiceItemsTable.makingChargePercent,
      stones: invoiceItemsTable.stoneCharges,
      invoiceId: invoiceItemsTable.invoiceId,
    })
    .from(invoiceItemsTable)
    .leftJoin(invoicesTable, eq(invoicesTable.id, invoiceItemsTable.invoiceId))
    .where(
      and(
        gte(invoicesTable.date, fromDate),
        lte(invoicesTable.date, toDate),
      ),
    );

  const slabMap = new Map<
    number,
    { taxable: number; tax: number; invoices: Set<string> }
  >();
  for (const r of itemRows) {
    const metal = n(r.weight) * n(r.rate);
    const making = (metal * n(r.making)) / 100;
    const taxable = metal + making + n(r.stones);
    const tax = (taxable * n(r.gstRate)) / 100;
    const rate = n(r.gstRate);
    if (!slabMap.has(rate))
      slabMap.set(rate, { taxable: 0, tax: 0, invoices: new Set() });
    const s = slabMap.get(rate)!;
    s.taxable += taxable;
    s.tax += tax;
    s.invoices.add(r.invoiceId);
  }

  const slabs = Array.from(slabMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([gstRate, s]) => ({
      gstRate,
      taxableAmount: Number(s.taxable.toFixed(2)),
      cgst: Number((s.tax / 2).toFixed(2)),
      sgst: Number((s.tax / 2).toFixed(2)),
      totalTax: Number(s.tax.toFixed(2)),
      invoiceCount: s.invoices.size,
    }));

  const totalTaxable = slabs.reduce((a, b) => a + b.taxableAmount, 0);
  const totalTax = slabs.reduce((a, b) => a + b.totalTax, 0);

  res.json(
    GetGstReportResponse.parse({
      from: fromDate.toISOString().slice(0, 10),
      to: toDate.toISOString().slice(0, 10),
      totalTaxable: Number(totalTaxable.toFixed(2)),
      totalCgst: Number((totalTax / 2).toFixed(2)),
      totalSgst: Number((totalTax / 2).toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      slabs,
    }),
  );
});

router.get("/reports/stock", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable);
  let totalItems = 0;
  let totalWeight = 0;
  let totalValue = 0;
  const groupMap = new Map<
    string,
    { metal: string; category: string; items: number; totalWeight: number; totalValue: number }
  >();
  for (const p of products) {
    const qty = p.stockQuantity;
    const weight = qty * n(p.weightGrams);
    const value = qty * (n(p.weightGrams) * n(p.ratePerGram) + n(p.stoneCharges));
    totalItems += qty;
    totalWeight += weight;
    totalValue += value;
    const key = `${p.metal}::${p.category}`;
    if (!groupMap.has(key))
      groupMap.set(key, {
        metal: p.metal,
        category: p.category,
        items: 0,
        totalWeight: 0,
        totalValue: 0,
      });
    const g = groupMap.get(key)!;
    g.items += qty;
    g.totalWeight += weight;
    g.totalValue += value;
  }

  res.json(
    GetStockReportResponse.parse({
      totalItems,
      totalWeight: Number(totalWeight.toFixed(3)),
      totalValue: Number(totalValue.toFixed(2)),
      groups: Array.from(groupMap.values())
        .map((g) => ({
          metal: g.metal,
          category: g.category,
          items: g.items,
          totalWeight: Number(g.totalWeight.toFixed(3)),
          totalValue: Number(g.totalValue.toFixed(2)),
        }))
        .sort(
          (a, b) =>
            a.metal.localeCompare(b.metal) || a.category.localeCompare(b.category),
        ),
    }),
  );
});

router.get("/reports/girvi-summary", async (_req, res): Promise<void> => {
  const now = new Date();
  const allLoans = await db
    .select({
      loan: girviLoansTable,
      paid: sql<string>`coalesce(sum(${girviPaymentsTable.amount}),0)`,
    })
    .from(girviLoansTable)
    .leftJoin(
      girviPaymentsTable,
      eq(girviPaymentsTable.loanId, girviLoansTable.id),
    )
    .groupBy(girviLoansTable.id);

  let activeCount = 0;
  let overdueCount = 0;
  let closedCount = 0;
  let totalPrincipal = 0;
  let totalAccruedInterest = 0;
  let totalOutstanding = 0;
  let totalCollateralWeight = 0;

  for (const r of allLoans) {
    const principal = n(r.loan.loanAmount);
    const accrued = computeAccruedInterest(
      principal,
      n(r.loan.interestRatePct),
      r.loan.loanDate,
      r.loan.closedAt ?? now,
    );
    const outstanding = Math.max(0, principal + accrued - n(r.paid));
    const status = computeGirviStatus(
      r.loan.status,
      outstanding,
      r.loan.dueDate,
      now,
    );
    if (status === "closed") {
      closedCount++;
    } else {
      activeCount++;
      if (status === "overdue") overdueCount++;
      totalPrincipal += principal;
      totalAccruedInterest += accrued;
      totalOutstanding += outstanding;
      totalCollateralWeight += n(r.loan.weightGrams);
    }
  }

  res.json(
    GetGirviSummaryResponse.parse({
      activeCount,
      overdueCount,
      closedCount,
      totalPrincipal: Number(totalPrincipal.toFixed(2)),
      totalAccruedInterest: Number(totalAccruedInterest.toFixed(2)),
      totalOutstanding: Number(totalOutstanding.toFixed(2)),
      totalCollateralWeight: Number(totalCollateralWeight.toFixed(3)),
    }),
  );
});

router.get("/reports/top-customers", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      customerId: invoicesTable.customerId,
      customerName: customersTable.name,
      type: customersTable.type,
      total: sql<string>`coalesce(sum(${invoicesTable.total}),0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(invoicesTable)
    .leftJoin(customersTable, eq(customersTable.id, invoicesTable.customerId))
    .groupBy(invoicesTable.customerId, customersTable.name, customersTable.type)
    .orderBy(desc(sql`sum(${invoicesTable.total})`))
    .limit(10);

  res.json(
    GetTopCustomersResponse.parse(
      rows.map((r) => ({
        customerId: r.customerId,
        customerName: r.customerName ?? "(deleted)",
        type: r.type ?? "retail",
        totalPurchases: Number(n(r.total).toFixed(2)),
        invoiceCount: r.count ?? 0,
      })),
    ),
  );
});

router.get("/reports/recent-activity", async (_req, res): Promise<void> => {
  const recentInvoices = await db
    .select({
      inv: invoicesTable,
      name: customersTable.name,
    })
    .from(invoicesTable)
    .leftJoin(customersTable, eq(customersTable.id, invoicesTable.customerId))
    .orderBy(desc(invoicesTable.date))
    .limit(8);

  const recentGirvi = await db
    .select({
      loan: girviLoansTable,
      name: customersTable.name,
    })
    .from(girviLoansTable)
    .leftJoin(customersTable, eq(customersTable.id, girviLoansTable.customerId))
    .orderBy(desc(girviLoansTable.loanDate))
    .limit(6);

  const recentLedger = await db
    .select({
      entry: ledgerEntriesTable,
      name: customersTable.name,
    })
    .from(ledgerEntriesTable)
    .leftJoin(
      customersTable,
      eq(customersTable.id, ledgerEntriesTable.customerId),
    )
    .orderBy(desc(ledgerEntriesTable.date))
    .limit(6);

  const items = [
    ...recentInvoices.map((r) => ({
      id: `inv-${r.inv.id}`,
      kind: "invoice" as const,
      title: `${r.inv.type === "wholesale" ? "Wholesale" : "Retail"} invoice ${r.inv.invoiceNumber}`,
      subtitle: r.name ?? "(deleted)",
      amount: n(r.inv.total),
      date: r.inv.date.toISOString(),
    })),
    ...recentGirvi.map((r) => ({
      id: `gir-${r.loan.id}`,
      kind: r.loan.status === "closed"
        ? ("girvi_closed" as const)
        : ("girvi_created" as const),
      title: `Girvi ${r.loan.loanNumber} — ${r.loan.itemDescription}`,
      subtitle: r.name ?? "(deleted)",
      amount: n(r.loan.loanAmount),
      date: r.loan.loanDate.toISOString(),
    })),
    ...recentLedger.map((r) => ({
      id: `led-${r.entry.id}`,
      kind: "ledger" as const,
      title: `${r.entry.type === "credit" ? "Credit" : "Debit"} entry`,
      subtitle: `${r.name ?? "(deleted)"} — ${r.entry.description}`,
      amount: n(r.entry.amount),
      date: r.entry.date.toISOString(),
    })),
  ];
  items.sort((a, b) => (a.date < b.date ? 1 : -1));
  res.json(GetRecentActivityResponse.parse(items.slice(0, 12)));
});

router.get("/reports/metal-rates", async (_req, res): Promise<void> => {
  // Derive from products: take median rate per metal+purity, with last-updated time.
  const products = await db.select().from(productsTable);
  const map = new Map<
    string,
    { metal: string; purity: string; rates: number[]; updatedAt: Date }
  >();
  for (const p of products) {
    const key = `${p.metal}::${p.purity}`;
    if (!map.has(key))
      map.set(key, {
        metal: p.metal,
        purity: p.purity,
        rates: [],
        updatedAt: p.createdAt,
      });
    const g = map.get(key)!;
    g.rates.push(n(p.ratePerGram));
    if (p.createdAt > g.updatedAt) g.updatedAt = p.createdAt;
  }
  const result = Array.from(map.values())
    .map((g) => {
      const sorted = [...g.rates].sort((a, b) => a - b);
      const ratePerGram = sorted[Math.floor(sorted.length / 2)] ?? 0;
      return {
        metal: g.metal,
        purity: g.purity,
        ratePerGram: Number(ratePerGram.toFixed(2)),
        updatedAt: g.updatedAt.toISOString(),
      };
    })
    .sort(
      (a, b) =>
        a.metal.localeCompare(b.metal) || a.purity.localeCompare(b.purity),
    );
  res.json(GetMetalRatesResponse.parse(result));
});

export default router;
