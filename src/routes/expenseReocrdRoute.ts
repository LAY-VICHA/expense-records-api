import express from "express";
import {
  getExpenseRecord,
  getExpenseRecordById,
  createExpenseRecord,
  handleBulkExpenseRecord,
  updateExpenseRecord,
  deleteExpenseRecord,
} from "@/controllers/expenseRecordController";
import { upload } from "../middleware/upload";
import { authenticateToken } from "@/middleware/authentication";

const router = express.Router();

router.get("/", authenticateToken, getExpenseRecord);
router.get("/:id", authenticateToken, getExpenseRecordById);
router.post("/", authenticateToken, createExpenseRecord);
router.post(
  "/bulk",
  authenticateToken,
  upload.single("file"),
  handleBulkExpenseRecord
);
router.put("/:id", authenticateToken, updateExpenseRecord);
router.delete("/:id", authenticateToken, deleteExpenseRecord);

export default router;
