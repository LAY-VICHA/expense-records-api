import { db } from "@/db";
import {
  categoryTable,
  expenseRecordTable,
  subCategoryTable,
} from "@/db/schema";
import { sql, and, gte, lte, lt, eq } from "drizzle-orm";
import { Request, Response, NextFunction } from "express";
import {
  dashboardBarChartQuerySchema,
  dashboardPieChartQuerySchema,
} from "@/types/dashboard";
import { AppError } from "@/middleware/error";
import config from "@/config/config";
import { AuthenticatedRequest } from "@/middleware/authentication";

export const getDashboardCardData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { user } = req as AuthenticatedRequest;

  if (!user.id) {
    const error = new Error("User is not authenticated") as AppError;
    error.status = 401;
    return next(error);
  }

  const result = await db
    .select({
      totalExpense: sql<number>`SUM(CAST(${expenseRecordTable.amount} AS DECIMAL))`,
      oldestDate: sql<Date>`MIN(${expenseRecordTable.expenseDate})`,
    })
    .from(expenseRecordTable)
    .where(eq(expenseRecordTable.userId, user.id));

  const { totalExpense, oldestDate } = result[0];

  if (!oldestDate || !totalExpense) {
    res.status(200).json({
      success: true,
      data: {
        totalExpense: 0,
        totalDays: 0,
        averagePerDay: 0,
      },
      message: "No data available for dashboard card",
    });
    return;
  }

  const today = new Date();
  const start = new Date(oldestDate);
  const findTotalDays = today.getTime() - start.getTime();
  const totalDays = Math.max(Math.ceil(findTotalDays / (1000 * 3600 * 24)), 1);

  const averagePerDay = Number(totalExpense) / totalDays;

  res.json({
    success: true,
    data: {
      totalExpense: Number(totalExpense),
      totalDays,
      averagePerDay: parseFloat(averagePerDay.toFixed(2)),
    },
    message: "Dashboard card data fetched successfully",
  });
  return;
};

export const getDashboardBarchart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { user } = req as AuthenticatedRequest;

  if (!user.id) {
    const error = new Error("User is not authenticated") as AppError;
    error.status = 401;
    return next(error);
  }

  const result = dashboardBarChartQuerySchema.safeParse(req.query);

  if (!result.success) {
    const error = new Error(`Invalid query parameter.`) as AppError;
    error.status = 400;
    return next(error);
  }

  const {
    selectedCategory,
    selectedSubCategory,
    periodType,
    isIncludeHighExpenseRecord,
  } = result.data;
  const includeHigh = isIncludeHighExpenseRecord === "true";

  const now = new Date();
  let groupBy: "month" | "year";
  let periodCount: number = 0;
  let startDate: Date;

  if (periodType === "monthly") {
    groupBy = "month";
    startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1, 7, 0, 0, 0); // last 12 months
    periodCount = 12;
  } else {
    groupBy = "year";
    startDate = new Date(now.getFullYear() - 6, 0, 1, 7, 0, 0, 0); // last 7 years
    periodCount = 7;
  }

  const expenses = await db.query.expenseRecordTable.findMany({
    where: (fields, { and, eq, gte, lt }) =>
      and(
        eq(expenseRecordTable.userId, user.id),
        gte(fields.expenseDate, startDate),
        selectedCategory ? eq(fields.categoryId, selectedCategory) : undefined,
        selectedSubCategory
          ? eq(fields.subCategoryId, selectedSubCategory)
          : undefined,
        !includeHigh
          ? lt(fields.amount, config.highExpenseThreshold)
          : undefined
      ),
  });

  if (!expenses || expenses.length === 0) {
    const error = new Error(`No data`) as AppError;
    error.status = 404;
    return next(error);
  }

  const groupedMap = new Map<string, number>();
  let totalExpense = 0;

  for (const record of expenses) {
    const date = new Date(record.expenseDate);
    const key =
      groupBy === "year"
        ? `${date.getFullYear()}`
        : `${date.getFullYear()}-${date.getMonth() + 1}`;

    const amount = parseFloat(record.amount);
    if (!groupedMap.has(key)) groupedMap.set(key, 0);
    groupedMap.set(key, groupedMap.get(key)! + amount);
    totalExpense += amount;
  }

  const periodsWithData = groupedMap.size;
  const averageExpense =
    periodsWithData === 0 ? 0 : totalExpense / periodsWithData;

  res.json({
    success: true,
    data: {
      totalExpense: parseFloat(totalExpense.toFixed(2)),
      averageExpense: parseFloat(averageExpense.toFixed(2)),
      periodsWithData,
      dataPoints: Array.from(groupedMap.entries()).map(([label, value]) => ({
        date: label,
        amount: value,
      })),
    },
    message: "Dashboard bar chart data fetched successfully",
  });
  return;
};

