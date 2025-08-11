import { db } from "@/db";
import { categoryTable } from "@/db/schema";
import { and, eq, ilike, sql } from "drizzle-orm";
import { Request, Response, NextFunction } from "express";
import { AppError } from "@/middleware/error";
import { generateIdFromEntropySize } from "@/lib/random";
import { AuthenticatedRequest } from "@/middleware/authentication";

export const getCategory = async (
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
      id: categoryTable.id,
      name: categoryTable.name,
      description: categoryTable.description,
      createdAt: categoryTable.createdAt,
      updatedAt: categoryTable.updatedAt,
    })
    .from(categoryTable)
    .where(eq(categoryTable.userId, user.id))
    .orderBy(sql`${categoryTable.createdAt} desc`)
    .$dynamic();

  if (name && name.trim() !== "") {
    sqlQuery = sqlQuery.where(ilike(categoryTable.name, `%${name}%`));
  }

  const [count, items] = await Promise.all([
    db.$count(sqlQuery.as("sq")),
    sqlQuery.limit(pageSize).offset((page - 1) * pageSize),
  ]);

  if (count === 0) {
    const error = new Error(`No categories found`) as AppError;
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
    message: "Categories fetched successfully",
  });
  return;
};

export const getAllCategory = async (
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

  const categories = await db.query.categoryTable.findMany({
    where: eq(categoryTable.userId, user.id),
    with: {
      subCategories: true,
    },
  });

  if (categories.length === 0 || !categories) {
    const error = new Error(`No categories found`) as AppError;
    error.status = 404;
    return next(error);
  }

  res.json({
    data: categories,
    message: "Categories fetched successfully",
    success: true,
  });
  return;
};

export const getCategoryById = async (
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

  const category = await db.query.categoryTable.findFirst({
    where: and(eq(categoryTable.id, id), eq(categoryTable.userId, user.id)),
  });

  if (!category) {
    const error = new Error(
      `Category with the id of ${id} was not found`
    ) as AppError;
    error.status = 404;
    return next(error);
  }

  res.status(200).json(category);
  return;
};

export const createCategory = async (
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

  const categoryId = generateIdFromEntropySize(5);
  const data = req.body;
  data.id = categoryId;
  data.userId = user.id;

  const newCategory = await db.insert(categoryTable).values(data).returning();

  res.json({ success: true, data: newCategory, status: 201 });
  return;
};

export const updateCategory = async (
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

  const category = await db.query.categoryTable.findFirst({
    where: and(eq(categoryTable.id, id)),
  });

  if (!category) {
    const error = new Error(
      `Category with the id of ${id} was not found`
    ) as AppError;
    error.status = 404;
    return next(error);
  }

  if (user.id !== category.userId) {
    const error = new Error(
      "You are not authorized to update this category"
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

  const updatedCategory = await db
    .update(categoryTable)
    .set({
      ...(data.name && { name: data.name }),
      ...(data.description && { description: data.description }),
      updatedAt: new Date(),
    })
    .where(eq(categoryTable.id, id))
    .returning();

  res.json({
    success: true,
    data: updatedCategory,
    message: "Category updated successfully",
    status: 202,
  });
  return;
};

export const deleteCategory = async (
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

  const category = await db.query.categoryTable.findFirst({
    where: and(eq(categoryTable.id, id)),
  });

  if (!category) {
    const error = new Error(
      `Category with the id of ${id} was not found`
    ) as AppError;
    error.status = 404;
    return next(error);
  }

  if (user.id !== category.userId) {
    const error = new Error(
      "You are not authorized to delete this category"
    ) as AppError;
    error.status = 403;
    return next(error);
  }

  const deletedCategory = await db
    .delete(categoryTable)
    .where(eq(categoryTable.id, id))
    .returning();

  res.json({
    success: true,
    data: deletedCategory,
    message: "Category deleted successfully",
    status: 200,
  });
  return;
};
