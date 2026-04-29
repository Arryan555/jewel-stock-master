import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  repairJobsTable,
  customersTable,
} from "@workspace/db";
import {
  ListRepairsResponse,
  CreateRepairBody,
  CreateRepairResponse,
  UpdateRepairParams,
  UpdateRepairBody,
  UpdateRepairResponse,
  DeleteRepairParams,
  DeleteRepairResponse,
} from "@workspace/api-zod";
import { n, nextSerial } from "../lib/calc";

const router: IRouter = Router();

function summarize(
  r: typeof repairJobsTable.$inferSelect,
  customerName: string,
) {
  return {
    id: r.id,
    ticketNumber: r.ticketNumber,
    customerId: r.customerId,
    customerName,
    itemDescription: r.itemDescription,
    metal: r.metal,
    purity: r.purity,
    weightGrams: n(r.weightGrams),
    issue: r.issue,
    estimatedCost: n(r.estimatedCost),
    finalCost: r.finalCost != null ? n(r.finalCost) : null,
    receivedDate: r.receivedDate.toISOString(),
    promisedDate: r.promisedDate ? r.promisedDate.toISOString() : null,
    deliveredDate: r.deliveredDate ? r.deliveredDate.toISOString() : null,
    status: r.status as "received" | "in_progress" | "ready" | "delivered",
    paidAmount: n(r.paidAmount),
    notes: r.notes,
  };
}

router.get("/repairs", async (req, res): Promise<void> => {
  const status =
    typeof req.query.status === "string" ? req.query.status : undefined;
  const conds = [];
  if (status && status !== "all") conds.push(eq(repairJobsTable.status, status));
  const rows = await db
    .select({ r: repairJobsTable, name: customersTable.name })
    .from(repairJobsTable)
    .leftJoin(customersTable, eq(customersTable.id, repairJobsTable.customerId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(repairJobsTable.receivedDate));
  res.json(
    ListRepairsResponse.parse(
      rows.map((r) => summarize(r.r, r.name ?? "(deleted)")),
    ),
  );
});

router.post("/repairs", async (req, res): Promise<void> => {
  const parsed = CreateRepairBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(repairJobsTable);
  const ticketNumber = nextSerial("REP", count ?? 0);
  const [row] = await db
    .insert(repairJobsTable)
    .values({
      ticketNumber,
      customerId: d.customerId,
      itemDescription: d.itemDescription,
      metal: d.metal,
      purity: d.purity ?? null,
      weightGrams: String(d.weightGrams),
      issue: d.issue,
      estimatedCost: String(d.estimatedCost),
      receivedDate: new Date(d.receivedDate),
      promisedDate: d.promisedDate ? new Date(d.promisedDate) : null,
      notes: d.notes ?? null,
    })
    .returning();
  const [c] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, d.customerId));
  res.json(CreateRepairResponse.parse(summarize(row, c?.name ?? "(deleted)")));
});

router.put("/repairs/:id", async (req, res): Promise<void> => {
  const params = UpdateRepairParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateRepairBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const updateData: Record<string, unknown> = { status: d.status };
  if (d.finalCost != null) updateData.finalCost = String(d.finalCost);
  if (d.paidAmount != null) updateData.paidAmount = String(d.paidAmount);
  if (d.deliveredDate) updateData.deliveredDate = new Date(d.deliveredDate);
  if (d.notes !== undefined) updateData.notes = d.notes ?? null;
  if (d.status === "delivered" && !d.deliveredDate) {
    updateData.deliveredDate = new Date();
  }
  const [row] = await db
    .update(repairJobsTable)
    .set(updateData)
    .where(eq(repairJobsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Repair not found" });
    return;
  }
  const [c] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, row.customerId));
  res.json(UpdateRepairResponse.parse(summarize(row, c?.name ?? "(deleted)")));
});

router.delete("/repairs/:id", async (req, res): Promise<void> => {
  const params = DeleteRepairParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(repairJobsTable)
    .where(eq(repairJobsTable.id, params.data.id));
  res.json(DeleteRepairResponse.parse({ ok: true }));
});

export default router;
