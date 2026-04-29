import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  schemePlansTable,
  schemeAccountsTable,
  schemeInstallmentsTable,
  customersTable,
} from "@workspace/db";
import {
  ListSchemePlansResponse,
  CreateSchemePlanBody,
  CreateSchemePlanResponse,
  DeleteSchemePlanParams,
  DeleteSchemePlanResponse,
  ListSchemeAccountsResponse,
  CreateSchemeAccountBody,
  CreateSchemeAccountResponse,
  GetSchemeAccountParams,
  GetSchemeAccountResponse,
  PaySchemeInstallmentParams,
  PaySchemeInstallmentBody,
  PaySchemeInstallmentResponse,
  RedeemSchemeAccountParams,
  RedeemSchemeAccountResponse,
} from "@workspace/api-zod";
import { n, nextSerial } from "../lib/calc";

const router: IRouter = Router();

router.get("/scheme-plans", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      p: schemePlansTable,
      count: sql<number>`count(${schemeAccountsTable.id})::int`,
    })
    .from(schemePlansTable)
    .leftJoin(
      schemeAccountsTable,
      eq(schemeAccountsTable.planId, schemePlansTable.id),
    )
    .groupBy(schemePlansTable.id)
    .orderBy(desc(schemePlansTable.createdAt));
  res.json(
    ListSchemePlansResponse.parse(
      rows.map((r) => ({
        id: r.p.id,
        name: r.p.name,
        monthlyAmount: n(r.p.monthlyAmount),
        durationMonths: r.p.durationMonths,
        bonusMonths: r.p.bonusMonths,
        description: r.p.description,
        active: r.p.active === "true",
        accountCount: r.count ?? 0,
        createdAt: r.p.createdAt.toISOString(),
      })),
    ),
  );
});

router.post("/scheme-plans", async (req, res): Promise<void> => {
  const parsed = CreateSchemePlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const [row] = await db
    .insert(schemePlansTable)
    .values({
      name: d.name,
      monthlyAmount: String(d.monthlyAmount),
      durationMonths: d.durationMonths,
      bonusMonths: d.bonusMonths,
      description: d.description ?? null,
      active: d.active ? "true" : "false",
    })
    .returning();
  res.json(
    CreateSchemePlanResponse.parse({
      id: row.id,
      name: row.name,
      monthlyAmount: n(row.monthlyAmount),
      durationMonths: row.durationMonths,
      bonusMonths: row.bonusMonths,
      description: row.description,
      active: row.active === "true",
      accountCount: 0,
      createdAt: row.createdAt.toISOString(),
    }),
  );
});

router.delete("/scheme-plans/:id", async (req, res): Promise<void> => {
  const params = DeleteSchemePlanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(schemePlansTable)
    .where(eq(schemePlansTable.id, params.data.id));
  res.json(DeleteSchemePlanResponse.parse({ ok: true }));
});

async function summarizeAccount(accountId: string) {
  const [row] = await db
    .select({
      a: schemeAccountsTable,
      plan: schemePlansTable,
      cust: customersTable,
    })
    .from(schemeAccountsTable)
    .leftJoin(
      schemePlansTable,
      eq(schemePlansTable.id, schemeAccountsTable.planId),
    )
    .leftJoin(
      customersTable,
      eq(customersTable.id, schemeAccountsTable.customerId),
    )
    .where(eq(schemeAccountsTable.id, accountId));
  if (!row || !row.plan) return null;
  const installments = await db
    .select()
    .from(schemeInstallmentsTable)
    .where(eq(schemeInstallmentsTable.accountId, accountId))
    .orderBy(schemeInstallmentsTable.installmentNumber);
  const accumulated = installments.reduce((s, i) => s + n(i.paidAmount), 0);
  const monthly = n(row.plan.monthlyAmount);
  const bonus = monthly * row.plan.bonusMonths;
  const total = row.plan.durationMonths;
  return {
    summary: {
      id: row.a.id,
      accountNumber: row.a.accountNumber,
      planId: row.a.planId,
      planName: row.plan.name,
      customerId: row.a.customerId,
      customerName: row.cust?.name ?? "(deleted)",
      startDate: row.a.startDate.toISOString(),
      maturityDate: row.a.maturityDate ? row.a.maturityDate.toISOString() : null,
      status: row.a.status as "active" | "redeemed",
      installmentsPaid: installments.length,
      totalInstallments: total,
      accumulatedAmount: accumulated,
      bonusAmount: installments.length >= total ? bonus : 0,
      redeemableAmount:
        accumulated + (installments.length >= total ? bonus : 0),
    },
    installments: installments.map((i) => ({
      id: i.id,
      installmentNumber: i.installmentNumber,
      paidAmount: n(i.paidAmount),
      paidAt: i.paidAt.toISOString(),
      note: i.note,
    })),
  };
}

