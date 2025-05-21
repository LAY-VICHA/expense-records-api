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

const router = express.Router();

router.get("/", getExpenseRecord);
router.get("/:id", getExpenseRecordById);
router.post("/", createExpenseRecord);
router.post("/bulk", upload.single("file"), handleBulkExpenseRecord);
router.put("/:id", updateExpenseRecord);
router.delete("/:id", deleteExpenseRecord);

//hello world
export default router;
