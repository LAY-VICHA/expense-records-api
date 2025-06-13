import { z } from "zod";

export const dashboardBarChartQuerySchema = z.object({
  selectedCategory: z.string().optional(),
  selectedSubCategory: z.string().optional(),
  periodType: z.enum(["monthly", "yearly"]).default("monthly"),
  isIncludeHighExpenseRecord: z
    .union([z.literal("true"), z.literal("false")])
    .default("false"),
});

export const dashboardPieChartQuerySchema = z.object({
  year: z.string().optional().default(String(new Date().getFullYear())),
  month: z.string().optional(),
  groupBy: z.enum(["category", "subCategory"]).default("category"),
  isIncludeHighExpenseRecordPieChart: z
    .union([z.literal("true"), z.literal("false")])
    .default("false"),
});
