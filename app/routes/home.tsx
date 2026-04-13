import { useState, useRef, useEffect, lazy, Suspense } from "react";
import {
  data,
  useLoaderData,
  useRouteLoaderData,
  useActionData,
  useNavigation,
  useSubmit,
} from "react-router";
import type { Route } from "./+types/home";
import { requireAuth } from "~/lib/auth.server";
import { getSupabaseAdmin } from "~/lib/supabase.server";

const GymMapView = lazy(() => import("~/components/GymMapView"));

interface Gym {
  id: string;
  name: string;
  lat: number;
  lang: number;
}

interface ActiveSession {
  id: number;
  session_time: string;
  gym: { id: string; name: string; lat: number; lang: number };
  player: { name: string; belt: string; stripes: number };
}

interface GymPin {
  id: string;
  name: string;
  lat: number;
  lang: number;
  members: { name: string; belt: string; stripes: number }[];
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Mat Finder - Map View" },
    { name: "description", content: "Find nearby rolling partners." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAuth(request);
  const supabaseAdmin = getSupabaseAdmin();

  const { data: gyms, error } = await supabaseAdmin
    .from("gym")
    .select("id, name, lat, lang")
    .order("name");

  if (error) {
    console.error("Failed to load gyms:", error.message);
  }

  // Fetch active sessions (session_time in the future + location enabled + has gym)
  const { data: activeSessions } = await supabaseAdmin
    .from("open_mat_settings")
    .select(
      "id, session_time, gym:gym_id(id, name, lat, lang), player:bjj_player_id(name, belt, stripes)"
    )
    .eq("is_location_enabled", true)
    .not("gym_id", "is", null)
    .gt("session_time", new Date().toISOString());

  // Group active sessions by gym
  const gymPinMap = new Map<string, GymPin>();
  for (const session of (activeSessions ?? []) as unknown as ActiveSession[]) {
    if (!session.gym || !session.player) continue;
    const gymId = session.gym.id;
    if (!gymPinMap.has(gymId)) {
      gymPinMap.set(gymId, {
        id: gymId,
        name: session.gym.name,
        lat: session.gym.lat,
        lang: session.gym.lang,
        members: [],
      });
    }
    gymPinMap.get(gymId)!.members.push(session.player);
  }
  const gymPins: GymPin[] = Array.from(gymPinMap.values());

  return data({ gyms: (gyms ?? []) as Gym[], gymPins }, { headers });
}

export async function action({ request }: Route.ActionArgs) {
  const { user, headers } = await requireAuth(request);
  const supabaseAdmin = getSupabaseAdmin();
  const formData = await request.formData();

  const { data: player } = await supabaseAdmin
    .from("bjj_player")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!player) return data({ error: "No player profile." }, { headers });

  const sessionMinutes = Number(formData.get("session_minutes") ?? 60);
  const gymId = formData.get("gym_id") ? String(formData.get("gym_id")) : null;
  const gymName = formData.get("gym_name") ? String(formData.get("gym_name")) : null;
  const lat = formData.get("lat") ? Number(formData.get("lat")) : null;
  const lng = formData.get("lng") ? Number(formData.get("lng")) : null;

  if (!gymId || lat == null || lng == null) {
    return data({ error: "Please select a gym from the map first." }, { headers });
  }

  const sessionTime = new Date(
    Date.now() + sessionMinutes * 60 * 1000
  ).toISOString();

  const { error } = await supabaseAdmin
    .from("open_mat_settings")
    .update({
      session_time: sessionTime,
      is_location_enabled: true,
      gym_id: gymId,
      roll_place_lat: lat,
      roll_place_lng: lng,
    })
    .eq("bjj_player_id", player.id);

  if (error) {
    console.error("Post to map error:", error);
    return data({ error: error.message }, { headers });
  }

  return data(
    {
      success: true,
      gymId,
      gymName,
      lat,
      lng,
      sessionMinutes,
    },
    { headers }
  );
}

const DURATIONS = [60, 90, 120] as const;

const BELT_DISPLAY_COLORS: Record<string, string> = {
  white: "#e0e0e0",
  blue: "#0047AB",
  purple: "#6a1b9a",
  brown: "#5C4033",
  black: "#191c1d",
};

