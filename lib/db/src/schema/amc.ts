import {
  pgTable,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const amcSettingsTable = pgTable("amc_settings", {
  id: integer("id").primaryKey().default(1),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  plan: text("plan").notNull().default("1y"),
  vendorName: text("vendor_name"),
  warnBeforeDays: integer("warn_before_days").notNull().default(30),
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AmcSettings = typeof amcSettingsTable.$inferSelect;
