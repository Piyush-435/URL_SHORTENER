import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
console.log("CURRENT DB:", process.env.DATABASE_URL);
const pool = mysql.createPool(process.env.DATABASE_URL);

export const db = drizzle(pool);
