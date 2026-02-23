import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle/migration",
  schema: "./drizzle/schema.js",
  dialect: "mysql",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
});