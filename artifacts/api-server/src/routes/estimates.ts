import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import {
  db,
  estimatesTable,
  estimateItemsTable,
  customersTable,
  productsTable,
  invoicesTable,
  invoiceItemsTable,
} from "@workspace/db";
import {
  ListEstimatesResponse,
  CreateEstimateBody,
  CreateEstimateResponse,
  GetEstimateParams,
  GetEstimateResponse,
  DeleteEstimateParams,
  DeleteEstimateResponse,
  ConvertEstimateParams,
  ConvertEstimateResponse,
} from "@workspace/api-zod";
import { computeInvoiceTotals, computeItem, n, nextSerial } from "../lib/calc";

const router: IRouter = Router();

function summarize(
  est: typeof estimatesTable.$inferSelect,
  customerName: string,
) {
  return {
    id: est.id,
    estimateNumber: est.estimateNumber,
    customerId: est.customerId,
    customerName,
    date: est.date.toISOString(),
    validUntil: est.validUntil ? est.validUntil.toISOString() : null,
    subtotal: n(est.subtotal),
    gstAmount: n(est.gstAmount),
    discount: n(est.discount),
    total: n(est.total),
    status: est.status as "draft" | "sent" | "accepted" | "converted" | "expired",
    convertedInvoiceId: est.convertedInvoiceId,
  };
}

async function loadDetail(id: string) {
  const [row] = await db
    .select({ est: estimatesTable, customerName: customersTable.name })
    .from(estimatesTable)
    .leftJoin(customersTable, eq(customersTable.id, estimatesTable.customerId))
    .where(eq(estimatesTable.id, id));
  if (!row) return null;
  const items = await db
    .select()
    .from(estimateItemsTable)
    .where(eq(estimateItemsTable.estimateId, id));
  return {
    ...summarize(row.est, row.customerName ?? "(deleted)"),
    notes: row.est.notes,
    items: items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      metal: i.metal,
      purity: i.purity,
      grossWeight: n(i.weightGrams),
      lessWeight: 0,
      weightGrams: n(i.weightGrams),
      wastagePercent: 0,
      ratePerGram: n(i.ratePerGram),
      makingChargePercent: n(i.makingChargePercent),
      stoneCharges: n(i.stoneCharges),
      gstRate: n(i.gstRate),
      amount: n(i.amount),
    })),
  };
}

router.get("/estimates", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ est: estimatesTable, customerName: customersTable.name })
    .from(estimatesTable)
    .leftJoin(customersTable, eq(customersTable.id, estimatesTable.customerId))
    .orderBy(desc(estimatesTable.date));
  res.json(
    ListEstimatesResponse.parse(
      rows.map((r) => summarize(r.est, r.customerName ?? "(deleted)")),
    ),
  );
});

router.get("/estimates/:id", async (req, res): Promise<void> => {
  const params = GetEstimateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const detail = await loadDetail(params.data.id);
  if (!detail) {
    res.status(404).json({ error: "Estimate not found" });
    return;
  }
  res.json(GetEstimateResponse.parse(detail));
});

router.post("/estimates", async (req, res): Promise<void> => {
  const parsed = CreateEstimateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const totals = computeInvoiceTotals(d.items, d.discount);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(estimatesTable);
  const estimateNumber = nextSerial("EST", count ?? 0);

  const productIds = d.items.map((i) => i.productId);
  const products = productIds.length
    ? await db
        .select()
        .from(productsTable)
        .where(sql`${productsTable.id} = ANY(${productIds})`)
    : [];
  const productMap = new Map(products.map((p) => [p.id, p]));

  const [est] = await db
    .insert(estimatesTable)
    .values({
      estimateNumber,
      customerId: d.customerId,
      date: new Date(d.date),
      validUntil: d.validUntil ? new Date(d.validUntil) : null,
      subtotal: String(totals.subtotal.toFixed(2)),
      gstAmount: String(totals.gstAmount.toFixed(2)),
      discount: String((d.discount ?? 0).toFixed(2)),
      total: String(totals.total.toFixed(2)),
      notes: d.notes ?? null,
    })
    .returning();

  if (d.items.length > 0) {
    await db.insert(estimateItemsTable).values(
      d.items.map((it) => {
        const c = computeItem(it);
        const product = productMap.get(it.productId);
        return {
          estimateId: est.id,
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
        };
      }),
    );
  }

  const detail = await loadDetail(est.id);
  res.json(CreateEstimateResponse.parse(detail));
});

