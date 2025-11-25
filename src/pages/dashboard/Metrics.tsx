import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { mockMetricsData } from "@/lib/mockData";

export default function Metrics() {
  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold mb-2">Metrics & Analytics</h1>
          <p className="text-muted-foreground">Deep insights into your LLM performance</p>
        </div>

        {/* Latency Charts */}
        <Card className="p-6 glass">
          <h3 className="text-lg font-semibold mb-4">Response Latency Trends</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={mockMetricsData.latency}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="time" className="text-xs" />
              <YAxis className="text-xs" label={{ value: "Latency (ms)", angle: -90, position: "insideLeft" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Token Usage */}
        <Card className="p-6 glass">
          <h3 className="text-lg font-semibold mb-4">Token Consumption</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={mockMetricsData.tokens}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="time" className="text-xs" />
              <YAxis className="text-xs" label={{ value: "Tokens", angle: -90, position: "insideLeft" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--accent))" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Error Rates */}
        <Card className="p-6 glass">
          <h3 className="text-lg font-semibold mb-4">Error Rates by Model</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={mockMetricsData.errors}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="model" className="text-xs" />
              <YAxis className="text-xs" label={{ value: "Errors", angle: -90, position: "insideLeft" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Cost Estimation */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 glass">
            <h3 className="text-lg font-semibold mb-4">Cost Breakdown</h3>
            <div className="space-y-4">
              {[
                { model: "GPT-4", cost: "$1,247.23", percentage: 45 },
                { model: "GPT-3.5 Turbo", cost: "$892.14", percentage: 32 },
                { model: "Claude 3", cost: "$634.89", percentage: 23 },
              ].map((item) => (
                <div key={item.model}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{item.model}</span>
                    <span className="text-sm font-semibold">{item.cost}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 glass">
            <h3 className="text-lg font-semibold mb-4">Model Performance</h3>
            <div className="space-y-4">
              {[
                { model: "GPT-4", score: 98, latency: "45ms" },
                { model: "GPT-3.5 Turbo", score: 95, latency: "32ms" },
                { model: "Claude 3", score: 92, latency: "67ms" },
              ].map((item) => (
                <div key={item.model} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.model}</span>
                    <span className="text-sm text-muted-foreground">{item.latency}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success"
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold">{item.score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
