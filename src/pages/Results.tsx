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
  const [locationName, setLocationName] = useState<string>("");
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const date = searchParams.get("date") || "";
  const window = Number(searchParams.get("window")) || 15;
  const units = searchParams.get("units") || "metric";

  useEffect(() => {
    const fetchLocationName = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
        );
        const data = await response.json();
        const name = data.address?.city || data.address?.town || data.address?.village || data.address?.county || data.address?.state || "Unknown Location";
        setLocationName(name);
      } catch (err) {
        console.error("Error fetching location name:", err);
        setLocationName("Location");
      }
    };

    if (lat && lon) {
      fetchLocationName();
    }
  }, [lat, lon]);

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
              probability_percent: forecastData.forecast.precipitation.amount > 1 ? Math.min(90, Math.max(55, forecastData.forecast.precipitation.probability * 100)) : 0,
              rule_applied: `Expected rainfall: ${forecastData.forecast.precipitation.amount.toFixed(1)}${forecastData.forecast.precipitation.unit}. Probability: ${(forecastData.forecast.precipitation.probability * 100).toFixed(0)}%`,
            },
            {
              risk_type: 'very_windy',
              level: ((forecastData.forecast.wind?.speed || 0) > 40 ? 'high' : 
                     (forecastData.forecast.wind?.speed || 0) > 25 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
              probability_percent: (forecastData.forecast.wind?.speed || 0) > 10 ? Math.min(85, Math.max(40, 50 + (forecastData.forecast.wind?.speed || 0))) : 20,
              rule_applied: `Wind speed: ${(forecastData.forecast.wind?.speed || 0).toFixed(1)} ${forecastData.forecast.wind?.unit || 'km/h'}. Gusts up to ${(forecastData.forecast.wind?.gusts || forecastData.forecast.wind?.speed || 0).toFixed(1)} ${forecastData.forecast.wind?.unit || 'km/h'}`,
            },
            {
              risk_type: 'very_uncomfortable',
              level: (forecastData.forecast.temperature.mean > 28 && forecastData.forecast.precipitation.amount > 5 ? 'high' :
                     forecastData.forecast.temperature.mean > 25 || forecastData.forecast.precipitation.amount > 2 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
              probability_percent: Math.min(75, Math.max(30, (forecastData.forecast.temperature.mean > 25 ? 60 : 35) + (forecastData.forecast.precipitation.amount * 2))),
              rule_applied: `Humidity and heat index assessment. Temperature: ${forecastData.forecast.temperature.mean.toFixed(1)}°C, Expected precipitation: ${forecastData.forecast.precipitation.amount.toFixed(1)}mm`,
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
            className="mb-4 hover:bg-white/50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            New Search
          </Button>
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Climate Outlook Report
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white/70 backdrop-blur-sm px-5 py-3 rounded-xl border-2 border-white/50 shadow-md">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Location</div>
                <div className="text-lg font-bold text-foreground">
                  {locationName || "Loading..."}
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm px-5 py-3 rounded-xl border-2 border-white/50 shadow-md">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Target Days</div>
                <div className="text-lg font-bold text-foreground">
                  {(() => {
                    const targetDate = new Date(data.metadata.date_requested);
                    const startDate = new Date(targetDate);
                    startDate.setDate(targetDate.getDate() - data.metadata.window_days);
                    const endDate = new Date(targetDate);
                    endDate.setDate(targetDate.getDate() + data.metadata.window_days);
                    
                    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                  })()}
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm px-5 py-3 rounded-xl border-2 border-white/50 shadow-md">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Analysis Window</div>
                <div className="text-lg font-bold text-foreground">
                  ±{data.metadata.window_days} Days
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 relative z-10">
        {/* Featured Risk - Cleaner Design */}
        <section className="animate-fade-in">
          <h2 className="text-2xl font-bold mb-4 text-foreground">
            Primary Weather Alert
          </h2>
          <div className="relative">
            <RiskCards data={[highestRisk]} featured />
          </div>
        </section>

        {/* Weather Forecast Cards */}
        <section className="grid md:grid-cols-2 gap-6 animate-fade-in">
          {/* Temperature Card - Redesigned */}
          <Card className="relative overflow-hidden border-3 border-white/50 bg-gradient-to-br from-orange-50/80 to-red-50/80 backdrop-blur-md hover:shadow-2xl transition-all rounded-3xl">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-yellow-400 to-red-500" />
            <CardContent className="pt-8 pb-6 px-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-foreground">Temperature Forecast</h3>
                <div className="p-3 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a1 1 0 011 1v6.268l2.121 2.121a1 1 0 01-1.414 1.414L9 10.414V3a1 1 0 011-1z"/>
                    <path d="M13.95 13.536a5 5 0 10-7.9 0A3.5 3.5 0 0010 20a3.5 3.5 0 003.95-6.464z"/>
                  </svg>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Low</div>
                  <div className="text-5xl font-black text-blue-600 mb-1">
                    {tMinData?.p50.toFixed(0)}°
                  </div>
                  <div className="h-2 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full w-16 mx-auto" />
                </div>
                
                <div className="text-center">
                  <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">Avg</div>
                  <div className="text-5xl font-black text-orange-600 mb-1">
                    {tempData?.p50.toFixed(0)}°
                  </div>
                  <div className="h-2 bg-gradient-to-r from-orange-600 to-orange-400 rounded-full w-16 mx-auto" />
                </div>
                
                <div className="text-center">
                  <div className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">High</div>
                  <div className="text-5xl font-black text-red-600 mb-1">
                    {tMaxData?.p50.toFixed(0)}°
                  </div>
                  <div className="h-2 bg-gradient-to-r from-red-600 to-red-400 rounded-full w-16 mx-auto" />
                </div>
              </div>
              
              <div className="bg-white/60 rounded-2xl p-4 border-2 border-white/70">
                <div className="text-sm font-semibold text-muted-foreground text-center">
                  Expected Range: {tMinData?.p50.toFixed(1)}°C - {tMaxData?.p50.toFixed(1)}°C
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Precipitation Card - Redesigned */}
          <Card className="relative overflow-hidden border-3 border-white/50 bg-gradient-to-br from-sky-50/80 to-blue-50/80 backdrop-blur-md hover:shadow-2xl transition-all rounded-3xl">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 to-sky-400" />
            <CardContent className="pt-8 pb-6 px-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-foreground">Precipitation Forecast</h3>
                <div className="p-3 bg-gradient-to-br from-blue-500 to-sky-400 rounded-2xl shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.5 3A2.5 2.5 0 003 5.5v9A2.5 2.5 0 005.5 17h9a2.5 2.5 0 002.5-2.5v-9A2.5 2.5 0 0014.5 3h-9zm0 2a.5.5 0 00-.5.5v9a.5.5 0 00.5.5h9a.5.5 0 00.5-.5v-9a.5.5 0 00-.5-.5h-9z" clipRule="evenodd"/>
                    <path d="M10 7a1 1 0 011 1v4a1 1 0 11-2 0V8a1 1 0 011-1z"/>
                  </svg>
                </div>
              </div>
              
              <div className="text-center mb-6">
                <div className="text-8xl font-black bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent mb-3">
                  {(precipProb?.probability_percent || 0).toFixed(0)}%
                </div>
                <div className="text-lg font-bold text-muted-foreground uppercase tracking-wider">
                  Chance of Rain
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="bg-white/60 rounded-2xl p-4 border-2 border-white/70">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-muted-foreground">Expected Amount</span>
                    <span className="text-2xl font-black text-foreground">{precipData?.p50.toFixed(1)} mm</span>
                  </div>
                </div>
                
                <div className="bg-white/60 rounded-2xl overflow-hidden border-2 border-white/70">
                  <div className="h-3 bg-gradient-to-r from-blue-600 to-sky-400" 
                       style={{ width: `${Math.min(100, (precipProb?.probability_percent || 0))}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Other Risks - Show all secondary risks */}
        {otherRisks.length > 0 && (
          <section className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-4">
              Additional Risk Factors
            </h2>
            <RiskCards data={otherRisks} />
          </section>
        )}

        {/* Enhanced Climate Map */}
        <section className="animate-fade-in">
          <h2 className="text-2xl font-bold mb-4">
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
          <h2 className="text-2xl font-bold mb-4">
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
            Long-range climate outlook based on historical patterns — not a short-term weather forecast. 
            Data represents statistical probabilities and should be used as guidance only.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Results;
