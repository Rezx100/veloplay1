import { PostgresJsDatabase, drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Use Neon PostgreSQL database
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('Missing required DATABASE_URL environment variable');
}

// Create Neon PostgreSQL connection
const sql = postgres(DATABASE_URL);
export const db = drizzle(sql, { schema });

console.log("Neon Database connected successfully");
console.log("Database URL:", DATABASE_URL.substring(0, 30) + "...");