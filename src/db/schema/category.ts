import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import type { z } from "zod";

export const categoryTable = pgTable("category", {
  id: text("id").primaryKey(),
  name: text("name").unique().notNull(),
  description: text("description"),
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
export const insertCategorySchema = createInsertSchema(categoryTable);

export type category = typeof categoryTable.$inferSelect;
export type NewCategory = z.infer<typeof insertCategorySchema>;
