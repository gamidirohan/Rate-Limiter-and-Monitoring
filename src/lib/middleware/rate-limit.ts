import { NextRequest, NextResponse } from "next/server"
import { findApiKeyByValue } from "@/lib/db/api-keys"
import { checkRateLimit } from "@/lib/redis/rate-limiter"
import { addEvent } from "@/lib/redis/events"
import { updateLastSeen } from "@/lib/redis/metadata"
import { ensureRedisConnected } from "@/lib/redis/client"

export type RateLimitResult =
  | {
      allowed: true
      minuteCount: number
      dayCount: number
      minuteLimit: number
      dayLimit: number
    }
  | {
      allowed: false
      reason: string
      retryAfter: number
    }

/**
 * Rate limit middleware for API requests
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  endpoint: string
): Promise<RateLimitResult> {
  const startTime = Date.now()

  // Ensure Redis is connected
  await ensureRedisConnected()

  // Extract API key from header
  const apiKeyValue = request.headers.get("x-api-key")

  if (!apiKeyValue) {
    await addEvent({
      timestamp: new Date().toISOString(),
      apiKey: "anonymous",
      endpoint,
      status: 401,
      reason: "Missing API key",
      latencyMs: Date.now() - startTime,
    })

    return {
      allowed: false,
      reason: "Missing x-api-key header",
      retryAfter: 60,
    }
  }

  // Find API key in database
  const apiKey = await findApiKeyByValue(apiKeyValue)

  if (!apiKey) {
    await addEvent({
      timestamp: new Date().toISOString(),
      apiKey: apiKeyValue,
      endpoint,
      status: 401,
      reason: "Invalid API key",
      latencyMs: Date.now() - startTime,
    })

    return {
      allowed: false,
      reason: "Invalid API key",
      retryAfter: 60,
    }
  }

  if (apiKey.disabled) {
    await addEvent({
      timestamp: new Date().toISOString(),
      apiKey: apiKeyValue,
      endpoint,
      status: 403,
      reason: "API key disabled",
      latencyMs: Date.now() - startTime,
    })

    return {
      allowed: false,
      reason: "API key is disabled",
      retryAfter: 3600,
    }
  }

  // Check rate limits
  const rateLimitResult = await checkRateLimit(
    apiKeyValue,
    apiKey.perMinute,
    apiKey.perDay
  )

  const latencyMs = Date.now() - startTime

  if (rateLimitResult.isOverLimit) {
    // Rate limit exceeded
    await addEvent({
      timestamp: new Date().toISOString(),
      apiKey: apiKeyValue,
      endpoint,
      status: 429,
      reason: "Rate limit exceeded",
      latencyMs,
    })

    // Calculate retry after (time until next minute window)
    const now = new Date()
    const nextMinute = new Date(now)
    nextMinute.setMinutes(nextMinute.getMinutes() + 1)
    nextMinute.setSeconds(0)
    nextMinute.setMilliseconds(0)
    const retryAfter = Math.ceil((nextMinute.getTime() - now.getTime()) / 1000)

    return {
      allowed: false,
      reason: "Rate limit exceeded",
      retryAfter,
    }
  }

  // Request allowed
  await addEvent({
    timestamp: new Date().toISOString(),
    apiKey: apiKeyValue,
    endpoint,
    status: 200,
    reason: "Allowed",
    latencyMs,
  })

  // Update last seen
  await updateLastSeen(apiKeyValue)

  return {
    allowed: true,
    minuteCount: rateLimitResult.minuteCount,
    dayCount: rateLimitResult.dayCount,
    minuteLimit: apiKey.perMinute,
    dayLimit: apiKey.perDay,
  }
}

/**
 * Create a rate-limited API response
 */
export function createRateLimitedResponse(
  result: RateLimitResult
): NextResponse | null {
  if (!result.allowed) {
    // result.allowed === false, so TypeScript should narrow the type
    const reason = (result as Extract<RateLimitResult, { allowed: false }>).reason
    const retryAfter = (result as Extract<RateLimitResult, { allowed: false }>).retryAfter
    
    // Return error response
    const response = NextResponse.json(
      {
        error: reason,
        retryAfter: retryAfter,
      },
      {
        status: reason.includes("Missing") || reason.includes("Invalid")
          ? 401
          : reason.includes("disabled")
          ? 403
          : 429,
      }
    )

    if (reason === "Rate limit exceeded") {
      response.headers.set("Retry-After", retryAfter.toString())
    }

    return response
  }
  
  // Add rate limit headers
  const headers = new Headers()
  headers.set("X-RateLimit-Limit-Minute", result.minuteLimit.toString())
  headers.set("X-RateLimit-Remaining-Minute", (result.minuteLimit - result.minuteCount).toString())
  headers.set("X-RateLimit-Limit-Day", result.dayLimit.toString())
  headers.set("X-RateLimit-Remaining-Day", (result.dayLimit - result.dayCount).toString())

  return null // Continue to actual handler
}
