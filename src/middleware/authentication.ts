import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import config from "@/config/config";

interface userAuthenticated {
  id: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user: userAuthenticated;
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = req.cookies.token;

  if (!token) {
    res.status(401).json({ message: "Access token missing" });
  } else {
    jwt.verify(
      token,
      config.jwtSecretKey,
      (err: jwt.VerifyErrors | null, user: any) => {
        if (err)
          return res.status(401).json({ message: "Invalid or expired token" });
        (req as AuthenticatedRequest).user = {
          id: user.id,
          email: user.email,
        };

        next();
      }
    );
  }
}
