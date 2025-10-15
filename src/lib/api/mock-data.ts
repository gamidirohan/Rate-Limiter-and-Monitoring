import {
  DashboardPayload,
  ActiveKey,
  DashboardMetrics,
  LatencyPoint,
  PerformancePoint,
  RecentEvent,
  TopOffender,
  ApiKeySummary,
  ApiKeyDetail,
  SettingsPayload,
  ApiKeyTimelinePoint,
} from "@/lib/api/schemas"

const metrics: DashboardMetrics = {
  totalRequests: 12345,
  blockedRequests: 678,
  averageLatencyMs: 23,
  maxLatencyMs: 150,
}

const performance: PerformancePoint[] = [
  { time: "10:00", rps: 120 },
  { time: "10:05", rps: 118 },
  { time: "10:10", rps: 130 },
  { time: "10:15", rps: 115 },
  { time: "10:20", rps: 126 },
  { time: "10:25", rps: 132 },
  { time: "10:30", rps: 123 },
]

const latency: LatencyPoint[] = [
  { time: "10:00", latency: 21 },
  { time: "10:05", latency: 22 },
  { time: "10:10", latency: 20 },
  { time: "10:15", latency: 24 },
  { time: "10:20", latency: 23 },
  { time: "10:25", latency: 25 },
  { time: "10:30", latency: 22 },
]

const activeKeys: ActiveKey[] = [
  { id: "user:123", usagePercent: 75 },
  { id: "user:456", usagePercent: 50 },
  { id: "user:789", usagePercent: 25 },
  { id: "user:101", usagePercent: 90 },
  { id: "user:112", usagePercent: 60 },
]

const recentEvents: RecentEvent[] = [
  {
    timestamp: "2024-01-26 10:00:00",
    type: "Request",
    key: "user:123",
    status: "allowed",
  },
  {
    timestamp: "2024-01-26 10:00:01",
    type: "Request",
    key: "user:456",
    status: "blocked",
  },
  {
    timestamp: "2024-01-26 10:00:02",
    type: "Request",
    key: "user:789",
    status: "allowed",
  },
  {
    timestamp: "2024-01-26 10:00:03",
    type: "Request",
    key: "user:101",
    status: "allowed",
  },
  {
    timestamp: "2024-01-26 10:00:04",
    type: "Request",
    key: "user:112",
    status: "blocked",
  },
]

const topOffenders: TopOffender[] = [
  { key: "user:456", blockedRequests: 100 },
  { key: "user:112", blockedRequests: 75 },
  { key: "user:223", blockedRequests: 50 },
  { key: "user:334", blockedRequests: 25 },
  { key: "user:567", blockedRequests: 10 },
]

const apiKeys: ApiKeySummary[] = [
  {
    id: "key-1",
    name: "Project Alpha",
    maskedKey: "sk_test_a1b2...7890",
    limits: { perMinute: 100, perDay: 1000 },
    usage: { minute: 75, day: 50 },
    errors429: 5,
    lastSeen: "2025-10-26T10:30:00Z",
  },
  {
    id: "key-2",
    name: "Service Beta",
    maskedKey: "sk_test_c3d4...1234",
    limits: { perMinute: 50, perDay: 500 },
    usage: { minute: 20, day: 10 },
    errors429: 0,
    lastSeen: "2025-10-25T14:15:00Z",
  },
  {
    id: "key-3",
    name: "App Gamma",
    maskedKey: "sk_test_e5f6...5678",
    limits: { perMinute: 200, perDay: 2000 },
    usage: { minute: 90, day: 80 },
    errors429: 12,
    lastSeen: "2025-10-26T09:00:00Z",
  },
]

const minuteTimeline: ApiKeyTimelinePoint[] = [
  { time: "09:40", value: 20 },
  { time: "09:45", value: 35 },
  { time: "09:50", value: 45 },
  { time: "09:55", value: 38 },
  { time: "10:00", value: 50 },
  { time: "10:05", value: 42 },
  { time: "10:10", value: 60 },
]

