import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, shopSettingsTable } from "@workspace/db";
import {
  GetShopSettingsResponse,
  UpdateShopSettingsBody,
  UpdateShopSettingsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function ensureRow(): Promise<typeof shopSettingsTable.$inferSelect> {
  const [existing] = await db
    .select()
    .from(shopSettingsTable)
    .where(eq(shopSettingsTable.id, 1));
  if (existing) return existing;
  const [created] = await db
    .insert(shopSettingsTable)
    .values({
      id: 1,
      shopName: "Jewel Suite",
      tagline: "Premium Jewellers • Established 1972",
      address: "12, Pedder Road",
      city: "Mumbai 400026",
      phone: "+91 22 2345 6789",
      email: "info@jewelsuite.example",
      gstin: "27AABCJ1234F1Z9",
      pan: "AABCJ1234F",
      upiId: "jewelsuite@hdfcbank",
      bankName: "HDFC Bank",
      bankAccount: "00123456789012",
      bankIfsc: "HDFC0000123",
      invoiceTerms:
        "Hallmarked metal as per BIS standards. Goods once sold can be exchanged within 30 days. Subject to Mumbai jurisdiction.",
    })
    .returning();
  return created;
}

function serialize(row: typeof shopSettingsTable.$inferSelect) {
  return {
    shopName: row.shopName,
    tagline: row.tagline,
    address: row.address,
    city: row.city,
    phone: row.phone,
    email: row.email,
    gstin: row.gstin,
    pan: row.pan,
    upiId: row.upiId,
    bankName: row.bankName,
    bankAccount: row.bankAccount,
    bankIfsc: row.bankIfsc,
    invoiceTerms: row.invoiceTerms,
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get("/settings", async (_req, res): Promise<void> => {
  const row = await ensureRow();
  res.json(GetShopSettingsResponse.parse(serialize(row)));
});

router.put("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateShopSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await ensureRow();
  const d = parsed.data;
  const [row] = await db
    .update(shopSettingsTable)
    .set({
      shopName: d.shopName,
      tagline: d.tagline ?? null,
      address: d.address ?? null,
      city: d.city ?? null,
      phone: d.phone ?? null,
      email: d.email ?? null,
      gstin: d.gstin ?? null,
      pan: d.pan ?? null,
      upiId: d.upiId ?? null,
      bankName: d.bankName ?? null,
      bankAccount: d.bankAccount ?? null,
      bankIfsc: d.bankIfsc ?? null,
      invoiceTerms: d.invoiceTerms ?? null,
      updatedAt: new Date(),
    })
    .where(eq(shopSettingsTable.id, 1))
    .returning();
  res.json(UpdateShopSettingsResponse.parse(serialize(row)));
});

export default router;
