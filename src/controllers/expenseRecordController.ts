import { db } from "@/db";
import {
  categoryTable,
  expenseRecordTable,
  NewExpenseRecord,
  subCategoryTable,
} from "@/db/schema";
import fs from "fs";
import { and, eq, gte, ilike, lte, sql } from "drizzle-orm";
import { Request, Response, NextFunction } from "express";
import { AppError } from "@/middleware/error";
import { generateIdFromEntropySize } from "@/lib/random";
import { parse as csvParse } from "csv-parse";
import { parse as parseDateFns } from "date-fns";
import stripBomStream from "strip-bom-stream";
import { expenseRecordQuerySchema } from "@/types/expenseRecord";

export const getExpenseRecord = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const parseResult = expenseRecordQuerySchema.safeParse(req.query);

  if (!parseResult.success) {
    const error = new Error(parseResult.error.message) as AppError;
    error.status = 400;
    return next(error);
  }
  // const page: number = Number(req.query.page) ?? 1;
  // const pageSize: number = Number(req.query.pageSize) ?? 10;
  // const reason: string | null = req.query.reason as string;
  // const sortBy: string | null = req.query.sortBy as string;

  // need to add more rule like sorting, filtering, search, filter by date and more
  let sqlQuery = db
    .select({
      id: expenseRecordTable.id,
      expenseDate: expenseRecordTable.expenseDate,
      amount: expenseRecordTable.amount,
      currency: expenseRecordTable.currency,
      reason: expenseRecordTable.reason,
      category: expenseRecordTable.category,
      subCategory: expenseRecordTable.subCategory,
      createdAt: expenseRecordTable.createdAt,
      updatedAt: expenseRecordTable.updatedAt,
    })
    .from(expenseRecordTable)
    .$dynamic();

  if (parseResult.data?.reason && parseResult.data?.reason.trim() !== "") {
    sqlQuery = sqlQuery.where(
      ilike(expenseRecordTable.reason, `%${parseResult.data?.reason}%`)
    );
  }
  if (parseResult.data?.sortBy && parseResult.data?.sortBy.trim() !== "") {
    if (parseResult.data?.sortBy === "newest") {
      sqlQuery = sqlQuery.orderBy(sql`${expenseRecordTable.expenseDate} desc`);
    } else if (parseResult.data?.sortBy === "oldest") {
      sqlQuery = sqlQuery.orderBy(sql`${expenseRecordTable.expenseDate} asc`);
    } else if (parseResult.data?.sortBy === "highest") {
      sqlQuery = sqlQuery.orderBy(sql`${expenseRecordTable.amount} desc`);
    } else {
      sqlQuery = sqlQuery.orderBy(sql`${expenseRecordTable.amount} asc`);
    }
  }
  if (
    parseResult.data?.filterCategory &&
    parseResult.data?.filterCategory.trim() !== ""
  ) {
    sqlQuery = sqlQuery.where(
      ilike(
        expenseRecordTable.category,
        `%${parseResult.data?.filterCategory}%`
      )
    );
  }
  if (
    parseResult.data?.filterSubCategory &&
    parseResult.data?.filterSubCategory.trim() !== ""
  ) {
    sqlQuery = sqlQuery.where(
      ilike(
        expenseRecordTable.subCategory,
        `%${parseResult.data?.filterSubCategory}%`
      )
    );
  }
  if (
    parseResult.data?.filterStartDate &&
    parseResult.data?.filterStartDate.trim() !== "" &&
    parseResult.data?.filterEndDate &&
    parseResult.data?.filterEndDate.trim() !== ""
  ) {
    sqlQuery = sqlQuery.where(
      and(
        gte(
          expenseRecordTable.expenseDate,
          new Date(parseResult.data?.filterStartDate as string)
        ),
        lte(
          expenseRecordTable.expenseDate,
          new Date(parseResult.data?.filterEndDate as string)
        )
      )
    );
  }

  const [count, items] = await Promise.all([
    db.$count(sqlQuery.as("sq")),
    sqlQuery
      .limit(parseResult.data.pageSize)
      .offset((parseResult.data.page - 1) * parseResult.data.pageSize),
  ]);

  res.json({
    items,
    currentPage: parseResult.data.page,
    totalPages: Math.ceil(count / parseResult.data.pageSize),
    totalItems: count,
    pageSize: parseResult.data.pageSize,
  });
};

export const getExpenseRecordById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const id: string = req.params.id;

  const expenseRecord = await db.query.expenseRecordTable.findFirst({
    where: and(eq(expenseRecordTable.id, id)),
  });

  if (!expenseRecord) {
    const error = new Error(
      `Expense record with the id of ${id} was not found`
    ) as AppError;
    error.status = 404;
    return next(error);
  }

  res.status(200).json(expenseRecord);
};

export const createExpenseRecord = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const expenseRecordId = generateIdFromEntropySize(5);
  const data = req.body;
  data.id = expenseRecordId;

  const category = await db.query.categoryTable.findFirst({
    where: and(eq(categoryTable.name, data.category)),
  });

  if (!category) {
    const error = new Error(
      `Expense record with category ${data.category} was not found`
    ) as AppError;
    error.status = 400;
    return next(error);
  }

  const subCategory = await db.query.subCategoryTable.findFirst({
    where: and(eq(subCategoryTable.name, data.subCategory)),
  });

  if (!subCategory) {
    const error = new Error(
      `Expense record with sub-category ${data.subCategory} was not found`
    ) as AppError;
    error.status = 400;
    return next(error);
  }

  const newExpenseRecordId = await db
    .insert(expenseRecordTable)
    .values(data)
    .returning();

  res.json({ success: true, data: newExpenseRecordId, status: 201 });
};

