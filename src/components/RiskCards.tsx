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
    colorClass: {
      low: "bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-300 dark:border-orange-800",
      medium: "bg-gradient-to-br from-orange-200 to-orange-100 dark:from-orange-900/50 dark:to-orange-800/30 border-orange-400 dark:border-orange-700",
      high: "bg-gradient-to-br from-red-500/90 to-orange-500/80 dark:from-red-600/90 dark:to-orange-600/80 border-red-600 dark:border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]",
    },
    iconColor: "text-risk-hot",
    animation: "animate-pulse",
    emoji: "🔥",
    description: "High temperatures expected",
  },
  very_cold: {
    label: "Very Cold",
    icon: Snowflake,
    colorClass: {
      low: "bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-300 dark:border-blue-800",
      medium: "bg-gradient-to-br from-blue-200 to-blue-100 dark:from-blue-900/50 dark:to-blue-800/30 border-blue-400 dark:border-blue-700",
      high: "bg-gradient-to-br from-blue-500/90 to-cyan-500/80 dark:from-blue-600/90 dark:to-cyan-600/80 border-blue-600 dark:border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.5)]",
    },
    iconColor: "text-risk-cold",
    animation: "animate-[spin_3s_linear_infinite]",
    emoji: "❄️",
    description: "Low temperatures expected",
  },
  very_windy: {
    label: "Very Windy",
    icon: Wind,
    colorClass: {
      low: "bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-950/30 dark:to-slate-900/20 border-slate-300 dark:border-slate-800",
      medium: "bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/30 border-slate-400 dark:border-slate-700",
      high: "bg-gradient-to-br from-slate-600/90 to-gray-500/80 dark:from-slate-700/90 dark:to-gray-600/80 border-slate-700 dark:border-slate-600 shadow-[0_0_30px_rgba(100,116,139,0.5)]",
    },
    iconColor: "text-risk-wind",
    animation: "animate-[bounce_1s_ease-in-out_infinite]",
    emoji: "💨",
    description: "Strong winds expected",
  },
  very_wet: {
    label: "Very Wet",
    icon: CloudRain,
    colorClass: {
      low: "bg-gradient-to-br from-sky-100 to-sky-50 dark:from-sky-950/30 dark:to-sky-900/20 border-sky-300 dark:border-sky-800",
      medium: "bg-gradient-to-br from-sky-200 to-sky-100 dark:from-sky-900/50 dark:to-sky-800/30 border-sky-400 dark:border-sky-700",
      high: "bg-gradient-to-br from-sky-600/90 to-blue-600/80 dark:from-sky-700/90 dark:to-blue-700/80 border-sky-700 dark:border-sky-600 shadow-[0_0_30px_rgba(14,165,233,0.5)]",
    },
    iconColor: "text-risk-wet",
    animation: "animate-[bounce_2s_ease-in-out_infinite]",
    emoji: "💧",
    description: "Heavy rain expected",
  },
  very_uncomfortable: {
    label: "Very Uncomfortable",
    icon: ThermometerSun,
    colorClass: {
      low: "bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-300 dark:border-amber-800",
      medium: "bg-gradient-to-br from-amber-200 to-amber-100 dark:from-amber-900/50 dark:to-amber-800/30 border-amber-400 dark:border-amber-700",
      high: "bg-gradient-to-br from-amber-500/90 to-yellow-500/80 dark:from-amber-600/90 dark:to-yellow-600/80 border-amber-600 dark:border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.5)]",
    },
    iconColor: "text-risk-uncomfortable",
    animation: "animate-pulse",
    emoji: "😓",
    description: "Uncomfortable conditions",
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
      <Card className={cn("overflow-hidden border-2 transition-all hover:shadow-2xl", config.colorClass[risk.level])}>
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className={cn(
              "relative p-8 rounded-full",
              risk.level === "high" ? "bg-white/90 dark:bg-black/50" : "bg-card/50",
              config.iconColor
            )}>
              <Icon className={cn("h-20 w-20", config.animation)} />
              <div className="absolute -top-2 -right-2 text-4xl">{config.emoji}</div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <h2 className="text-3xl font-bold">{config.label}</h2>
                <Badge className={cn(levelInfo.color, "text-base px-4 py-1 animate-pulse")}>
                  {levelInfo.label} Risk
                </Badge>
              </div>
              <p className="text-6xl font-bold my-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {risk.probability_percent}%
              </p>
              <p className="text-lg text-muted-foreground mb-4">
                {config.description}
              </p>
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  {risk.rule_applied}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {data.map((risk) => {
        const config = riskConfig[risk.risk_type];
        const Icon = config.icon;
        const levelInfo = levelConfig[risk.level];

        return (
          <Card
            key={risk.risk_type}
            className={cn(
              "group transition-all hover:scale-105 hover:shadow-xl border-2 overflow-hidden",
              config.colorClass[risk.level]
            )}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className={cn(
                  "relative p-3 rounded-xl",
                  risk.level === "high" ? "bg-white/90 dark:bg-black/50" : "bg-card/50",
                  config.iconColor
                )}>
                  <Icon className={cn("h-8 w-8", config.animation)} />
                  <div className="absolute -top-1 -right-1 text-xl">{config.emoji}</div>
                </div>
                <Badge className={cn(levelInfo.color, "px-3 py-1")}>
                  {levelInfo.label}
                </Badge>
              </div>
              <CardTitle className="text-xl">{config.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    {risk.probability_percent}%
                  </p>
                  <p className="text-sm text-muted-foreground">chance</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {config.description}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
