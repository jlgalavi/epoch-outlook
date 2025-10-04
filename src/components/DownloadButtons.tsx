import { Button } from "@/components/ui/button";
import { Download, FileJson } from "lucide-react";

interface DownloadButtonsProps {
  jsonPayload: any;
  lat: number;
  lon: number;
  date: string;
}

export function DownloadButtons({
  jsonPayload,
  lat,
  lon,
  date,
}: DownloadButtonsProps) {
  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(jsonPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `climate-outlook-${lat}-${lon}-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const { metadata, summary, probabilities, risk_labels } = jsonPayload;

    let csv = "[metadata]\n";
    csv += "key,value\n";
    Object.entries(metadata).forEach(([key, value]) => {
      if (typeof value === "object") {
        csv += `${key},"${JSON.stringify(value)}"\n`;
      } else {
        csv += `${key},${value}\n`;
      }
    });

    csv += "\n[summary]\n";
    csv += "var,unit,mean,std,p10,p25,p50,p75,p90\n";
    summary.forEach((row: any) => {
      csv += `${row.var},${row.unit},${row.mean},${row.std},${row.p10},${row.p25},${row.p50},${row.p75},${row.p90}\n`;
    });

    csv += "\n[probabilities]\n";
    csv += "metric,threshold,comparator,probability_percent\n";
    probabilities.forEach((row: any) => {
      csv += `${row.metric},${row.threshold},${row.comparator},${row.probability_percent}\n`;
    });

    csv += "\n[risk_labels]\n";
    csv += "risk_type,level,probability_percent,rule_applied\n";
    risk_labels.forEach((row: any) => {
      csv += `${row.risk_type},${row.level},${row.probability_percent},"${row.rule_applied}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `climate-outlook-${lat}-${lon}-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-3">
      <Button onClick={downloadJSON} variant="outline" className="gap-2">
        <FileJson className="h-4 w-4" />
        Download JSON
      </Button>
      <Button onClick={downloadCSV} variant="outline" className="gap-2">
        <Download className="h-4 w-4" />
        Download CSV
      </Button>
    </div>
  );
}
