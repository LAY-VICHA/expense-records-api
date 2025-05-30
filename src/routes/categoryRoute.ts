import express from "express";
import {
  getCategory,
  getAllCategory,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/controllers/categoryController";
const router = express.Router();

router.get("/", getCategory);
router.get("/all", getAllCategory);
router.get("/:id", getCategoryById);
router.post("/", createCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

//hello world
export default router;
