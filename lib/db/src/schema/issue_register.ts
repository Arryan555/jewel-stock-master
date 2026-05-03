import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";

export const issueRegisterTable = pgTable("issue_register", {
  id: uuid("id").primaryKey().defaultRandom(),
  issueNumber: text("issue_number").notNull().unique(),
  karigarName: text("karigar_name").notNull(),
  metal: text("metal").notNull().default("Gold"),
  purity: text("purity").notNull().default("22K"),
  grossGrams: numeric("gross_grams", { precision: 12, scale: 3 })
    .notNull()
    .default("0"),
  netGrams: numeric("net_grams", { precision: 12, scale: 3 })
    .notNull()
    .default("0"),
  ratePerGram: numeric("rate_per_gram", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  description: text("description").notNull().default(""),
  issueDate: timestamp("issue_date", { withTimezone: true })
    .notNull()
    .defaultNow(),
  dueDate: timestamp("due_date", { withTimezone: true }),
  returnDate: timestamp("return_date", { withTimezone: true }),
  status: text("status").notNull().default("pending"),
  remarks: text("remarks").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type IssueRegister = typeof issueRegisterTable.$inferSelect;
