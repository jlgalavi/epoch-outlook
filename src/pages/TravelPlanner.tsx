import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MapPin, Plus, Trash2, Navigation, CalendarIcon } from "lucide-react";
import { LocationPicker } from "@/components/LocationPicker";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Waypoint {
  id: string;
  name: string;
  location: { lat: number; lon: number };
  date?: Date;
}

const TravelPlanner = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Route planning state
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [currentName, setCurrentName] = useState("");
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>();

  const handleLocationChange = async (location: { lat: number; lon: number } | null) => {
    setCurrentLocation(location);
    
    if (location) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lon}`
        );
        const data = await response.json();
        
        if (data && data.display_name) {
          // Extract a shorter, more readable name
          const name = data.name || data.address?.city || data.address?.town || 
                      data.address?.village || data.address?.country || 
                      data.display_name.split(',')[0];
          setCurrentName(name);
        }
      } catch (error) {
        console.error("Error fetching location name:", error);
      }
    }
  };

  const addWaypoint = () => {
    if (!currentName.trim()) {
      toast({
        title: "Missing name",
        description: "Please enter a name for this location.",
        variant: "destructive",
      });
      return;
    }

    if (!currentLocation) {
      toast({
        title: "Missing location",
        description: "Please select a location on the map.",
        variant: "destructive",
      });
      return;
    }

    const newWaypoint: Waypoint = {
      id: Date.now().toString(),
      name: currentName,
      location: currentLocation,
      date: currentDate,
    };

    setWaypoints([...waypoints, newWaypoint]);
    setCurrentName("");
    setCurrentLocation(null);
    setCurrentDate(undefined);

    toast({
      title: "Location added",
      description: `${currentName} has been added to your route.`,
    });
  };

  const removeWaypoint = (id: string) => {
    setWaypoints(waypoints.filter(wp => wp.id !== id));
  };

  const calculateRoute = () => {
    if (waypoints.length < 2) {
      toast({
        title: "Not enough locations",
        description: "Please add at least 2 locations to plan a route.",
        variant: "destructive",
      });
      return;
    }

    // Navigate to results page with waypoint data
    const routeData = encodeURIComponent(JSON.stringify(waypoints));
    navigate(`/travel-results?route=${routeData}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(200_100%_88%)] via-[hsl(190_95%_85%)] to-[hsl(45_100%_88%)]">
      {/* Header */}
      <header className="w-full py-4 px-6 border-b border-white/20 bg-white/30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Travel Route Planner
            </h1>
          </div>
          <Button variant="ghost" onClick={() => navigate("/")}>
            Back to Climate
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Location Card */}
          <Card className="p-6 shadow-xl border-white/40 bg-white/40 backdrop-blur-md rounded-2xl">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Add Location
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location-name">Location Name</Label>
                <Input
                  id="location-name"
                  value={currentName}
                  onChange={(e) => setCurrentName(e.target.value)}
                  placeholder="e.g., Paris, Tokyo, New York"
                />
              </div>

              <div className="space-y-2">
                <Label>Select on Map</Label>
                <LocationPicker
                  value={currentLocation || undefined}
                  onChange={handleLocationChange}
                  searchEnabled={true}
                />
              </div>

              <div className="space-y-2">
                <Label>Visit Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !currentDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {currentDate ? format(currentDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={currentDate}
                      onSelect={setCurrentDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button onClick={addWaypoint} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add to Route
              </Button>
            </div>
          </Card>

          {/* Route Overview Card */}
          <Card className="p-6 shadow-xl border-white/40 bg-white/40 backdrop-blur-md rounded-2xl">
            <h2 className="text-xl font-semibold mb-4">Your Route</h2>
            
            {waypoints.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No locations added yet</p>
                <p className="text-sm mt-1">Add at least 2 locations to plan your route</p>
              </div>
            ) : (
              <div className="space-y-3">
                {waypoints.map((waypoint, index) => (
                  <div
                    key={waypoint.id}
                    className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-white/60"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{waypoint.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {waypoint.location.lat.toFixed(4)}, {waypoint.location.lon.toFixed(4)}
                        </p>
                        {waypoint.date && (
                          <p className="text-xs text-primary mt-1">
                            {format(waypoint.date, "PPP")}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeWaypoint(waypoint.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button onClick={calculateRoute} className="w-full mt-4" size="lg">
                  <Navigation className="h-4 w-4 mr-2" />
                  Plan Route ({waypoints.length} stops)
                </Button>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default TravelPlanner;
