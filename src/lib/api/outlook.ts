// Mock data for BFF endpoint
// In production, this would call the actual Model API

export interface OutlookParams {
  lat: number;
  lon: number;
  date: string;
  window?: number;
  units?: "metric" | "imperial";
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
        mean: units === "metric" ? 25.4 : 77.7,
        std: units === "metric" ? 2.1 : 3.8,
        p10: units === "metric" ? 22.0 : 71.6,
        p25: units === "metric" ? 24.0 : 75.2,
        p50: units === "metric" ? 25.3 : 77.5,
        p75: units === "metric" ? 26.7 : 80.1,
        p90: units === "metric" ? 28.9 : 84.0,
      },
      {
        var: "t_max",
        unit: units === "metric" ? "°C" : "°F",
        mean: units === "metric" ? 31.2 : 88.2,
        std: units === "metric" ? 2.6 : 4.7,
        p10: units === "metric" ? 27.9 : 82.2,
        p25: units === "metric" ? 29.8 : 85.6,
        p50: units === "metric" ? 31.0 : 87.8,
        p75: units === "metric" ? 32.6 : 90.7,
        p90: units === "metric" ? 34.7 : 94.5,
      },
      {
        var: "t_min",
        unit: units === "metric" ? "°C" : "°F",
        mean: units === "metric" ? 19.1 : 66.4,
        std: units === "metric" ? 1.8 : 3.2,
        p10: units === "metric" ? 16.6 : 61.9,
        p25: units === "metric" ? 18.0 : 64.4,
        p50: units === "metric" ? 19.0 : 66.2,
        p75: units === "metric" ? 20.2 : 68.4,
        p90: units === "metric" ? 21.8 : 71.2,
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
        mean: units === "metric" ? 3.6 : 8.1,
        std: units === "metric" ? 1.2 : 2.7,
        p10: units === "metric" ? 2.1 : 4.7,
        p25: units === "metric" ? 2.9 : 6.5,
        p50: units === "metric" ? 3.4 : 7.6,
        p75: units === "metric" ? 4.2 : 9.4,
        p90: units === "metric" ? 5.4 : 12.1,
      },
      {
        var: "precip_mm",
        unit: units === "metric" ? "mm/d" : "in/d",
        mean: units === "metric" ? 1.8 : 0.07,
        std: units === "metric" ? 4.6 : 0.18,
        p10: 0.0,
        p25: 0.0,
        p50: units === "metric" ? 0.2 : 0.01,
        p75: units === "metric" ? 1.3 : 0.05,
        p90: units === "metric" ? 5.9 : 0.23,
      },
    ],
    probabilities: [
      {
        metric: "t_max",
        threshold: units === "metric" ? 32 : 90,
        comparator: ">=",
        probability_percent: 22,
      },
      {
        metric: "precip_mm",
        threshold: units === "metric" ? 1 : 0.04,
        comparator: ">=",
        probability_percent: 28,
      },
      {
        metric: "precip_mm",
        threshold: units === "metric" ? 10 : 0.4,
        comparator: ">=",
        probability_percent: 6,
      },
      {
        metric: "wind10m",
        threshold: units === "metric" ? 8 : 18,
        comparator: ">=",
        probability_percent: 4,
      },
    ],
    risk_labels: [
      {
        risk_type: "very_hot" as const,
        level: "medium" as const,
        probability_percent: 22,
        rule_applied: `Heat Index ≥ ${units === "metric" ? "33°C" : "91°F"}`,
      },
      {
        risk_type: "very_windy" as const,
        level: "low" as const,
        probability_percent: 10,
        rule_applied: "Wind speed ≥ 75th percentile",
      },
      {
        risk_type: "very_wet" as const,
        level: "low" as const,
        probability_percent: 6,
        rule_applied: `Precipitation ≥ ${units === "metric" ? "10mm/day" : "0.4in/day"}`,
      },
      {
        risk_type: "very_uncomfortable" as const,
        level: "medium" as const,
        probability_percent: 18,
        rule_applied: `Heat Index ≥ ${units === "metric" ? "33°C" : "91°F"} or Dew Point ≥ ${
          units === "metric" ? "20°C" : "68°F"
        }`,
      },
      {
        risk_type: "very_cold" as const,
        level: "low" as const,
        probability_percent: 2,
        rule_applied: `Wind Chill ≤ ${units === "metric" ? "0°C" : "32°F"}`,
      },
    ],
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
