import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, amcSettingsTable } from "@workspace/db";
import { UpdateAmcSettingsBody } from "@workspace/api-zod";

const router: IRouter = Router();

function format(r: typeof amcSettingsTable.$inferSelect) {
  const now = new Date();
  const end = r.endDate ? new Date(r.endDate) : null;
  const daysRemaining = end ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000)) : null;
  const isExpired = end ? now > end : false;
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= (r.warnBeforeDays ?? 30) && !isExpired;
  return {
    startDate: r.startDate ? r.startDate.toISOString() : null,
    endDate: r.endDate ? r.endDate.toISOString() : null,
    plan: r.plan,
    vendorName: r.vendorName ?? null,
    warnBeforeDays: r.warnBeforeDays,
    notes: r.notes ?? null,
    daysRemaining,
    isExpired,
    isExpiringSoon,
    updatedAt: r.updatedAt.toISOString(),
  };
}

router.get("/amc", async (_req, res): Promise<void> => {
  const rows = await db.select().from(amcSettingsTable).where(eq(amcSettingsTable.id, 1));
  if (rows.length === 0) {
    await db.insert(amcSettingsTable).values({ id: 1 });
    const [fresh] = await db.select().from(amcSettingsTable).where(eq(amcSettingsTable.id, 1));
    res.json(format(fresh));
    return;
  }
  res.json(format(rows[0]));
});

router.put("/amc", async (req, res): Promise<void> => {
  const body = UpdateAmcSettingsBody.parse(req.body);
  const rows = await db.select().from(amcSettingsTable).where(eq(amcSettingsTable.id, 1));
  if (rows.length === 0) {
    await db.insert(amcSettingsTable).values({ id: 1 });
  }
  const [updated] = await db
    .update(amcSettingsTable)
    .set({
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      plan: body.plan ?? "1y",
      vendorName: body.vendorName ?? null,
      warnBeforeDays: body.warnBeforeDays ?? 30,
      notes: body.notes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(amcSettingsTable.id, 1))
    .returning();
  res.json(format(updated));
});

export default router;
