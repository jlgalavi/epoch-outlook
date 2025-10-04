// Mock data for BFF endpoint
// In production, this would call the actual Model API

export interface OutlookParams {
  lat: number;
  lon: number;
  date: string;
  window?: number;
  units?: "metric" | "imperial";
}

// Generate diverse extreme scenarios for testing
function generateScenario(lat: number, lon: number, doy: number, units: "metric" | "imperial") {
  const hash = Math.abs(Math.sin(lat * lon * doy));
  
  // Extreme Hot Desert (40% chance)
  if (hash < 0.4) {
    return units === "metric" ? {
      temps: { mean: 42, tMax: 48, tMin: 35, std: 3.5 },
      precip: { mean: 0.1, p50: 0, p90: 0.5, rainChance: 5 },
      wind: { mean: 2.5, p90: 4.2 },
      risks: [
        { type: "very_hot", level: "high", prob: 85, rule: "Heat Index ≥ 40°C" },
        { type: "very_uncomfortable", level: "high", prob: 78, rule: "Extreme heat conditions" },
      ]
    } : {
      temps: { mean: 108, tMax: 118, tMin: 95, std: 6.3 },
      precip: { mean: 0.004, p50: 0, p90: 0.02, rainChance: 5 },
      wind: { mean: 5.6, p90: 9.4 },
      risks: [
        { type: "very_hot", level: "high", prob: 85, rule: "Heat Index ≥ 104°F" },
        { type: "very_uncomfortable", level: "high", prob: 78, rule: "Extreme heat conditions" },
      ]
    };
  }
  
  // Extreme Cold Winter (20% chance)
  if (hash < 0.6) {
    return units === "metric" ? {
      temps: { mean: -15, tMax: -8, tMin: -22, std: 4.2 },
      precip: { mean: 1.5, p50: 0.8, p90: 4.5, rainChance: 45 },
      wind: { mean: 8.5, p90: 14.2 },
      risks: [
        { type: "very_cold", level: "high", prob: 92, rule: "Wind Chill ≤ -20°C" },
        { type: "very_windy", level: "high", prob: 68, rule: "Wind speed ≥ 12 m/s" },
      ]
    } : {
      temps: { mean: 5, tMax: 18, tMin: -8, std: 7.6 },
      precip: { mean: 0.06, p50: 0.03, p90: 0.18, rainChance: 45 },
      wind: { mean: 19, p90: 32 },
      risks: [
        { type: "very_cold", level: "high", prob: 92, rule: "Wind Chill ≤ -4°F" },
        { type: "very_windy", level: "high", prob: 68, rule: "Wind speed ≥ 27 mph" },
      ]
    };
  }
  
  // Monsoon/Hurricane Season (20% chance)
  if (hash < 0.8) {
    return units === "metric" ? {
      temps: { mean: 28, tMax: 32, tMin: 24, std: 2.1 },
      precip: { mean: 45, p50: 38, p90: 95, rainChance: 88 },
      wind: { mean: 12, p90: 22 },
      risks: [
        { type: "very_wet", level: "high", prob: 88, rule: "Heavy rainfall ≥ 30mm/day" },
        { type: "very_windy", level: "high", prob: 75, rule: "Storm conditions ≥ 15 m/s" },
      ]
    } : {
      temps: { mean: 82, tMax: 90, tMin: 75, std: 3.8 },
      precip: { mean: 1.77, p50: 1.5, p90: 3.74, rainChance: 88 },
      wind: { mean: 27, p90: 49 },
      risks: [
        { type: "very_wet", level: "high", prob: 88, rule: "Heavy rainfall ≥ 1.2in/day" },
        { type: "very_windy", level: "high", prob: 75, rule: "Storm conditions ≥ 34 mph" },
      ]
    };
  }
  
  // Moderate/Pleasant (20% chance)
  return units === "metric" ? {
    temps: { mean: 22, tMax: 27, tMin: 17, std: 2.5 },
    precip: { mean: 2.5, p50: 1.2, p90: 8, rainChance: 35 },
    wind: { mean: 4.2, p90: 7.5 },
    risks: [
      { type: "very_wet", level: "low", prob: 15, rule: "Light rain possible" },
    ]
  } : {
    temps: { mean: 72, tMax: 81, tMin: 63, std: 4.5 },
    precip: { mean: 0.1, p50: 0.05, p90: 0.31, rainChance: 35 },
    wind: { mean: 9.4, p90: 16.8 },
    risks: [
      { type: "very_wet", level: "low", prob: 15, rule: "Light rain possible" },
    ]
  };
}

