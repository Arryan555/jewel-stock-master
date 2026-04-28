import { Router, type IRouter } from "express";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  db,
  girviLoansTable,
  girviPaymentsTable,
  customersTable,
} from "@workspace/db";
import {
  ListGirviLoansResponse,
  CreateGirviLoanBody,
  CreateGirviLoanResponse,
  GetGirviLoanParams,
  GetGirviLoanResponse,
  DeleteGirviLoanParams,
  DeleteGirviLoanResponse,
  RecordGirviPaymentParams,
  RecordGirviPaymentBody,
  RecordGirviPaymentResponse,
  CloseGirviLoanParams,
  CloseGirviLoanResponse,
} from "@workspace/api-zod";
import { computeAccruedInterest, computeGirviStatus, n, nextSerial } from "../lib/calc";

const router: IRouter = Router();

interface LoanWithName {
  loan: typeof girviLoansTable.$inferSelect;
  customerName: string | null;
  paidAmount: number;
}

async function loadAggregated(condition?: ReturnType<typeof eq>) {
  const rows = await db
    .select({
      loan: girviLoansTable,
      customerName: customersTable.name,
      paidAmount: sql<string>`coalesce(sum(${girviPaymentsTable.amount}),0)`,
    })
    .from(girviLoansTable)
    .leftJoin(customersTable, eq(customersTable.id, girviLoansTable.customerId))
    .leftJoin(
      girviPaymentsTable,
      eq(girviPaymentsTable.loanId, girviLoansTable.id),
    )
    .where(condition)
    .groupBy(girviLoansTable.id, customersTable.name)
    .orderBy(desc(girviLoansTable.loanDate));
  return rows.map<LoanWithName>((r) => ({
    loan: r.loan,
    customerName: r.customerName,
    paidAmount: n(r.paidAmount),
  }));
}

function summarizeLoan(row: LoanWithName) {
  const now = new Date();
  const principal = n(row.loan.loanAmount);
  const accrued = computeAccruedInterest(
    principal,
    n(row.loan.interestRatePct),
    row.loan.loanDate,
    row.loan.closedAt ?? now,
  );
  const outstanding = Math.max(0, principal + accrued - row.paidAmount);
  const status = computeGirviStatus(
    row.loan.status,
    outstanding,
    row.loan.dueDate,
    now,
  );
  return {
    id: row.loan.id,
    loanNumber: row.loan.loanNumber,
    customerId: row.loan.customerId,
    customerName: row.customerName ?? "(deleted)",
    itemDescription: row.loan.itemDescription,
    metal: row.loan.metal,
    purity: row.loan.purity,
    weightGrams: n(row.loan.weightGrams),
    loanAmount: principal,
    interestRatePct: n(row.loan.interestRatePct),
    loanDate: row.loan.loanDate.toISOString(),
    dueDate: row.loan.dueDate.toISOString(),
    status,
    paidAmount: row.paidAmount,
    accruedInterest: Number(accrued.toFixed(2)),
    outstanding: Number(outstanding.toFixed(2)),
  };
}

router.get("/girvi", async (req, res): Promise<void> => {
  const status =
    typeof req.query.status === "string" ? req.query.status : undefined;
  const all = await loadAggregated();
  let summarized = all.map(summarizeLoan);
  if (status && status !== "all") {
    summarized = summarized.filter((s) => s.status === status);
  }
  res.json(ListGirviLoansResponse.parse(summarized));
});

router.post("/girvi", async (req, res): Promise<void> => {
  const parsed = CreateGirviLoanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(girviLoansTable);
  const loanNumber = nextSerial("GR", count ?? 0);
  const [loan] = await db
    .insert(girviLoansTable)
    .values({
      loanNumber,
      customerId: d.customerId,
      itemDescription: d.itemDescription,
      metal: d.metal,
      purity: d.purity,
      weightGrams: String(d.weightGrams),
      loanAmount: String(d.loanAmount),
      interestRatePct: String(d.interestRatePct),
      loanDate: new Date(d.loanDate),
      dueDate: new Date(d.dueDate),
      status: "active",
    })
    .returning();

  const detail = await loadDetail(loan.id);
  res.json(CreateGirviLoanResponse.parse(detail));
});

async function loadDetail(loanId: string) {
  const [row] = await loadAggregated(eq(girviLoansTable.id, loanId));
  if (!row) return null;
  const summary = summarizeLoan(row);
  const payments = await db
    .select()
    .from(girviPaymentsTable)
    .where(eq(girviPaymentsTable.loanId, loanId))
    .orderBy(asc(girviPaymentsTable.date));
  return {
    ...summary,
    payments: payments.map((p) => ({
      id: p.id,
      date: p.date.toISOString(),
      amount: n(p.amount),
      note: p.note,
    })),
  };
}

router.get("/girvi/:id", async (req, res): Promise<void> => {
  const params = GetGirviLoanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const detail = await loadDetail(params.data.id);
  if (!detail) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }
  res.json(GetGirviLoanResponse.parse(detail));
});

router.delete("/girvi/:id", async (req, res): Promise<void> => {
  const params = DeleteGirviLoanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(girviPaymentsTable)
    .where(eq(girviPaymentsTable.loanId, params.data.id));
  await db.delete(girviLoansTable).where(eq(girviLoansTable.id, params.data.id));
  res.json(DeleteGirviLoanResponse.parse({ ok: true }));
});

router.post("/girvi/:id/payment", async (req, res): Promise<void> => {
  const params = RecordGirviPaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = RecordGirviPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [loan] = await db
    .select()
    .from(girviLoansTable)
    .where(eq(girviLoansTable.id, params.data.id));
  if (!loan) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }
  await db.insert(girviPaymentsTable).values({
    loanId: params.data.id,
    amount: String(parsed.data.amount),
    note: parsed.data.note ?? null,
  });
  const detail = await loadDetail(params.data.id);
  res.json(RecordGirviPaymentResponse.parse(detail));
});

router.post("/girvi/:id/close", async (req, res): Promise<void> => {
  const params = CloseGirviLoanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .update(girviLoansTable)
    .set({ status: "closed", closedAt: new Date() })
    .where(eq(girviLoansTable.id, params.data.id));
  const detail = await loadDetail(params.data.id);
  if (!detail) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }
  res.json(CloseGirviLoanResponse.parse(detail));
});

export default router;
