import express from "express";
import {
  register,
  verifyCode,
  login,
  logout,
  getme,
  verifyEmail,
  verifyCodeAndResetPassword,
} from "@/controllers/authController";
import { authenticateToken } from "@/middleware/authentication";
const router = express.Router();

router.post("/register", register);
router.post("/verify-code", verifyCode);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authenticateToken, getme);
router.post("/verify-email", verifyEmail);
router.post("/reset-password", verifyCodeAndResetPassword);

export default router;
