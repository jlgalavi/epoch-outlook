import { Card, CardContent } from "@/components/ui/card";
import { Cloud, Sun, Moon, Droplets, Wind, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";

interface DailyData {
  date: string;
  tempMin: number;
  tempMax: number;
  tempDayMean: number;
  tempNightMean: number;
  precipitation: number;
  windSpeed: number;
  uvIndex: number;
  cloudCover: number;
  humidity: number;
}

interface DailyForecastProps {
  dailyData: DailyData[];
  averages: {
    tempMin: number;
    tempMax: number;
    tempMean: number;
    tempDayMean: number;
    tempNightMean: number;
    precipitation: number;
    windSpeed: number;
    uvIndex: number;
  };
  units: string;
}

export const DailyForecast = ({ dailyData, averages, units }: DailyForecastProps) => {
  const getTempColor = (temp: number) => {
    if (temp < 5) return '#3b82f6';
    if (temp < 15) return '#0891b2';
    if (temp < 25) return '#10b981';
    if (temp < 30) return '#f59e0b';
    if (temp < 33) return '#f97316';
    return '#ef4444';
  };

  const getComparison = (value: number, average: number, metric: string) => {
    const diff = value - average;
    const percentDiff = Math.abs((diff / average) * 100);
    
    if (Math.abs(diff) < 0.5) return null;
    
    const isHigher = diff > 0;
    let label = '';
    
    if (metric === 'temp') {
      if (percentDiff > 20) label = isHigher ? 'Much hotter' : 'Much colder';
      else if (percentDiff > 10) label = isHigher ? 'Warmer' : 'Cooler';
      else label = isHigher ? 'Slightly warmer' : 'Slightly cooler';
    } else if (metric === 'precip') {
      if (percentDiff > 50) label = isHigher ? 'Much wetter' : 'Much drier';
      else label = isHigher ? 'Wetter' : 'Drier';
    }
    
    return { label, isHigher, diff: Math.abs(diff) };
  };

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold">Daily Forecast</h3>
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {dailyData.map((day, index) => {
            const dayMean = (day.tempMin + day.tempMax) / 2;
            const tempComparison = getComparison(dayMean, averages.tempMean, 'temp');
            const precipComparison = getComparison(day.precipitation, averages.precipitation, 'precip');
            
            return (
              <Card 
                key={day.date}
                className="flex-shrink-0 w-72 hover:shadow-lg transition-all duration-300 hover:scale-105 border-2"
                style={{
                  background: `linear-gradient(135deg, ${getTempColor(dayMean)}15, ${getTempColor(dayMean)}05)`,
                  borderColor: `${getTempColor(dayMean)}40`
                }}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="text-center">
                    <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {format(new Date(day.date), 'EEE, MMM d')}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Day {index + 1} of {dailyData.length}
                    </div>
                  </div>

                  {/* Temperature Display */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sun className="w-5 h-5" style={{ color: getTempColor(day.tempDayMean) }} />
                        <span className="text-sm font-medium">Day</span>
                      </div>
                      <span className="text-2xl font-bold" style={{ color: getTempColor(day.tempDayMean) }}>
                        {day.tempDayMean}°
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Moon className="w-5 h-5" style={{ color: getTempColor(day.tempNightMean) }} />
                        <span className="text-sm font-medium">Night</span>
                      </div>
                      <span className="text-2xl font-bold" style={{ color: getTempColor(day.tempNightMean) }}>
                        {day.tempNightMean}°
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Range: {day.tempMin}° - {day.tempMax}°</span>
                    </div>
                  </div>

                  {/* Comparison Badge */}
                  {tempComparison && (
                    <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-background/60">
                      {tempComparison.isHigher ? (
                        <TrendingUp className="w-4 h-4 text-orange-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-blue-500" />
                      )}
                      <span className="text-sm font-medium">
                        {tempComparison.label} than average
                      </span>
                    </div>
                  )}

                  {/* Weather Details */}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-blue-500" />
                        <span>Rain</span>
                      </div>
                      <span className="font-semibold">{day.precipitation} mm</span>
                    </div>
                    
                    {precipComparison && (
                      <div className="text-xs text-muted-foreground pl-6">
                        {precipComparison.label} than average
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Wind className="w-4 h-4 text-gray-500" />
                        <span>Wind</span>
                      </div>
                      <span className="font-semibold">{day.windSpeed} km/h</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Cloud className="w-4 h-4 text-gray-500" />
                        <span>Cloud</span>
                      </div>
                      <span className="font-semibold">{day.cloudCover}%</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4 text-yellow-500" />
                        <span>UV Index</span>
                      </div>
                      <span className="font-semibold">{day.uvIndex}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
