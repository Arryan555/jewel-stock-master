import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";

export const invoicesTable = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  type: text("type").notNull(),
  customerId: uuid("customer_id").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
  gstAmount: numeric("gst_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 14, scale: 2 }).notNull().default("0"),
  oldGoldValue: numeric("old_gold_value", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  total: numeric("total", { precision: 14, scale: 2 }).notNull().default("0"),
  paidAmount: numeric("paid_amount", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  paymentMode: text("payment_mode").notNull().default("cash"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Invoice = typeof invoicesTable.$inferSelect;

export const invoiceItemsTable = pgTable("invoice_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").notNull(),
  productId: uuid("product_id").notNull(),
  productName: text("product_name").notNull(),
  metal: text("metal").notNull(),
  purity: text("purity").notNull(),
  grossWeight: numeric("gross_weight", { precision: 12, scale: 3 })
    .notNull()
    .default("0"),
  lessWeight: numeric("less_weight", { precision: 12, scale: 3 })
    .notNull()
    .default("0"),
  weightGrams: numeric("weight_grams", { precision: 12, scale: 3 })
    .notNull()
    .default("0"),
  wastagePercent: numeric("wastage_percent", { precision: 6, scale: 2 })
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
  hsnCode: text("hsn_code").notNull().default("7113"),
});

export type InvoiceItem = typeof invoiceItemsTable.$inferSelect;

export const invoiceOldGoldTable = pgTable("invoice_old_gold", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").notNull(),
  description: text("description").notNull(),
  metal: text("metal").notNull(),
  grossWeight: numeric("gross_weight", { precision: 12, scale: 3 })
    .notNull()
    .default("0"),
  purityPercent: numeric("purity_percent", { precision: 6, scale: 2 })
    .notNull()
    .default("0"),
  fineWeight: numeric("fine_weight", { precision: 12, scale: 3 })
    .notNull()
    .default("0"),
  ratePerGram: numeric("rate_per_gram", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  value: numeric("value", { precision: 14, scale: 2 }).notNull().default("0"),
});

export type InvoiceOldGold = typeof invoiceOldGoldTable.$inferSelect;
