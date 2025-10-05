import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navigation, MapPin, Calendar as CalendarIcon, Loader2, ArrowDown, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface Waypoint {
  id: string;
  name: string;
  location: { lat: number; lon: number };
  date?: Date;
}

interface ClimateData {
  temperature: {
    mean: number;
    min: number;
    max: number;
    unit: string;
  };
  precipitation: {
    probability: number;
    amount: number;
    unit: string;
  };
  wind: {
    speed: number;
    unit: string;
  };
  summary: {
    outlook: string;
    precipitationRisk: string;
  };
}

const TravelResults = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [climateData, setClimateData] = useState<Record<string, ClimateData>>({});
  const [loading, setLoading] = useState(true);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    const routeData = searchParams.get("route");
    if (routeData) {
      try {
        const parsed = JSON.parse(decodeURIComponent(routeData));
        const waypointsWithDates = parsed.map((wp: any) => ({
          ...wp,
          date: wp.date ? new Date(wp.date) : undefined,
        }));
        setWaypoints(waypointsWithDates);
        fetchClimateForAllWaypoints(waypointsWithDates);
      } catch (error) {
        console.error("Error parsing route data:", error);
        toast({
          title: "Error",
          description: "Failed to load route data.",
          variant: "destructive",
        });
      }
    }
  }, [searchParams]);

  const fetchClimateForAllWaypoints = async (wps: Waypoint[]) => {
    setLoading(true);
    const data: Record<string, ClimateData> = {};

    for (const waypoint of wps) {
      if (waypoint.date) {
        try {
          const year = waypoint.date.getFullYear();
          const month = String(waypoint.date.getMonth() + 1).padStart(2, '0');
          const day = String(waypoint.date.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;

          const { data: forecastData, error } = await supabase.functions.invoke("weather-forecast", {
            body: {
              lat: waypoint.location.lat,
              lon: waypoint.location.lon,
              date: dateStr,
              window: 7,
              units: "metric",
            },
          });

          if (error) throw error;

          if (forecastData?.forecast) {
            data[waypoint.id] = {
              temperature: forecastData.forecast.temperature,
              precipitation: forecastData.forecast.precipitation,
              wind: forecastData.forecast.wind,
              summary: forecastData.summary,
            };
          }
        } catch (error) {
          console.error(`Error fetching climate for ${waypoint.name}:`, error);
        }
      }
    }

    setClimateData(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!mapContainer.current || waypoints.length === 0) return;

    // Clean up existing map if it exists
    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [waypoints[0].location.lon, waypoints[0].location.lat],
      zoom: 3,
    });

    // Add markers with climate data
    waypoints.forEach((waypoint, index) => {
      const climateInfo = climateData[waypoint.id];
      
      // Determine temperature condition and color
      let tempColor = 'hsl(var(--primary))';
      let tempIcon = '🌡️';
      if (climateInfo) {
        const temp = climateInfo.temperature.mean;
        if (temp < 5) {
          tempColor = '#60a5fa'; // Cold - blue
          tempIcon = '❄️';
        } else if (temp < 15) {
          tempColor = '#38bdf8'; // Cool - light blue
          tempIcon = '🌡️';
        } else if (temp < 25) {
          tempColor = '#4ade80'; // Mild - green
          tempIcon = '☀️';
        } else if (temp < 30) {
          tempColor = '#fb923c'; // Warm - orange
          tempIcon = '🌞';
        } else {
          tempColor = '#f87171'; // Hot - red
          tempIcon = '🔥';
        }
      }

      // Create marker container
      const markerContainer = document.createElement('div');
      markerContainer.style.cssText = 'position: relative; width: 36px; height: 36px;';

      // Create main marker
      const el = document.createElement('div');
      el.style.cssText = `
        background: ${tempColor};
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        border: 3px solid white;
        cursor: pointer;
      `;
      el.textContent = (index + 1).toString();
      markerContainer.appendChild(el);

      // Add climate indicators
      if (climateInfo) {
        const indicators = document.createElement('div');
        indicators.style.cssText = `
          position: absolute;
          top: -10px;
          right: -10px;
          display: flex;
          gap: 2px;
          flex-direction: column;
        `;

        // Temperature indicator
        const tempBadge = document.createElement('div');
        tempBadge.style.cssText = `
          background: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        tempBadge.textContent = tempIcon;
        indicators.appendChild(tempBadge);

        // Wind indicator (if windy)
        if (climateInfo.wind.speed > 30) {
          const windBadge = document.createElement('div');
          windBadge.style.cssText = `
            background: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            margin-top: 2px;
          `;
          windBadge.textContent = '💨';
          indicators.appendChild(windBadge);
        }

        // Precipitation indicator (if rainy)
        if (climateInfo.precipitation.probability > 50) {
          const rainBadge = document.createElement('div');
          rainBadge.style.cssText = `
            background: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            margin-top: 2px;
          `;
          rainBadge.textContent = '🌧️';
          indicators.appendChild(rainBadge);
        }

        markerContainer.appendChild(indicators);
      }

      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 12px; min-width: 200px;">
          <h3 style="font-weight: bold; margin-bottom: 8px; font-size: 16px;">${waypoint.name}</h3>
          ${waypoint.date ? `<p style="font-size: 13px; color: #666; margin-bottom: 8px;">${format(waypoint.date, "PPP")}</p>` : ''}
          ${climateInfo ? `
            <div style="border-top: 1px solid #e5e5e5; padding-top: 8px; font-size: 13px;">
              <p style="margin: 4px 0;">🌡️ ${climateInfo.temperature.mean.toFixed(1)}${climateInfo.temperature.unit}</p>
              <p style="margin: 4px 0;">🌧️ ${climateInfo.precipitation.probability}% rain chance</p>
              <p style="margin: 4px 0;">💨 ${climateInfo.wind.speed.toFixed(1)} ${climateInfo.wind.unit}</p>
            </div>
          ` : '<p style="font-size: 12px; color: #999; margin-top: 8px;">Loading climate data...</p>'}
        </div>
      `);

      new maplibregl.Marker({ element: markerContainer })
        .setLngLat([waypoint.location.lon, waypoint.location.lat])
        .setPopup(popup)
        .addTo(map.current!);
    });

    // Add route line
    if (waypoints.length > 1) {
      const coordinates = waypoints.map(wp => [wp.location.lon, wp.location.lat]);

      map.current.on('load', () => {
        if (!map.current) return;
        
        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: coordinates,
            },
          },
        });

        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': 'hsl(var(--primary))',
            'line-width': 4,
            'line-dasharray': [3, 3],
          },
        });
      });

      const bounds = new maplibregl.LngLatBounds();
      waypoints.forEach(wp => bounds.extend([wp.location.lon, wp.location.lat]));
      map.current.fitBounds(bounds, { padding: 80 });
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [waypoints, climateData]);

  if (waypoints.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(200_100%_88%)] via-[hsl(190_95%_85%)] to-[hsl(45_100%_88%)] flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-lg mb-4">No route data found</p>
          <Button onClick={() => navigate("/travel")}>Back to Planner</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(200_100%_88%)] via-[hsl(190_95%_85%)] to-[hsl(45_100%_88%)]">
      <header className="w-full py-4 px-6 border-b border-white/20 bg-white/30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Your Travel Plan
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
              <Home className="h-4 w-4" />
              Home
            </Button>
            <Button variant="ghost" onClick={() => navigate("/travel")}>
              Edit Route
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:sticky lg:top-6 h-[600px]">
            <Card className="h-full shadow-xl border-white/40 bg-white/40 backdrop-blur-md rounded-2xl overflow-hidden">
              <div ref={mapContainer} className="w-full h-full" />
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6 shadow-xl border-white/40 bg-white/40 backdrop-blur-md rounded-2xl">
              <h2 className="text-xl font-semibold mb-2">Route Overview</h2>
              <p className="text-muted-foreground">
                {waypoints.length} destinations • {waypoints.filter(w => w.date).length} with dates
              </p>
            </Card>

            {waypoints.map((waypoint, index) => (
              <div key={waypoint.id} className="relative">
                {index < waypoints.length - 1 && (
                  <div className="absolute left-1/2 -bottom-6 transform -translate-x-1/2 z-10">
                    <ArrowDown className="h-8 w-8 text-primary drop-shadow-lg" />
                  </div>
                )}

                <Card className="p-6 shadow-xl border-white/40 bg-white/40 backdrop-blur-md rounded-2xl">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-semibold shrink-0">
                      {index + 1}
                    </div>

                    <div className="flex-1 space-y-4">
                      <div>
                        <h3 className="text-xl font-semibold flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-primary" />
                          {waypoint.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {waypoint.location.lat.toFixed(4)}, {waypoint.location.lon.toFixed(4)}
                        </p>
                        {waypoint.date && (
                          <p className="text-sm text-primary mt-1 flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4" />
                            {format(waypoint.date, "PPP")}
                          </p>
                        )}
                      </div>

                      {waypoint.date && (
                        <div className="p-4 bg-white/50 rounded-lg border border-white/60">
                          {loading ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Loading climate data...</span>
                            </div>
                          ) : climateData[waypoint.id] ? (
                            <div className="space-y-3">
                              <div>
                                <h4 className="font-semibold text-sm mb-2">Weather Outlook</h4>
                                <p className="text-sm text-muted-foreground">
                                  {climateData[waypoint.id].summary.outlook}
                                </p>
                              </div>

                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <p className="text-xs text-muted-foreground">Temperature</p>
                                  <p className="font-semibold">
                                    {climateData[waypoint.id].temperature.mean.toFixed(1)}
                                    {climateData[waypoint.id].temperature.unit}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {climateData[waypoint.id].temperature.min.toFixed(0)} - {climateData[waypoint.id].temperature.max.toFixed(0)}
                                    {climateData[waypoint.id].temperature.unit}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs text-muted-foreground">Precipitation</p>
                                  <p className="font-semibold">
                                    {climateData[waypoint.id].precipitation.probability}%
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {climateData[waypoint.id].precipitation.amount.toFixed(1)} {climateData[waypoint.id].precipitation.unit}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs text-muted-foreground">Wind</p>
                                  <p className="font-semibold">
                                    {climateData[waypoint.id].wind.speed.toFixed(1)} {climateData[waypoint.id].wind.unit}
                                  </p>
                                </div>
                              </div>

                              {climateData[waypoint.id].precipitation.probability > 50 && (
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded text-xs text-blue-900 dark:text-blue-100">
                                  ⚠️ High chance of rain - pack an umbrella!
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No climate data available for this location
                            </p>
                          )}
                        </div>
                      )}

                      {!waypoint.date && (
                        <p className="text-sm text-muted-foreground italic">
                          No date set for this destination
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            ))}

            <div className="flex gap-4 justify-center pt-6">
              <Button variant="outline" onClick={() => navigate("/travel")} size="lg">
                Edit Route
              </Button>
              <Button onClick={() => navigate("/")} size="lg">
                Plan Another Trip
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TravelResults;
