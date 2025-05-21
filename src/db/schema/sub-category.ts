import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import type { z } from "zod";
import { categoryTable } from "./category";

export const subCategoryTable = pgTable("sub_category", {
  id: text("id").primaryKey(),
  name: text("name").unique().notNull(),
  description: text("description"),
  categoryId: text("category_id")
    .notNull()
    .references(() => categoryTable.id),
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
export const insertSubCategorySchema = createInsertSchema(subCategoryTable);

export type subCategory = typeof subCategoryTable.$inferSelect;
export type NewSubCategory = z.infer<typeof insertSubCategorySchema>;
