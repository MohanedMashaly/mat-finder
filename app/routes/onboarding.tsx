import { useState } from "react";
import { Form, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/onboarding";
import { requireAuth } from "~/lib/auth.server";
import { getSupabaseAdmin } from "~/lib/supabase.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Mat Finder - Onboarding" },
    {
      name: "description",
      content: "Complete your practitioner profile to get started.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user, headers } = await requireAuth(request);
  const supabaseAdmin = getSupabaseAdmin();

  // If user already has a profile, skip onboarding
  const { data: existing } = await supabaseAdmin
    .from("bjj_player")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existing) {
    throw redirect("/", { headers });
  }

  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const { user, headers } = await requireAuth(request);
  const supabaseAdmin = getSupabaseAdmin();

  const formData = await request.formData();

  const name = String(formData.get("fullName") ?? "").trim();
  const age = Number(formData.get("age"));
  const belt = String(formData.get("beltRank") ?? "").trim().toLowerCase();
  const stripes = Number(formData.get("stripes"));

  if (!name || !age || !belt) {
    return { error: "Please fill in all required fields." };
  }

  const { data: player, error } = await supabaseAdmin
    .from("bjj_player")
    .insert({
      user_id: user.id,
      name,
      age,
      belt,
      stripes,
    })
    .select("id")
    .single();

  if (error || !player) {
    console.error("bjj_player insert error:", error);
    return { error: error?.message ?? "Failed to create player profile." };
  }

  // Create default open_mat_settings for this player
  const { error: settingsError } = await supabaseAdmin
    .from("open_mat_settings")
    .insert({
      bjj_player_id: player.id,
      is_location_enabled: false,
      include_gi: true,
      roll_with_same_belt: false,
      session_time: new Date().toISOString(),
      roll_place_lat: null,
      roll_place_lng: null,
      gym_id: null,
    });

  if (settingsError) {
    console.error("open_mat_settings insert error:", settingsError);
    // Don't block — settings can be created later
  }

  return redirect("/", { headers });
}

const BELTS = [
  {
    name: "White",
    level: "Fundamental",
    color: "bg-white",
    tipColor: "bg-on-surface",
    stripeSlots: 4,
  },
  {
    name: "Blue",
    level: "Intermediate",
    color: "bg-[#0047AB]",
    tipColor: "bg-on-surface",
    stripeSlots: 3,
  },
  {
    name: "Purple",
    level: "Advanced",
    color: "bg-[#6A0DAD]",
    tipColor: "bg-on-surface",
    stripeSlots: 2,
  },
  {
    name: "Brown",
    level: "Expert",
    color: "bg-[#5C4033]",
    tipColor: "bg-on-surface",
    stripeSlots: 0,
  },
  {
    name: "Black",
    level: "Mastery",
    color: "bg-black",
    tipColor: "bg-tertiary",
    stripeSlots: 0,
  },
] as const;

