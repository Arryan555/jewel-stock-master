import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
  integer,
} from "drizzle-orm/pg-core";

export const productsTable = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  category: text("category").notNull(),
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
  hsnCode: text("hsn_code").notNull().default("7113"),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull().default("3"),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  sku: text("sku").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Product = typeof productsTable.$inferSelect;