export async function getOutlook(params: OutlookParams) {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const { lat, lon, date, window = 15, units = "metric" } = params;

  // Parse date to get DOY
  const dateObj = new Date(date);
  const start = new Date(dateObj.getFullYear(), 0, 0);
  const diff = dateObj.getTime() - start.getTime();
  const doy = Math.floor(diff / (1000 * 60 * 60 * 24));

  // Create diverse scenarios based on location/date
  const scenario = generateScenario(lat, lon, doy, units);

  // Mock response matching the spec
  return {
    metadata: {
      latitude: Number(lat.toFixed(4)),
      longitude: Number(lon.toFixed(4)),
      date_requested: date,
      doy,
      window_days: window,
      years_used: 22,
      samples_n: window * 2 * 22,
      units,
      grid_resolution: "0.1deg",
      snap_rounded: true,
      disclaimer: "Climate-based outlook. Not a short-term forecast.",
      data_sources: [
        {
          name: "NASA POWER",
          version: "v9.0",
          period: "2001–present",
        },
      ],
      processing: {
        smoothing: "gaussian_doy",
        window_days: window,
      },
    },
    summary: [
      {
        var: "t_mean",
        unit: units === "metric" ? "°C" : "°F",
        mean: scenario.temps.mean,
        std: scenario.temps.std,
        p10: scenario.temps.mean - scenario.temps.std * 1.5,
        p25: scenario.temps.mean - scenario.temps.std * 0.7,
        p50: scenario.temps.mean,
        p75: scenario.temps.mean + scenario.temps.std * 0.7,
        p90: scenario.temps.mean + scenario.temps.std * 1.5,
      },
      {
        var: "t_max",
        unit: units === "metric" ? "°C" : "°F",
        mean: scenario.temps.tMax,
        std: scenario.temps.std,
        p10: scenario.temps.tMax - scenario.temps.std * 1.5,
        p25: scenario.temps.tMax - scenario.temps.std * 0.7,
        p50: scenario.temps.tMax,
        p75: scenario.temps.tMax + scenario.temps.std * 0.7,
        p90: scenario.temps.tMax + scenario.temps.std * 1.5,
      },
      {
        var: "t_min",
        unit: units === "metric" ? "°C" : "°F",
        mean: scenario.temps.tMin,
        std: scenario.temps.std,
        p10: scenario.temps.tMin - scenario.temps.std * 1.5,
        p25: scenario.temps.tMin - scenario.temps.std * 0.7,
        p50: scenario.temps.tMin,
        p75: scenario.temps.tMin + scenario.temps.std * 0.7,
        p90: scenario.temps.tMin + scenario.temps.std * 1.5,
      },
      {
        var: "rh_mean",
        unit: "%",
        mean: 48,
        std: 9,
        p10: 35,
        p25: 42,
        p50: 48,
        p75: 54,
        p90: 62,
      },
      {
        var: "dew_point",
        unit: units === "metric" ? "°C" : "°F",
        mean: units === "metric" ? 13.5 : 56.3,
        std: units === "metric" ? 1.7 : 3.1,
        p10: units === "metric" ? 11.2 : 52.2,
        p25: units === "metric" ? 12.3 : 54.1,
        p50: units === "metric" ? 13.4 : 56.1,
        p75: units === "metric" ? 14.5 : 58.1,
        p90: units === "metric" ? 15.8 : 60.4,
      },
      {
        var: "wind10m",
        unit: units === "metric" ? "m/s" : "mph",
        mean: scenario.wind.mean,
        std: scenario.wind.mean * 0.3,
        p10: scenario.wind.mean * 0.6,
        p25: scenario.wind.mean * 0.8,
        p50: scenario.wind.mean,
        p75: scenario.wind.mean * 1.2,
        p90: scenario.wind.p90,
      },
      {
        var: "precip_mm",
        unit: units === "metric" ? "mm/d" : "in/d",
        mean: scenario.precip.mean,
        std: scenario.precip.mean * 2.5,
        p10: 0.0,
        p25: scenario.precip.mean * 0.1,
        p50: scenario.precip.p50,
        p75: scenario.precip.mean * 0.7,
        p90: scenario.precip.p90,
      },
    ],
    probabilities: [
      {
        metric: "t_max",
        threshold: scenario.temps.tMax - 5,
        comparator: ">=",
        probability_percent: scenario.risks[0]?.prob || 20,
      },
      {
        metric: "precip_mm",
        threshold: units === "metric" ? 1 : 0.04,
        comparator: ">=",
        probability_percent: scenario.precip.rainChance,
      },
      {
        metric: "precip_mm",
        threshold: scenario.precip.p90 * 0.8,
        comparator: ">=",
        probability_percent: Math.min(scenario.precip.rainChance * 0.3, 10),
      },
      {
        metric: "wind10m",
        threshold: scenario.wind.p90 * 0.7,
        comparator: ">=",
        probability_percent: scenario.risks.find(r => r.type === "very_windy")?.prob || 10,
      },
    ],
    risk_labels: scenario.risks.map(r => ({
      risk_type: r.type as any,
      level: r.level as any,
      probability_percent: r.prob,
      rule_applied: r.rule,
    })),
    raw_sample_snapshot: [
      {
        date_iso: "2004-08-10",
        t_mean: units === "metric" ? 25.7 : 78.3,
        t_max: units === "metric" ? 31.1 : 88.0,
        t_min: units === "metric" ? 19.2 : 66.6,
        rh_mean: 47,
        dew_point: units === "metric" ? 13.2 : 55.8,
        wind10m: units === "metric" ? 3.1 : 6.9,
        precip_mm: 0.0,
      },
    ],
  };
}