router.delete("/estimates/:id", async (req, res): Promise<void> => {
  const params = DeleteEstimateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(estimateItemsTable)
    .where(eq(estimateItemsTable.estimateId, params.data.id));
  await db.delete(estimatesTable).where(eq(estimatesTable.id, params.data.id));
  res.json(DeleteEstimateResponse.parse({ ok: true }));
});

router.post("/estimates/:id/convert", async (req, res): Promise<void> => {
  const params = ConvertEstimateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [est] = await db
    .select()
    .from(estimatesTable)
    .where(eq(estimatesTable.id, params.data.id));
  if (!est) {
    res.status(404).json({ error: "Estimate not found" });
    return;
  }
  if (est.convertedInvoiceId) {
    res.status(400).json({ error: "Estimate already converted" });
    return;
  }
  const items = await db
    .select()
    .from(estimateItemsTable)
    .where(eq(estimateItemsTable.estimateId, est.id));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invoicesTable);
  const invoiceNumber = nextSerial("RT", count ?? 0);

  const [inv] = await db
    .insert(invoicesTable)
    .values({
      invoiceNumber,
      type: "retail",
      customerId: est.customerId,
      date: new Date(),
      subtotal: est.subtotal,
      gstAmount: est.gstAmount,
      discount: est.discount,
      oldGoldValue: "0",
      total: est.total,
      paidAmount: "0",
      paymentMode: "cash",
      notes: `Converted from estimate ${est.estimateNumber}`,
    })
    .returning();

  if (items.length > 0) {
    await db.insert(invoiceItemsTable).values(
      items.map((it) => ({
        invoiceId: inv.id,
        productId: it.productId,
        productName: it.productName,
        metal: it.metal,
        purity: it.purity,
        grossWeight: it.weightGrams,
        lessWeight: "0",
        weightGrams: it.weightGrams,
        wastagePercent: "0",
        ratePerGram: it.ratePerGram,
        makingChargePercent: it.makingChargePercent,
        stoneCharges: it.stoneCharges,
        gstRate: it.gstRate,
        amount: it.amount,
        hsnCode: "7113",
      })),
    );
  }

  await db
    .update(estimatesTable)
    .set({ status: "converted", convertedInvoiceId: inv.id })
    .where(eq(estimatesTable.id, est.id));

  // Build invoice detail response
  const [row] = await db
    .select({ inv: invoicesTable, customerName: customersTable.name })
    .from(invoicesTable)
    .leftJoin(customersTable, eq(customersTable.id, invoicesTable.customerId))
    .where(eq(invoicesTable.id, inv.id));
  const invItems = await db
    .select()
    .from(invoiceItemsTable)
    .where(eq(invoiceItemsTable.invoiceId, inv.id));

  const total = n(row.inv.total);
  const paid = n(row.inv.paidAmount);
  const detail = {
    id: row.inv.id,
    invoiceNumber: row.inv.invoiceNumber,
    type: row.inv.type as "retail" | "wholesale",
    customerId: row.inv.customerId,
    customerName: row.customerName ?? "(deleted)",
    date: row.inv.date.toISOString(),
    subtotal: n(row.inv.subtotal),
    gstAmount: n(row.inv.gstAmount),
    discount: n(row.inv.discount),
    oldGoldValue: n(row.inv.oldGoldValue),
    total,
    paidAmount: paid,
    balance: Math.max(0, total - paid),
    status:
      paid <= 0 ? "unpaid" : paid + 0.001 >= total ? "paid" : "partial",
    paymentMode: row.inv.paymentMode,
    notes: row.inv.notes,
    items: invItems.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      metal: i.metal,
      purity: i.purity,
      grossWeight: n(i.grossWeight),
      lessWeight: n(i.lessWeight),
      weightGrams: n(i.weightGrams),
      wastagePercent: n(i.wastagePercent),
      ratePerGram: n(i.ratePerGram),
      makingChargePercent: n(i.makingChargePercent),
      stoneCharges: n(i.stoneCharges),
      gstRate: n(i.gstRate),
      amount: n(i.amount),
    })),
    oldGoldItems: [],
  };
  res.json(ConvertEstimateResponse.parse(detail));
});

export default router;