router.get("/scheme-accounts", async (req, res): Promise<void> => {
  const status =
    typeof req.query.status === "string" ? req.query.status : undefined;
  const conds = [];
  if (status && status !== "all")
    conds.push(eq(schemeAccountsTable.status, status));
  const rows = await db
    .select({ id: schemeAccountsTable.id })
    .from(schemeAccountsTable)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(schemeAccountsTable.createdAt));
  const out = [];
  for (const r of rows) {
    const s = await summarizeAccount(r.id);
    if (s) out.push(s.summary);
  }
  res.json(ListSchemeAccountsResponse.parse(out));
});

router.post("/scheme-accounts", async (req, res): Promise<void> => {
  const parsed = CreateSchemeAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const [plan] = await db
    .select()
    .from(schemePlansTable)
    .where(eq(schemePlansTable.id, d.planId));
  if (!plan) {
    res.status(400).json({ error: "Plan not found" });
    return;
  }
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schemeAccountsTable);
  const accountNumber = nextSerial("SCH", count ?? 0);

  const start = new Date(d.startDate);
  const maturity = new Date(start);
  maturity.setMonth(maturity.getMonth() + plan.durationMonths);

  const [row] = await db
    .insert(schemeAccountsTable)
    .values({
      accountNumber,
      planId: d.planId,
      customerId: d.customerId,
      startDate: start,
      maturityDate: maturity,
      notes: null,
    })
    .returning();
  const detail = await summarizeAccount(row.id);
  res.json(
    CreateSchemeAccountResponse.parse({
      ...detail!.summary,
      installments: detail!.installments,
    }),
  );
});

router.get("/scheme-accounts/:id", async (req, res): Promise<void> => {
  const params = GetSchemeAccountParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const detail = await summarizeAccount(params.data.id);
  if (!detail) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  res.json(
    GetSchemeAccountResponse.parse({
      ...detail.summary,
      installments: detail.installments,
    }),
  );
});

router.post("/scheme-accounts/:id/installment", async (req, res): Promise<void> => {
  const params = PaySchemeInstallmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = PaySchemeInstallmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schemeInstallmentsTable)
    .where(eq(schemeInstallmentsTable.accountId, params.data.id));
  await db.insert(schemeInstallmentsTable).values({
    accountId: params.data.id,
    installmentNumber: (count ?? 0) + 1,
    paidAmount: String(parsed.data.paidAmount),
    note: parsed.data.note ?? null,
  });
  const detail = await summarizeAccount(params.data.id);
  if (!detail) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  res.json(
    PaySchemeInstallmentResponse.parse({
      ...detail.summary,
      installments: detail.installments,
    }),
  );
});

router.post("/scheme-accounts/:id/redeem", async (req, res): Promise<void> => {
  const params = RedeemSchemeAccountParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .update(schemeAccountsTable)
    .set({ status: "redeemed", redeemedAt: new Date() })
    .where(eq(schemeAccountsTable.id, params.data.id));
  const detail = await summarizeAccount(params.data.id);
  if (!detail) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  res.json(
    RedeemSchemeAccountResponse.parse({
      ...detail.summary,
      installments: detail.installments,
    }),
  );
});

export default router;
