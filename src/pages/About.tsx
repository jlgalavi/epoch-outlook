import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Database, TrendingUp, AlertTriangle, Mail } from "lucide-react";

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-[image:var(--gradient-hero)] text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4 text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Search
          </Button>
          <h1 className="text-4xl font-bold mb-2">Methodology & Data Sources</h1>
          <p className="text-xl text-white/90">
            Understanding our climate-based outlook approach
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              What is a Climate-Based Outlook?
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p>
              A climate-based outlook provides a statistical picture of typical
              weather conditions expected around a specific date based on
              historical patterns. <strong>This is not a short-term weather forecast.</strong>
            </p>
            <p>
              Instead, we analyze historical climate data to understand what
              conditions are typical for a given location and time of year,
              expressed as probabilities and risk levels.
            </p>
          </CardContent>
        </Card>

        {/* Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Our Method
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. Day-of-Year Sampling</h3>
              <p className="text-sm text-muted-foreground">
                For your selected date, we calculate its "day of year" (DOY).
                We then collect historical weather data from ±15 days (configurable)
                around that same DOY across many years.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">2. Statistical Analysis</h3>
              <p className="text-sm text-muted-foreground">
                From these samples, we compute:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside ml-4">
                <li>Mean (μ) and standard deviation (σ)</li>
                <li>Percentiles: 10th, 25th, 50th (median), 75th, 90th</li>
                <li>Empirical exceedance probabilities for key thresholds</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">3. Risk Classification</h3>
              <p className="text-sm text-muted-foreground">
                We apply predefined rules to classify risk levels:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside ml-4">
                <li>
                  <strong>Very Hot:</strong> Based on Heat Index (NWS formula)
                </li>
                <li>
                  <strong>Very Cold:</strong> Based on Wind Chill (optional)
                </li>
                <li>
                  <strong>Very Windy:</strong> Based on wind speed percentiles
                </li>
                <li>
                  <strong>Very Wet:</strong> Based on precipitation thresholds
                </li>
                <li>
                  <strong>Very Uncomfortable:</strong> Combined heat index and dew point
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Data Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Data Sources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">NASA POWER</h3>
              <p className="text-sm text-muted-foreground">
                Primary data source: NASA's Prediction of Worldwide Energy
                Resources (POWER) project provides meteorological data from
                2001–present at 0.5° × 0.5° resolution globally.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Future Enhancements</h3>
              <p className="text-sm text-muted-foreground">
                We plan to integrate additional sources like IMERG (precipitation)
                and MERRA-2 (reanalysis) for improved accuracy and coverage.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Limitations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Limitations & Important Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>
                <strong>Not a forecast:</strong> This tool shows typical
                conditions based on historical patterns, not specific predictions
                for the future.
              </li>
              <li>
                <strong>Grid resolution:</strong> Locations are rounded to
                0.1° grid cells for caching efficiency. Your exact location
                may have slightly different microclimates.
              </li>
              <li>
                <strong>Climate change:</strong> Historical patterns may not
                fully reflect current or future climate trends.
              </li>
              <li>
                <strong>Local variability:</strong> Topography, urban effects,
                and coastal influences can create significant local variations.
              </li>
              <li>
                <strong>Short-term events:</strong> Cannot predict specific
                storms, cold snaps, or heat waves.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Future Improvements */}
        <Card>
          <CardHeader>
            <CardTitle>Future Improvements</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>Integration of additional data sources (IMERG, MERRA-2)</li>
              <li>Machine learning models for better trend detection</li>
              <li>Interactive charts and historical trends visualization</li>
              <li>Multi-location comparison tools</li>
              <li>Climate change adjusted outlooks</li>
            </ul>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact & Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Have questions or suggestions? We'd love to hear from you.
              This is an open-source project built to make climate data
              more accessible.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default About;
