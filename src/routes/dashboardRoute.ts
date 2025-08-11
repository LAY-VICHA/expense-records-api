import express from "express";
import {
  getDashboardCardData,
  getDashboardBarchart,
  getDashboardPiechart,
} from "@/controllers/dashboardController";
import { authenticateToken } from "@/middleware/authentication";
const router = express.Router();

router.get("/", authenticateToken, getDashboardCardData);
router.get("/bar-chart", authenticateToken, getDashboardBarchart);
router.get("/pie-chart", authenticateToken, getDashboardPiechart);

export default router;
