import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { mockIncidents } from "@/lib/mockData";

export default function IncidentDetail() {
  const { id } = useParams();
  const incident = mockIncidents.find((i) => i.id === id) || mockIncidents[0];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard/incidents">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{incident.id}</h1>
            <p className="text-muted-foreground">{incident.description}</p>
          </div>
          <Button>
            <CheckCircle className="mr-2 h-4 w-4" />
            Apply Fix
          </Button>
        </div>

        {/* Metadata */}
        <Card className="p-6 glass">
          <h3 className="text-lg font-semibold mb-4">Incident Details</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Severity</p>
              <Badge
                variant={
                  incident.severity === "critical"
                    ? "destructive"
                    : incident.severity === "warning"
                    ? "default"
                    : "secondary"
                }
              >
                {incident.severity}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <Badge variant="outline">{incident.status}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Model</p>
              <p className="font-mono">{incident.model}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Affected Users</p>
              <p className="font-semibold">{incident.affectedUsers.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Timestamp</p>
              <p>{new Date(incident.timestamp).toLocaleString()}</p>
            </div>
          </div>
        </Card>

        {/* Timeline */}
        <Card className="p-6 glass">
          <h3 className="text-lg font-semibold mb-4">Timeline</h3>
          <div className="space-y-4">
            {[
              { time: "14:23", event: "Incident detected", type: "error" },
              { time: "14:25", event: "Auto-analysis initiated", type: "info" },
              { time: "14:27", event: "RCA completed", type: "success" },
              { time: "14:30", event: "Remediation recommended", type: "warning" },
            ].map((item, index) => (
              <div key={index} className="flex gap-4">
                <div className="w-20 text-sm text-muted-foreground">{item.time}</div>
                <div className="flex-1 flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      item.type === "error"
                        ? "bg-destructive"
                        : item.type === "success"
                        ? "bg-success"
                        : item.type === "warning"
                        ? "bg-warning"
                        : "bg-primary"
                    }`}
                  />
                  <p>{item.event}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* AI RCA */}
        <Card className="p-6 glass">
          <h3 className="text-lg font-semibold mb-4">AI-Generated Root Cause Analysis</h3>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-muted-foreground">
              Analysis indicates a spike in streaming response latency due to increased concurrent requests during peak hours.
              The issue is exacerbated by insufficient rate limiting on the GPT-4 endpoint.
            </p>
            <h4 className="mt-4 font-semibold">Key Findings:</h4>
            <ul className="text-muted-foreground">
              <li>Request rate increased by 340% compared to baseline</li>
              <li>Average response time degraded from 45ms to 2.3s</li>
              <li>Timeout errors increased by 89%</li>
            </ul>
          </div>
        </Card>

        {/* Remediation */}
        <Card className="p-6 glass">
          <h3 className="text-lg font-semibold mb-4">Recommended Remediation</h3>
          <div className="space-y-4">
            {[
              "Implement adaptive rate limiting based on endpoint load",
              "Scale horizontal replicas by 3x during peak hours",
              "Add request queuing with priority handling",
              "Enable circuit breaker pattern for graceful degradation",
            ].map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg border border-border/50">
                <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <p className="text-sm">{recommendation}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
