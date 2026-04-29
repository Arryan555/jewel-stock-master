import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";

export const repairJobsTable = pgTable("repair_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketNumber: text("ticket_number").notNull().unique(),
  customerId: uuid("customer_id").notNull(),
  itemDescription: text("item_description").notNull(),
  metal: text("metal").notNull(),
  purity: text("purity"),
  weightGrams: numeric("weight_grams", { precision: 12, scale: 3 })
    .notNull()
    .default("0"),
  issue: text("issue").notNull(),
  estimatedCost: numeric("estimated_cost", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  finalCost: numeric("final_cost", { precision: 14, scale: 2 }),
  receivedDate: timestamp("received_date", { withTimezone: true })
    .notNull()
    .defaultNow(),
  promisedDate: timestamp("promised_date", { withTimezone: true }),
  deliveredDate: timestamp("delivered_date", { withTimezone: true }),
  status: text("status").notNull().default("received"),
  paidAmount: numeric("paid_amount", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type RepairJob = typeof repairJobsTable.$inferSelect;
