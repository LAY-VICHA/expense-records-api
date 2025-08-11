import { date, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import type { z } from "zod";
import { categoryTable } from "./category";
import { subCategoryTable } from "./sub-category";
import { userTable } from "./user";

export const expenseRecordTable = pgTable("expense_records", {
  id: text("id").primaryKey(),
  expenseDate: date("expense_date", {
    mode: "date",
  }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  reason: text("reason"),
  categoryId: text("category_id")
    .notNull()
    .references(() => categoryTable.id),
  subCategoryId: text("sub_category_id")
    .notNull()
    .references(() => subCategoryTable.id),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "date",
  }),
});
export const insertExpenseRecordSchema = createInsertSchema(expenseRecordTable);

export type expenseRecord = typeof expenseRecordTable.$inferSelect;
export type NewExpenseRecord = z.infer<typeof insertExpenseRecordSchema>;
