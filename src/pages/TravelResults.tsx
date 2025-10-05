import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navigation, MapPin, Calendar as CalendarIcon, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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

  useEffect(() => {
    const routeData = searchParams.get("route");
    if (routeData) {
      try {
        const parsed = JSON.parse(decodeURIComponent(routeData));
        // Convert date strings back to Date objects
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
      {/* Header */}
      <header className="w-full py-4 px-6 border-b border-white/20 bg-white/30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Your Travel Plan
            </h1>
          </div>
          <Button variant="ghost" onClick={() => navigate("/travel")}>
            Edit Route
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Route Overview */}
          <Card className="p-6 shadow-xl border-white/40 bg-white/40 backdrop-blur-md rounded-2xl">
            <h2 className="text-xl font-semibold mb-2">Route Overview</h2>
            <p className="text-muted-foreground mb-4">
              {waypoints.length} destinations • {waypoints.filter(w => w.date).length} with dates
            </p>
          </Card>

          {/* Waypoints with Climate Data */}
          {waypoints.map((waypoint, index) => (
            <div key={waypoint.id} className="relative">
              {/* Connector Arrow */}
              {index < waypoints.length - 1 && (
                <div className="absolute left-1/2 -bottom-3 transform -translate-x-1/2 z-10">
                  <ArrowRight className="h-6 w-6 text-primary rotate-90" />
                </div>
              )}

              <Card className="p-6 shadow-xl border-white/40 bg-white/40 backdrop-blur-md rounded-2xl">
                <div className="flex items-start gap-4">
                  {/* Step Number */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-semibold shrink-0">
                    {index + 1}
                  </div>

                  <div className="flex-1 space-y-4">
                    {/* Location Info */}
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

                    {/* Climate Data */}
                    {waypoint.date && (
                      <div className="mt-4 p-4 bg-white/50 rounded-lg border border-white/60">
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

          {/* Actions */}
          <div className="flex gap-4 justify-center pt-6">
            <Button variant="outline" onClick={() => navigate("/travel")} size="lg">
              Edit Route
            </Button>
            <Button onClick={() => navigate("/")} size="lg">
              Plan Another Trip
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TravelResults;