// bulk uploaded
export const handleBulkExpenseRecord = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const file = req.file;

  if (!file) {
    const error = new Error(`CSV file is required.`) as AppError;
    error.status = 400;
    return next(error);
  }

  const results: NewExpenseRecord[] = [];
  const categories = await db.query.categoryTable.findMany({
    columns: {
      id: true,
      name: true,
    },
  });
  if (!categories) {
    const error = new Error(`Unable to get categories data`) as AppError;
    error.status = 500;
    return next(error);
  }

  const subCategories = await db.query.subCategoryTable.findMany({
    columns: {
      id: true,
      name: true,
    },
  });
  if (!subCategories) {
    const error = new Error(`Unable to get sub-categories data`) as AppError;
    error.status = 500;
    return next(error);
  }

  fs.createReadStream(file.path)
    .pipe(stripBomStream())
    .pipe(csvParse({ columns: true, trim: true }))
    .on("data", async (row) => {
      const categoryExist = categories.some(
        (category) => category.name === row.category
      );

      if (!categoryExist) {
        const error = new Error(
          `Expense record with category ${row.category} was not found`
        ) as AppError;
        error.status = 400;
        return next(error);
      }

      const subCategoryExist = subCategories.some(
        (subCategory) => subCategory.name === row.subCategory
      );

      if (!subCategoryExist) {
        const error = new Error(
          `Expense record with sub-category ${row.subCategory} was not found`
        ) as AppError;
        error.status = 400;
        return next(error);
      }

      const expenseRecordId = generateIdFromEntropySize(5);
      const expenseDate = parseDateFns(row.expenseDate, "M/d/yyyy", new Date());
      expenseDate.setHours(12, 0, 0, 0);

      results.push({
        id: expenseRecordId,
        expenseDate: expenseDate,
        amount: parseFloat(row.amount).toString(),
        currency: row.currency,
        reason: row.reason,
        category: row.category,
        subCategory: row.subCategory,
        createdAt: new Date(),
      });
    })
    .on("end", async () => {
      try {
        await db.insert(expenseRecordTable).values(results);
        res.status(200).json({
          status: 200,
          message: "Expense records uploaded successfully",
          data: results,
          count: results.length,
        });
      } catch (err) {
        res.status(500).json({ error: "Failed to insert expenses." });
      } finally {
        console.log("----- clear uploaded file -----");

        fs.unlinkSync(file.path); // Clean up uploaded file
      }
    })
    .on("error", (err) => {
      fs.unlinkSync(file.path);
      res.status(500).json({ error: "Failed to parse CSV." });
    });
};

//---------------------------------------------------------------------------------------------

export const updateExpenseRecord = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const id: string = req.params.id;

  const expenseRecord = await db.query.expenseRecordTable.findFirst({
    where: and(eq(expenseRecordTable.id, id)),
  });

  if (!expenseRecord) {
    const error = new Error(
      `Expense record with the id of ${id} was not found`
    ) as AppError;
    error.status = 404;
    return next(error);
  }

  const data = req.body;

  if (!data) {
    const error = new Error(`No data is updated`) as AppError;
    error.status = 400;
    return next(error);
  }

  if (data.category) {
    const category = await db.query.categoryTable.findFirst({
      where: and(eq(categoryTable.name, data.category)),
    });

    if (!category) {
      const error = new Error(
        `Expense record with category ${data.category} was not found`
      ) as AppError;
      error.status = 400;
      return next(error);
    }
  }

  if (data.subCategory) {
    const subCategory = await db.query.subCategoryTable.findFirst({
      where: and(eq(subCategoryTable.name, data.subCategory)),
    });

    if (!subCategory) {
      const error = new Error(
        `Expense record with sub-category ${data.subCategory} was not found`
      ) as AppError;
      error.status = 400;
      return next(error);
    }
  }

  const updatedExpenseRecord = await db
    .update(expenseRecordTable)
    .set({
      ...(data.expenseDate && { name: data.expenseDate }),
      ...(data.amount && { amount: data.description }),
      ...(data.currency && { currency: data.description }),
      ...(data.reason && { reason: data.description }),
      ...(data.category && { category: data.description }),
      ...(data.subCategory && { subCategory: data.description }),
      updatedAt: new Date(),
    })
    .where(eq(expenseRecordTable.id, id))
    .returning();

  res.json({
    success: true,
    data: updatedExpenseRecord,
    message: "Expense record updated successfully",
    status: 202,
  });
};

export const deleteExpenseRecord = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const id: string = req.params.id;

  const expenseRecord = await db.query.expenseRecordTable.findFirst({
    where: and(eq(expenseRecordTable.id, id)),
  });

  if (!expenseRecord) {
    const error = new Error(
      `Expense record with the id of ${id} was not found`
    ) as AppError;
    error.status = 404;
    return next(error);
  }

  const deletedExpenseRecord = await db
    .delete(expenseRecordTable)
    .where(eq(expenseRecordTable.id, id))
    .returning();

  res.json({
    success: true,
    data: deletedExpenseRecord,
    message: "Expense record deleted successfully",
    status: 200,
  });
};
