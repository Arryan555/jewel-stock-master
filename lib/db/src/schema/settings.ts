import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const shopSettingsTable = pgTable("shop_settings", {
  id: integer("id").primaryKey().default(1),
  shopName: text("shop_name").notNull().default("Jewel Suite"),
  tagline: text("tagline").default("Premium Jewellers"),
  address: text("address"),
  city: text("city"),
  phone: text("phone"),
  email: text("email"),
  gstin: text("gstin"),
  pan: text("pan"),
  upiId: text("upi_id"),
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  bankIfsc: text("bank_ifsc"),
  invoiceTerms: text("invoice_terms"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ShopSettings = typeof shopSettingsTable.$inferSelect;
