import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, metalRatesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/rates", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(metalRatesTable)
    .orderBy(desc(metalRatesTable.date))
    .limit(30);
  res.json(rows);
});

router.get("/rates/today", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const [row] = await db
    .select()
    .from(metalRatesTable)
    .where(eq(metalRatesTable.date, today));
  res.json(row ?? null);
});

router.post("/rates", async (req, res): Promise<void> => {
  const { date, gold24k, gold22k, gold18k, silver, makingPct, wastagePct } =
    req.body;

  const d = date ?? new Date().toISOString().split("T")[0];

  const existing = await db
    .select()
    .from(metalRatesTable)
    .where(eq(metalRatesTable.date, d));

  let row;
  if (existing.length > 0) {
    [row] = await db
      .update(metalRatesTable)
      .set({
        gold24k: String(gold24k ?? 0),
        gold22k: String(gold22k ?? 0),
        gold18k: String(gold18k ?? 0),
        silver: String(silver ?? 0),
        makingPct: String(makingPct ?? 10),
        wastagePct: String(wastagePct ?? 5),
      })
      .where(eq(metalRatesTable.date, d))
      .returning();
  } else {
    [row] = await db
      .insert(metalRatesTable)
      .values({
        date: d,
        gold24k: String(gold24k ?? 0),
        gold22k: String(gold22k ?? 0),
        gold18k: String(gold18k ?? 0),
        silver: String(silver ?? 0),
        makingPct: String(makingPct ?? 10),
        wastagePct: String(wastagePct ?? 5),
      })
      .returning();
  }
  res.json(row);
});

export default router;
