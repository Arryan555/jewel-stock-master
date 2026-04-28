import { Router, type IRouter } from "express";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import {
  db,
  invoicesTable,
  invoiceItemsTable,
  customersTable,
  productsTable,
} from "@workspace/db";
import {
  ListInvoicesResponse,
  CreateInvoiceBody,
  CreateInvoiceResponse,
  GetInvoiceParams,
  GetInvoiceResponse,
  DeleteInvoiceParams,
  DeleteInvoiceResponse,
  RecordInvoicePaymentParams,
  RecordInvoicePaymentBody,
  RecordInvoicePaymentResponse,
} from "@workspace/api-zod";
import {
  computeInvoiceStatus,
  computeInvoiceTotals,
  computeItem,
  n,
  nextSerial,
} from "../lib/calc";

const router: IRouter = Router();

function summarizeInvoice(
  inv: typeof invoicesTable.$inferSelect,
  customerName: string,
) {
  const total = n(inv.total);
  const paid = n(inv.paidAmount);
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    type: inv.type,
    customerId: inv.customerId,
    customerName,
    date: inv.date.toISOString(),
    subtotal: n(inv.subtotal),
    gstAmount: n(inv.gstAmount),
    discount: n(inv.discount),
    total,
    paidAmount: paid,
    balance: Math.max(0, total - paid),
    status: computeInvoiceStatus(total, paid),
  };
}

router.get("/invoices", async (req, res): Promise<void> => {
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  const customerId =
    typeof req.query.customerId === "string" ? req.query.customerId : undefined;
  const from = typeof req.query.from === "string" ? req.query.from : undefined;
  const to = typeof req.query.to === "string" ? req.query.to : undefined;

  const conds = [];
  if (type && type !== "all") conds.push(eq(invoicesTable.type, type));
  if (customerId) conds.push(eq(invoicesTable.customerId, customerId));
  if (from) conds.push(gte(invoicesTable.date, new Date(from)));
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    conds.push(lte(invoicesTable.date, end));
  }

  const rows = await db
    .select({
      inv: invoicesTable,
      customerName: customersTable.name,
    })
    .from(invoicesTable)
    .leftJoin(customersTable, eq(customersTable.id, invoicesTable.customerId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(invoicesTable.date));

  res.json(
    ListInvoicesResponse.parse(
      rows.map((r) => summarizeInvoice(r.inv, r.customerName ?? "(deleted)")),
    ),
  );
});

async function loadInvoiceDetail(invoiceId: string) {
  const [row] = await db
    .select({
      inv: invoicesTable,
      customerName: customersTable.name,
    })
    .from(invoicesTable)
    .leftJoin(customersTable, eq(customersTable.id, invoicesTable.customerId))
    .where(eq(invoicesTable.id, invoiceId));
  if (!row) return null;
  const items = await db
    .select()
    .from(invoiceItemsTable)
    .where(eq(invoiceItemsTable.invoiceId, invoiceId));
  return {
    ...summarizeInvoice(row.inv, row.customerName ?? "(deleted)"),
    notes: row.inv.notes,
    items: items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      metal: i.metal,
      purity: i.purity,
      weightGrams: n(i.weightGrams),
      ratePerGram: n(i.ratePerGram),
      makingChargePercent: n(i.makingChargePercent),
      stoneCharges: n(i.stoneCharges),
      gstRate: n(i.gstRate),
      amount: n(i.amount),
    })),
  };
}

router.post("/invoices", async (req, res): Promise<void> => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;

  // Look up product names and HSN codes
  const productIds = d.items.map((i) => i.productId);
  const products = productIds.length
    ? await db
        .select()
        .from(productsTable)
        .where(sql`${productsTable.id} = ANY(${productIds})`)
    : [];
  const productMap = new Map(products.map((p) => [p.id, p]));

  const totals = computeInvoiceTotals(d.items, d.discount);

  // Generate invoice number
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invoicesTable);
  const prefix = d.type === "wholesale" ? "WS" : "RT";
  const invoiceNumber = nextSerial(prefix, count ?? 0);

  const [inv] = await db
    .insert(invoicesTable)
    .values({
      invoiceNumber,
      type: d.type,
      customerId: d.customerId,
      date: new Date(d.date),
      subtotal: String(totals.subtotal.toFixed(2)),
      gstAmount: String(totals.gstAmount.toFixed(2)),
      discount: String((d.discount ?? 0).toFixed(2)),
      total: String(totals.total.toFixed(2)),
      paidAmount: String((d.paidAmount ?? 0).toFixed(2)),
      notes: d.notes ?? null,
    })
    .returning();

  if (d.items.length > 0) {
    await db.insert(invoiceItemsTable).values(
      d.items.map((it) => {
        const c = computeItem(it);
        const product = productMap.get(it.productId);
        return {
          invoiceId: inv.id,
          productId: it.productId,
          productName: product?.name ?? "(unknown)",
          metal: product?.metal ?? "gold",
          purity: product?.purity ?? "",
          weightGrams: String(it.weightGrams),
          ratePerGram: String(it.ratePerGram),
          makingChargePercent: String(it.makingChargePercent),
          stoneCharges: String(it.stoneCharges),
          gstRate: String(it.gstRate),
          amount: String(c.amount.toFixed(2)),
          hsnCode: product?.hsnCode ?? "7113",
        };
      }),
    );
  }

  // Decrement stock by 1 per item (jewellery items typically billed per piece)
  for (const it of d.items) {
    await db
      .update(productsTable)
      .set({
        stockQuantity: sql`greatest(${productsTable.stockQuantity} - 1, 0)`,
      })
      .where(eq(productsTable.id, it.productId));
  }

  const detail = await loadInvoiceDetail(inv.id);
  res.json(CreateInvoiceResponse.parse(detail));
});

router.get("/invoices/:id", async (req, res): Promise<void> => {
  const params = GetInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const detail = await loadInvoiceDetail(params.data.id);
  if (!detail) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  res.json(GetInvoiceResponse.parse(detail));
});

router.delete("/invoices/:id", async (req, res): Promise<void> => {
  const params = DeleteInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(invoiceItemsTable)
    .where(eq(invoiceItemsTable.invoiceId, params.data.id));
  await db.delete(invoicesTable).where(eq(invoicesTable.id, params.data.id));
  res.json(DeleteInvoiceResponse.parse({ ok: true }));
});

router.post("/invoices/:id/payment", async (req, res): Promise<void> => {
  const params = RecordInvoicePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = RecordInvoicePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  const newPaid = n(existing.paidAmount) + parsed.data.amount;
  await db
    .update(invoicesTable)
    .set({ paidAmount: String(newPaid.toFixed(2)) })
    .where(eq(invoicesTable.id, params.data.id));

  const detail = await loadInvoiceDetail(params.data.id);
  res.json(RecordInvoicePaymentResponse.parse(detail));
});

export default router;
// silence unused
void asc;
