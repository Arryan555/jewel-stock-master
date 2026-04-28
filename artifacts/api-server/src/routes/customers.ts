import { Router, type IRouter } from "express";
import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import {
  db,
  customersTable,
  invoicesTable,
  ledgerEntriesTable,
  girviLoansTable,
} from "@workspace/db";
import {
  ListCustomersResponse,
  CreateCustomerBody,
  CreateCustomerResponse,
  GetCustomerParams,
  GetCustomerResponse,
  UpdateCustomerParams,
  UpdateCustomerBody,
  UpdateCustomerResponse,
  DeleteCustomerParams,
  DeleteCustomerResponse,
} from "@workspace/api-zod";
import { n } from "../lib/calc";

const router: IRouter = Router();

function serializeCustomer(c: typeof customersTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    address: c.address,
    city: c.city,
    type: c.type,
    gstNumber: c.gstNumber,
    openingBalance: n(c.openingBalance),
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/customers", async (req, res): Promise<void> => {
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : undefined;

  const conditions = [];
  if (type && type !== "all") conditions.push(eq(customersTable.type, type));
  if (search) {
    const like = `%${search}%`;
    conditions.push(
      or(
        ilike(customersTable.name, like),
        ilike(customersTable.phone, like),
        ilike(customersTable.city, like),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(customersTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(customersTable.name));

  res.json(ListCustomersResponse.parse(rows.map(serializeCustomer)));
});

router.post("/customers", async (req, res): Promise<void> => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [row] = await db
    .insert(customersTable)
    .values({
      name: data.name,
      phone: data.phone,
      email: data.email ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      type: data.type,
      gstNumber: data.gstNumber ?? null,
      openingBalance: String(data.openingBalance ?? 0),
    })
    .returning();
  res.json(CreateCustomerResponse.parse(serializeCustomer(row)));
});

router.get("/customers/:id", async (req, res): Promise<void> => {
  const params = GetCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [c] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, params.data.id));

  if (!c) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  // Aggregates
  const [{ totalPurchases, invoiceCount, totalPaid }] = await db
    .select({
      totalPurchases: sql<string>`coalesce(sum(${invoicesTable.total}),0)`,
      totalPaid: sql<string>`coalesce(sum(${invoicesTable.paidAmount}),0)`,
      invoiceCount: sql<number>`count(*)::int`,
    })
    .from(invoicesTable)
    .where(eq(invoicesTable.customerId, c.id));

  const [{ activeGirviCount }] = await db
    .select({
      activeGirviCount: sql<number>`count(*)::int`,
    })
    .from(girviLoansTable)
    .where(
      and(
        eq(girviLoansTable.customerId, c.id),
        sql`${girviLoansTable.status} <> 'closed'`,
      ),
    );

  const [{ creditSum, debitSum }] = await db
    .select({
      creditSum: sql<string>`coalesce(sum(case when ${ledgerEntriesTable.type}='credit' then ${ledgerEntriesTable.amount} else 0 end),0)`,
      debitSum: sql<string>`coalesce(sum(case when ${ledgerEntriesTable.type}='debit' then ${ledgerEntriesTable.amount} else 0 end),0)`,
    })
    .from(ledgerEntriesTable)
    .where(eq(ledgerEntriesTable.customerId, c.id));

  // Balance: positive = customer owes us (receivable). debit increases what they owe;
  // credit reduces it. Invoice unpaid balance also adds to receivable. Opening balance
  // is treated as "what the customer owes at start".
  const ledgerBalance = n(debitSum) - n(creditSum);
  const invoiceBalance = n(totalPurchases) - n(totalPaid);
  const balance = n(c.openingBalance) + ledgerBalance + invoiceBalance;

  res.json(
    GetCustomerResponse.parse({
      ...serializeCustomer(c),
      balance,
      totalPurchases: n(totalPurchases),
      invoiceCount: invoiceCount ?? 0,
      activeGirviCount: activeGirviCount ?? 0,
    }),
  );
});

router.put("/customers/:id", async (req, res): Promise<void> => {
  const params = UpdateCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [row] = await db
    .update(customersTable)
    .set({
      name: data.name,
      phone: data.phone,
      email: data.email ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      type: data.type,
      gstNumber: data.gstNumber ?? null,
      openingBalance: String(data.openingBalance ?? 0),
    })
    .where(eq(customersTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.json(UpdateCustomerResponse.parse(serializeCustomer(row)));
});

router.delete("/customers/:id", async (req, res): Promise<void> => {
  const params = DeleteCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(customersTable).where(eq(customersTable.id, params.data.id));
  res.json(DeleteCustomerResponse.parse({ ok: true }));
});

export default router;
