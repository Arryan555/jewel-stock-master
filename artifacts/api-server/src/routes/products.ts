import { Router, type IRouter } from "express";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import {
  ListProductsResponse,
  CreateProductBody,
  CreateProductResponse,
  GetProductParams,
  GetProductResponse,
  UpdateProductParams,
  UpdateProductBody,
  UpdateProductResponse,
  DeleteProductParams,
  DeleteProductResponse,
} from "@workspace/api-zod";
import { n } from "../lib/calc";

const router: IRouter = Router();

function serializeProduct(p: typeof productsTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    metal: p.metal,
    purity: p.purity,
    weightGrams: n(p.weightGrams),
    ratePerGram: n(p.ratePerGram),
    makingChargePercent: n(p.makingChargePercent),
    stoneCharges: n(p.stoneCharges),
    hsnCode: p.hsnCode,
    gstRate: n(p.gstRate),
    stockQuantity: p.stockQuantity,
    sku: p.sku,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/products", async (req, res): Promise<void> => {
  const metal =
    typeof req.query.metal === "string" ? req.query.metal : undefined;
  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : undefined;

  const conditions = [];
  if (metal && metal !== "all") conditions.push(eq(productsTable.metal, metal));
  if (search) {
    const like = `%${search}%`;
    conditions.push(
      or(
        ilike(productsTable.name, like),
        ilike(productsTable.sku, like),
        ilike(productsTable.category, like),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(productsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(productsTable.name));

  res.json(ListProductsResponse.parse(rows.map(serializeProduct)));
});

router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const [row] = await db
    .insert(productsTable)
    .values({
      name: d.name,
      category: d.category,
      metal: d.metal,
      purity: d.purity,
      weightGrams: String(d.weightGrams),
      ratePerGram: String(d.ratePerGram),
      makingChargePercent: String(d.makingChargePercent),
      stoneCharges: String(d.stoneCharges),
      hsnCode: d.hsnCode,
      gstRate: String(d.gstRate),
      stockQuantity: d.stockQuantity,
      sku: d.sku,
    })
    .returning();
  res.json(CreateProductResponse.parse(serializeProduct(row)));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(GetProductResponse.parse(serializeProduct(row)));
});

router.put("/products/:id", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const [row] = await db
    .update(productsTable)
    .set({
      name: d.name,
      category: d.category,
      metal: d.metal,
      purity: d.purity,
      weightGrams: String(d.weightGrams),
      ratePerGram: String(d.ratePerGram),
      makingChargePercent: String(d.makingChargePercent),
      stoneCharges: String(d.stoneCharges),
      hsnCode: d.hsnCode,
      gstRate: String(d.gstRate),
      stockQuantity: d.stockQuantity,
      sku: d.sku,
    })
    .where(eq(productsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(UpdateProductResponse.parse(serializeProduct(row)));
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(productsTable).where(eq(productsTable.id, params.data.id));
  res.json(DeleteProductResponse.parse({ ok: true }));
});

export default router;