export default function Home() {
  const { gyms, gymPins } = useLoaderData<typeof loader>();
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const layoutData = useRouteLoaderData("components/AppLayout") as
    | {
        profile: { name: string; belt: string; stripes: number };
        settings: {
          is_location_enabled: boolean;
          include_gi: boolean;
          gym_id: string | null;
          roll_place_lat: number | null;
          roll_place_lng: number | null;
        } | null;
      }
    | undefined;

  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isPosting = navigation.state === "submitting";

  const profile = layoutData?.profile;
  const settings = layoutData?.settings;
  const belt = profile?.belt ?? "white";
  const stripes = profile?.stripes ?? 0;
  const beltColor = BELT_DISPLAY_COLORS[belt] ?? "#e0e0e0";
  const beltInitial = belt.charAt(0).toUpperCase();
  const includeGi = settings?.include_gi ?? true;

  const actionSuccess =
    actionData && "success" in actionData ? actionData : null;
  const actionError =
    actionData && "error" in actionData ? actionData.error : null;

  // Resolve the active gym: user selection > saved setting
  const displayGym: Gym | null =
    selectedGym ?? gyms.find((g) => g.id === settings?.gym_id) ?? null;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredGyms = gyms.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleSelectGym(gym: Gym) {
    setSelectedGym(gym);
    setDropdownOpen(false);
    setSearch("");
  }

  function handlePostToMap() {
    if (!displayGym) return;
    const fd = new FormData();
    fd.set("session_minutes", String(selectedDuration));
    fd.set("gym_id", displayGym.id);
    fd.set("lat", String(displayGym.lat));
    fd.set("lng", String(displayGym.lang));
    fd.set("gym_name", displayGym.name);
    submit(fd, { method: "post" });
  }

  return (
    <>
      {/* Top Bar */}
      <header className="w-full sticky top-0 z-40 bg-surface flex justify-between items-center px-6 py-4">
        <h1 className="font-semibold text-lg tracking-tight text-on-surface">
          Confirm Roll
        </h1>
        <div className="flex items-center space-x-4">
          <span className="material-symbols-outlined text-on-surface opacity-60">
            notifications
          </span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 md:p-12">
        {/* Large Headline */}
        <div className="mb-12">
          <h2 className="text-5xl md:text-7xl font-headline font-black tracking-tighter text-on-surface mb-2">
            Ready to Roll?
          </h2>
          <p className="text-on-surface-variant max-w-md">
            Verify your session details before broadcasting your location to the
            community.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Map + Gym Selector Section (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Map with Gym Selector Overlay */}
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm aspect-video relative">
              <img
                className="w-full h-full object-cover grayscale opacity-80"
                alt="minimalistic clean map view with a location pin"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDfyIZ2LCgS-p_duyYEL3RqJ62NDC5Amd7MCplwaUNl9DZ9Prhu7z-af7FlofoI4c-SmC1XKhHoYTY1JMlm8Q-qLsJwxN58T9BOCZH3fdHurvRq6rAKDq2V_2qHKz9TYy806wupDVqmiXUk3n4b1TotUwnVdAuCLSgmDsJWXpDQKYrj1dUxPGKM1Ie84jJbeTG97e7oHceT99fghkTHhhU4gVm1OKZ4Bq0ziVOJ2KKNyuA73uzQrCbEDo7IvpBQilnCISDKR-StvkE"
              />
              <div className="absolute inset-0 bg-primary/5" />

              {/* Location Selection Overlay */}
              <div
                ref={dropdownRef}
                className="absolute bottom-6 left-6 right-6 p-1 bg-surface/90 backdrop-blur-md rounded-2xl flex flex-col border border-outline-variant/15 shadow-2xl"
              >
                {/* Current Gym Display / Toggle */}
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container-low transition-colors rounded-xl w-full text-left"
                >
                  <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-1">
                      Current Gym
                    </p>
                    <div className="flex items-center space-x-2">
                      <p className="font-black text-lg">
                        {displayGym?.name ?? "Select a gym"}
                      </p>
                      <span className="material-symbols-outlined text-xs opacity-40">
                        expand_more
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-primary scale-125">
                    my_location
                  </span>
                </button>

                {/* Searchable Dropdown */}
                {dropdownOpen && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-2xl border border-outline-variant/20 overflow-hidden z-50">
                    {/* Search Input */}
                    <div className="p-3 border-b border-outline-variant/10">
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3 text-on-surface-variant/60 text-lg">
                          search
                        </span>
                        <input
                          className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 rounded-lg text-sm font-medium outline-none"
                          placeholder="Search academies..."
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Gym List */}
                    <div className="max-h-48 overflow-y-auto">
                      {filteredGyms.length === 0 && (
                        <div className="px-5 py-4 text-sm text-on-surface-variant text-center">
                          No gyms found
                        </div>
                      )}
                      {filteredGyms.map((gym, i) => {
                        const isSelected = gym.id === displayGym?.id;
                        return (
                          <button
                            key={gym.id}
                            type="button"
                            onClick={() => handleSelectGym(gym)}
                            className={`w-full text-left px-5 py-3 hover:bg-primary/5 flex items-center justify-between group/item ${
                              i > 0
                                ? "border-t border-outline-variant/5"
                                : ""
                            }`}
                          >
                            <div>
                              <p className="font-bold text-sm">{gym.name}</p>
                            </div>
                            <span
                              className={`material-symbols-outlined text-primary transition-opacity ${
                                isSelected
                                  ? "opacity-100"
                                  : "opacity-0 group-hover/item:opacity-40"
                              }`}
                            >
                              {isSelected ? "check_circle" : "circle"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Engagement Window */}
            <div className="flex flex-col space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant opacity-60">
                Engagement Window
              </label>
              <div className="grid grid-cols-3 gap-4">
                {DURATIONS.map((duration) => (
                  <button
                    key={duration}
                    type="button"
                    onClick={() => setSelectedDuration(duration)}
                    className={`py-4 rounded-xl font-bold flex flex-col items-center justify-center transition-all ${
                      selectedDuration === duration
                        ? "bg-surface-container-lowest border-2 border-primary text-primary"
                        : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest border-2 border-transparent"
                    }`}
                  >
                    <span className="text-xl">{duration}</span>
                    <span className="text-[10px] uppercase tracking-tighter">
                      Minutes
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Selection Panel (5 cols) */}
          <div className="lg:col-span-5 space-y-8">
            {/* Rank Selection Card */}
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/10">
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant opacity-60 mb-6">
                Verified Rank
              </p>
              <div className="flex items-center space-x-6 mb-8">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-dashed border-primary/20" />
                  <div
                    className="w-16 h-16 rounded-lg shadow-xl flex items-center justify-center transform rotate-12"
                    style={{ backgroundColor: beltColor }}
                  >
                    <div className="w-full h-4 bg-black/30 absolute top-2" />
                    <span className="text-white font-black text-2xl">
                      {beltInitial}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black capitalize">
                    {belt} Belt
                  </h3>
                  <p className="text-on-surface-variant">
                    {stripes} Stripe{stripes !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-surface rounded-lg">
                  <span className="text-sm font-medium">Include Gi Status</span>
                  <div
                    className={`w-10 h-6 rounded-full relative ${
                      includeGi ? "bg-primary" : "bg-outline-variant"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full ${
                        includeGi ? "right-1" : "left-1"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button Section */}
            <div className="space-y-4">
              {/* Feedback */}
              {actionSuccess && (
                <div className="bg-primary/10 text-primary px-4 py-3 rounded-xl text-sm font-bold text-center">
                  ✅ You're on the map
                  {actionSuccess.gymName
                    ? ` at ${actionSuccess.gymName}`
                    : ""}
                  ! Session expires in {actionSuccess.sessionMinutes} min.
                </div>
              )}
              {actionError && (
                <div className="bg-error-container/30 text-on-error-container px-4 py-3 rounded-xl text-sm font-medium text-center">
                  {actionError}
                </div>
              )}

              <button
                type="button"
                onClick={handlePostToMap}
                disabled={isPosting || !displayGym}
                className="w-full bg-gradient-primary text-white py-6 rounded-xl font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-3 disabled:opacity-60 disabled:pointer-events-none"
              >
                <span className="material-symbols-outlined">sensors</span>
                <span>{isPosting ? "Posting..." : "Post to Map"}</span>
              </button>

              {!displayGym && (
                <p className="text-center text-xs text-on-surface-variant opacity-60">
                  Select a gym from the map above to continue
                </p>
              )}
            </div>

            {/* Info Hint */}
            <div className="p-6 bg-primary/5 rounded-xl flex items-start space-x-4">
              <span className="material-symbols-outlined text-primary">
                info
              </span>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Posting to the map will notify practitioners within a 15km
                radius of your selected gym. Your session will automatically
                expire after the selected window.
              </p>
            </div>
          </div>
        </div>

        {/* Active Sessions 3D Map */}
        <div className="mt-12">
          <div className="mb-6">
            <h3 className="text-2xl md:text-3xl font-black tracking-tight text-on-surface">
              Live on the Mat
            </h3>
            <p className="text-sm text-on-surface-variant mt-1">
              Practitioners currently broadcasting their sessions
            </p>
          </div>
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64 text-on-surface-variant/40 text-sm">
                Loading map…
              </div>
            }
          >
            <GymMapView
              gymPins={gymPins}
              highlightGymId={
                actionSuccess?.gymId ?? displayGym?.id ?? null
              }
            />
          </Suspense>
        </div>
      </div>
    </>
  );
}
