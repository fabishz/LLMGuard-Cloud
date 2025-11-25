import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Activity, Clock, Coins, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { mockStats, mockMetricsData, mockIncidents } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";

export default function Overview() {
  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
          <p className="text-muted-foreground">Monitor your LLM applications in real-time</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Requests"
            value={mockStats.totalRequests}
            change="+12.5% from last week"
            changeType="positive"
            icon={Activity}
          />
          <StatsCard
            title="Avg Latency"
            value={mockStats.avgLatency}
            change="-8ms from yesterday"
            changeType="positive"
            icon={Clock}
          />
          <StatsCard
            title="Token Usage"
            value={mockStats.tokenUsage}
            change="+18.2% from last week"
            changeType="neutral"
            icon={Coins}
          />
          <StatsCard
            title="Active Incidents"
            value={mockStats.incidentCount}
            change="+3 in last hour"
            changeType="negative"
            icon={AlertTriangle}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6 glass">
            <h3 className="text-lg font-semibold mb-4">Latency Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockMetricsData.latency}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6 glass">
            <h3 className="text-lg font-semibold mb-4">Token Usage</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockMetricsData.tokens}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--accent))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Recent Incidents */}
        <Card className="p-6 glass">
          <h3 className="text-lg font-semibold mb-4">Recent Incidents</h3>
          <div className="space-y-4">
            {mockIncidents.slice(0, 5).map((incident) => (
              <div key={incident.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-4">
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
                  <div>
                    <p className="font-medium">{incident.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {incident.id} • {incident.model} • {new Date(incident.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">{incident.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
