import { z } from "zod";

export const expenseRecordQuerySchema = z.object({
  // page: z.number(),
  // pageSize: z.number(),
  reason: z.string().optional(),
  sortBy: z.enum(["newest", "oldest", "highest", "lowest"]).optional(),
  filterCategory: z.string().optional(),
  filterSubCategory: z.string().optional(),
  filterStartDate: z.string().optional(),
  filterEndDate: z.string().optional(),
});
