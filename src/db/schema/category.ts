import { relations } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import type { z } from "zod";
import { subCategoryTable } from "./sub-category";
import { userTable } from "./user";

export const categoryTable = pgTable("category", {
  id: text("id").primaryKey(),
  name: text("name").unique().notNull(),
  description: text("description"),
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

export const categoryRelations = relations(categoryTable, ({ many }) => ({
  subCategories: many(subCategoryTable),
}));

export const insertCategorySchema = createInsertSchema(categoryTable);

export type category = typeof categoryTable.$inferSelect;
export type NewCategory = z.infer<typeof insertCategorySchema>;
