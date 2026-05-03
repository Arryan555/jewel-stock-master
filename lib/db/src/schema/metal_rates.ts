import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";

export const metalRatesTable = pgTable("metal_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: text("date").notNull().unique(),
  gold24k: numeric("gold24k", { precision: 12, scale: 2 }).notNull().default("0"),
  gold22k: numeric("gold22k", { precision: 12, scale: 2 }).notNull().default("0"),
  gold18k: numeric("gold18k", { precision: 12, scale: 2 }).notNull().default("0"),
  silver: numeric("silver", { precision: 12, scale: 2 }).notNull().default("0"),
  makingPct: numeric("making_pct", { precision: 6, scale: 2 }).notNull().default("10"),
  wastagePct: numeric("wastage_pct", { precision: 6, scale: 2 }).notNull().default("5"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type MetalRate = typeof metalRatesTable.$inferSelect;
