import { Form, NavLink, Outlet, redirect, data, useLoaderData } from "react-router";
import { getUserProfile } from "~/lib/auth.server";
import type { Route } from "./+types/AppLayout";

interface PlayerProfile {
  id: string;
  user_id: string;
  name: string;
  age: number;
  belt: string;
  stripes: number;
  training_years: number | null;
  created_at: string;
}

interface OpenMatSettings {
  id: number;
  is_location_enabled: boolean;
  include_gi: boolean;
  session_time: string;
  roll_place_lat: number | null;
  roll_place_lng: number | null;
  roll_with_same_belt: boolean;
  gym_id: string | null;
  bjj_player_id: string;
  created_at: string;
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user, profile, settings, headers } = await getUserProfile(request);

  // If logged in but no profile yet, send to onboarding
  if (!profile) {
    throw redirect("/onboarding", { headers });
  }

  return data(
    {
      user: { id: user.id, email: user.email },
      profile: profile as PlayerProfile,
      settings: (settings ?? null) as OpenMatSettings | null,
    },
    { headers }
  );
}

const NAV_ITEMS = [
  { to: "/", icon: "map", label: "Map View" },
  { to: "/my-belt", icon: "workspace_premium", label: "My Belt" },
  { to: "/settings", icon: "settings", label: "Settings" },
] as const;

export default function AppLayout() {
  const { profile } = useLoaderData<typeof loader>();

  const beltLabel = profile?.belt
    ? `${profile.belt.charAt(0).toUpperCase() + profile.belt.slice(1)} Belt`
    : "No Belt";
  const stripesLabel = profile?.stripes != null ? `${profile.stripes} Stripes` : "";

  return (
    <div className="bg-surface text-on-surface font-body antialiased">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 p-6 space-y-2 bg-surface-container-lowest shadow-[0_12px_32px_-4px_rgba(25,28,29,0.06)] z-50">
        <div className="text-2xl font-black text-on-surface mb-8">
          Mat Finder
        </div>

        {/* User Profile */}
        <div className="flex items-center space-x-3 mb-10 px-2">
          <div className="w-10 h-10 rounded-xl bg-surface-container-high overflow-hidden flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant">
              person
            </span>
          </div>
          <div>
            <p className="font-headline font-bold text-sm text-on-surface">
              {profile?.name ?? "Practitioner"}
            </p>
            <p className="text-xs text-on-surface-variant opacity-70">
              {beltLabel} {stripesLabel ? `· ${stripesLabel}` : ""}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 transition-all ${
                  isActive
                    ? "text-primary font-bold border-l-4 border-primary bg-surface"
                    : "text-on-surface opacity-70 hover:bg-surface border-l-4 border-transparent"
                }`
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-sm tracking-tight">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <NavLink
          to="/"
          className="w-full bg-gradient-primary text-white py-4 rounded-xl font-bold active:scale-[0.98] transition-transform duration-200 shadow-lg text-center block"
        >
          Post to Map
        </NavLink>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 min-h-screen pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center h-16 px-4 bg-surface-container-lowest/80 backdrop-blur-md border-t border-on-surface/15 z-50">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center ${
                isActive ? "text-primary" : "text-on-surface/60"
              }`
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {item.label.split(" ").pop()}
            </span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
