import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockLogs } from "@/lib/mockData";
import { Search, ChevronDown } from "lucide-react";
import { useState } from "react";

export default function Logs() {
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Logs</h1>
            <p className="text-muted-foreground">Search and analyze request logs</p>
          </div>
          <div className="w-96">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search logs..." className="pl-10 glass" />
            </div>
          </div>
        </div>

        <Card className="glass">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left p-4 font-semibold">Timestamp</th>
                  <th className="text-left p-4 font-semibold">Model</th>
                  <th className="text-left p-4 font-semibold">User</th>
                  <th className="text-left p-4 font-semibold">Prompt Length</th>
                  <th className="text-left p-4 font-semibold">Latency</th>
                  <th className="text-left p-4 font-semibold">Risk Score</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-left p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockLogs.map((log) => (
                  <>
                    <tr
                      key={log.id}
                      className="border-b border-border/50 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-4 font-mono text-sm">{log.model}</td>
                      <td className="p-4 text-sm">{log.user}</td>
                      <td className="p-4 text-sm">{log.promptLength.toLocaleString()}</td>
                      <td className="p-4 text-sm">{log.latency}ms</td>
                      <td className="p-4">
                        <Badge
                          variant={log.riskScore > 0.7 ? "destructive" : log.riskScore > 0.4 ? "default" : "secondary"}
                        >
                          {(log.riskScore * 100).toFixed(0)}%
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant={log.status === "success" ? "secondary" : "destructive"}>
                          {log.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Button variant="ghost" size="sm">
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              expandedLog === log.id ? "rotate-180" : ""
                            }`}
                          />
                        </Button>
                      </td>
                    </tr>
                    {expandedLog === log.id && (
                      <tr>
                        <td colSpan={8} className="p-4 bg-muted/30">
                          <div className="p-4 rounded-lg bg-card border border-border font-mono text-xs overflow-x-auto">
                            <pre>
                              {JSON.stringify(
                                {
                                  id: log.id,
                                  timestamp: log.timestamp,
                                  model: log.model,
                                  user: log.user,
                                  request: {
                                    prompt: "Example prompt text...",
                                    max_tokens: 500,
                                    temperature: 0.7,
                                  },
                                  response: {
                                    text: "Example response...",
                                    tokens: log.promptLength,
                                    latency: log.latency,
                                  },
                                  metadata: {
                                    risk_score: log.riskScore,
                                    status: log.status,
                                  },
                                },
                                null,
                                2
                              )}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
