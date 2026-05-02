import { Router, type IRouter } from "express";
import { and, desc, gte, ilike, lte } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db, purchaseVouchersTable, purchaseVoucherItemsTable } from "@workspace/db";
import {
  ListPurchasesResponse,
  CreatePurchaseBody,
  GetPurchaseParams,
  DeletePurchaseParams,
  RecordPurchasePaymentParams,
  RecordPurchasePaymentBody,
} from "@workspace/api-zod";
import { computeInvoiceStatus, n, nextSerial } from "../lib/calc";

const router: IRouter = Router();

function summarize(v: typeof purchaseVouchersTable.$inferSelect) {
  const total = n(v.total);
  const paid = n(v.paidAmount);
  return {
    id: v.id,
    voucherNumber: v.voucherNumber,
    vendorName: v.vendorName,
    vendorPhone: v.vendorPhone ?? null,
    date: v.date.toISOString(),
    subtotal: n(v.subtotal),
    discount: n(v.discount),
    total,
    paidAmount: paid,
    balance: Math.max(0, total - paid),
    status: computeInvoiceStatus(total, paid),
    paymentMode: v.paymentMode,
    goldPayWeight: n(v.goldPayWeight),
    silverPayWeight: n(v.silverPayWeight),
  };
}

router.get("/purchases", async (req, res): Promise<void> => {
  const where = [];
  if (typeof req.query.vendorName === "string" && req.query.vendorName) {
    where.push(ilike(purchaseVouchersTable.vendorName, `%${req.query.vendorName}%`));
  }
  if (typeof req.query.from === "string") {
    where.push(gte(purchaseVouchersTable.date, new Date(req.query.from)));
  }
  if (typeof req.query.to === "string") {
    const to = new Date(req.query.to);
    to.setHours(23, 59, 59, 999);
    where.push(lte(purchaseVouchersTable.date, to));
  }
  const rows = await db
    .select()
    .from(purchaseVouchersTable)
    .where(and(...where))
    .orderBy(desc(purchaseVouchersTable.date));
  const parsed = ListPurchasesResponse.parse(rows.map(summarize));
  res.json(parsed);
});

router.post("/purchases", async (req, res): Promise<void> => {
  const body = CreatePurchaseBody.parse(req.body);

  const count = await db.$count(purchaseVouchersTable);
  const voucherNumber = nextSerial("PV", count);

  let subtotal = 0;
  const itemRows = body.items.map((it) => {
    const net = it.grossWeight - it.lessWeight;
    const fine = net * (it.purityPercent / 100);
    const amount = fine * it.ratePerGram;
    subtotal += amount;
    return {
      description: it.description,
      metal: it.metal,
      purity: it.purity,
      purityPercent: it.purityPercent.toFixed(2),
      grossWeight: it.grossWeight.toFixed(3),
      lessWeight: it.lessWeight.toFixed(3),
      netWeight: net.toFixed(3),
      fineWeight: fine.toFixed(3),
      ratePerGram: it.ratePerGram.toFixed(2),
      amount: amount.toFixed(2),
    };
  });

  const discount = body.discount ?? 0;
  const total = Math.max(0, subtotal - discount);

  const [voucher] = await db
    .insert(purchaseVouchersTable)
    .values({
      voucherNumber,
      vendorName: body.vendorName,
      vendorPhone: body.vendorPhone ?? null,
      date: body.date ? new Date(body.date) : new Date(),
      subtotal: subtotal.toFixed(2),
      discount: discount.toFixed(2),
      total: total.toFixed(2),
      paidAmount: (body.paidAmount ?? 0).toFixed(2),
      paymentMode: body.paymentMode ?? "cash",
      goldPayWeight: (body.goldPayWeight ?? 0).toFixed(3),
      silverPayWeight: (body.silverPayWeight ?? 0).toFixed(3),
      notes: body.notes ?? null,
    })
    .returning();

  if (itemRows.length > 0) {
    await db.insert(purchaseVoucherItemsTable).values(
      itemRows.map((ir) => ({ voucherId: voucher.id, ...ir })),
    );
  }

  res.json(summarize(voucher));
});

router.get("/purchases/:id", async (req, res): Promise<void> => {
  const { id } = GetPurchaseParams.parse(req.params);
  const [v] = await db.select().from(purchaseVouchersTable).where(eq(purchaseVouchersTable.id, id));
  if (!v) { res.status(404).json({ error: "Not found" }); return; }
  const items = await db.select().from(purchaseVoucherItemsTable).where(eq(purchaseVoucherItemsTable.voucherId, id));
  res.json({
    ...summarize(v),
    notes: v.notes ?? null,
    items: items.map((it) => ({
      id: it.id,
      description: it.description,
      metal: it.metal,
      purity: it.purity,
      purityPercent: n(it.purityPercent),
      grossWeight: n(it.grossWeight),
      lessWeight: n(it.lessWeight),
      netWeight: n(it.netWeight),
      fineWeight: n(it.fineWeight),
      ratePerGram: n(it.ratePerGram),
      amount: n(it.amount),
    })),
  });
});

router.delete("/purchases/:id", async (req, res): Promise<void> => {
  const { id } = DeletePurchaseParams.parse(req.params);
  await db.delete(purchaseVoucherItemsTable).where(eq(purchaseVoucherItemsTable.voucherId, id));
  await db.delete(purchaseVouchersTable).where(eq(purchaseVouchersTable.id, id));
  res.json({ id });
});

router.post("/purchases/:id/payment", async (req, res): Promise<void> => {
  const { id } = RecordPurchasePaymentParams.parse(req.params);
  const { amount } = RecordPurchasePaymentBody.parse(req.body);
  const [v] = await db.select().from(purchaseVouchersTable).where(eq(purchaseVouchersTable.id, id));
  if (!v) { res.status(404).json({ error: "Not found" }); return; }
  const newPaid = Math.min(n(v.total), n(v.paidAmount) + amount);
  const [updated] = await db
    .update(purchaseVouchersTable)
    .set({ paidAmount: newPaid.toFixed(2) })
    .where(eq(purchaseVouchersTable.id, id))
    .returning();
  res.json(summarize(updated));
});

export default router;
