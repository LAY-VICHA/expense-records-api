import { db } from "@/db";
import { categoryTable, subCategoryTable } from "@/db/schema";
import { and, eq, ilike, sql } from "drizzle-orm";
import { Request, Response, NextFunction } from "express";
import { AppError } from "@/middleware/error";
import { generateIdFromEntropySize } from "@/lib/random";

export const getSubCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const page: number = Number(req.query.page) ?? 1;
  const pageSize: number = Number(req.query.pageSize) ?? 10;
  const name: string = req.query.name as string;

  let sqlQuery = db
    .select({
      id: subCategoryTable.id,
      name: subCategoryTable.name,
      description: subCategoryTable.description,
      createdAt: subCategoryTable.createdAt,
      updatedAt: subCategoryTable.updatedAt,
      category: {
        id: categoryTable.id,
        name: categoryTable.name,
      },
    })
    .from(subCategoryTable)
    .innerJoin(categoryTable, eq(subCategoryTable.categoryId, categoryTable.id))
    .orderBy(sql`${subCategoryTable.createdAt} desc`)
    .$dynamic();

  if (name && name.trim() !== "") {
    sqlQuery = sqlQuery.where(ilike(subCategoryTable.name, `%${name}%`));
  }

  const [count, items] = await Promise.all([
    db.$count(sqlQuery.as("sq")),
    sqlQuery.limit(pageSize).offset((page - 1) * pageSize),
  ]);

  res.json({
    success: true,
    data: {
      items,
      currentPage: page,
      totalPages: Math.ceil(count / pageSize),
      totalItems: count,
      pageSize,
    },
    message: "Categories fetched successfully",
  });
};

export const getSubCategoryById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const id: string = req.params.id;

  const subCategory = await db.query.subCategoryTable.findFirst({
    where: and(eq(subCategoryTable.id, id)),
  });

  if (!subCategory) {
    const error = new Error(
      `Subcategory with the id of ${id} was not found`
    ) as AppError;
    error.status = 404;
    return next(error);
  }

  res.status(200).json(subCategory);
};

export const createSubCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const subCategoryId = generateIdFromEntropySize(5);
  const data = req.body;
  data.id = subCategoryId;

  const newSubCategory = await db
    .insert(subCategoryTable)
    .values(data)
    .returning();

  res.json({ success: true, data: newSubCategory, status: 201 });
};

export const updateSubCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const id: string = req.params.id;

  const subCategory = await db.query.subCategoryTable.findFirst({
    where: and(eq(subCategoryTable.id, id)),
  });

  if (!subCategory) {
    const error = new Error(
      `Subcategory with the id of ${id} was not found`
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

  const updatedSubCategory = await db
    .update(subCategoryTable)
    .set({
      ...(data.name && { name: data.name }),
      ...(data.description && { description: data.description }),
      ...(data.categoryId && { categoryId: data.categoryId }),
      updatedAt: new Date(),
    })
    .where(eq(subCategoryTable.id, id))
    .returning();

  res.json({
    success: true,
    data: updatedSubCategory,
    message: "Subcategory updated successfully",
    status: 202,
  });
};

export const deleteSubCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const id: string = req.params.id;

  const subCategory = await db.query.subCategoryTable.findFirst({
    where: and(eq(categoryTable.id, id)),
  });

  if (!subCategory) {
    const error = new Error(
      `Subcategory with the id of ${id} was not found`
    ) as AppError;
    error.status = 404;
    return next(error);
  }

  const deletedSubCategory = await db
    .delete(subCategoryTable)
    .where(eq(subCategoryTable.id, id))
    .returning();

  res.json({
    success: true,
    data: deletedSubCategory,
    message: "Subcategory deleted successfully",
    status: 200,
  });
};
