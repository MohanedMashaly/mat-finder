import type { Route } from "./+types/my-belt";
import { useRouteLoaderData } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Mat Finder - My Belt" },
    { name: "description", content: "View your current belt rank and progress." },
  ];
}

const BELT_COLORS: Record<string, string> = {
  white: "bg-white",
  blue: "bg-[#0047AB]",
  purple: "bg-[#6A0DAD]",
  brown: "bg-[#5C4033]",
  black: "bg-black",
};

const BELT_INITIALS: Record<string, string> = {
  white: "W",
  blue: "B",
  purple: "P",
  brown: "Br",
  black: "Bk",
};

export default function MyBelt() {
  const layoutData = useRouteLoaderData("components/AppLayout") as {
    profile: { name: string; belt: string; stripes: number; training_years: number | null };
  } | undefined;

  const profile = layoutData?.profile;
  const belt = profile?.belt ?? "white";
  const stripes = profile?.stripes ?? 0;
  const name = profile?.name ?? "Practitioner";
  const trainingYears = profile?.training_years;

  return (
    <>
      <header className="w-full sticky top-0 z-40 bg-surface flex justify-between items-center px-6 py-4">
        <h1 className="font-semibold text-lg tracking-tight text-on-surface">
          My Belt
        </h1>
      </header>

      <div className="max-w-2xl mx-auto p-6 md:p-12">
        {/* Belt Visual */}
        <div className="flex flex-col items-center mb-12">
          <div className="relative w-32 h-32 flex items-center justify-center mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-dashed border-primary/20" />
            <div
              className={`w-20 h-20 ${BELT_COLORS[belt] ?? "bg-gray-300"} rounded-lg shadow-xl flex items-center justify-center transform rotate-12`}
            >
              <span className="text-white font-black text-3xl drop-shadow-md">
                {BELT_INITIALS[belt] ?? "?"}
              </span>
            </div>
          </div>
          <h2 className="text-3xl font-black capitalize mb-1">{belt} Belt</h2>
          <p className="text-on-surface-variant">
            {stripes} Stripe{stripes !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10 text-center">
            <p className="text-3xl font-black text-primary mb-1">{stripes}</p>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant opacity-60">
              Stripes
            </p>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10 text-center">
            <p className="text-3xl font-black text-primary mb-1">{trainingYears ?? "—"}</p>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant opacity-60">
              Training Years
            </p>
          </div>
        </div>

        {/* Belt Journey */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant opacity-60">
            Belt Journey
          </h3>
          <div className="flex items-center gap-2">
            {Object.entries(BELT_COLORS).map(([key, color]) => {
              const isCurrentOrPast =
                Object.keys(BELT_COLORS).indexOf(key) <=
                Object.keys(BELT_COLORS).indexOf(belt);
              return (
                <div
                  key={key}
                  className={`flex-1 h-3 rounded-full ${color} border border-outline-variant/30 ${
                    isCurrentOrPast ? "opacity-100" : "opacity-20"
                  }`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-50">
            <span>White</span>
            <span>Black</span>
          </div>
        </div>
      </div>
    </>
  );
}
