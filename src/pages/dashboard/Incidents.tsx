import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockIncidents } from "@/lib/mockData";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

export default function Incidents() {
  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Incidents</h1>
            <p className="text-muted-foreground">Monitor and resolve AI incidents</p>
          </div>
          <Button>Create Incident</Button>
        </div>

        <Card className="glass">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left p-4 font-semibold">ID</th>
                  <th className="text-left p-4 font-semibold">Severity</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-left p-4 font-semibold">Timestamp</th>
                  <th className="text-left p-4 font-semibold">Model</th>
                  <th className="text-left p-4 font-semibold">Description</th>
                  <th className="text-left p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockIncidents.map((incident) => (
                  <tr key={incident.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                    <td className="p-4 font-mono text-sm">{incident.id}</td>
                    <td className="p-4">
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
                    </td>
                    <td className="p-4">
                      <Badge variant="outline">{incident.status}</Badge>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(incident.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4 font-mono text-sm">{incident.model}</td>
                    <td className="p-4 text-sm">{incident.description}</td>
                    <td className="p-4">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/dashboard/incidents/${incident.id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
