import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";

export const purchaseVouchersTable = pgTable("purchase_vouchers", {
  id: uuid("id").primaryKey().defaultRandom(),
  voucherNumber: text("voucher_number").notNull().unique(),
  vendorName: text("vendor_name").notNull(),
  vendorPhone: text("vendor_phone"),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 14, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 14, scale: 2 }).notNull().default("0"),
  paidAmount: numeric("paid_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  paymentMode: text("payment_mode").notNull().default("cash"),
  goldPayWeight: numeric("gold_pay_weight", { precision: 12, scale: 3 }).notNull().default("0"),
  silverPayWeight: numeric("silver_pay_weight", { precision: 12, scale: 3 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PurchaseVoucher = typeof purchaseVouchersTable.$inferSelect;

export const purchaseVoucherItemsTable = pgTable("purchase_voucher_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  voucherId: uuid("voucher_id").notNull(),
  description: text("description").notNull(),
  metal: text("metal").notNull(),
  purity: text("purity").notNull(),
  purityPercent: numeric("purity_percent", { precision: 6, scale: 2 }).notNull().default("0"),
  grossWeight: numeric("gross_weight", { precision: 12, scale: 3 }).notNull().default("0"),
  lessWeight: numeric("less_weight", { precision: 12, scale: 3 }).notNull().default("0"),
  netWeight: numeric("net_weight", { precision: 12, scale: 3 }).notNull().default("0"),
  fineWeight: numeric("fine_weight", { precision: 12, scale: 3 }).notNull().default("0"),
  ratePerGram: numeric("rate_per_gram", { precision: 12, scale: 2 }).notNull().default("0"),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
});

export type PurchaseVoucherItem = typeof purchaseVoucherItemsTable.$inferSelect;
