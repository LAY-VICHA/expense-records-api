import { db } from "@/db";
import {
  categoryTable,
  expenseRecordTable,
  NewExpenseRecord,
  subCategoryTable,
} from "@/db/schema";
import fs from "fs";
import { and, eq, gte, ilike, lte, sql, SQLWrapper } from "drizzle-orm";
import { Request, Response, NextFunction } from "express";
import { AppError } from "@/middleware/error";
import { generateIdFromEntropySize } from "@/lib/random";
import { parse as csvParse } from "csv-parse";
import stripBomStream from "strip-bom-stream";
import { expenseRecordQuerySchema } from "@/types/expenseRecord";
import { parseDate } from "@/lib/dateParse";
import { AuthenticatedRequest } from "@/middleware/authentication";

export const getExpenseRecord = async (
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

  const parseResult = expenseRecordQuerySchema.safeParse(req.query);

  if (!parseResult.success) {
    const error = new Error(parseResult.error.message) as AppError;
    error.status = 400;
    return next(error);
  }
  const page: number = Number(req.query.page) ?? 1;
  const pageSize: number = Number(req.query.pageSize) ?? 10;

  let sqlQuery = db
    .select({
      id: expenseRecordTable.id,
      expenseDate: expenseRecordTable.expenseDate,
      amount: expenseRecordTable.amount,
      currency: expenseRecordTable.currency,
      reason: expenseRecordTable.reason,
      category: categoryTable.name,
      categoryId: categoryTable.id,
      subCategory: subCategoryTable.name,
      subCategoryId: subCategoryTable.id,
      createdAt: expenseRecordTable.createdAt,
      updatedAt: expenseRecordTable.updatedAt,
    })
    .from(expenseRecordTable)
    .where(eq(expenseRecordTable.userId, user.id))
    .innerJoin(
      categoryTable,
      eq(expenseRecordTable.categoryId, categoryTable.id)
    )
    .innerJoin(
      subCategoryTable,
      eq(expenseRecordTable.subCategoryId, subCategoryTable.id)
    )
    .orderBy(sql`${expenseRecordTable.expenseDate} desc`)
    .$dynamic();

  const conditions: SQLWrapper[] = [];
  if (parseResult.data?.reason && parseResult.data?.reason.trim() !== "") {
    conditions.push(
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
  } else {
    sqlQuery = sqlQuery.orderBy(sql`${expenseRecordTable.expenseDate} desc`);
  }
  if (
    parseResult.data?.filterCategory &&
    parseResult.data?.filterCategory.trim() !== ""
  ) {
    conditions.push(
      ilike(
        expenseRecordTable.categoryId,
        `%${parseResult.data?.filterCategory}%`
      )
    );
  }
  if (
    parseResult.data?.filterSubCategory &&
    parseResult.data?.filterSubCategory.trim() !== ""
  ) {
    conditions.push(
      ilike(
        expenseRecordTable.subCategoryId,
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
    const startDate = parseDate(parseResult.data.filterStartDate);
    const endDate = parseDate(parseResult.data.filterEndDate, true);

    conditions.push(
      gte(expenseRecordTable.expenseDate, startDate),
      lte(expenseRecordTable.expenseDate, endDate)
    );
  }

  if (conditions.length > 0) {
    sqlQuery = sqlQuery.where(and(...conditions));
  }

  const [count, items] = await Promise.all([
    db.$count(sqlQuery.as("sq")),
    sqlQuery.limit(pageSize).offset((page - 1) * pageSize),
  ]);

  if (count === 0) {
    const error = new Error(`No records found`) as AppError;
    error.status = 404;
    return next(error);
  }

  res.json({
    success: true,
    data: {
      items,
      currentPage: page,
      totalPages: Math.ceil(count / pageSize),
      totalItems: count,
      pageSize,
    },
    message: "Expense records fetched successfully",
  });
  return;
};

export const getExpenseRecordById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { user } = req as AuthenticatedRequest;
  const id: string = req.params.id;

  if (!user.id) {
    const error = new Error("User is not authenticated") as AppError;
    error.status = 401;
    return next(error);
  }

  const expenseRecord = await db.query.expenseRecordTable.findFirst({
    where: and(
      eq(expenseRecordTable.id, id),
      eq(expenseRecordTable.userId, user.id)
    ),
  });

  if (!expenseRecord) {
    const error = new Error(
      `Expense record with the id of ${id} was not found`
    ) as AppError;
    error.status = 404;
    return next(error);
  }

  res.status(200).json(expenseRecord);
  return;
};

export const createExpenseRecord = async (
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

  const expenseRecordId = generateIdFromEntropySize(10);
  const data = req.body;
  data.id = expenseRecordId;
  data.userId = user.id;
  data.expenseDate = new Date(data.expenseDate);

  const category = await db.query.categoryTable.findFirst({
    where: and(eq(categoryTable.id, data.categoryId)),
  });

  if (!category) {
    const error = new Error(
      `Expense record with category ${data.categoryId} was not found`
    ) as AppError;
    error.status = 400;
    return next(error);
  }

  const subCategory = await db.query.subCategoryTable.findFirst({
    where: and(eq(subCategoryTable.id, data.subCategoryId)),
  });

  if (!subCategory) {
    const error = new Error(
      `Expense record with sub-category ${data.subCategoryId} was not found`
    ) as AppError;
    error.status = 400;
    return next(error);
  }

  const newExpenseRecordId = await db
    .insert(expenseRecordTable)
    .values(data)
    .returning();

  res.json({ success: true, data: newExpenseRecordId, status: 201 });
  return;
};

// bulk uploaded
export const handleBulkExpenseRecord = async (
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

  const file = req.file;
  if (!file) {
    const error = new Error(`CSV file is required.`) as AppError;
    error.status = 400;
    return next(error);
  }
  const categories = await db.query.categoryTable.findMany({
    columns: { id: true, name: true },
  });
  if (!categories) {
    const error = new Error(`Unable to get categories data`) as AppError;
    error.status = 500;
    return next(error);
  }
  const subCategories = await db.query.subCategoryTable.findMany({
    columns: { id: true, name: true },
  });
  if (!subCategories) {
    const error = new Error(`Unable to get sub-categories data`) as AppError;
    error.status = 500;
    return next(error);
  }
  const rawRows: any[] = [];
  fs.createReadStream(file.path)
    .pipe(stripBomStream())
    .pipe(csvParse({ columns: true, trim: true }))
    .on("data", (row) => {
      rawRows.push(row);
    })
    .on("end", async () => {
      try {
        const results: NewExpenseRecord[] = [];
        for (const row of rawRows) {
          const categoryExist = categories.find(
            (category) => category.name === row.category
          );
          if (!categoryExist) {
            throw new Error(
              `Expense record with category ${row.category} was not found`
            );
          }
          const categoryId = categoryExist.id;
          const subCategoryExist = subCategories.find(
            (subCategory) => subCategory.name === row.subCategory
          );
          if (!subCategoryExist) {
            throw new Error(
              `Expense record with sub-category ${row.subCategory} was not found`
            );
          }
          const subCategoryId = subCategoryExist.id;
          const expenseDate = new Date(row.expenseDate);
          expenseDate.setHours(12, 0, 0, 0);
          results.push({
            id: generateIdFromEntropySize(5),
            expenseDate: expenseDate,
            amount: parseFloat(row.amount).toString(),
            currency: row.currency,
            reason: row.reason,
            categoryId: categoryId,
            subCategoryId: subCategoryId,
            userId: user.id,
            createdAt: new Date(),
          });
        }
        await db.insert(expenseRecordTable).values(results);
        res.status(200).json({
          status: 200,
          message: "Expense records uploaded successfully",
          data: results,
          count: results.length,
        });
        return;
      } catch (err: any) {
        res.status(400).json({ error: err.message || "Upload failed" });
        return;
      } finally {
        // console.log("----- clear uploaded file -----");
        fs.unlinkSync(file.path);
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
  const { user } = req as AuthenticatedRequest;

  if (!user.id) {
    const error = new Error("User is not authenticated") as AppError;
    error.status = 401;
    return next(error);
  }

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

  if (user.id !== expenseRecord.userId) {
    const error = new Error(
      "You are not authorized to update this record"
    ) as AppError;
    error.status = 403;
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
      where: and(eq(categoryTable.id, data.categoryId)),
    });

    if (!category) {
      const error = new Error(
        `Expense record with category ${data.categoryId} was not found`
      ) as AppError;
      error.status = 400;
      return next(error);
    }
  }

  if (data.subCategory) {
    const subCategory = await db.query.subCategoryTable.findFirst({
      where: and(eq(subCategoryTable.id, data.subCategoryId)),
    });

    if (!subCategory) {
      const error = new Error(
        `Expense record with sub-category ${data.subCategoryId} was not found`
      ) as AppError;
      error.status = 400;
      return next(error);
    }
  }

  if (data.expenseDate) {
    data.expenseDate = new Date(data.expenseDate);
  }

  const updatedExpenseRecord = await db
    .update(expenseRecordTable)
    .set({
      ...(data.expenseDate && { expenseDate: data.expenseDate }),
      ...(data.amount && { amount: data.amount }),
      ...(data.currency && { currency: data.currency }),
      ...(data.reason && { reason: data.reason }),
      ...(data.categoryId && { categoryId: data.categoryId }),
      ...(data.subCategoryId && { subCategoryId: data.subCategoryId }),
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
  return;
};

export const deleteExpenseRecord = async (
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

  if (user.id !== expenseRecord.userId) {
    const error = new Error(
      "You are not authorized to delete this record"
    ) as AppError;
    error.status = 403;
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
  return;
};
