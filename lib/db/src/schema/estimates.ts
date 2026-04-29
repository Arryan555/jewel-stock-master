import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";

export const estimatesTable = pgTable("estimates", {
  id: uuid("id").primaryKey().defaultRandom(),
  estimateNumber: text("estimate_number").notNull().unique(),
  customerId: uuid("customer_id").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
  gstAmount: numeric("gst_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 14, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 14, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("draft"),
  convertedInvoiceId: uuid("converted_invoice_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Estimate = typeof estimatesTable.$inferSelect;

export const estimateItemsTable = pgTable("estimate_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  estimateId: uuid("estimate_id").notNull(),
  productId: uuid("product_id").notNull(),
  productName: text("product_name").notNull(),
  metal: text("metal").notNull(),
  purity: text("purity").notNull(),
  weightGrams: numeric("weight_grams", { precision: 12, scale: 3 })
    .notNull()
    .default("0"),
  ratePerGram: numeric("rate_per_gram", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  makingChargePercent: numeric("making_charge_percent", { precision: 6, scale: 2 })
    .notNull()
    .default("0"),
  stoneCharges: numeric("stone_charges", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
});

export type EstimateItem = typeof estimateItemsTable.$inferSelect;
