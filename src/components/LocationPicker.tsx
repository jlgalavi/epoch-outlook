import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface LocationPickerProps {
  value?: { lat: number; lon: number };
  onChange: (coords: { lat: number; lon: number }) => void;
  searchEnabled?: boolean;
}

export function LocationPicker({
  value,
  onChange,
  searchEnabled = true,
}: LocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [value?.lon || -3.7038, value?.lat || 40.4168],
      zoom: 8,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    map.current.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      onChange({ lat: Number(lat.toFixed(4)), lon: Number(lng.toFixed(4)) });
    });

    if (value) {
      marker.current = new maplibregl.Marker({ color: "hsl(215, 70%, 45%)" })
        .setLngLat([value.lon, value.lat])
        .addTo(map.current);
    }

    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (value && map.current) {
      if (marker.current) {
        marker.current.setLngLat([value.lon, value.lat]);
      } else {
        marker.current = new maplibregl.Marker({ color: "hsl(215, 70%, 45%)" })
          .setLngLat([value.lon, value.lat])
          .addTo(map.current);
      }
      map.current.flyTo({ center: [value.lon, value.lat], zoom: 8 });
    }
  }, [value]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();

      if (data.length > 0) {
        const { lat, lon } = data[0];
        onChange({ lat: Number(lat), lon: Number(lon) });
      }
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  return (
    <div className="space-y-3">
      {searchEnabled && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for a location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10"
          />
        </div>
      )}
      <div
        ref={mapContainer}
        className="h-[300px] w-full rounded-lg border border-border overflow-hidden"
      />
      {value && (
        <p className="text-sm text-muted-foreground">
          Selected: {value.lat.toFixed(4)}°N, {value.lon.toFixed(4)}°E
        </p>
      )}
    </div>
  );
}
