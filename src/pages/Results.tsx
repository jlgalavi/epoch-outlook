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
          <h1 className="text-3xl font-bold mb-2">Climate Outlook Results</h1>
          <div className="text-white/90 space-y-1">
            <p>
              Location: {data.metadata.latitude.toFixed(4)}°N,{" "}
              {data.metadata.longitude.toFixed(4)}°E
            </p>
            <p>
              Date: {data.metadata.date_requested} (Day of Year: {data.metadata.doy})
            </p>
            <p>
              Window: ±{data.metadata.window_days} days | Samples:{" "}
              {data.metadata.samples_n} from {data.metadata.years_used} years
            </p>
          </div>
          <Alert className="mt-4 bg-white/10 border-white/20 text-white backdrop-blur-sm">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Long-range outlook based on historical climate patterns. This is not a short-term forecast.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Risk Cards */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Risk Assessment</h2>
          <RiskCards data={data.risk_labels} />
        </section>

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
          <h2 className="text-2xl font-bold mb-4">Export Data</h2>
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
      </div>
    </div>
  );
};

export default Results;
