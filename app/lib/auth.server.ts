import { redirect } from "react-router";
import { createSupabaseClient, getSupabaseAdmin } from "./supabase.server";

/**
 * Get the current authenticated user from the request cookies.
 * Returns null if not logged in.
 */
export async function getUser(request: Request) {
  const { supabase, headers } = createSupabaseClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user, supabase, headers };
}

/**
 * Require authentication. Redirects to /login if no session.
 * Returns the user, the cookie-bound supabase client, the admin client, and headers.
 */
export async function requireAuth(request: Request) {
  const { user, supabase, headers } = await getUser(request);

  if (!user) {
    throw redirect("/login", { headers });
  }

  return { user, supabase, headers };
}

/**
 * Fetch the bjj_player profile and open_mat_settings for the authenticated user.
 * Uses the admin client to bypass RLS.
 */
export async function getUserProfile(request: Request) {
  const { user, supabase, headers } = await requireAuth(request);
  const supabaseAdmin = getSupabaseAdmin();

  const { data: profile } = await supabaseAdmin
    .from("bjj_player")
    .select("*")
    .eq("user_id", user.id)
    .single();

  let settings = null;
  if (profile) {
    const { data } = await supabaseAdmin
      .from("open_mat_settings")
      .select("*")
      .eq("bjj_player_id", profile.id)
      .single();
    settings = data;
  }

  return { user, profile, settings, supabase, headers };
}
