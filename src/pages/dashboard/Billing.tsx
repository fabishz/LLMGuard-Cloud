import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowUpRight } from "lucide-react";

const usageData = [
  { date: "Jan 1", cost: 45 },
  { date: "Jan 8", cost: 62 },
  { date: "Jan 15", cost: 89 },
  { date: "Jan 22", cost: 112 },
  { date: "Jan 29", cost: 95 },
];

const invoices = [
  { id: "INV-001", date: "2025-01-01", amount: "$247.00", status: "paid" },
  { id: "INV-002", date: "2024-12-01", amount: "$189.00", status: "paid" },
  { id: "INV-003", date: "2024-11-01", amount: "$156.00", status: "paid" },
];

export default function Billing() {
  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Billing & Usage</h1>
            <p className="text-muted-foreground">Manage your subscription and usage</p>
          </div>
          <Button>
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Upgrade Plan
          </Button>
        </div>

        {/* Current Plan */}
        <Card className="p-6 glass">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Current Plan</h3>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold">Pro</span>
                <Badge>Active</Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">Monthly Cost</p>
              <p className="text-2xl font-bold">$199/mo</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Requests</span>
                <span className="text-sm text-muted-foreground">687K / 1M</span>
              </div>
              <Progress value={68.7} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Token Usage</span>
                <span className="text-sm text-muted-foreground">24M / Unlimited</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>
          </div>
        </Card>

        {/* Usage Chart */}
        <Card className="p-6 glass">
          <h3 className="text-lg font-semibold mb-4">Cost Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" label={{ value: "Cost ($)", angle: -90, position: "insideLeft" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Line type="monotone" dataKey="cost" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Cost Breakdown */}
        <Card className="p-6 glass">
          <h3 className="text-lg font-semibold mb-4">This Month's Breakdown</h3>
          <div className="space-y-4">
            {[
              { service: "GPT-4 API Calls", amount: "$89.23", percentage: 45 },
              { service: "GPT-3.5 Turbo", amount: "$56.78", percentage: 28 },
              { service: "Incident Analysis", amount: "$34.12", percentage: 17 },
              { service: "Storage", amount: "$18.87", percentage: 10 },
            ].map((item) => (
              <div key={item.service}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{item.service}</span>
                  <span className="text-sm font-semibold">{item.amount}</span>
                </div>
                <Progress value={item.percentage} className="h-2" />
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total Estimated</span>
              <span className="text-2xl font-bold">$199.00</span>
            </div>
          </div>
        </Card>

        {/* Invoices */}
        <Card className="p-6 glass">
          <h3 className="text-lg font-semibold mb-4">Recent Invoices</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left p-4 font-semibold">Invoice ID</th>
                  <th className="text-left p-4 font-semibold">Date</th>
                  <th className="text-left p-4 font-semibold">Amount</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-left p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                    <td className="p-4 font-mono text-sm">{invoice.id}</td>
                    <td className="p-4 text-sm">{invoice.date}</td>
                    <td className="p-4 font-semibold">{invoice.amount}</td>
                    <td className="p-4">
                      <Badge variant="secondary">{invoice.status}</Badge>
                    </td>
                    <td className="p-4">
                      <Button variant="ghost" size="sm">Download</Button>
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
