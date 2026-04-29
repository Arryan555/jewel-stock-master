import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";

export const karigarsTable = pgTable("karigars", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  speciality: text("speciality"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Karigar = typeof karigarsTable.$inferSelect;

export const karigarJobsTable = pgTable("karigar_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobNumber: text("job_number").notNull().unique(),
  karigarId: uuid("karigar_id").notNull(),
  itemDescription: text("item_description").notNull(),
  metal: text("metal").notNull(),
  purity: text("purity").notNull(),
  issuedWeight: numeric("issued_weight", { precision: 12, scale: 3 })
    .notNull()
    .default("0"),
  receivedWeight: numeric("received_weight", { precision: 12, scale: 3 }),
  expectedWastagePct: numeric("expected_wastage_pct", { precision: 6, scale: 2 })
    .notNull()
    .default("0"),
  laborCharge: numeric("labor_charge", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  issuedDate: timestamp("issued_date", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expectedDate: timestamp("expected_date", { withTimezone: true }),
  receivedDate: timestamp("received_date", { withTimezone: true }),
  status: text("status").notNull().default("issued"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type KarigarJob = typeof karigarJobsTable.$inferSelect;
