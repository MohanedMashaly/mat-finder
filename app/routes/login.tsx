import { Form, Link, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/login";
import { createSupabaseClient } from "~/lib/supabase.server";
import { getUser } from "~/lib/auth.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Mat Finder - Log In" },
    { name: "description", content: "Log in to your Mat Finder account." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await getUser(request);
  if (user) {
    throw redirect("/");
  }
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const { supabase, headers } = createSupabaseClient(request);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return redirect("/", { headers });
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-surface">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold tracking-tighter text-on-surface mb-2">
            Welcome Back
          </h1>
          <p className="text-on-surface-variant">
            Log in to find your next roll.
          </p>
        </div>

        <Form method="post" className="space-y-6">
          {actionData?.error && (
            <div className="bg-error-container/30 text-on-error-container px-4 py-3 rounded-xl text-sm font-medium">
              {actionData.error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[0.65rem] font-bold tracking-widest uppercase text-on-surface-variant ml-1">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full px-4 py-3.5 bg-surface-container-lowest border-2 border-outline-variant/30 rounded-xl focus:border-primary transition-all text-on-surface placeholder:text-outline-variant/60 font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[0.65rem] font-bold tracking-widest uppercase text-on-surface-variant ml-1">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Your password"
              className="w-full px-4 py-3.5 bg-surface-container-lowest border-2 border-outline-variant/30 rounded-xl focus:border-primary transition-all text-on-surface placeholder:text-outline-variant/60 font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-primary text-on-primary font-bold text-lg rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg disabled:opacity-60 disabled:pointer-events-none"
          >
            {isSubmitting ? "Logging In..." : "Log In"}
          </button>
        </Form>

        <p className="text-center mt-8 text-sm text-on-surface-variant">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-primary font-bold hover:underline"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </main>
  );
}
