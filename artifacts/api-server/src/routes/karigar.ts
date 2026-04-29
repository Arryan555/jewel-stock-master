import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  karigarsTable,
  karigarJobsTable,
} from "@workspace/db";
import {
  ListKarigarsResponse,
  CreateKarigarBody,
  CreateKarigarResponse,
  UpdateKarigarParams,
  UpdateKarigarBody,
  UpdateKarigarResponse,
  DeleteKarigarParams,
  DeleteKarigarResponse,
  ListKarigarJobsResponse,
  CreateKarigarJobBody,
  CreateKarigarJobResponse,
  ReceiveKarigarJobParams,
  ReceiveKarigarJobBody,
  ReceiveKarigarJobResponse,
  DeleteKarigarJobParams,
  DeleteKarigarJobResponse,
} from "@workspace/api-zod";
import { n, nextSerial } from "../lib/calc";

const router: IRouter = Router();

router.get("/karigars", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      k: karigarsTable,
      total: sql<number>`count(${karigarJobsTable.id})::int`,
      active: sql<number>`sum(case when ${karigarJobsTable.status} = 'issued' then 1 else 0 end)::int`,
    })
    .from(karigarsTable)
    .leftJoin(karigarJobsTable, eq(karigarJobsTable.karigarId, karigarsTable.id))
    .groupBy(karigarsTable.id)
    .orderBy(karigarsTable.name);

  res.json(
    ListKarigarsResponse.parse(
      rows.map((r) => ({
        id: r.k.id,
        name: r.k.name,
        phone: r.k.phone,
        speciality: r.k.speciality,
        address: r.k.address,
        notes: r.k.notes,
        activeJobs: r.active ?? 0,
        totalJobs: r.total ?? 0,
        createdAt: r.k.createdAt.toISOString(),
      })),
    ),
  );
});

router.post("/karigars", async (req, res): Promise<void> => {
  const parsed = CreateKarigarBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(karigarsTable)
    .values({
      name: parsed.data.name,
      phone: parsed.data.phone,
      speciality: parsed.data.speciality ?? null,
      address: parsed.data.address ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning();
  res.json(
    CreateKarigarResponse.parse({
      id: row.id,
      name: row.name,
      phone: row.phone,
      speciality: row.speciality,
      address: row.address,
      notes: row.notes,
      activeJobs: 0,
      totalJobs: 0,
      createdAt: row.createdAt.toISOString(),
    }),
  );
});

router.put("/karigars/:id", async (req, res): Promise<void> => {
  const params = UpdateKarigarParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateKarigarBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(karigarsTable)
    .set({
      name: parsed.data.name,
      phone: parsed.data.phone,
      speciality: parsed.data.speciality ?? null,
      address: parsed.data.address ?? null,
      notes: parsed.data.notes ?? null,
    })
    .where(eq(karigarsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Karigar not found" });
    return;
  }
  res.json(
    UpdateKarigarResponse.parse({
      id: row.id,
      name: row.name,
      phone: row.phone,
      speciality: row.speciality,
      address: row.address,
      notes: row.notes,
      activeJobs: 0,
      totalJobs: 0,
      createdAt: row.createdAt.toISOString(),
    }),
  );
});

router.delete("/karigars/:id", async (req, res): Promise<void> => {
  const params = DeleteKarigarParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(karigarsTable).where(eq(karigarsTable.id, params.data.id));
  res.json(DeleteKarigarResponse.parse({ ok: true }));
});

function summarizeJob(
  j: typeof karigarJobsTable.$inferSelect,
  karigarName: string,
) {
  const issued = n(j.issuedWeight);
  const received = j.receivedWeight != null ? n(j.receivedWeight) : null;
  const wastageWeight = received != null ? Math.max(0, issued - received) : null;
  const actualPct =
    received != null && issued > 0 ? (wastageWeight! / issued) * 100 : null;
  return {
    id: j.id,
    jobNumber: j.jobNumber,
    karigarId: j.karigarId,
    karigarName,
    itemDescription: j.itemDescription,
    metal: j.metal,
    purity: j.purity,
    issuedWeight: issued,
    receivedWeight: received,
    wastageWeight,
    expectedWastagePct: n(j.expectedWastagePct),
    actualWastagePct: actualPct,
    laborCharge: n(j.laborCharge),
    issuedDate: j.issuedDate.toISOString(),
    expectedDate: j.expectedDate ? j.expectedDate.toISOString() : null,
    receivedDate: j.receivedDate ? j.receivedDate.toISOString() : null,
    status: j.status as "issued" | "received",
    notes: j.notes,
  };
}

router.get("/karigar-jobs", async (req, res): Promise<void> => {
  const status =
    typeof req.query.status === "string" ? req.query.status : undefined;
  const karigarId =
    typeof req.query.karigarId === "string" ? req.query.karigarId : undefined;
  const conds = [];
  if (status && status !== "all")
    conds.push(eq(karigarJobsTable.status, status));
  if (karigarId) conds.push(eq(karigarJobsTable.karigarId, karigarId));
  const rows = await db
    .select({ j: karigarJobsTable, name: karigarsTable.name })
    .from(karigarJobsTable)
    .leftJoin(karigarsTable, eq(karigarsTable.id, karigarJobsTable.karigarId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(karigarJobsTable.issuedDate));
  res.json(
    ListKarigarJobsResponse.parse(
      rows.map((r) => summarizeJob(r.j, r.name ?? "(deleted)")),
    ),
  );
});

router.post("/karigar-jobs", async (req, res): Promise<void> => {
  const parsed = CreateKarigarJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(karigarJobsTable);
  const jobNumber = nextSerial("JOB", count ?? 0);

  const [row] = await db
    .insert(karigarJobsTable)
    .values({
      jobNumber,
      karigarId: d.karigarId,
      itemDescription: d.itemDescription,
      metal: d.metal,
      purity: d.purity,
      issuedWeight: String(d.issuedWeight),
      expectedWastagePct: String(d.expectedWastagePct),
      laborCharge: String(d.laborCharge),
      issuedDate: new Date(d.issuedDate),
      expectedDate: d.expectedDate ? new Date(d.expectedDate) : null,
      notes: d.notes ?? null,
    })
    .returning();

  const [k] = await db
    .select()
    .from(karigarsTable)
    .where(eq(karigarsTable.id, d.karigarId));

  res.json(CreateKarigarJobResponse.parse(summarizeJob(row, k?.name ?? "(deleted)")));
});

router.post("/karigar-jobs/:id/receive", async (req, res): Promise<void> => {
  const params = ReceiveKarigarJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = ReceiveKarigarJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(karigarJobsTable)
    .set({
      status: "received",
      receivedWeight: String(parsed.data.receivedWeight),
      receivedDate: new Date(parsed.data.receivedDate),
      notes: parsed.data.notes ?? undefined,
    })
    .where(eq(karigarJobsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  const [k] = await db
    .select()
    .from(karigarsTable)
    .where(eq(karigarsTable.id, row.karigarId));
  res.json(ReceiveKarigarJobResponse.parse(summarizeJob(row, k?.name ?? "(deleted)")));
});

router.delete("/karigar-jobs/:id", async (req, res): Promise<void> => {
  const params = DeleteKarigarJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(karigarJobsTable)
    .where(eq(karigarJobsTable.id, params.data.id));
  res.json(DeleteKarigarJobResponse.parse({ ok: true }));
});

export default router;
