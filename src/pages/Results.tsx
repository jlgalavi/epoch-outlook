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
      zoom: 8,
    });

    new maplibregl.Marker({ color: "hsl(215, 70%, 45%)" })
      .setLngLat([lon, lat])
      .setPopup(
        new maplibregl.Popup().setHTML(
          `<div class="p-2"><strong>Selected Location</strong><br/>${lat.toFixed(
            4
          )}°N, ${lon.toFixed(4)}°E</div>`
        )
      )
      .addTo(map.current);

    return () => {
      map.current?.remove();
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
      <div className="bg-[image:var(--gradient-hero)] text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-6 text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            New Search
          </Button>
          <div className="flex items-start justify-between gap-8">
            <div>
              <h1 className="text-4xl font-bold mb-4">Climate Outlook</h1>
              <div className="text-white/90 space-y-2 text-sm">
                <p>
                  📍 {data.metadata.latitude.toFixed(4)}°N, {data.metadata.longitude.toFixed(4)}°E
                </p>
                <p>
                  📅 {data.metadata.date_requested} (DOY {data.metadata.doy})
                </p>
                <p>
                  📊 {data.metadata.samples_n} samples from {data.metadata.years_used} years (±{data.metadata.window_days} days)
                </p>
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
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="text-2xl">🌡️</span>
                Temperature Range
              </h3>
              <div className="flex items-center justify-center gap-8 py-8">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-2">Low</div>
                  <div className="text-4xl font-bold text-blue-500">
                    {tMinData?.p50.toFixed(1)}°
                  </div>
                </div>
                <div className="relative h-32 w-px">
                  <div 
                    className="absolute inset-0 bg-gradient-to-b from-blue-500 via-yellow-500 to-red-500 rounded-full"
                    style={{ width: '4px', left: '-1.5px' }}
                  />
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-2">High</div>
                  <div className="text-4xl font-bold text-red-500">
                    {tMaxData?.p50.toFixed(1)}°
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Average: {tempData?.p50.toFixed(1)}°C
              </p>
            </CardContent>
          </Card>

          {/* Precipitation Visual */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="text-2xl">💧</span>
                Chance of Rain
              </h3>
              <div className="flex items-center justify-center py-8">
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="hsl(var(--muted))"
                      strokeWidth="16"
                      fill="none"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="hsl(var(--risk-wet))"
                      strokeWidth="16"
                      fill="none"
                      strokeDasharray={`${(precipProb?.probability_percent || 0) * 5.03} 502.4`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-5xl font-bold">{precipProb?.probability_percent || 0}%</div>
                    <div className="text-sm text-muted-foreground mt-1">Rain Chance</div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Expected: {precipData?.p50.toFixed(1)} mm/day
              </p>
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

        {/* Map */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Location</h2>
          <Card>
            <CardContent className="p-0">
              <div
                ref={mapContainer}
                className="h-[300px] w-full rounded-lg overflow-hidden"
              />
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
        <div className="text-center py-8 border-t">
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            This is a long-range outlook based on historical climate patterns. This is not a short-term forecast.
            Results are derived from statistical analysis of past weather data and should be used for planning purposes only.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Results;
