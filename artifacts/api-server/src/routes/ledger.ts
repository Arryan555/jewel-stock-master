import { Router, type IRouter } from "express";
import { asc, desc, eq, sql } from "drizzle-orm";
import {
  db,
  ledgerEntriesTable,
  customersTable,
  invoicesTable,
} from "@workspace/db";
import {
  ListLedgerEntriesResponse,
  CreateLedgerEntryBody,
  CreateLedgerEntryResponse,
  DeleteLedgerEntryParams,
  DeleteLedgerEntryResponse,
  GetLedgerBalancesResponse,
} from "@workspace/api-zod";
import { n } from "../lib/calc";

const router: IRouter = Router();

router.get("/ledger/entries", async (req, res): Promise<void> => {
  const customerId =
    typeof req.query.customerId === "string" ? req.query.customerId : undefined;

  const rows = await db
    .select({
      entry: ledgerEntriesTable,
      customerName: customersTable.name,
    })
    .from(ledgerEntriesTable)
    .leftJoin(
      customersTable,
      eq(customersTable.id, ledgerEntriesTable.customerId),
    )
    .where(customerId ? eq(ledgerEntriesTable.customerId, customerId) : undefined)
    .orderBy(desc(ledgerEntriesTable.date));

  res.json(
    ListLedgerEntriesResponse.parse(
      rows.map((r) => ({
        id: r.entry.id,
        customerId: r.entry.customerId,
        customerName: r.customerName ?? "(deleted)",
        date: r.entry.date.toISOString(),
        type: r.entry.type,
        amount: n(r.entry.amount),
        description: r.entry.description,
        reference: r.entry.reference,
      })),
    ),
  );
});

router.post("/ledger/entries", async (req, res): Promise<void> => {
  const parsed = CreateLedgerEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const [row] = await db
    .insert(ledgerEntriesTable)
    .values({
      customerId: d.customerId,
      date: new Date(d.date),
      type: d.type,
      amount: String(d.amount),
      description: d.description,
      reference: d.reference ?? null,
    })
    .returning();
  const [{ name }] = await db
    .select({ name: customersTable.name })
    .from(customersTable)
    .where(eq(customersTable.id, row.customerId));
  res.json(
    CreateLedgerEntryResponse.parse({
      id: row.id,
      customerId: row.customerId,
      customerName: name ?? "(deleted)",
      date: row.date.toISOString(),
      type: row.type,
      amount: n(row.amount),
      description: row.description,
      reference: row.reference,
    }),
  );
});

router.delete("/ledger/entries/:id", async (req, res): Promise<void> => {
  const params = DeleteLedgerEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(ledgerEntriesTable)
    .where(eq(ledgerEntriesTable.id, params.data.id));
  res.json(DeleteLedgerEntryResponse.parse({ ok: true }));
});

router.get("/ledger/balances", async (_req, res): Promise<void> => {
  // Combine ledger + invoice balance per customer.
  const ledgerByCustomer = await db
    .select({
      customerId: ledgerEntriesTable.customerId,
      credit: sql<string>`coalesce(sum(case when ${ledgerEntriesTable.type}='credit' then ${ledgerEntriesTable.amount} else 0 end),0)`,
      debit: sql<string>`coalesce(sum(case when ${ledgerEntriesTable.type}='debit' then ${ledgerEntriesTable.amount} else 0 end),0)`,
    })
    .from(ledgerEntriesTable)
    .groupBy(ledgerEntriesTable.customerId);
  const ledgerMap = new Map<string, number>();
  for (const r of ledgerByCustomer) {
    ledgerMap.set(r.customerId, n(r.debit) - n(r.credit));
  }

  const invoiceByCustomer = await db
    .select({
      customerId: invoicesTable.customerId,
      total: sql<string>`coalesce(sum(${invoicesTable.total}),0)`,
      paid: sql<string>`coalesce(sum(${invoicesTable.paidAmount}),0)`,
    })
    .from(invoicesTable)
    .groupBy(invoicesTable.customerId);
  const invoiceMap = new Map<string, number>();
  for (const r of invoiceByCustomer) {
    invoiceMap.set(r.customerId, n(r.total) - n(r.paid));
  }

  const customers = await db
    .select()
    .from(customersTable)
    .orderBy(asc(customersTable.name));

  const result = customers.map((c) => {
    const opening = n(c.openingBalance);
    const ledger = ledgerMap.get(c.id) ?? 0;
    const invoice = invoiceMap.get(c.id) ?? 0;
    return {
      customerId: c.id,
      customerName: c.name,
      type: c.type,
      balance: Number((opening + ledger + invoice).toFixed(2)),
    };
  });

  res.json(GetLedgerBalancesResponse.parse(result));
});

export default router;
