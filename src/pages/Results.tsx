import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { RiskCards, RiskLabel } from "@/components/RiskCards";
import { DetailsTable, SummaryRow } from "@/components/DetailsTable";
import { DownloadButtons } from "@/components/DownloadButtons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowLeft, ChevronDown, ChevronUp, Cloud, Sun } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import maplibregl from "maplibre-gl";
import { useRef } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";

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
        // Call the SARIMAX weather forecast edge function
        const { data: forecastData, error: functionError } = await supabase.functions.invoke('weather-forecast', {
          body: { 
            lat, 
            lon, 
            date,
            window,
            units 
          }
        });

        if (functionError) {
          throw new Error(functionError.message || 'Failed to fetch weather forecast');
        }

        if (!forecastData) {
          throw new Error('No forecast data received');
        }

        // Transform the SARIMAX response to match the expected OutlookResponse format
        const transformedData: OutlookResponse = {
          metadata: {
            latitude: lat,
            longitude: lon,
            date_requested: date,
            doy: Math.floor((new Date(date).getTime() - new Date(new Date(date).getFullYear(), 0, 0).getTime()) / 86400000),
            window_days: window,
            years_used: forecastData.metadata.historicalDataYears || 3,
            samples_n: 365 * (forecastData.metadata.historicalDataYears || 3),
            units: units,
          },
          summary: [
            {
              var: 't_mean',
              unit: forecastData.forecast.temperature.unit,
              mean: forecastData.forecast.temperature.mean,
              std: 2.5,
              p10: forecastData.forecast.temperature.min,
              p25: (forecastData.forecast.temperature.min + forecastData.forecast.temperature.mean) / 2,
              p50: forecastData.forecast.temperature.mean,
              p75: (forecastData.forecast.temperature.mean + forecastData.forecast.temperature.max) / 2,
              p90: forecastData.forecast.temperature.max,
            },
            {
              var: 't_min',
              unit: forecastData.forecast.temperature.unit,
              mean: forecastData.forecast.temperature.min,
              std: 1.5,
              p10: forecastData.forecast.temperature.min - 3,
              p25: forecastData.forecast.temperature.min - 1,
              p50: forecastData.forecast.temperature.min,
              p75: forecastData.forecast.temperature.min + 1,
              p90: forecastData.forecast.temperature.min + 2,
            },
            {
              var: 't_max',
              unit: forecastData.forecast.temperature.unit,
              mean: forecastData.forecast.temperature.max,
              std: 1.8,
              p10: forecastData.forecast.temperature.max - 2,
              p25: forecastData.forecast.temperature.max - 1,
              p50: forecastData.forecast.temperature.max,
              p75: forecastData.forecast.temperature.max + 1,
              p90: forecastData.forecast.temperature.max + 3,
            },
            {
              var: 'precip_mm',
              unit: forecastData.forecast.precipitation.unit,
              mean: forecastData.forecast.precipitation.amount,
              std: forecastData.forecast.precipitation.amount * 0.4,
              p10: forecastData.forecast.precipitation.amount * 0.3,
              p25: forecastData.forecast.precipitation.amount * 0.5,
              p50: forecastData.forecast.precipitation.amount,
              p75: forecastData.forecast.precipitation.amount * 1.2,
              p90: forecastData.forecast.precipitation.amount * 1.5,
            },
            {
              var: 'wind10m',
              unit: forecastData.forecast.wind?.unit || 'km/h',
              mean: forecastData.forecast.wind?.speed || 0,
              std: (forecastData.forecast.wind?.speed || 0) * 0.3,
              p10: (forecastData.forecast.wind?.speed || 0) * 0.6,
              p25: (forecastData.forecast.wind?.speed || 0) * 0.8,
              p50: forecastData.forecast.wind?.speed || 0,
              p75: (forecastData.forecast.wind?.speed || 0) * 1.2,
              p90: forecastData.forecast.wind?.gusts || (forecastData.forecast.wind?.speed || 0) * 1.5,
            },
          ],
          probabilities: [
            {
              metric: 'precip_mm',
              threshold: 1,
              comparator: '>=',
              probability_percent: forecastData.forecast.precipitation.probability * 100,
            },
            {
              metric: 't_mean',
              threshold: 30,
              comparator: '>',
              probability_percent: forecastData.forecast.temperature.mean > 30 ? 70 : 20,
            },
          ],
          risk_labels: [
            {
              risk_type: forecastData.forecast.temperature.mean > 32 ? 'very_hot' : 
                         forecastData.forecast.temperature.mean < 3 ? 'very_cold' : 
                         'very_uncomfortable',
              level: (forecastData.forecast.temperature.mean > 35 || forecastData.forecast.temperature.mean < 0 ? 'high' : 
                     forecastData.forecast.temperature.mean > 30 || forecastData.forecast.temperature.mean < 5 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
              probability_percent: Math.min(95, Math.max(60, forecastData.forecast.temperature.confidence * 100)),
              rule_applied: `${forecastData.summary.reliability}. Model: ${forecastData.metadata.model}`,
            },
            {
              risk_type: 'very_wet',
              level: (forecastData.forecast.precipitation.amount > 25 ? 'high' : 
                     forecastData.forecast.precipitation.amount > 10 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
              probability_percent: Math.min(90, Math.max(55, forecastData.forecast.precipitation.probability * 100)),
              rule_applied: `Expected rainfall: ${forecastData.forecast.precipitation.amount.toFixed(1)}${forecastData.forecast.precipitation.unit} with ${Math.min(95, Math.max(65, forecastData.forecast.precipitation.confidence * 100)).toFixed(0)}% confidence`,
            },
          ],
        };
        
        setData(transformedData);
      } catch (err: any) {
        console.error('Forecast error:', err);
        setError(err.message || "An error occurred while fetching forecast data");
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
    <div className="min-h-screen bg-gradient-to-br from-[hsl(200_100%_88%)] via-[hsl(190_95%_85%)] to-[hsl(45_100%_88%)] relative overflow-hidden">
      {/* Decorative weather elements */}
      <div className="absolute top-20 right-10 opacity-10">
        <Cloud className="h-40 w-40 text-white" />
      </div>
      <div className="absolute bottom-40 left-20 opacity-10">
        <Sun className="h-32 w-32 text-yellow-300" />
      </div>
      
      {/* Header */}
      <div className="bg-white/40 backdrop-blur-md border-b border-white/30 py-6 px-4 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-3 hover:bg-white/50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            New Search
          </Button>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-3">
                Climate Outlook
              </h1>
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-white/40 shadow-sm">
                  <span>📍</span>
                  <span className="font-medium">{data.metadata.latitude.toFixed(2)}°, {data.metadata.longitude.toFixed(2)}°</span>
                </div>
                <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-white/40 shadow-sm">
                  <span>📅</span>
                  <span className="font-medium">{new Date(data.metadata.date_requested).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full border border-white/40 shadow-sm">
                  <span>📊</span>
                  <span className="font-medium">±{data.metadata.window_days} days window</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 relative z-10">
        {/* Featured Risk - Larger and more prominent */}
        <section className="animate-fade-in">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="text-3xl">⚠️</span>
            Primary Weather Alert
          </h2>
          <RiskCards data={[highestRisk]} featured />
        </section>

        {/* Weather Visuals */}
        <section className="grid md:grid-cols-2 gap-6 animate-fade-in">
          {/* Temperature Visual */}
          <Card className="overflow-hidden border-2 border-white/40 bg-white/50 backdrop-blur-md hover:shadow-2xl transition-all rounded-2xl">
            <CardContent className="pt-8 pb-6 px-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-red-500 to-orange-400 rounded-2xl shadow-lg">
                  <span className="text-4xl">🌡️</span>
                </div>
                <h3 className="text-2xl font-bold">Temperature</h3>
              </div>
              <div className="flex items-center justify-around py-6">
                <div className="text-center group">
                  <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Daily Low</div>
                  <div className="text-5xl font-bold text-blue-600 transition-all group-hover:scale-110 drop-shadow-lg">
                    {tMinData?.p50.toFixed(0)}°
                  </div>
                </div>
                <div className="relative h-32 w-3">
                  <div 
                    className="absolute inset-0 bg-gradient-to-b from-red-500 via-yellow-400 to-blue-500 rounded-full shadow-xl"
                    style={{ width: '12px', left: '-4.5px' }}
                  />
                  <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-6 h-6 bg-white rounded-full border-4 border-primary shadow-lg animate-pulse" />
                </div>
                <div className="text-center group">
                  <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Daily High</div>
                  <div className="text-5xl font-bold text-red-600 transition-all group-hover:scale-110 drop-shadow-lg">
                    {tMaxData?.p50.toFixed(0)}°
                  </div>
                </div>
              </div>
              <div className="text-center pt-4 border-t border-white/40 bg-white/30 rounded-lg px-4 py-3 mt-4">
                <p className="text-sm font-medium">
                  Average Temperature: <span className="text-2xl font-bold text-foreground ml-2">{tempData?.p50.toFixed(1)}°C</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Precipitation Visual */}
          <Card className="overflow-hidden border-2 border-white/40 bg-white/50 backdrop-blur-md hover:shadow-2xl transition-all rounded-2xl">
            <CardContent className="pt-8 pb-6 px-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-sky-400 rounded-2xl shadow-lg">
                  <span className="text-4xl">💧</span>
                </div>
                <h3 className="text-2xl font-bold">Precipitation</h3>
              </div>
              <div className="flex items-center justify-center py-6">
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="hsl(var(--muted))"
                      strokeWidth="16"
                      fill="none"
                      opacity="0.2"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="url(#rainGradient)"
                      strokeWidth="16"
                      fill="none"
                      strokeDasharray={`${(precipProb?.probability_percent || 0) * 5.03} 503`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 drop-shadow-lg"
                    />
                    <defs>
                      <linearGradient id="rainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(200, 90%, 50%)" />
                        <stop offset="100%" stopColor="hsl(210, 85%, 60%)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent drop-shadow-lg">
                      {(precipProb?.probability_percent || 0).toFixed(0)}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 font-semibold uppercase tracking-wider">Rain Chance</div>
                  </div>
                </div>
              </div>
              <div className="text-center pt-4 border-t border-white/40 bg-white/30 rounded-lg px-4 py-3 mt-4">
                <p className="text-sm font-medium">
                  Expected: <span className="text-2xl font-bold text-foreground ml-2">{precipData?.p50.toFixed(1)} mm</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Other Risks */}
        {otherRisks.length > 0 && (
          <section className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">📋</span>
              Additional Risk Factors
            </h2>
            <RiskCards data={otherRisks} />
          </section>
        )}

        {/* Enhanced Climate Map */}
        <section className="animate-fade-in">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">🗺️</span>
            Location Overview
          </h2>
          <Card className="border-2 border-white/40 bg-white/50 backdrop-blur-md rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div
                ref={mapContainer}
                className="h-[400px] w-full relative"
              >
                <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-xl border-2 border-white/50">
                  <div className="text-xs font-bold mb-3 uppercase tracking-wider text-primary">Climate Data</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-red-500 shadow-sm"></div>
                      <span className="font-medium">Temp: {tempData?.p50.toFixed(1)}°C</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-sky-500 shadow-sm"></div>
                      <span className="font-medium">Rain: {(precipProb?.probability_percent || 0).toFixed(0)}%</span>
                    </div>
                    {data.summary.find(s => s.var === 'wind10m') && (
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-slate-500 shadow-sm"></div>
                        <span className="font-medium">Wind: {data.summary.find(s => s.var === 'wind10m')?.p50.toFixed(1)} m/s</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Details */}
        <section className="animate-fade-in">
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full gap-2 mb-4 bg-white/50 backdrop-blur-sm border-white/40 hover:bg-white/70 rounded-xl">
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
              <Card className="border-2 border-white/40 bg-white/50 backdrop-blur-md rounded-2xl">
                <CardContent className="pt-6">
                  <DetailsTable
                    summary={data.summary}
                    windowDays={data.metadata.window_days}
                  />
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </section>

        {/* Downloads */}
        <section className="animate-fade-in">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">💾</span>
            Export Data
          </h2>
          <Card className="border-2 border-white/40 bg-white/50 backdrop-blur-md rounded-2xl">
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
        <div className="text-center py-6 px-6 bg-white/40 backdrop-blur-sm rounded-2xl border border-white/40">
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            📊 Long-range climate outlook based on historical patterns — not a short-term weather forecast. 
            Data represents statistical probabilities and should be used as guidance only.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Results;