const dailyTimeline: ApiKeyTimelinePoint[] = [
  { time: "Oct 20", value: 34 },
  { time: "Oct 21", value: 44 },
  { time: "Oct 22", value: 38 },
  { time: "Oct 23", value: 52 },
  { time: "Oct 24", value: 49 },
  { time: "Oct 25", value: 55 },
  { time: "Oct 26", value: 61 },
]

const apiKeyDetails: Record<string, ApiKeyDetail> = {
  "key-1": {
    id: "key-1",
    name: "Project Alpha",
    apiKey: "sk_test_a1b2c3d4e5f6g7h8",
    minuteUsage: 120,
    dailyUsage: 1500,
    minuteTimeline,
    dailyTimeline,
    rateLimit: 100,
    timeWindowSeconds: 60,
    activityLog: [
      {
        timestamp: "2025-10-26 10:30:00",
        event: "Request",
        details: "Endpoint: /users, Status: 200",
        status: 200,
      },
      {
        timestamp: "2025-10-26 10:31:00",
        event: "Request",
        details: "Endpoint: /users, Status: 429",
        status: 429,
      },
      {
        timestamp: "2025-10-26 10:32:00",
        event: "Request",
        details: "Endpoint: /users, Status: 200",
        status: 200,
      },
    ],
  },
  "key-2": {
    id: "key-2",
    name: "Service Beta",
    apiKey: "sk_test_c3d4e5f6g7h8i9j0",
    minuteUsage: 80,
    dailyUsage: 900,
    minuteTimeline,
    dailyTimeline,
    rateLimit: 50,
    timeWindowSeconds: 60,
    activityLog: [
      {
        timestamp: "2025-10-25 14:15:00",
        event: "Request",
        details: "Endpoint: /orders, Status: 200",
        status: 200,
      },
      {
        timestamp: "2025-10-25 14:16:00",
        event: "Request",
        details: "Endpoint: /orders, Status: 200",
        status: 200,
      },
      {
        timestamp: "2025-10-25 14:17:00",
        event: "Request",
        details: "Endpoint: /orders, Status: 200",
        status: 200,
      },
    ],
  },
  "key-3": {
    id: "key-3",
    name: "App Gamma",
    apiKey: "sk_test_e5f6g7h8i9j0k1l2",
    minuteUsage: 160,
    dailyUsage: 2100,
    minuteTimeline,
    dailyTimeline,
    rateLimit: 200,
    timeWindowSeconds: 60,
    activityLog: [
      {
        timestamp: "2025-10-26 09:00:00",
        event: "Request",
        details: "Endpoint: /metrics, Status: 200",
        status: 200,
      },
      {
        timestamp: "2025-10-26 09:01:00",
        event: "Request",
        details: "Endpoint: /metrics, Status: 429",
        status: 429,
      },
      {
        timestamp: "2025-10-26 09:02:00",
        event: "Request",
        details: "Endpoint: /metrics, Status: 200",
        status: 200,
      },
    ],
  },
}

const settings: SettingsPayload = {
  defaultRateLimit: 100,
  defaultBurstLimit: 200,
  tiers: [
    { id: "tier-1", name: "Basic", rateLimit: 50, burstLimit: 100 },
    { id: "tier-2", name: "Standard", rateLimit: 100, burstLimit: 200 },
    { id: "tier-3", name: "Premium", rateLimit: 200, burstLimit: 400 },
  ],
}

export function getMockDashboard(): DashboardPayload {
  return {
    metrics,
    performance,
    latency,
    activeKeys,
    recentEvents,
    topOffenders,
  }
}

export function getMockMetrics() {
  return metrics
}

export function getMockPerformance() {
  return performance
}

export function getMockLatency() {
  return latency
}

export function getMockActiveKeys() {
  return activeKeys
}

export function getMockRecentEvents() {
  return recentEvents
}

export function getMockTopOffenders() {
  return topOffenders
}

export function getMockApiKeys() {
  return {
    keys: apiKeys,
    total: apiKeys.length,
  }
}

export function getMockApiKeyDetail(id: string) {
  return apiKeyDetails[id] ?? null
}

export function getMockSettings() {
  return settings
}
