import { NextRequest } from "next/server"
import { requireAdminAuth } from "@/lib/api/auth"
import { error, ok } from "@/lib/api/response"
import { dashboardPayloadSchema } from "@/lib/api/schemas"
import { ensureRedisConnected } from "@/lib/redis/client"
import { getRecentEvents } from "@/lib/redis/events"
import { listApiKeys } from "@/lib/db/api-keys"

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request)
  if (unauthorized) {
    return unauthorized
  }

  try {
    await ensureRedisConnected()

    // Get recent events
    const events = await getRecentEvents(undefined, 1000)

    // Calculate metrics
    const totalRequests = events.length
    const blockedRequests = events.filter((e) => e.status === 429).length
    const latencies = events
      .filter((e) => e.latencyMs && e.latencyMs > 0)
      .map((e) => e.latencyMs!)
    const averageLatencyMs =
      latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0
    const maxLatencyMs = latencies.length > 0 ? Math.max(...latencies) : 0

    // Generate performance data (last 7 time points)
    const performance = generatePerformanceData(events)

    // Generate latency data
    const latency = generateLatencyData(events)

    // Get active keys usage
    const keys = await listApiKeys()
    const activeKeys = keys.slice(0, 5).map((key) => ({
      id: key.name,
      usagePercent: Math.round((key.usage.minute / key.perMinute) * 100),
    }))

    // Create a map of full API keys to names for lookups
    // We need to build this from the actual events to match the keys
    const keyNameMap = new Map<string, string>()
    
    // For each event, try to match it with a key from our list
    const uniqueEventKeys = new Set(events.map(e => e.apiKey))
    for (const eventKey of uniqueEventKeys) {
      // Try to find matching key by looking at stored keys
      const matchingKey = keys.find(k => {
        // Extract the parts from masked key and compare
        const parts = k.maskedKey.split('...')
        if (parts.length === 2) {
          return eventKey.startsWith(parts[0]) && eventKey.endsWith(parts[1])
        }
        return false
      })
      
      if (matchingKey) {
        keyNameMap.set(eventKey, matchingKey.name)
      }
    }

    // Recent events (last 10)
    const recentEvents = events.slice(0, 10).map((e) => {
      // Format timestamp to be more readable
      const date = new Date(e.timestamp)
      const formattedTime = date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
      })
      
      // Get the key name from our map, or use masked key as fallback
      const keyName = keyNameMap.get(e.apiKey) || (e.apiKey.slice(0, 8) + '...' + e.apiKey.slice(-4))

      return {
        timestamp: formattedTime,
        type: "Request",
        key: keyName,
        status: e.status === 429 ? ("blocked" as const) : ("allowed" as const),
      }
    })

    // Top offenders - use key names instead of API keys
    const offenderMap = new Map<string, { name: string; count: number }>()
    events
      .filter((e) => e.status === 429)
      .forEach((e) => {
        const keyName = keyNameMap.get(e.apiKey) || (e.apiKey.slice(0, 8) + '...' + e.apiKey.slice(-4))
        
        const existing = offenderMap.get(e.apiKey)
        if (existing) {
          existing.count++
        } else {
          offenderMap.set(e.apiKey, { name: keyName, count: 1 })
        }
      })
    const topOffenders = Array.from(offenderMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((item) => ({ key: item.name, blockedRequests: item.count }))

    const payload = {
      metrics: {
        totalRequests,
        blockedRequests,
        averageLatencyMs: Math.round(averageLatencyMs),
        maxLatencyMs: Math.round(maxLatencyMs),
      },
      performance,
      latency,
      activeKeys,
      recentEvents,
      topOffenders,
    }

    const parsed = dashboardPayloadSchema.safeParse(payload)

    if (!parsed.success) {
      console.error("Validation error:", parsed.error)
      return error("Dashboard payload validation failed", 500)
    }

    return ok(parsed.data)
  } catch (err) {
    console.error("Error fetching dashboard data:", err)
    return error(
      err instanceof Error ? err.message : "Failed to fetch dashboard data",
      500
    )
  }
}

function generatePerformanceData(events: any[]) {
  const now = new Date()
  const points = []

  for (let i = 6; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 5 * 60 * 1000)
    // Format time in local timezone as HH:MM
    const hours = time.getHours().toString().padStart(2, '0')
    const minutes = time.getMinutes().toString().padStart(2, '0')
    const timeStr = `${hours}:${minutes}`

    // Count events in this 5-minute window
    const windowStart = time.getTime()
    const windowEnd = windowStart + 5 * 60 * 1000
    const count = events.filter((e) => {
      const eventTime = new Date(e.timestamp).getTime()
      return eventTime >= windowStart && eventTime < windowEnd
    }).length

    // Convert to RPS (requests per second)
    const rps = Math.round((count / 300) * 10) / 10

    points.push({ time: timeStr, rps })
  }

  return points
}

function generateLatencyData(events: any[]) {
  const now = new Date()
  const points = []

  for (let i = 6; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 5 * 60 * 1000)
    // Format time in local timezone as HH:MM
    const hours = time.getHours().toString().padStart(2, '0')
    const minutes = time.getMinutes().toString().padStart(2, '0')
    const timeStr = `${hours}:${minutes}`

    // Get average latency in this 5-minute window
    const windowStart = time.getTime()
    const windowEnd = windowStart + 5 * 60 * 1000
    const windowEvents = events.filter((e) => {
      const eventTime = new Date(e.timestamp).getTime()
      return eventTime >= windowStart && eventTime < windowEnd
    })

    const latencies = windowEvents
      .filter((e) => e.latencyMs && e.latencyMs > 0)
      .map((e) => e.latencyMs!)
    const avgLatency =
      latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0

    points.push({ time: timeStr, latency: Math.round(avgLatency) })
  }

  return points
}
