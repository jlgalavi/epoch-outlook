import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { RiskCards, RiskLabel } from "@/components/RiskCards";
import { DetailsTable, SummaryRow } from "@/components/DetailsTable";
import { DownloadButtons } from "@/components/DownloadButtons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import maplibregl from "maplibre-gl";
import { useRef } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface OutlookResponse {
  metadata: {
    latitude: number;
    longitude: number;
    date_requested: string;
    doy: number;
    window_days: number;
    years_used: number;
    samples_n: number;
    units: string;
  };
  summary: SummaryRow[];
  probabilities: Array<{
    metric: string;
    threshold: number;
    comparator: string;
    probability_percent: number;
  }>;
  risk_labels: RiskLabel[];
}

const Results = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState<OutlookResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const date = searchParams.get("date") || "";
  const window = Number(searchParams.get("window")) || 15;
  const units = searchParams.get("units") || "metric";

  useEffect(() => {
    const fetchOutlook = async () => {
      setLoading(true);
      setError("");

      try {
        // Import the mock API handler
        const { handleOutlookRequest } = await import("@/pages/api/outlook");
        
        const result = await handleOutlookRequest({
          lat,
          lon,
          date,
          window,
          units: units as "metric" | "imperial",
        });
        
        setData(result);
      } catch (err: any) {
        if (err.error) {
          setError(err.error.message);
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "An error occurred while fetching data"
          );
        }
      } finally {
        setLoading(false);
      }
    };

    if (lat && lon && date) {
      fetchOutlook();
    } else {
      setError("Missing required parameters");
      setLoading(false);
    }
  }, [lat, lon, date, window, units]);

  useEffect(() => {
    if (!mapContainer.current || map.current || !data) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [lon, lat],
      zoom: 6,
      interactive: false,
      scrollZoom: false,
      boxZoom: false,
      doubleClickZoom: false,
      touchZoomRotate: false,
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // Add temperature heatmap radius
      const tempValue = tempData?.p50 || 25;
      const tempNormalized = Math.max(0, Math.min(100, ((tempValue + 10) / 60) * 100));
      
      // Add temperature zone circle
      map.current.addSource('temp-zone', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lon, lat]
          },
          properties: {
            temp: tempValue
          }
        }
      });

      map.current.addLayer({
        id: 'temp-heatmap',
        type: 'circle',
        source: 'temp-zone',
        paint: {
          'circle-radius': 80,
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'temp'],
            -10, '#3b82f6',
            0, '#60a5fa',
            15, '#fbbf24',
            25, '#f97316',
            35, '#ef4444'
          ],
          'circle-opacity': 0.3,
          'circle-blur': 1
        }
      });

      // Add precipitation indicator
      const precipChance = precipProb?.probability_percent || 0;
      if (precipChance > 20) {
        map.current.addLayer({
          id: 'precip-zone',
          type: 'circle',
          source: 'temp-zone',
          paint: {
            'circle-radius': 60,
            'circle-color': '#0ea5e9',
            'circle-opacity': precipChance / 200,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#0ea5e9',
            'circle-stroke-opacity': 0.5,
          }
        });
      }
    });

    // Add location marker
    new maplibregl.Marker({ 
      color: tempData && tempData.p50 > 30 ? "hsl(0, 70%, 50%)" : 
             tempData && tempData.p50 < 10 ? "hsl(210, 70%, 50%)" :
             "hsl(25, 70%, 50%)" 
    })
      .setLngLat([lon, lat])
      .setPopup(
        new maplibregl.Popup({ offset: 25 }).setHTML(
          `<div class="p-2">
            <strong>Selected Location</strong><br/>
            ${lat.toFixed(2)}°, ${lon.toFixed(2)}°<br/>
            <span class="text-sm">Temp: ${tempData?.p50.toFixed(1)}°C</span>
          </div>`
        )
      )
      .addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [data, lat, lon]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || "No data available"}</AlertDescription>
          </Alert>
          <Button onClick={() => navigate("/")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Search
          </Button>
        </div>
      </div>
    );
  }

  // Prepare temperature range chart data (min to max)
  const tMinData = data.summary.find(s => s.var === 't_min');
  const tMaxData = data.summary.find(s => s.var === 't_max');
  const tempData = data.summary.find(s => s.var === 't_mean');
  
  const tempChartData = [
    { 
      name: 'Expected Temperature',
      low: tMinData?.p50 || 0,
      high: tMaxData?.p50 || 0,
      mean: tempData?.p50 || 0
    }
  ];

  // Prepare precipitation simple data
  const precipData = data.summary.find(s => s.var === 'precip_mm');
  const precipProb = data.probabilities.find(p => p.metric === 'precip_mm' && p.threshold >= 1);
  const precipChartData = [
    { name: 'No Rain', value: 100 - (precipProb?.probability_percent || 0), fill: 'hsl(var(--muted))' },
    { name: 'Rain Expected', value: precipProb?.probability_percent || 0, fill: 'hsl(var(--risk-wet))' }
  ];

  // Get highest risk for featured display
  const highestRisk = data.risk_labels.reduce((prev, current) => {
    const levelOrder = { high: 3, medium: 2, low: 1 };
    return levelOrder[current.level] > levelOrder[prev.level] ? current : prev;
  });

  const otherRisks = data.risk_labels.filter(r => r !== highestRisk);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-[image:var(--gradient-hero)] text-white py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4 text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            New Search
          </Button>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold mb-3">Climate Outlook</h1>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                  <span>📍</span>
                  <span>{data.metadata.latitude.toFixed(2)}°, {data.metadata.longitude.toFixed(2)}°</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                  <span>📅</span>
                  <span>{new Date(data.metadata.date_requested).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                  <span>📊</span>
                  <span>±{data.metadata.window_days} days window</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
        {/* Featured Risk */}
        <section>
          <RiskCards data={[highestRisk]} featured />
        </section>

        {/* Weather Visuals */}
        <section className="grid md:grid-cols-2 gap-8">
          {/* Temperature Visual */}
          <Card className="overflow-hidden border-2 hover:shadow-xl transition-all">
            <CardContent className="pt-6">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="text-4xl">🌡️</span>
                <span>Temperature</span>
              </h3>
              <div className="flex items-center justify-center gap-12 py-8">
                <div className="text-center group">
                  <div className="text-sm font-medium text-muted-foreground mb-3">Daily Low</div>
                  <div className="text-5xl font-bold text-blue-500 transition-all group-hover:scale-110">
                    {tMinData?.p50.toFixed(0)}°
                  </div>
                </div>
                <div className="relative h-40 w-2">
                  <div 
                    className="absolute inset-0 bg-gradient-to-b from-red-500 via-yellow-400 to-blue-500 rounded-full shadow-lg"
                    style={{ width: '8px', left: '-3px' }}
                  />
                  <div className="absolute top-1/2 -translate-y-1/2 -left-8 w-16 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                </div>
                <div className="text-center group">
                  <div className="text-sm font-medium text-muted-foreground mb-3">Daily High</div>
                  <div className="text-5xl font-bold text-red-500 transition-all group-hover:scale-110">
                    {tMaxData?.p50.toFixed(0)}°
                  </div>
                </div>
              </div>
              <div className="text-center pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Average: <span className="font-bold text-foreground">{tempData?.p50.toFixed(1)}°C</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Precipitation Visual */}
          <Card className="overflow-hidden border-2 hover:shadow-xl transition-all">
            <CardContent className="pt-6">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="text-4xl">💧</span>
                <span>Rain Forecast</span>
              </h3>
              <div className="flex items-center justify-center py-8">
                <div className="relative w-56 h-56">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="112"
                      cy="112"
                      r="90"
                      stroke="hsl(var(--muted))"
                      strokeWidth="20"
                      fill="none"
                      opacity="0.3"
                    />
                    <circle
                      cx="112"
                      cy="112"
                      r="90"
                      stroke="hsl(var(--risk-wet))"
                      strokeWidth="20"
                      fill="none"
                      strokeDasharray={`${(precipProb?.probability_percent || 0) * 5.65} 565`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-6xl font-bold bg-gradient-to-r from-blue-500 to-blue-300 bg-clip-text text-transparent">
                      {precipProb?.probability_percent || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground mt-2 font-medium">Rain Chance</div>
                  </div>
                </div>
              </div>
              <div className="text-center pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Expected rainfall: <span className="font-bold text-foreground">{precipData?.p50.toFixed(1)} mm/day</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Other Risks */}
        {otherRisks.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">Additional Risk Factors</h2>
            <RiskCards data={otherRisks} />
          </section>
        )}

        {/* Enhanced Climate Map */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Climate Overview Map</h2>
          <Card>
            <CardContent className="p-0">
              <div
                ref={mapContainer}
                className="h-[400px] w-full rounded-lg overflow-hidden relative"
              >
                <div className="absolute top-4 right-4 z-10 bg-card/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border">
                  <div className="text-xs font-medium mb-2">Climate Indicators</div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-red-500"></div>
                      <span>Temperature: {tempData?.p50.toFixed(1)}°C</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-sky-500"></div>
                      <span>Rain chance: {precipProb?.probability_percent || 0}%</span>
                    </div>
                    {data.summary.find(s => s.var === 'wind10m') && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-500"></div>
                        <span>Wind: {data.summary.find(s => s.var === 'wind10m')?.p50.toFixed(1)} m/s</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Details */}
        <section>
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full gap-2 mb-4">
                {detailsOpen ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Hide Statistical Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show Statistical Details
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <DetailsTable
                summary={data.summary}
                windowDays={data.metadata.window_days}
              />
            </CollapsibleContent>
          </Collapsible>
        </section>

        {/* Downloads */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Export Data</h2>
          <Card>
            <CardContent className="pt-6">
              <DownloadButtons
                jsonPayload={data}
                lat={lat}
                lon={lon}
                date={date}
              />
            </CardContent>
          </Card>
        </section>

        {/* Disclaimer Footer */}
        <div className="text-center py-6 px-4 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground max-w-xl mx-auto">
            Long-range climate outlook based on historical patterns — not a short-term weather forecast
          </p>
        </div>
      </div>
    </div>
  );
};

export default Results;
