import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface SummaryRow {
  var: string;
  unit: string;
  mean: number;
  std: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

interface DetailsTableProps {
  summary: SummaryRow[];
  windowDays?: number;
}

const variableLabels: Record<string, string> = {
  t_mean: "Mean Temperature",
  t_max: "Max Temperature",
  t_min: "Min Temperature",
  rh_mean: "Mean Humidity",
  dew_point: "Dew Point",
  wind10m: "Wind Speed (10m)",
  precip_mm: "Precipitation",
};

export function DetailsTable({ summary, windowDays = 15 }: DetailsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Statistical Summary</CardTitle>
        <p className="text-sm text-muted-foreground">
          These statistics are computed from historical data within ±{windowDays}{" "}
          days of the same day of year across many years. We report mean,
          standard deviation, and percentiles. Probabilities are empirical
          exceedance rates.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Variable</TableHead>
                <TableHead>Mean</TableHead>
                <TableHead>Std Dev</TableHead>
                <TableHead>10th</TableHead>
                <TableHead>25th</TableHead>
                <TableHead>Median</TableHead>
                <TableHead>75th</TableHead>
                <TableHead>90th</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.map((row) => (
                <TableRow key={row.var}>
                  <TableCell className="font-medium">
                    {variableLabels[row.var] || row.var}
                    <span className="text-muted-foreground ml-1">
                      ({row.unit})
                    </span>
                  </TableCell>
                  <TableCell>{row.mean.toFixed(1)}</TableCell>
                  <TableCell>{row.std.toFixed(1)}</TableCell>
                  <TableCell>{row.p10.toFixed(1)}</TableCell>
                  <TableCell>{row.p25.toFixed(1)}</TableCell>
                  <TableCell className="font-semibold">{row.p50.toFixed(1)}</TableCell>
                  <TableCell>{row.p75.toFixed(1)}</TableCell>
                  <TableCell>{row.p90.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
