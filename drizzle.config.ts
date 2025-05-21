import type { Config } from "drizzle-kit";
import { defineConfig } from "drizzle-kit";
import config from "./src/config/config";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: config.DB_URL!,
  },
  migrations: {
    prefix: "timestamp",
    table: "__drizzle_migrations",
    schema: "public",
  },
}) satisfies Config;