export default function Onboarding() {
  const [selectedBelt, setSelectedBelt] = useState(0);
  const [selectedStripes, setSelectedStripes] = useState(0);
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <Form method="post">
      {/* Hidden fields to send belt rank and stripes */}
      <input type="hidden" name="beltRank" value={BELTS[selectedBelt].name} />
      <input type="hidden" name="stripes" value={selectedStripes} />

      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-full opacity-5 pointer-events-none">
        <img
          className="w-full h-full object-cover"
          alt="abstract geometric pattern"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtv1Czs4YenJjExGLjRWMS4OveILQn7zMmHkYCwJw7v8wH2dsNAWjfBtdgG_D63dejK2xmk2M9McyvIhlQ2Lhn7dS52W7tFN5-YQ4cEEuORq0Unf0z9-gGDNdnbM_l5spVM861anCPS5xgvD7co4eNJKKF2biynpFcsGfhGnc6J5opeTIBOZhGGBTSpShjOv--E81X4Buh8xUPYdJnw_rQbhFZZsbCxV8hG915iyQTQ86aD_zeK5FINnVqTLuhL6eW919DFKtpzVE"
        />
      </div>

      <div className="z-10 w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-[3.5rem] leading-[1.1] font-extrabold tracking-tighter text-on-surface mb-4">
            PRACTITIONER PROFILE
          </h1>
          <p className="text-on-surface-variant max-w-md mx-auto text-lg">
            Complete your details to calibrate your training experience.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 max-w-2xl mx-auto">
          <div className="space-y-2">
            <label className="text-[0.65rem] font-bold tracking-widest uppercase text-on-surface-variant ml-1">
              Full Name
            </label>
            <input
              name="fullName"
              className="w-full px-4 py-3.5 bg-surface-container-lowest border-2 border-outline-variant/30 rounded-xl focus:border-primary transition-all text-on-surface placeholder:text-outline-variant/60 font-medium"
              placeholder="e.g. Rickson Gracie"
              type="text"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[0.65rem] font-bold tracking-widest uppercase text-on-surface-variant ml-1">
              Age
            </label>
            <input
              name="age"
              className="w-full px-4 py-3.5 bg-surface-container-lowest border-2 border-outline-variant/30 rounded-xl focus:border-primary transition-all text-on-surface placeholder:text-outline-variant/60 font-medium"
              placeholder="25"
              type="number"
              required
              min={1}
            />
          </div>
        </div>
        <div className="flex items-center gap-4 mb-6 max-w-2xl mx-auto">
          <div className="h-px flex-grow bg-outline-variant/30" />
          <h2 className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-on-surface-variant">
            Select Belt Rank
          </h2>
          <div className="h-px flex-grow bg-outline-variant/30" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-8">
          {BELTS.map((belt, index) => {
            const isActive = selectedBelt === index;
            return (
              <button
                key={belt.name}
                type="button"
                onClick={() => {
                  setSelectedBelt(index);
                  setSelectedStripes(0);
                }}
                className={`group relative bg-surface-container-lowest p-6 rounded-xl cursor-pointer transition-all active:scale-95 duration-150 border-2 ${
                  isActive
                    ? "border-primary belt-card-active"
                    : "border-transparent hover:bg-surface-container"
                }`}
              >
                <div className="flex flex-col items-center gap-6">
                  <div className="w-full h-12 flex flex-row border border-outline-variant/30 shadow-sm overflow-hidden rounded-sm">
                    <div className={`h-full w-3/4 ${belt.color}`} />
                    <div
                      className={`h-full w-1/4 ${belt.tipColor} relative`}
                    >
                      {Array.from({ length: belt.stripeSlots }).map((_, i) => (
                        <div
                          key={i}
                          className="absolute inset-y-0 w-0.5 bg-white opacity-20"
                          style={{ left: `${4 + i * 8}px` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-bold tracking-widest uppercase mb-1">
                      {belt.name}
                    </h3>
                    <p className="text-[0.65rem] text-on-surface-variant/70 tracking-widest uppercase">
                      {belt.level}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col items-center mb-16">
          <p className="text-[0.65rem] font-bold tracking-widest uppercase text-on-surface-variant mb-4">
            Number of Stripes
          </p>
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map((stripe) => (
              <button
                key={stripe}
                type="button"
                onClick={() => setSelectedStripes(stripe)}
                className={`w-12 h-12 flex items-center justify-center rounded-xl font-bold transition-all border-2 ${
                  selectedStripes === stripe
                    ? "bg-primary text-on-primary shadow-md shadow-primary/20 border-primary"
                    : "bg-surface-container-lowest text-on-surface border-outline-variant/30 hover:border-primary"
                }`}
              >
                {stripe}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center gap-8">
          {actionData?.error && (
            <p className="text-red-600 text-sm font-medium bg-red-50 px-4 py-2 rounded-lg">
              {actionData.error}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="group relative px-12 py-5 w-full md:w-80 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold text-lg rounded-lg transition-all hover:scale-[1.02] active:scale-95 shadow-lg disabled:opacity-60 disabled:pointer-events-none"
          >
            {isSubmitting ? "Submitting..." : "Roll Now"}
            <span className="absolute right-6 top-1/2 -translate-y-1/2 group-hover:translate-x-1 transition-transform">
              <span className="material-symbols-outlined align-middle">chevron_right</span>
            </span>
          </button>

          <div className="flex items-center gap-6">
            <div className="w-1 h-1 rounded-full bg-outline-variant" />
            <button
              type="button"
              className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors tracking-widest uppercase"
            >
              Rank Requirements
            </button>
          </div>
        </div>
      </div>

    </main>
    </Form>
  );
}
