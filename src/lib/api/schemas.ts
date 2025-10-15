import { z } from "zod"

export const dashboardMetricsSchema = z.object({
  totalRequests: z.number().nonnegative(),
  blockedRequests: z.number().nonnegative(),
  averageLatencyMs: z.number().nonnegative(),
  maxLatencyMs: z.number().nonnegative(),
})

export const performancePointSchema = z.object({
  time: z.string(),
  rps: z.number().nonnegative(),
})

export const latencyPointSchema = z.object({
  time: z.string(),
  latency: z.number().nonnegative(),
})

export const activeKeySchema = z.object({
  id: z.string(),
  usagePercent: z.number().int().min(0).max(100),
})

export const recentEventSchema = z.object({
  timestamp: z.string(),
  type: z.string(),
  key: z.string(),
  status: z.enum(["allowed", "blocked"]),
})

export const topOffenderSchema = z.object({
  key: z.string(),
  blockedRequests: z.number().nonnegative(),
})

export const dashboardPayloadSchema = z.object({
  metrics: dashboardMetricsSchema,
  performance: z.array(performancePointSchema),
  latency: z.array(latencyPointSchema),
  activeKeys: z.array(activeKeySchema),
  recentEvents: z.array(recentEventSchema),
  topOffenders: z.array(topOffenderSchema),
})

export const apiKeySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  maskedKey: z.string(),
  limits: z.object({
    perMinute: z.number().nonnegative(),
    perDay: z.number().nonnegative(),
  }),
  usage: z.object({
    minute: z.number().int().min(0), // Can exceed 100% when over limit
    day: z.number().int().min(0), // Can exceed 100% when over limit
  }),
  errors429: z.number().nonnegative(),
  lastSeen: z.string(),
})

export const apiKeyListSchema = z.object({
  keys: z.array(apiKeySummarySchema),
  total: z.number().nonnegative(),
})

export const apiKeyTimelinePointSchema = z.object({
  time: z.string(),
  value: z.number().nonnegative(),
})

export const apiKeyActivityLogItemSchema = z.object({
  timestamp: z.string(),
  event: z.string(),
  details: z.string(),
  status: z.number().int(),
})

export const apiKeyDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  apiKey: z.string(),
  minuteUsage: z.number().nonnegative(),
  dailyUsage: z.number().nonnegative(),
  minuteTimeline: z.array(apiKeyTimelinePointSchema),
  dailyTimeline: z.array(apiKeyTimelinePointSchema),
  rateLimit: z.number().nonnegative(),
  timeWindowSeconds: z.number().nonnegative(),
  activityLog: z.array(apiKeyActivityLogItemSchema),
})

export const tierSchema = z.object({
  id: z.string(),
  name: z.string(),
  rateLimit: z.number().nonnegative(),
  burstLimit: z.number().nonnegative(),
})

export const settingsSchema = z.object({
  defaultRateLimit: z.number().nonnegative(),
  defaultBurstLimit: z.number().nonnegative(),
  tiers: z.array(tierSchema),
})

export type DashboardMetrics = z.infer<typeof dashboardMetricsSchema>
export type PerformancePoint = z.infer<typeof performancePointSchema>
export type LatencyPoint = z.infer<typeof latencyPointSchema>
export type ActiveKey = z.infer<typeof activeKeySchema>
export type RecentEvent = z.infer<typeof recentEventSchema>
export type TopOffender = z.infer<typeof topOffenderSchema>
export type DashboardPayload = z.infer<typeof dashboardPayloadSchema>
export type ApiKeySummary = z.infer<typeof apiKeySummarySchema>
export type ApiKeyList = z.infer<typeof apiKeyListSchema>
export type ApiKeyTimelinePoint = z.infer<typeof apiKeyTimelinePointSchema>
export type ApiKeyActivityLogItem = z.infer<typeof apiKeyActivityLogItemSchema>
export type ApiKeyDetail = z.infer<typeof apiKeyDetailSchema>
export type TierConfig = z.infer<typeof tierSchema>
export type SettingsPayload = z.infer<typeof settingsSchema>
