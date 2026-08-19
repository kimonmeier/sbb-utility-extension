import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./src/background/db/migrations",
  schema: "./src/background/db/schema.ts",
  dialect: "sqlite",

  verbose: true,
  strict: true,
});
