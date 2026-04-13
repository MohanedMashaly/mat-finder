import { useState, useEffect } from "react";
import {
  data,
  Form,
  useLoaderData,
  useRouteLoaderData,
  useActionData,
  useNavigation,
  useSubmit,
} from "react-router";
import type { Route } from "./+types/settings";
import { requireAuth } from "~/lib/auth.server";
import { getSupabaseAdmin } from "~/lib/supabase.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Mat Finder - Settings" },
    { name: "description", content: "Manage your open mat settings." },
  ];
}

interface GymRow {
  id: string;
  name: string;
}

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAuth(request);
  const supabaseAdmin = getSupabaseAdmin();

  const { data: gyms } = await supabaseAdmin
    .from("gym")
    .select("id, name")
    .order("name");

  return data({ gyms: (gyms ?? []) as GymRow[] }, { headers });
}

export async function action({ request }: Route.ActionArgs) {
  const { user, headers } = await requireAuth(request);
  const supabaseAdmin = getSupabaseAdmin();
  const formData = await request.formData();
  const intent = formData.get("intent");

  // Look up the player's id
  const { data: player } = await supabaseAdmin
    .from("bjj_player")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!player) {
    return data({ error: "Player profile not found." }, { headers });
  }

  if (intent === "update-settings") {
    const includeGi = formData.get("include_gi") === "true";
    const rollWithSameBelt = formData.get("roll_with_same_belt") === "true";
    const gymId = formData.get("gym_id") || null;

    const updateData: Record<string, unknown> = {
      include_gi: includeGi,
      roll_with_same_belt: rollWithSameBelt,
    };

    if (gymId) {
      // Look up gym lat/lng
      const { data: gym } = await supabaseAdmin
        .from("gym")
        .select("lat, lang")
        .eq("id", gymId)
        .single();

      if (gym) {
        updateData.gym_id = gymId;
        updateData.roll_place_lat = gym.lat;
        updateData.roll_place_lng = gym.lang;
        updateData.is_location_enabled = true;
      }
    }

    const { error } = await supabaseAdmin
      .from("open_mat_settings")
      .update(updateData)
      .eq("bjj_player_id", player.id)
      .select();

    if (error) {
      console.error("Settings update error:", error);
      return data({ error: error.message }, { headers });
    }

    return data({ success: true }, { headers });
  }

  return data({ error: "Unknown action." }, { headers });
}

export default function Settings() {
  const { gyms } = useLoaderData<typeof loader>();

  const layoutData = useRouteLoaderData("components/AppLayout") as {
    settings: {
      id: number;
      is_location_enabled: boolean;
      include_gi: boolean;
      roll_with_same_belt: boolean;
      gym_id: string | null;
    } | null;
  } | undefined;

  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isSaving = navigation.state === "submitting";

  const s = layoutData?.settings;

  const [selectedGymId, setSelectedGymId] = useState<string | null>(
    s?.gym_id ?? null
  );
  const [includeGi, setIncludeGi] = useState(s?.include_gi ?? true);
  const [rollWithSameBelt, setRollWithSameBelt] = useState(
    s?.roll_with_same_belt ?? false
  );

  // Sync from server data when layout reloads
  useEffect(() => {
    if (s) {
      setSelectedGymId(s.gym_id);
      setIncludeGi(s.include_gi);
      setRollWithSameBelt(s.roll_with_same_belt);
    }
  }, [s]);

  const selectedGym = gyms.find((g) => g.id === selectedGymId) ?? null;

  function handleSave() {
    const formData = new FormData();
    formData.set("intent", "update-settings");
    formData.set("include_gi", String(includeGi));
    formData.set("roll_with_same_belt", String(rollWithSameBelt));
    if (selectedGymId) formData.set("gym_id", selectedGymId);
    submit(formData, { method: "post" });
  }

  return (
    <>
      <header className="w-full sticky top-0 z-40 bg-surface flex justify-between items-center px-6 py-4">
        <h1 className="font-semibold text-lg tracking-tight text-on-surface">
          Settings
        </h1>
      </header>

      <div className="max-w-2xl mx-auto p-6 md:p-12 space-y-8">
        {/* Success / Error */}
        {actionData && "success" in actionData && (
          <div className="bg-primary/10 text-primary px-4 py-3 rounded-xl text-sm font-medium">
            Settings saved successfully.
          </div>
        )}
        {actionData && "error" in actionData && actionData.error && (
          <div className="bg-error-container/30 text-on-error-container px-4 py-3 rounded-xl text-sm font-medium">
            {actionData.error}
          </div>
        )}

        {/* Default Gym Section */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant opacity-60">
            Default Gym
          </h2>
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 divide-y divide-outline-variant/10">
            {gyms.map((gym) => (
              <button
                key={gym.id}
                type="button"
                onClick={() => setSelectedGymId(gym.id)}
                className={`w-full flex items-center justify-between p-5 transition-colors ${
                  gym.id === selectedGymId
                    ? "bg-primary/5"
                    : "hover:bg-surface-container-high/30"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span
                    className={`material-symbols-outlined ${
                      gym.id === selectedGymId
                        ? "text-primary"
                        : "text-on-surface-variant"
                    }`}
                  >
                    fitness_center
                  </span>
                  <div className="text-left">
                    <span className="text-sm font-medium block">{gym.name}</span>
                  </div>
                </div>
                {gym.id === selectedGymId && (
                  <span className="material-symbols-outlined text-primary">
                    check_circle
                  </span>
                )}
              </button>
            ))}
            {gyms.length === 0 && (
              <div className="p-5 text-center text-on-surface-variant opacity-60 text-sm">
                No gyms available yet.
              </div>
            )}
          </div>
        </section>

        {/* Roll Preferences */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant opacity-60">
            Roll Preferences
          </h2>
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 divide-y divide-outline-variant/10">
            <div className="flex justify-between items-center p-5">
              <div className="flex items-center space-x-3">
                <span className="material-symbols-outlined text-on-surface-variant">
                  checkroom
                </span>
                <div>
                  <span className="text-sm font-medium block">Include Gi</span>
                  <span className="text-xs text-on-surface-variant opacity-60">
                    Show that you're training with a Gi
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIncludeGi(!includeGi)}
                className={`w-10 h-6 rounded-full relative transition-colors ${
                  includeGi ? "bg-primary" : "bg-outline-variant"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                    includeGi ? "right-1" : "left-1"
                  }`}
                />
              </button>
            </div>
            <div className="flex justify-between items-center p-5">
              <div className="flex items-center space-x-3">
                <span className="material-symbols-outlined text-on-surface-variant">
                  workspace_premium
                </span>
                <div>
                  <span className="text-sm font-medium block">
                    Roll with Same Belt
                  </span>
                  <span className="text-xs text-on-surface-variant opacity-60">
                    Only match with practitioners of your rank
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRollWithSameBelt(!rollWithSameBelt)}
                className={`w-10 h-6 rounded-full relative transition-colors ${
                  rollWithSameBelt ? "bg-primary" : "bg-outline-variant"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                    rollWithSameBelt ? "right-1" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-4 bg-gradient-primary text-on-primary font-bold text-lg rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg disabled:opacity-60 disabled:pointer-events-none"
        >
          {isSaving ? "Saving..." : "Save Settings"}
        </button>

        {/* Sign Out */}
        <Form method="post" action="/logout">
          <button
            type="submit"
            className="w-full py-4 text-error font-bold hover:bg-error-container/30 rounded-xl transition-colors"
          >
            Sign Out
          </button>
        </Form>
      </div>
    </>
  );
}