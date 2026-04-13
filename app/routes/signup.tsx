import { Form, Link, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/signup";
import { createSupabaseClient } from "~/lib/supabase.server";
import { getUser } from "~/lib/auth.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Mat Finder - Sign Up" },
    { name: "description", content: "Create your Mat Finder account." },
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
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const { supabase, headers } = createSupabaseClient(request);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is required, the session will be null
  if (!data.session) {
    // Auto sign-in since we just created the account
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      return {
        error:
          "Account created but could not sign in automatically. Please check your email for a confirmation link, then log in.",
      };
    }
  }

  // After signup, redirect to onboarding to complete profile
  return redirect("/onboarding", { headers });
}

export default function Signup() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-surface">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold tracking-tighter text-on-surface mb-2">
            Join the Mat
          </h1>
          <p className="text-on-surface-variant">
            Create your account to start rolling.
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
              autoComplete="new-password"
              placeholder="At least 6 characters"
              className="w-full px-4 py-3.5 bg-surface-container-lowest border-2 border-outline-variant/30 rounded-xl focus:border-primary transition-all text-on-surface placeholder:text-outline-variant/60 font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[0.65rem] font-bold tracking-widest uppercase text-on-surface-variant ml-1">
              Confirm Password
            </label>
            <input
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              placeholder="Re-enter password"
              className="w-full px-4 py-3.5 bg-surface-container-lowest border-2 border-outline-variant/30 rounded-xl focus:border-primary transition-all text-on-surface placeholder:text-outline-variant/60 font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-primary text-on-primary font-bold text-lg rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg disabled:opacity-60 disabled:pointer-events-none"
          >
            {isSubmitting ? "Creating Account..." : "Sign Up"}
          </button>
        </Form>

        <p className="text-center mt-8 text-sm text-on-surface-variant">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-primary font-bold hover:underline"
          >
            Log In
          </Link>
        </p>
      </div>
    </main>
  );
}
