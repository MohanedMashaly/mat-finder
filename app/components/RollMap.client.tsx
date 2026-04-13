import { useEffect, useState, useCallback } from "react";

export interface Gym {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
}

interface GymMapProps {
  gyms: Gym[];
  selectedGymId?: string | null;
  onSelectGym?: (gym: Gym) => void;
  /** If provided, shows a "you are here" marker */
  userLat?: number | null;
  userLng?: number | null;
}

/**
 * Client-only Leaflet map that displays gym markers.
 * Clicking a gym marker selects it and notifies the parent.
 */
export default function GymMap({
  gyms,
  selectedGymId,
  onSelectGym,
  userLat,
  userLng,
}: GymMapProps) {
  const [MapComponents, setMapComponents] = useState<{
    MapContainer: any;
    TileLayer: any;
    Marker: any;
    Popup: any;
    L: any;
  } | null>(null);

  useEffect(() => {
    Promise.all([import("leaflet"), import("react-leaflet")]).then(
      ([L, RL]) => {
        // Fix default marker icon paths
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        setMapComponents({
          MapContainer: RL.MapContainer,
          TileLayer: RL.TileLayer,
          Marker: RL.Marker,
          Popup: RL.Popup,
          L,
        });
      }
    );
  }, []);

  if (!MapComponents) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface-container-high rounded-xl">
        <span className="material-symbols-outlined text-primary animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, L } = MapComponents;

  // Center on the selected gym, or the first gym, or a default
  const selected = gyms.find((g) => g.id === selectedGymId);
  const center: [number, number] = selected
    ? [selected.lat, selected.lng]
    : gyms.length > 0
      ? [gyms[0].lat, gyms[0].lng]
      : [32.85, -117.2]; // Default: San Diego

  // Custom gym icon (orange/red marker)
  const gymIcon = L.divIcon({
    html: `<span class="material-symbols-outlined" style="font-size:32px;color:#0059bb;">fitness_center</span>`,
    className: "gym-marker-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  // Selected gym icon (larger, highlighted)
  const selectedGymIcon = L.divIcon({
    html: `<span class="material-symbols-outlined" style="font-size:40px;color:#c62828;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">fitness_center</span>`,
    className: "gym-marker-icon",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <style>{`
        .gym-marker-icon { background: none !important; border: none !important; }
      `}</style>
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%", borderRadius: "0.75rem" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {gyms.map((gym) => (
          <Marker
            key={gym.id}
            position={[gym.lat, gym.lng]}
            icon={gym.id === selectedGymId ? selectedGymIcon : gymIcon}
            eventHandlers={{
              click: () => onSelectGym?.(gym),
            }}
          >
            <Popup>
              <div style={{ minWidth: 160 }}>
                <strong style={{ fontSize: 14 }}>{gym.name}</strong>
                {gym.address && (
                  <p style={{ fontSize: 11, color: "#666", margin: "4px 0 0" }}>
                    {gym.address}
                  </p>
                )}
                {gym.id === selectedGymId && (
                  <p style={{ fontSize: 11, color: "#0059bb", fontWeight: 700, margin: "6px 0 0" }}>
                    ✓ Selected
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </>
  );
}
