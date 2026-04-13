import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getEnv() {
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables"
    );
  }

  return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey };
}

/**
 * Creates a Supabase client bound to the current request/response cookies.
 * Use this in loaders and actions for auth operations and user-scoped queries.
 */
export function createSupabaseClient(request: Request) {
  const { supabaseUrl, supabaseAnonKey } = getEnv();
  const headers = new Headers();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("Cookie") ?? "").map(
          (c) => ({ name: c.name, value: c.value ?? "" })
        );
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          headers.append(
            "Set-Cookie",
            serializeCookieHeader(name, value, options)
          );
        });
      },
    },
  });

  return { supabase, headers };
}

/**
 * Admin client that bypasses RLS. Use for server-side DB operations
 * like inserting/reading bjj_player rows.
 * Lazily initialized on first call so env vars are available at request time.
 */
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = getEnv();

    if (!supabaseServiceRoleKey) {
      console.warn(
        "⚠️  SUPABASE_SERVICE_ROLE_KEY is not set! DB writes will fail if RLS is enabled.\n" +
        "   Get it from Supabase Dashboard → Settings → API → service_role (secret)"
      );
    }

    _supabaseAdmin = supabaseServiceRoleKey
      ? createClient(supabaseUrl, supabaseServiceRoleKey)
      : createClient(supabaseUrl, supabaseAnonKey);
  }

  return _supabaseAdmin;
}
