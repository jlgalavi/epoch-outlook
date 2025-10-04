import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LocationPicker } from "@/components/LocationPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertCircle, CalendarIcon, MapPin, Settings2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const Index = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState<{ lat: number; lon: number }>();
  const [date, setDate] = useState<Date>();
  const [window, setWindow] = useState(15);
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const [error, setError] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const handleGetOutlook = () => {
    setError("");

    if (!location) {
      setError("Please select a location on the map.");
      return;
    }

    if (!date) {
      setError("Please select a date.");
      return;
    }

    const dateStr = format(date, "yyyy-MM-dd");
    navigate(
      `/results?lat=${location.lat}&lon=${location.lon}&date=${dateStr}&window=${window}&units=${units}`
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-[image:var(--gradient-hero)] text-white py-16 px-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
        <div className="max-w-4xl mx-auto text-center relative">
          <h1 className="text-5xl font-bold mb-4">Climate Outlook</h1>
          <p className="text-xl text-white/90">
            Long-range climate-based outlook for your location
          </p>
        </div>
      </div>

      {/* Search Panel */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card className="shadow-2xl border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Select Location & Date
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Location */}
            <div className="space-y-2">
              <Label>Location</Label>
              <LocationPicker value={location} onChange={setLocation} />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Advanced Options */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full gap-2">
                  <Settings2 className="h-4 w-4" />
                  Advanced Options
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="window">Window (days)</Label>
                    <Input
                      id="window"
                      type="number"
                      min={1}
                      max={30}
                      value={window}
                      onChange={(e) => setWindow(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      ±{window} days around selected date
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="units">Units</Label>
                    <select
                      id="units"
                      value={units}
                      onChange={(e) =>
                        setUnits(e.target.value as "metric" | "imperial")
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="metric">Metric</option>
                      <option value="imperial">Imperial</option>
                    </select>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* CTA */}
            <Button
              onClick={handleGetOutlook}
              size="lg"
              className="w-full text-lg"
            >
              Get Climate Outlook
            </Button>

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground text-center mt-4">
              This is a long-range outlook based on historical climate patterns. This is not a short-term forecast.
            </p>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="mt-8 text-center">
          <Button
            variant="link"
            onClick={() => navigate("/about")}
            className="text-primary"
          >
            Learn about our methodology →
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
