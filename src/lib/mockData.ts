// Mock data for dashboard

export const mockStats = {
  totalRequests: "2.4M",
  avgLatency: "45ms",
  tokenUsage: "1.2B",
  incidentCount: "23",
};

export const mockIncidents = [
  {
    id: "INC-001",
    severity: "critical",
    status: "open",
    timestamp: "2025-01-15T14:23:00Z",
    model: "gpt-4",
    description: "High latency detected on streaming responses",
    affectedUsers: 1247,
  },
  {
    id: "INC-002",
    severity: "warning",
    status: "investigating",
    timestamp: "2025-01-15T13:45:00Z",
    model: "gpt-3.5-turbo",
    description: "Increased error rate on function calling",
    affectedUsers: 89,
  },
  {
    id: "INC-003",
    severity: "info",
    status: "resolved",
    timestamp: "2025-01-15T12:10:00Z",
    model: "claude-3",
    description: "Temporary spike in token usage",
    affectedUsers: 0,
  },
];

export const mockLogs = [
  {
    id: "LOG-001",
    timestamp: "2025-01-15T14:23:45Z",
    model: "gpt-4",
    user: "user@example.com",
    promptLength: 1247,
    latency: 2341,
    riskScore: 0.92,
    status: "success",
  },
  {
    id: "LOG-002",
    timestamp: "2025-01-15T14:22:12Z",
    model: "gpt-3.5-turbo",
    user: "admin@company.com",
    promptLength: 456,
    latency: 892,
    riskScore: 0.23,
    status: "success",
  },
  {
    id: "LOG-003",
    timestamp: "2025-01-15T14:20:33Z",
    model: "claude-3",
    user: "test@demo.com",
    promptLength: 2891,
    latency: 4532,
    riskScore: 0.67,
    status: "error",
  },
];

export const mockMetricsData = {
  latency: [
    { time: "00:00", value: 45 },
    { time: "04:00", value: 52 },
    { time: "08:00", value: 78 },
    { time: "12:00", value: 92 },
    { time: "16:00", value: 67 },
    { time: "20:00", value: 54 },
  ],
  tokens: [
    { time: "00:00", value: 45000 },
    { time: "04:00", value: 62000 },
    { time: "08:00", value: 89000 },
    { time: "12:00", value: 112000 },
    { time: "16:00", value: 95000 },
    { time: "20:00", value: 73000 },
  ],
  errors: [
    { model: "gpt-4", count: 12 },
    { model: "gpt-3.5", count: 8 },
    { model: "claude-3", count: 3 },
  ],
};
