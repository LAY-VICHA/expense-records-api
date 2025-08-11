import { db } from "@/db";
import { categoryTable, subCategoryTable } from "@/db/schema";
import { and, eq, ilike, sql } from "drizzle-orm";
import { Request, Response, NextFunction } from "express";
import { AppError } from "@/middleware/error";
import { generateIdFromEntropySize } from "@/lib/random";
import { AuthenticatedRequest } from "@/middleware/authentication";

export const getSubCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { user } = req as AuthenticatedRequest;
  const page: number = Number(req.query.page) ?? 1;
  const pageSize: number = Number(req.query.pageSize) ?? 10;
  const name: string = req.query.name as string;

  if (!user.id) {
    const error = new Error("User is not authenticated") as AppError;
    error.status = 401;
    return next(error);
  }

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
    .where(eq(subCategoryTable.userId, user.id))
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

  if (count === 0) {
    const error = new Error(`No subcategories found`) as AppError;
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
    message: "Subcategories fetched successfully",
  });
  return;
};

export const getSubCategoryById = async (
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

  const subCategory = await db.query.subCategoryTable.findFirst({
    where: and(
      eq(subCategoryTable.id, id),
      eq(subCategoryTable.userId, user.id)
    ),
  });

  if (!subCategory) {
    const error = new Error(
      `Subcategory with the id of ${id} was not found`
    ) as AppError;
    error.status = 404;
    return next(error);
  }

  res.status(200).json(subCategory);
  return;
};

export const createSubCategory = async (
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

  const subCategoryId = generateIdFromEntropySize(5);
  const data = req.body;
  data.id = subCategoryId;
  data.userId = user.id;

  const newSubCategory = await db
    .insert(subCategoryTable)
    .values(data)
    .returning();

  res.json({ success: true, data: newSubCategory, status: 201 });
  return;
};

export const updateSubCategory = async (
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

  if (user.id !== subCategory.userId) {
    const error = new Error(
      "You are not authorized to update this subcategory"
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
  return;
};

export const deleteSubCategory = async (
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

  if (user.id !== subCategory.userId) {
    const error = new Error(
      "You are not authorized to delete this subcategory"
    ) as AppError;
    error.status = 403;
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
  return;
};
