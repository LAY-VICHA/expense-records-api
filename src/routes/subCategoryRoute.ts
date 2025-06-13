import express from "express";
import {
  getSubCategory,
  getSubCategoryById,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
} from "@/controllers/subCategoryController";
const router = express.Router();

router.get("/", getSubCategory);
router.get("/:id", getSubCategoryById);
router.post("/", createSubCategory);
router.put("/:id", updateSubCategory);
router.delete("/:id", deleteSubCategory);

export default router;
