import { createClient } from '@supabase/supabase-js';
import { PostgresJsDatabase, drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Create Supabase client using environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing required Supabase environment variables');
}

// Export Supabase client for direct API access
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY);

// We're using only Supabase for database operations through the client
console.log("Supabase URL:", SUPABASE_URL);
console.log("Supabase Anon Key (first 5 chars):", SUPABASE_ANON_KEY.substring(0, 5) + "...");

// The db instance is no longer used, as we're using Supabase client API instead
// This is just a placeholder to keep compatibility with existing imports
export const db = {} as PostgresJsDatabase<typeof schema>;