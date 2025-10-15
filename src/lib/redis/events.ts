import { getRedisClient } from "./client"
import { getEventsStreamKey, getGlobalEventsStreamKey } from "./keys"

export type EventType = "allowed" | "blocked"

export type RateLimitEvent = {
  timestamp: string
  apiKey: string
  endpoint: string
  status: number
  reason?: string
  latencyMs?: number
}

/**
 * Add an event to both the per-key stream and global stream
 */
export async function addEvent(event: RateLimitEvent): Promise<void> {
  const redis = getRedisClient()

  const eventData = {
    timestamp: event.timestamp,
    apiKey: event.apiKey,
    endpoint: event.endpoint,
    status: event.status.toString(),
    reason: event.reason || "",
    latencyMs: event.latencyMs?.toString() || "0",
  }

  // Add to per-key stream
  const keyStream = getEventsStreamKey(event.apiKey)
  await redis.xadd(keyStream, "MAXLEN", "~", "1000", "*", ...Object.entries(eventData).flat())

  // Add to global stream
  const globalStream = getGlobalEventsStreamKey()
  await redis.xadd(
    globalStream,
    "MAXLEN",
    "~",
    "10000",
    "*",
    ...Object.entries(eventData).flat()
  )
}

/**
 * Get the total count of events in a stream
 */
export async function getEventCount(apiKey?: string): Promise<number> {
  const redis = getRedisClient()
  
  const streamKey = apiKey
    ? getEventsStreamKey(apiKey)
    : getGlobalEventsStreamKey()
  
  try {
    const length = await redis.xlen(streamKey)
    return length
  } catch (error) {
    console.error("Error getting event count:", error)
    return 0
  }
}

/**
 * Get recent events from a stream
 */
export async function getRecentEvents(
  apiKey?: string,
  count: number = 100
): Promise<RateLimitEvent[]> {
  const redis = getRedisClient()

  const streamKey = apiKey
    ? getEventsStreamKey(apiKey)
    : getGlobalEventsStreamKey()

  // XREVRANGE returns events in reverse chronological order
  const events = await redis.xrevrange(streamKey, "+", "-", "COUNT", count)

  return events.map(([id, fields]) => {
    const fieldMap = new Map<string, string>()
    for (let i = 0; i < fields.length; i += 2) {
      fieldMap.set(fields[i], fields[i + 1])
    }

    return {
      timestamp: fieldMap.get("timestamp") || "",
      apiKey: fieldMap.get("apiKey") || "",
      endpoint: fieldMap.get("endpoint") || "",
      status: parseInt(fieldMap.get("status") || "0", 10),
      reason: fieldMap.get("reason"),
      latencyMs: parseInt(fieldMap.get("latencyMs") || "0", 10),
    }
  })
}
