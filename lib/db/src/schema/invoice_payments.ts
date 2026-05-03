import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";

export const invoicePaymentsTable = pgTable("invoice_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").notNull(),
  mode: text("mode").notNull().default("Cash"),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
  metalWeightGrams: numeric("metal_weight_grams", { precision: 12, scale: 3 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type InvoicePayment = typeof invoicePaymentsTable.$inferSelect;
