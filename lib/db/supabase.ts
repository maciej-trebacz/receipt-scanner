import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function validateEnvVars() {
  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
  }
  if (!supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable"
    );
  }
}

function validateServiceRoleKey() {
  validateEnvVars();
  if (!supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  }
}

/**
 * Creates a Supabase client for use in browser/client components.
 * This client is suitable for React components and hooks.
 */
export function createBrowserSupabaseClient() {
  validateEnvVars();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Creates a Supabase client for use in server-side code (API routes, Server Components).
 * This client bypasses the browser cookie handling since it runs on the server.
 */
export function createServerSupabaseClient() {
  validateEnvVars();
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Singleton server client for use in API routes and server actions.
 * Use this when you don't need request-specific context.
 */
let serverClient: ReturnType<typeof createServerSupabaseClient> | null = null;

export function getServerSupabaseClient() {
  if (!serverClient) {
    serverClient = createServerSupabaseClient();
  }
  return serverClient;
}

/**
 * Creates a Supabase client with service role key for admin operations.
 * Required for operations like creating signed upload URLs.
 * Only use server-side - never expose service role key to client.
 */
export function createServiceRoleClient() {
  validateServiceRoleKey();
  return createClient(supabaseUrl, supabaseServiceRoleKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export type { SupabaseClient } from "@supabase/supabase-js";
