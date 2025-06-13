import express from "express";
import {
  getDashboardCardData,
  getDashboardBarchart,
  getDashboardPiechart,
} from "@/controllers/dashboardController";
const router = express.Router();

router.get("/", getDashboardCardData);
router.get("/bar-chart", getDashboardBarchart);
router.get("/pie-chart", getDashboardPiechart);

export default router;
