import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, issueRegisterTable } from "@workspace/db";

const router: IRouter = Router();

function padded(n: number) {
  return "ISS-" + String(n).padStart(4, "0");
}

router.get("/issue", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(issueRegisterTable)
    .orderBy(desc(issueRegisterTable.createdAt));
  res.json(rows);
});

router.get("/issue/next-number", async (_req, res): Promise<void> => {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(issueRegisterTable);
  res.json({ issueNumber: padded((row?.count ?? 0) + 1) });
});

router.post("/issue", async (req, res): Promise<void> => {
  const {
    issueNumber,
    karigarName,
    metal,
    purity,
    grossGrams,
    netGrams,
    ratePerGram,
    description,
    issueDate,
    dueDate,
    remarks,
  } = req.body;

  if (!karigarName) {
    res.status(400).json({ error: "karigarName is required" });
    return;
  }

  const [row] = await db
    .insert(issueRegisterTable)
    .values({
      issueNumber: issueNumber ?? padded(Date.now()),
      karigarName,
      metal: metal ?? "Gold",
      purity: purity ?? "22K",
      grossGrams: String(grossGrams ?? 0),
      netGrams: String(netGrams ?? 0),
      ratePerGram: String(ratePerGram ?? 0),
      description: description ?? "",
      issueDate: issueDate ? new Date(issueDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : null,
      remarks: remarks ?? "",
    })
    .returning();
  res.status(201).json(row);
});

router.patch("/issue/:id/return", async (req, res): Promise<void> => {
  const [row] = await db
    .update(issueRegisterTable)
    .set({ status: "returned", returnDate: new Date() })
    .where(eq(issueRegisterTable.id, req.params.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(row);
});

router.delete("/issue/:id", async (req, res): Promise<void> => {
  await db
    .delete(issueRegisterTable)
    .where(eq(issueRegisterTable.id, req.params.id));
  res.json({ ok: true });
});

export default router;
