/**
 * Database layer exports for Supabase/PostgreSQL.
 * This file serves as the central export point for all database utilities.
 */

// Re-export Supabase client utilities
export {
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  getServerSupabaseClient,
} from "./supabase";

// Re-export schema types and tables
export * from "./schema";

// Re-export all query functions and types
export * from "./queries";

// Re-export Supabase types for convenience
export type { SupabaseClient } from "@supabase/supabase-js";
