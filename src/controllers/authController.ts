import config from "@/config/config";
import { db } from "@/db";
import { userTable } from "@/db/schema";
import { generateScryptHash, verifyScryptHash } from "@/lib/crypto";
import { generateIdFromEntropySize } from "@/lib/random";
import { AppError } from "@/middleware/error";
import { and, eq, sql } from "drizzle-orm";
import e, { Request, Response, NextFunction } from "express";
import { Resend } from "resend";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "@/middleware/authentication";

const pendingRegistrations = new Map();
const pendingResetPassword = new Map();
const resend = new Resend(config.resendApiKey);

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password } = req.body;

  const user = await db.query.userTable.findFirst({
    where: and(eq(userTable.email, email)),
  });

  if (user) {
    const error = new Error(
      `User with the email of ${email} already exist`
    ) as AppError;
    error.status = 403;
    return next(error);
  }

  const userId = generateIdFromEntropySize(5);
  const data = { id: userId, email, password };
  const code = generateCode();
  const expiresAt = Date.now() + 5 * 60 * 1000;

  pendingRegistrations.set(email, { data, code, expiresAt });

  const { data: resendData, error } = await resend.emails.send({
    from: "Expense Record Dashboard <onboarding@resend.dev>",
    to: ["layvicha081783923@gmail.com"],
    subject: `Register code for user ${data.email}`,
    html: `<strong>Register code: ${code}</strong>`,
  });

  if (error) {
    const errors = new Error(
      `Cannot send code to email: ${data.email} - ${error.message}`
    ) as AppError;
    errors.status = 404;
    return next(errors);
  }

  res.json({ success: true, data: { email }, status: 200 });
  return;
};

export const verifyCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, code } = req.body;
  const pending = pendingRegistrations.get(email);
  if (!pending) {
    const errors = new Error(`No pending registration found`) as AppError;
    errors.status = 404;
    return next(errors);
  }

  if (pending.code !== code) {
    const errors = new Error(`Invalid verification code`) as AppError;
    errors.status = 404;
    return next(errors);
  }
  if (Date.now() > pending.expiresAt) {
    const errors = new Error(`Verification code expired`) as AppError;
    errors.status = 404;
    return next(errors);
  }

  pending.data.password = await generateScryptHash(pending.data.password);
  const newUser = await db.insert(userTable).values(pending.data).returning();
  pendingRegistrations.delete(email);

  res.json({ success: true, data: newUser, status: 201 });
  return;
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: "Email and password required" });
    return;
  }

  const user = await db.query.userTable.findFirst({
    where: eq(userTable.email, email),
  });

  if (!user) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  } else {
    const passwordMatch = await verifyScryptHash(password, user.password);
    if (!passwordMatch) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const id = user.id;
    const token = jwt.sign({ email, id }, config.jwtSecretKey, {
      expiresIn: "100m",
    });

    res
      .cookie("token", token, {
        httpOnly: true,
        secure: config.nodeEnv === "production",
        sameSite: "strict",
        maxAge: 100 * 60 * 1000,
      })
      .json({ message: "Login successful", status: 200 });
    return;
  }
};

export const logout = (req: Request, res: Response, next: NextFunction) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "strict",
  });

  res.status(200).json({ message: "Logged out successfully" });
  return;
};

export const getme = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { user } = req as AuthenticatedRequest;

  if (!user?.id) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const userInformation = await db.query.userTable.findFirst({
    where: eq(userTable.email, user.email),
  });

  if (!userInformation) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const username = user?.email.split("@")[0];

  res.json({
    user: {
      id: user?.id,
      email: user?.email,
      name: username,
    },
  });
  return;
};

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body;

  const user = await db.query.userTable.findFirst({
    where: and(eq(userTable.email, email)),
  });

  if (!user) {
    const error = new Error(
      `User with the email of ${email} does not exist`
    ) as AppError;
    error.status = 404;
    return next(error);
  }

  const data = { email };
  const code = generateCode();
  const expiresAt = Date.now() + 5 * 60 * 1000;

  pendingResetPassword.set(email, { data, code, expiresAt });

  const { data: resendData, error } = await resend.emails.send({
    from: "Expense Record Dashboard <onboarding@resend.dev>",
    to: ["layvicha081783923@gmail.com"],
    subject: `Reset Password code for user ${data.email}`,
    html: `<strong>Reset Password code: ${code}</strong>`,
  });

  if (error) {
    const errors = new Error(
      `Cannot send code to email: ${data.email} - ${error.message}`
    ) as AppError;
    errors.status = 404;
    return next(errors);
  }

  res.json({ success: true, data: { email }, status: 200 });
  return;
};

export const verifyCodeAndResetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, code, password } = req.body;
  const pending = pendingResetPassword.get(email);
  if (!pending) {
    const errors = new Error(
      `No pending reset password request found`
    ) as AppError;
    errors.status = 404;
    return next(errors);
  }

  if (pending.code !== code) {
    const errors = new Error(`Invalid verification code`) as AppError;
    errors.status = 404;
    return next(errors);
  }
  if (Date.now() > pending.expiresAt) {
    const errors = new Error(`Verification code expired`) as AppError;
    errors.status = 404;
    return next(errors);
  }

  const hashPassword = await generateScryptHash(password);
  await db
    .update(userTable)
    .set({
      ...(hashPassword && { password: hashPassword }),

      updatedAt: new Date(),
    })
    .where(eq(userTable.email, email));
  pendingResetPassword.delete(email);

  res.json({ success: true, status: 201 });
  return;
};
