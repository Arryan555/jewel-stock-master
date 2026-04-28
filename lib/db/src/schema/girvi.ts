import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";

export const girviLoansTable = pgTable("girvi_loans", {
  id: uuid("id").primaryKey().defaultRandom(),
  loanNumber: text("loan_number").notNull().unique(),
  customerId: uuid("customer_id").notNull(),
  itemDescription: text("item_description").notNull(),
  metal: text("metal").notNull(),
  purity: text("purity").notNull(),
  weightGrams: numeric("weight_grams", { precision: 12, scale: 3 })
    .notNull()
    .default("0"),
  loanAmount: numeric("loan_amount", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  interestRatePct: numeric("interest_rate_pct", { precision: 6, scale: 2 })
    .notNull()
    .default("0"),
  loanDate: timestamp("loan_date", { withTimezone: true })
    .notNull()
    .defaultNow(),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("active"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type GirviLoan = typeof girviLoansTable.$inferSelect;

export const girviPaymentsTable = pgTable("girvi_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  loanId: uuid("loan_id").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
  note: text("note"),
});

export type GirviPayment = typeof girviPaymentsTable.$inferSelect;
