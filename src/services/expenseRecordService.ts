import { db } from "@/db";
import {
  categoryTable,
  expenseRecordTable,
  subCategoryTable,
} from "@/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import ExcelJS from "exceljs";
import path from "node:path";
import fs from "fs";

export type PrintDataFilters =
  | {
      year: number;
      type: "monthly";
      month: number;
      fileType: "excel" | "csv";
    }
  | {
      year: number;
      type: "yearly";
      fileType: "excel" | "csv";
    }
  | {
      year: number;
      type: "category";
      categoryId: string;
      fileType: "excel" | "csv";
      month?: number | undefined;
    }
  | {
      year: number;
      type: "subcategory";
      subCategoryId: string;
      fileType: "excel" | "csv";
      month?: number | undefined;
    };

export interface printData {
  categoryName: string;
  subCategoryName: string;
  expenseDate: Date;
  amount: string;
  currency: string;
  reason: string | null;
  totalAmount: number;
}

export const getExpenseReportPrintData = async (
  data: PrintDataFilters,
  userId: string,
) => {
  let startDate = new Date(data.year, 0, 1);
  let endDate = new Date(data.year, 11, 31, 30, 59, 59, 999);
  if (data.type !== "yearly" && data.month) {
    startDate = new Date(data.year, data.month - 1, 1);
    endDate = new Date(data.year, data.month, 1);
  }

  if (data.type === "monthly") {
    // generate monthly report
    const result = await getExpenseReportByDateRange({
      userId,
      startDate,
      endDate,
    });
    return result;
  }

  if (data.type === "yearly") {
    // generate yearly report
    const result = await getExpenseReportByDateRange({
      userId,
      startDate,
      endDate,
    });
    return result;
  }

  if (data.type === "category") {
    // generate category report
    const result = await getExpenseReportByCategory({
      userId,
      startDate,
      endDate,
      categoryId: data.categoryId,
    });
    return result;
  }

  // else, generate subcategory report
  const result = await getExpenseReportByCategory({
    userId,
    startDate,
    endDate,
    subCategoryId: data.subCategoryId,
  });
  return result;
};

export const getExpenseReportByDateRange = async (filters: {
  userId: string;
  startDate: Date;
  endDate: Date;
}) => {
  const { userId, startDate, endDate } = filters;

  const result = await db
    .select({
      categoryName: categoryTable.name,
      subCategoryName: subCategoryTable.name,
      expenseDate: expenseRecordTable.expenseDate,
      amount: expenseRecordTable.amount,
      currency: expenseRecordTable.currency,
      reason: expenseRecordTable.reason,
      totalAmount: sql<number>`SUM(${expenseRecordTable.amount}) OVER ()`,
    })
    .from(expenseRecordTable)
    .innerJoin(
      categoryTable,
      eq(expenseRecordTable.categoryId, categoryTable.id),
    )
    .innerJoin(
      subCategoryTable,
      eq(expenseRecordTable.subCategoryId, subCategoryTable.id),
    )
    .where(
      and(
        gte(expenseRecordTable.expenseDate, startDate),
        lte(expenseRecordTable.expenseDate, endDate),
        eq(expenseRecordTable.userId, userId),
      ),
    );

  return result;
};

export const getExpenseReportByCategory = async (filters: {
  userId: string;
  startDate: Date;
  endDate: Date;
  categoryId?: string;
  subCategoryId?: string;
}) => {
  const { userId, startDate, endDate, categoryId, subCategoryId } = filters;

  const conditions = [
    eq(expenseRecordTable.userId, userId),
    gte(expenseRecordTable.expenseDate, startDate),
    lte(expenseRecordTable.expenseDate, endDate),
  ];

  if (categoryId) {
    conditions.push(eq(expenseRecordTable.categoryId, categoryId));
  }

  if (subCategoryId) {
    conditions.push(eq(expenseRecordTable.subCategoryId, subCategoryId));
  }

  const result = await db
    .select({
      categoryName: categoryTable.name,
      subCategoryName: subCategoryTable.name,
      expenseDate: expenseRecordTable.expenseDate,
      amount: expenseRecordTable.amount,
      currency: expenseRecordTable.currency,
      reason: expenseRecordTable.reason,
      totalAmount: sql<number>`SUM(${expenseRecordTable.amount}) OVER ()`,
    })
    .from(expenseRecordTable)
    .innerJoin(
      categoryTable,
      eq(expenseRecordTable.categoryId, categoryTable.id),
    )
    .innerJoin(
      subCategoryTable,
      eq(expenseRecordTable.subCategoryId, subCategoryTable.id),
    )
    .where(and(and(...conditions)));

  return result;
};

export const generateExpenseExcel = async (
  data: printData[],
  reportTitle: string,
) => {
  const workbook = new ExcelJS.Workbook();
  const templatePath = path.join(
    process.cwd(),
    "public",
    "templates",
    "generate-report-template.xlsx",
  );

  if (!fs.existsSync(templatePath)) {
    throw new Error("Template file not found");
  }

  await workbook.xlsx.readFile(templatePath);

  let worksheet = workbook.getWorksheet("Expense Report");

  if (!worksheet) {
    worksheet = workbook.addWorksheet("Expense Report");
  }

  worksheet.getRow(2).getCell(1).value = reportTitle;
  let START_ROW = 4;
  const templateRow = worksheet.getRow(START_ROW);

  data.forEach((row, index) => {
    const amount = Number(row.amount);
    const newRow = worksheet.insertRow(START_ROW + index, [
      row.expenseDate,
      row.categoryName,
      row.subCategoryName,
      amount,
      row.currency,
      row.reason,
    ]);

    newRow.eachCell((cell, colNumber) => {
      const templateCell = templateRow.getCell(colNumber);

      cell.style = { ...templateCell.style };
      const borderStyle = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      } as const;
      cell.border = borderStyle;

      if (colNumber === 4) {
        const amount = Number(cell.value);

        if (amount >= 50) {
          cell.font = {
            ...cell.font,
            color: { argb: "FFFF0000" }, // red
            bold: true,
          };
        } else if (amount < 50 && amount >= 10) {
          cell.font = {
            ...cell.font,
            color: { argb: "FFFF8C00" }, // orange
            bold: true,
          };
        }
      }
    });
  });

  const totalRowIndex = START_ROW + data.length;
  const totalRow = worksheet.getRow(totalRowIndex);

  totalRow.getCell(4).value = data[0].totalAmount;

  totalRow.commit();

  return workbook;
};
