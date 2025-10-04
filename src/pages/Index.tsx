import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Search, ChevronDown, ChevronUp } from "lucide-react";
import { AnimatedCharacter } from "@/components/AnimatedCharacter";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LocationPicker } from "@/components/LocationPicker";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

interface Message {
  role: "user" | "assistant";
  content: string;
  action?: {
    type: "search";
    location?: string;
    date?: Date;
  };
}

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const manualSearchRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm Clima, your climate research assistant 🌤️\n\nI can help you search for climate outlooks for any location and date. Just tell me what you want to know!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [characterMood, setCharacterMood] = useState<"happy" | "thinking" | "excited">("happy");
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  
  // Search state
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [windowDays, setWindowDays] = useState(15);
  const [units, setUnits] = useState("metric");
  
  // Calculate max date (1 year from today)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);

  // Generate years array (current year to next year)
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1];
  
  // Months array
  const months = [
    { value: "0", label: "January" },
    { value: "1", label: "February" },
    { value: "2", label: "March" },
    { value: "3", label: "April" },
    { value: "4", label: "May" },
    { value: "5", label: "June" },
    { value: "6", label: "July" },
    { value: "7", label: "August" },
    { value: "8", label: "September" },
    { value: "9", label: "October" },
    { value: "10", label: "November" },
    { value: "11", label: "December" },
  ];

  // Update selectedDate when individual selectors change
  useEffect(() => {
    if (selectedMonth && selectedDay && selectedYear) {
      const date = new Date(parseInt(selectedYear), parseInt(selectedMonth), parseInt(selectedDay));
      setSelectedDate(date);
    }
  }, [selectedMonth, selectedDay, selectedYear]);

  // Get days in selected month
  const getDaysInMonth = () => {
    if (!selectedMonth || !selectedYear) return 31;
    return new Date(parseInt(selectedYear), parseInt(selectedMonth) + 1, 0).getDate();
  };

  const performSearch = (location: { lat: number; lon: number }, date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    navigate(`/results?lat=${location.lat}&lon=${location.lon}&date=${dateStr}&window=${windowDays}&units=${units}`);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setCharacterMood("thinking");

    try {
      const { data, error } = await supabase.functions.invoke("climate-assistant", {
        body: { 
          message: input,
          context: "home_search"
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.reply || "I'm sorry, I couldn't process that request.",
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      
      // Handle extracted search parameters
      if (data.searchParams) {
        const { location, date } = data.searchParams;
        
        // If we have a location, geocode it and populate the manual search
        if (location) {
          try {
            const geoResponse = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`
            );
            const geoData = await geoResponse.json();
            
            if (geoData && geoData[0]) {
              setSelectedLocation({
                lat: parseFloat(geoData[0].lat),
                lon: parseFloat(geoData[0].lon)
              });
            }
          } catch (err) {
            console.error("Error geocoding location:", err);
          }
        }
        
        // If we have a date, populate the manual search
        if (date) {
          const dateObj = new Date(date);
          setSelectedDate(dateObj);
          setSelectedMonth(dateObj.getMonth().toString());
          setSelectedDay(dateObj.getDate().toString());
          setSelectedYear(dateObj.getFullYear().toString());
        }
        
        // Show a message that the search fields have been populated
        if (location || date) {
          const followUpMessage: Message = {
            role: "assistant",
            content: "I've populated the search fields below with the information you provided. Please review and click 'Get Climate Outlook' when ready!",
          };
          setMessages((prev) => [...prev, followUpMessage]);
          
          // Scroll to manual search section
          setTimeout(() => {
            manualSearchRef.current?.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }, 500);
        }
      }
      
      setCharacterMood("happy");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to get response from Clima. Please try again.",
        variant: "destructive",
      });
      setCharacterMood("happy");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickSearch = () => {
    if (selectedLocation && selectedDate) {
      performSearch(selectedLocation, selectedDate);
    } else {
      toast({
        title: "Missing information",
        description: "Please select both a location and date for your search.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (isLoading) {
      setCharacterMood("thinking");
    } else {
      setCharacterMood("happy");
    }
  }, [isLoading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(210_90%_92%)] via-[hsl(185_100%_88%)] to-[hsl(160_80%_85%)] flex flex-col">
      {/* Header */}
      <header className="w-full py-4 px-6 border-b border-white/20 bg-white/30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Climate Outlook
            </h1>
          </div>
          <Button variant="ghost" onClick={() => navigate("/about")}>
            About
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-8">
          {/* Character */}
          <div className="flex flex-col items-center gap-6 animate-fade-in">
            <AnimatedCharacter isSpeaking={isLoading} mood={characterMood} />
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">Meet Clima</h2>
              <p className="text-muted-foreground">
                Your AI-powered climate research companion
              </p>
            </div>
          </div>

          {/* Collapsible Chat Bar */}
          <Card className="w-full shadow-xl animate-fade-in border-white/40 bg-white/40 backdrop-blur-md">
            {!isChatExpanded ? (
              /* Collapsed Write Bar */
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-lg">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={() => setIsChatExpanded(true)}
                    placeholder="Ask Clima about climate data... (click to expand)"
                    className="text-base"
                  />
                  <Button onClick={() => setIsChatExpanded(true)} size="icon" className="shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              /* Expanded Chat Interface */
              <div className="flex flex-col h-[280px]">
                {/* Messages */}
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl p-4 ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground shadow-lg"
                              : "bg-muted shadow-md"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start animate-fade-in">
                        <div className="bg-muted rounded-2xl p-4 shadow-md">
                          <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t border-white/30 bg-white/20 backdrop-blur-sm">
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me about climate data, locations, or trends..."
                      disabled={isLoading}
                      className="text-base"
                    />
                    <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon" className="shrink-0">
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => setIsChatExpanded(false)} variant="ghost" size="icon" className="shrink-0">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Try: "What's the weather outlook for Miami next month?"
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Manual Search Card */}
          <Card ref={manualSearchRef} className="w-full p-6 shadow-xl animate-fade-in border-white/40 bg-white/40 backdrop-blur-md">
            <div className="space-y-4">
              <LocationPicker
                value={selectedLocation || undefined}
                onChange={setSelectedLocation}
                searchEnabled={true}
              />
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="month">Month</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger id="month">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="day">Day</Label>
                  <Select value={selectedDay} onValueChange={setSelectedDay}>
                    <SelectTrigger id="day">
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: getDaysInMonth() }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger id="year">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Forecast limited to 1 year ahead (SARIMAX model constraint)
              </p>
              
              {/* Advanced Settings */}
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    Advanced Settings
                    {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="window">Forecast Window: {windowDays} days</Label>
                    <Slider
                      id="window"
                      min={7}
                      max={30}
                      step={1}
                      value={[windowDays]}
                      onValueChange={(value) => setWindowDays(value[0])}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of days to analyze for climate outlook
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="units">Temperature Units</Label>
                    <Select value={units} onValueChange={setUnits}>
                      <SelectTrigger id="units">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="metric">Celsius (°C)</SelectItem>
                        <SelectItem value="imperial">Fahrenheit (°F)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CollapsibleContent>
              </Collapsible>
              
              <Button onClick={handleQuickSearch} className="w-full" disabled={!selectedLocation || !selectedDate}>
                <Search className="h-4 w-4 mr-2" />
                Get Climate Outlook
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;
