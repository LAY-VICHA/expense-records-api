import express from "express";
import {
  getCategory,
  getAllCategory,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/controllers/categoryController";
import { authenticateToken } from "@/middleware/authentication";
const router = express.Router();

router.get("/", authenticateToken, getCategory);
router.get("/all", authenticateToken, getAllCategory);
router.get("/:id", authenticateToken, getCategoryById);
router.post("/", authenticateToken, createCategory);
router.put("/:id", authenticateToken, updateCategory);
router.delete("/:id", authenticateToken, deleteCategory);

export default router;
