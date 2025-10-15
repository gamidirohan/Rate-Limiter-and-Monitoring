export type DashboardMetrics = {
  totalRequests: number
  blockedRequests: number
  averageLatencyMs: number
  maxLatencyMs: number
}

export type PerformancePoint = {
  time: string
  rps: number
}

export type LatencyPoint = {
  time: string
  latency: number
}

export type ActiveKeyUsage = {
  id: string
  usagePercent: number
}

export type RecentEventStatus = "allowed" | "blocked"

export type RecentEvent = {
  timestamp: string
  type: string
  key: string
  status: RecentEventStatus
}

export type TopOffender = {
  key: string
  blockedRequests: number
}

export type DashboardPayload = {
  metrics: DashboardMetrics
  performance: PerformancePoint[]
  latency: LatencyPoint[]
  activeKeys: ActiveKeyUsage[]
  recentEvents: RecentEvent[]
  topOffenders: TopOffender[]
}
