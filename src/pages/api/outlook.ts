// BFF endpoint for climate outlook
// This would typically be implemented as a Next.js API route or Vercel serverless function
// For now, this file serves as documentation for the API contract

import { getOutlook, OutlookParams } from "@/lib/api/outlook";

export interface OutlookRequest {
  lat: number;
  lon: number;
  date: string;
  window?: number;
  units?: "metric" | "imperial";
  format?: "json" | "csv";
}

export interface OutlookError {
  error: {
    status: number;
    code: string;
    message: string;
  };
}

// Validation functions
export function validateLat(lat: number): boolean {
  return !isNaN(lat) && lat >= -90 && lat <= 90;
}

export function validateLon(lon: number): boolean {
  return !isNaN(lon) && lon >= -180 && lon <= 180;
}

export function validateDate(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
}

export function validateWindow(window: number): boolean {
  return !isNaN(window) && window >= 7 && window <= 30;
}

export function validateUnits(units: string): units is "metric" | "imperial" {
  return units === "metric" || units === "imperial";
}

// This would be the actual API route handler
export async function handleOutlookRequest(
  params: OutlookRequest
): Promise<any> {
  // Validate parameters
  if (!validateLat(params.lat)) {
    throw {
      error: {
        status: 400,
        code: "INVALID_PARAM",
        message: "Latitude must be between -90 and 90.",
      },
    };
  }

  if (!validateLon(params.lon)) {
    throw {
      error: {
        status: 400,
        code: "INVALID_PARAM",
        message: "Longitude must be between -180 and 180.",
      },
    };
  }

  if (!validateDate(params.date)) {
    throw {
      error: {
        status: 400,
        code: "INVALID_PARAM",
        message: "Parameter 'date' must be YYYY-MM-DD.",
      },
    };
  }

  if (params.window && !validateWindow(params.window)) {
    throw {
      error: {
        status: 400,
        code: "INVALID_PARAM",
        message: "Window must be between 7 and 30 days.",
      },
    };
  }

  if (params.units && !validateUnits(params.units)) {
    throw {
      error: {
        status: 400,
        code: "INVALID_PARAM",
        message: "Units must be 'metric' or 'imperial'.",
      },
    };
  }

  // Call Model API (currently mocked)
  const outlookParams: OutlookParams = {
    lat: params.lat,
    lon: params.lon,
    date: params.date,
    window: params.window || 15,
    units: params.units || "metric",
  };

  const result = await getOutlook(outlookParams);

  // Return result (CSV conversion would happen here if format=csv)
  return result;
}