export const getDashboardPiechart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { user } = req as AuthenticatedRequest;

  if (!user.id) {
    const error = new Error("User is not authenticated") as AppError;
    error.status = 401;
    return next(error);
  }

  const result = dashboardPieChartQuerySchema.safeParse(req.query);

  if (!result.success) {
    const error = new Error(`Invalid query parameter.`) as AppError;
    error.status = 404;
    return next(error);
  }

  const { groupBy, isIncludeHighExpenseRecordPieChart } = result.data;
  const includeHigh = isIncludeHighExpenseRecordPieChart === "true";

  const year = parseInt(req.query.year as string);
  const month = req.query.month
    ? parseInt(req.query.month as string)
    : undefined;

  const startDate = month
    ? new Date(year, month - 1, 1, 7, 0, 0, 0)
    : new Date(year, 0, 1, 7, 0, 0, 0);
  const endDate = month
    ? new Date(year, month, 0, 30, 59, 59, 999)
    : new Date(year, 11, 31, 30, 59, 59, 999);

  const records = await db
    .select({
      id: expenseRecordTable.id,
      amount: expenseRecordTable.amount,
      expenseDate: expenseRecordTable.expenseDate,
      categoryId: expenseRecordTable.categoryId,
      categoryName: categoryTable.name,
      subCategoryId: expenseRecordTable.subCategoryId,
      subCategoryName: subCategoryTable.name,
    })
    .from(expenseRecordTable)
    .leftJoin(
      categoryTable,
      eq(expenseRecordTable.categoryId, categoryTable.id)
    )
    .leftJoin(
      subCategoryTable,
      eq(expenseRecordTable.subCategoryId, subCategoryTable.id)
    )
    .where(
      and(
        eq(expenseRecordTable.userId, user.id),
        gte(expenseRecordTable.expenseDate, startDate),
        lte(expenseRecordTable.expenseDate, endDate),
        !includeHigh
          ? lt(expenseRecordTable.amount, config.highExpenseThreshold)
          : undefined
      )
    );

  if (!records || records.length === 0) {
    const error = new Error(`No Data`) as AppError;
    error.status = 404;
    return next(error);
  }

  const groupMap = new Map<string, { total: number; count: number }>();
  let totalExpense = 0;

  for (const record of records) {
    let key = "";
    if (groupBy === "category") {
      key = record.categoryName ?? "";
    } else if (groupBy === "subCategory") {
      key = record.subCategoryName ?? "";
    } else {
      key = "";
    }
    const amount = parseFloat(record.amount);

    if (!groupMap.has(key)) {
      groupMap.set(key, { total: 0, count: 0 });
    }

    const current = groupMap.get(key)!;
    current.total += amount;
    current.count += 1;

    totalExpense += amount;
  }

  const response = Array.from(groupMap.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([label, { total, count }]) => ({
      label,
      amount: total.toFixed(2),
      percentage:
        totalExpense > 0
          ? parseFloat(((total / totalExpense) * 100).toFixed(2))
          : 0,
      count,
    }));

  res.json({
    success: true,
    data: {
      totalExpense: parseFloat(totalExpense.toFixed(2)),
      pieChartData: response,
    },
    message: "Dashboard pie chart data fetched successfully",
  });
  return;
};
