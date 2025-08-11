import express from "express";
import {
  getSubCategory,
  getSubCategoryById,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
} from "@/controllers/subCategoryController";
import { authenticateToken } from "@/middleware/authentication";
const router = express.Router();

router.get("/", authenticateToken, getSubCategory);
router.get("/:id", authenticateToken, getSubCategoryById);
router.post("/", authenticateToken, createSubCategory);
router.put("/:id", authenticateToken, updateSubCategory);
router.delete("/:id", authenticateToken, deleteSubCategory);

export default router;
