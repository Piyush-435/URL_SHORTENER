import { z } from "zod";

const envSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  FRONTEND_URL: z.string().url().trim().min(1),
  GOOGLE_CALLBACK_URL: z.string().url().min(1), // ✅ add this
  GITHUB_CALLBACK_URL: z.string().url().min(1), // ✅ add this too for GitHub
});

export const env = envSchema.parse(process.env);
