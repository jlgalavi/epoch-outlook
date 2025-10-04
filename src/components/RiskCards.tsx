import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Flame,
  Snowflake,
  Wind,
  CloudRain,
  ThermometerSun,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface RiskLabel {
  risk_type:
    | "very_hot"
    | "very_cold"
    | "very_windy"
    | "very_wet"
    | "very_uncomfortable";
  level: "low" | "medium" | "high";
  probability_percent: number;
  rule_applied: string;
}

interface RiskCardsProps {
  data: RiskLabel[];
}

const riskConfig = {
  very_hot: {
    label: "Very Hot",
    icon: Flame,
    colorClass: "bg-gradient-to-br from-risk-hot/10 to-risk-hot/5 border-risk-hot/20",
    iconColor: "text-risk-hot",
  },
  very_cold: {
    label: "Very Cold",
    icon: Snowflake,
    colorClass: "bg-gradient-to-br from-risk-cold/10 to-risk-cold/5 border-risk-cold/20",
    iconColor: "text-risk-cold",
  },
  very_windy: {
    label: "Very Windy",
    icon: Wind,
    colorClass: "bg-gradient-to-br from-risk-wind/10 to-risk-wind/5 border-risk-wind/20",
    iconColor: "text-risk-wind",
  },
  very_wet: {
    label: "Very Wet",
    icon: CloudRain,
    colorClass: "bg-gradient-to-br from-risk-wet/10 to-risk-wet/5 border-risk-wet/20",
    iconColor: "text-risk-wet",
  },
  very_uncomfortable: {
    label: "Very Uncomfortable",
    icon: ThermometerSun,
    colorClass: "bg-gradient-to-br from-risk-uncomfortable/10 to-risk-uncomfortable/5 border-risk-uncomfortable/20",
    iconColor: "text-risk-uncomfortable",
  },
};

const levelConfig = {
  low: { label: "Low", color: "bg-risk-low text-white" },
  medium: { label: "Medium", color: "bg-risk-medium text-white" },
  high: { label: "High", color: "bg-risk-high text-white" },
};

export function RiskCards({ data }: RiskCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((risk) => {
        const config = riskConfig[risk.risk_type];
        const Icon = config.icon;
        const levelInfo = levelConfig[risk.level];

        return (
          <Card
            key={risk.risk_type}
            className={cn(
              "transition-all hover:shadow-lg border-2",
              config.colorClass
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-5 w-5", config.iconColor)} />
                  <CardTitle className="text-lg">{config.label}</CardTitle>
                </div>
                <Badge className={levelInfo.color}>{levelInfo.label}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">
                    {risk.probability_percent}%
                  </span>
                  <span className="text-sm text-muted-foreground">probability</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {risk.rule_applied}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
