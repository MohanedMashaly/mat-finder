import { useState } from "react";

interface GymPin {
  id: string;
  name: string;
  lat: number;
  lang: number;
  members: { name: string; belt: string; stripes: number }[];
}

const BELT_COLORS: Record<string, string> = {
  white: "#e0e0e0",
  blue: "#0047AB",
  purple: "#6a1b9a",
  brown: "#5C4033",
  black: "#191c1d",
};

function beltDot(belt: string) {
  return BELT_COLORS[belt] ?? "#e0e0e0";
}

/**
 * Converts lat/lang to percentage positions on the 3D plane.
 * Normalises gym coordinates to fill the viewport with padding.
 */
function normalizePositions(pins: GymPin[]) {
  if (pins.length === 0) return [];
  if (pins.length === 1) {
    return [{ ...pins[0], x: 50, y: 50 }];
  }

  const lats = pins.map((p) => p.lat);
  const lngs = pins.map((p) => p.lang);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latRange = maxLat - minLat || 0.01;
  const lngRange = maxLng - minLng || 0.01;
  const pad = 12; // percent padding

  return pins.map((pin) => ({
    ...pin,
    // lat increases upward, so invert Y
    x: pad + ((pin.lang - minLng) / lngRange) * (100 - 2 * pad),
    y: pad + ((maxLat - pin.lat) / latRange) * (100 - 2 * pad),
  }));
}

export default function GymMapView({
  gymPins,
  highlightGymId,
}: {
  gymPins: GymPin[];
  highlightGymId?: string | null;
}) {
  const [expandedPin, setExpandedPin] = useState<string | null>(null);
  const positioned = normalizePositions(gymPins);

  if (gymPins.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-on-surface-variant/50 text-sm">
        <span className="material-symbols-outlined mr-2">explore_off</span>
        No active sessions right now
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 3D Plane Container */}
      <div
        className="relative w-full overflow-hidden rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-lg"
        style={{ perspective: "900px" }}
      >
        {/* The tilted 3D plane */}
        <div
          className="relative w-full"
          style={{
            transformStyle: "preserve-3d",
            transform: "rotateX(45deg) scale(0.85)",
            transformOrigin: "center 60%",
            paddingBottom: "60%",
          }}
        >
          {/* Grid surface */}
          <div
            className="absolute inset-0 rounded-xl"
            style={{
              background: `
                linear-gradient(rgba(0,89,187,0.06) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,89,187,0.06) 1px, transparent 1px),
                radial-gradient(ellipse at center, rgba(0,89,187,0.04) 0%, transparent 70%)
              `,
              backgroundSize: "10% 10%, 10% 10%, 100% 100%",
            }}
          />

          {/* Connection lines between gyms */}
          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
            {positioned.map((pin, i) =>
              positioned.slice(i + 1).map((other) => (
                <line
                  key={`${pin.id}-${other.id}`}
                  x1={`${pin.x}%`}
                  y1={`${pin.y}%`}
                  x2={`${other.x}%`}
                  y2={`${other.y}%`}
                  stroke="rgba(0,89,187,0.08)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              ))
            )}
          </svg>

          {/* Gym Pins */}
          {positioned.map((pin) => {
            const isHighlighted = pin.id === highlightGymId;
            const isExpanded = expandedPin === pin.id;
            const count = pin.members.length;

            return (
              <div
                key={pin.id}
                className="absolute flex flex-col items-center"
                style={{
                  left: `${pin.x}%`,
                  top: `${pin.y}%`,
                  transform: "translate(-50%, -100%) rotateX(-45deg)",
                  zIndex: isExpanded ? 30 : 10,
                }}
              >
                {/* Expanded member list */}
                {isExpanded && (
                  <div className="mb-2 bg-white rounded-xl shadow-2xl border border-outline-variant/15 p-3 min-w-[180px] animate-in fade-in zoom-in-95">
                    <p className="text-xs font-bold text-on-surface mb-2 truncate">
                      {pin.name}
                    </p>
                    <div className="space-y-1.5">
                      {pin.members.map((m, mi) => (
                        <div
                          key={mi}
                          className="flex items-center space-x-2 text-xs"
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-black/10 flex-shrink-0"
                            style={{ backgroundColor: beltDot(m.belt) }}
                          />
                          <span className="font-medium truncate">
                            {m.name}
                          </span>
                          <span className="text-on-surface-variant/60 text-[10px] ml-auto">
                            {m.belt}
                            {m.stripes > 0
                              ? ` · ${m.stripes}${"▮".repeat(m.stripes)}`
                              : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-on-surface-variant/40 mt-2 text-center uppercase tracking-wider">
                      {pin.lat.toFixed(4)}, {pin.lang.toFixed(4)}
                    </p>
                  </div>
                )}

                {/* Pin marker */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedPin(isExpanded ? null : pin.id)
                  }
                  className={`group relative flex flex-col items-center transition-transform duration-200 ${
                    isExpanded ? "scale-110" : "hover:scale-105"
                  }`}
                >
                  {/* Pulse ring for highlighted gym */}
                  {isHighlighted && (
                    <span className="absolute -inset-3 rounded-full bg-primary/20 animate-ping" />
                  )}

                  {/* Count badge */}
                  <div
                    className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-colors ${
                      isHighlighted
                        ? "bg-primary text-white ring-4 ring-primary/30"
                        : count > 0
                        ? "bg-primary/90 text-white"
                        : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    <span className="font-black text-lg">{count}</span>
                    {/* Small people icon */}
                    <span
                      className="material-symbols-outlined absolute -bottom-0.5 -right-0.5 text-[14px] bg-white text-primary rounded-full p-0.5 shadow"
                      style={{ lineHeight: 1 }}
                    >
                      group
                    </span>
                  </div>

                  {/* Pin needle */}
                  <div
                    className={`w-0.5 h-4 ${
                      isHighlighted ? "bg-primary" : "bg-on-surface-variant/30"
                    }`}
                  />

                  {/* Ground dot */}
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isHighlighted ? "bg-primary/60" : "bg-on-surface-variant/20"
                    }`}
                  />

                  {/* Gym name label */}
                  <div className="mt-1 px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-md shadow-sm border border-outline-variant/10">
                    <p className="text-[10px] font-bold text-on-surface whitespace-nowrap truncate max-w-[120px]">
                      {pin.name}
                    </p>
                    <p className="text-[8px] text-on-surface-variant/50 text-center">
                      {pin.lat.toFixed(3)}°, {pin.lang.toFixed(3)}°
                    </p>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-4 px-1">
        <div className="flex items-center space-x-4 text-[10px] text-on-surface-variant/60 uppercase tracking-widest">
          <span className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded-full bg-primary" />
            <span>Your Gym</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded-full bg-primary/90" />
            <span>Active</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-3 h-3 rounded-full bg-surface-container-high" />
            <span>Empty</span>
          </span>
        </div>
        <p className="text-[10px] text-on-surface-variant/40">
          {gymPins.reduce((sum, g) => sum + g.members.length, 0)} active
          {gymPins.reduce((sum, g) => sum + g.members.length, 0) === 1
            ? " practitioner"
            : " practitioners"}
        </p>
      </div>
    </div>
  );
}
