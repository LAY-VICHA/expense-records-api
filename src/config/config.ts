import dotenv from "dotenv";

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  DB_URL: string;
  highExpenseThreshold: string;
  resendApiKey: string;
  jwtSecretKey: string;
}

const config: Config = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || "development",
  DB_URL: process.env.DB_URL || "",
  highExpenseThreshold: process.env.HIGH_EXPENSE_THRESHOLD || "500",
  resendApiKey: process.env.RESEND_API_KEY || "",
  jwtSecretKey: process.env.JWT_SECRET_KEY || "",
};

export default config;
