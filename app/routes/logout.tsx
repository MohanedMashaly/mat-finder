import { redirect } from "react-router";
import type { Route } from "./+types/logout";
import { createSupabaseClient } from "~/lib/supabase.server";

export async function action({ request }: Route.ActionArgs) {
  const { supabase, headers } = createSupabaseClient(request);
  await supabase.auth.signOut();
  return redirect("/login", { headers });
}

// If someone GETs /logout, just redirect to login
export function loader() {
  return redirect("/login");
}
