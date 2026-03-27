import { date, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { categoryTable } from "./category";
import { subCategoryTable } from "./sub-category";
import { userTable } from "./user";
import { z } from "zod";

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

export const REPORT_TYPE = {
  MONTHLY: "monthly",
  YEARLY: "yearly",
  CATEGORY: "category",
  SUBCATEGORY: "subcategory",
} as const;

const baseGenerateReportSchema = z.object({
  fileType: z.enum(["excel", "csv"]),
  type: z.enum(Object.values(REPORT_TYPE) as [string, ...string[]]),
});

export const generateReportParamsSchema = z.discriminatedUnion("type", [
  // Monthly Report
  baseGenerateReportSchema.extend({
    type: z.literal(REPORT_TYPE.MONTHLY),
    month: z.coerce.number().min(1).max(12),
    year: z.coerce.number().min(2000),
  }),

  // Yearly Report
  baseGenerateReportSchema.extend({
    type: z.literal(REPORT_TYPE.YEARLY),
    year: z.coerce.number().min(2000),
  }),

  // Category Report
  baseGenerateReportSchema.extend({
    type: z.literal(REPORT_TYPE.CATEGORY),
    month: z.coerce.number().min(1).max(12).optional(),
    year: z.coerce.number().min(2000),
    categoryId: z.string().min(1),
  }),

  // Subcategory Report
  baseGenerateReportSchema.extend({
    type: z.literal(REPORT_TYPE.SUBCATEGORY),
    month: z.coerce.number().min(1).max(12).optional(),
    year: z.coerce.number().min(2000),
    subCategoryId: z.string().min(1),
  }),
]);

export type expenseRecord = typeof expenseRecordTable.$inferSelect;
export type NewExpenseRecord = z.infer<typeof insertExpenseRecordSchema>;
