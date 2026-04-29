import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
  integer,
} from "drizzle-orm/pg-core";

export const schemePlansTable = pgTable("scheme_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  monthlyAmount: numeric("monthly_amount", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  durationMonths: integer("duration_months").notNull().default(11),
  bonusMonths: integer("bonus_months").notNull().default(1),
  description: text("description"),
  active: text("active").notNull().default("true"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type SchemePlan = typeof schemePlansTable.$inferSelect;

export const schemeAccountsTable = pgTable("scheme_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountNumber: text("account_number").notNull().unique(),
  planId: uuid("plan_id").notNull(),
  customerId: uuid("customer_id").notNull(),
  startDate: timestamp("start_date", { withTimezone: true })
    .notNull()
    .defaultNow(),
  status: text("status").notNull().default("active"),
  maturityDate: timestamp("maturity_date", { withTimezone: true }),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type SchemeAccount = typeof schemeAccountsTable.$inferSelect;

export const schemeInstallmentsTable = pgTable("scheme_installments", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull(),
  installmentNumber: integer("installment_number").notNull(),
  paidAmount: numeric("paid_amount", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  paidAt: timestamp("paid_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  note: text("note"),
});

export type SchemeInstallment = typeof schemeInstallmentsTable.$inferSelect;
