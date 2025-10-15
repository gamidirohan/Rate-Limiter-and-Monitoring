import { getRedisClient } from "./client"
import { getDayKey, getMinuteKey } from "./keys"

/**
 * Lua script for atomic rate limiting
 * KEYS[1] = minute key
 * KEYS[2] = day key
 * ARGV[1] = minute TTL (milliseconds)
 * ARGV[2] = day TTL (milliseconds)
 * ARGV[3] = minute limit
 * ARGV[4] = day limit
 *
 * Returns: [minuteCount, dayCount, isOverLimit (1 or 0)]
 */
const rateLimitLuaScript = `
local m = redis.call('INCR', KEYS[1])
if m == 1 then 
  redis.call('PEXPIRE', KEYS[1], ARGV[1]) 
end

local d = redis.call('INCR', KEYS[2])
if d == 1 then 
  redis.call('PEXPIRE', KEYS[2], ARGV[2]) 
end

local over = (m > tonumber(ARGV[3])) or (d > tonumber(ARGV[4]))
return {m, d, over and 1 or 0}
`

export type RateLimitResult = {
  minuteCount: number
  dayCount: number
  isOverLimit: boolean
}

export async function checkRateLimit(
  apiKey: string,
  minuteLimit: number,
  dayLimit: number
): Promise<RateLimitResult> {
  const redis = getRedisClient()

  const minuteKey = getMinuteKey(apiKey)
  const dayKey = getDayKey(apiKey)

  // TTLs: 90 seconds for minute window, 25 hours for day window
  const minuteTTL = 90 * 1000
  const dayTTL = 25 * 60 * 60 * 1000

  const result = (await redis.eval(
    rateLimitLuaScript,
    2,
    minuteKey,
    dayKey,
    minuteTTL.toString(),
    dayTTL.toString(),
    minuteLimit.toString(),
    dayLimit.toString()
  )) as [number, number, number]

  return {
    minuteCount: result[0],
    dayCount: result[1],
    isOverLimit: result[2] === 1,
  }
}

/**
 * Get current usage counts without incrementing
 */
export async function getCurrentUsage(
  apiKey: string
): Promise<{ minute: number; day: number }> {
  const redis = getRedisClient()

  const minuteKey = getMinuteKey(apiKey)
  const dayKey = getDayKey(apiKey)

  const [minuteCount, dayCount] = await Promise.all([
    redis.get(minuteKey),
    redis.get(dayKey),
  ])

  return {
    minute: minuteCount ? parseInt(minuteCount, 10) : 0,
    day: dayCount ? parseInt(dayCount, 10) : 0,
  }
}
