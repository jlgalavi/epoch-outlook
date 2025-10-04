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
  featured?: boolean;
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

export function RiskCards({ data, featured = false }: RiskCardsProps) {
  if (featured && data.length === 1) {
    const risk = data[0];
    const config = riskConfig[risk.risk_type];
    const levelInfo = levelConfig[risk.level];
    const Icon = config.icon;

    return (
      <Card className={cn("overflow-hidden border-2", config.colorClass)}>
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className={cn("p-8 rounded-full bg-card/50", config.iconColor)}>
              <Icon className="h-16 w-16" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <h2 className="text-3xl font-bold">{config.label}</h2>
                <Badge className={cn(levelInfo.color, "text-base px-4 py-1")}>
                  {levelInfo.label}
                </Badge>
              </div>
              <p className="text-5xl font-bold my-4">{risk.probability_percent}%</p>
              <p className="text-lg text-muted-foreground">
                Probability of occurrence
              </p>
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  Based on: {risk.rule_applied}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {data.map((risk) => {
        const config = riskConfig[risk.risk_type];
        const Icon = config.icon;
        const levelInfo = levelConfig[risk.level];

        return (
          <Card
            key={risk.risk_type}
            className={cn(
              "transition-all hover:shadow-lg border",
              config.colorClass
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <div className={cn("p-2 rounded-lg bg-card/50", config.iconColor)}>
                  <Icon className="h-5 w-5" />
                </div>
                <Badge className={levelInfo.color}>{levelInfo.label}</Badge>
              </div>
              <CardTitle className="text-base">{config.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    {risk.probability_percent}%
                  </p>
                </div>
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {risk.rule_applied}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
