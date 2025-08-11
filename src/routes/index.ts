import express from "express";
import authRoute from "./authRoute";
import categoryRouter from "./categoryRoute";
import subCategoryRoute from "./subCategoryRoute";
import expenseRecordRoute from "./expenseReocrdRoute";
import dashboardRoute from "./dashboardRoute";

const router = express.Router();

router.use("/api/auth", authRoute);
router.use("/api/category", categoryRouter);
router.use("/api/sub-category", subCategoryRoute);
router.use("/api/expense-record", expenseRecordRoute);
router.use("/api/dashboard", dashboardRoute);

export default router;
