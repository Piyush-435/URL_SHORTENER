import { Google } from "arctic";
import { env } from "../../config/env.js";

export const google = new Google(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_CALLBACK_URL // We will create this route to verify after login
);