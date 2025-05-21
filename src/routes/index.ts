import express from "express";
import categoryRouter from "./categoryRoute";
import subCategoryRoute from "./subCategoryRoute";
import expenseRecordRoute from "./expenseReocrdRoute";

const router = express.Router();

router.use("/api/category", categoryRouter);
router.use("/api/sub-category", subCategoryRoute);
router.use("/api/expense-record", expenseRecordRoute);
// router.use('/item', require('./item'));

export default router;
