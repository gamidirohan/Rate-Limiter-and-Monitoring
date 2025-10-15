import { NextRequest, NextResponse } from "next/server"
import { findApiKeyByValue } from "@/lib/db/api-keys"
import { checkRateLimit } from "@/lib/redis/rate-limiter"
import { addEvent } from "@/lib/redis/events"
import { updateLastSeen } from "@/lib/redis/metadata"
import { ensureRedisConnected } from "@/lib/redis/client"

/**
 * Test endpoint with full rate limiting
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Ensure Redis is connected
    await ensureRedisConnected()

    // Extract API key from header
    const apiKeyValue = request.headers.get("x-api-key")

    if (!apiKeyValue) {
      await addEvent({
        timestamp: new Date().toISOString(),
        apiKey: "anonymous",
        endpoint: "/api/test-simple",
        status: 401,
        reason: "Missing API key",
        latencyMs: Date.now() - startTime,
      })

      return NextResponse.json(
        { error: "Missing x-api-key header" },
        { status: 401 }
      )
    }

    // Find API key in database
    const apiKey = await findApiKeyByValue(apiKeyValue)

    if (!apiKey) {
      await addEvent({
        timestamp: new Date().toISOString(),
        apiKey: apiKeyValue,
        endpoint: "/api/test-simple",
        status: 401,
        reason: "Invalid API key",
        latencyMs: Date.now() - startTime,
      })

      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      )
    }

    if (apiKey.disabled) {
      await addEvent({
        timestamp: new Date().toISOString(),
        apiKey: apiKeyValue,
        endpoint: "/api/test-simple",
        status: 403,
        reason: "API key disabled",
        latencyMs: Date.now() - startTime,
      })

      return NextResponse.json(
        { error: "API key is disabled" },
        { status: 403 }
      )
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
        endpoint: "/api/test-simple",
        status: 429,
        reason: "Rate limit exceeded",
        latencyMs,
      })

      // Calculate retry after
      const now = new Date()
      const nextMinute = new Date(now)
      nextMinute.setMinutes(nextMinute.getMinutes() + 1)
      nextMinute.setSeconds(0)
      nextMinute.setMilliseconds(0)
      const retryAfter = Math.ceil((nextMinute.getTime() - now.getTime()) / 1000)

      const response = NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter,
        },
        { status: 429 }
      )

      response.headers.set("Retry-After", retryAfter.toString())
      return response
    }

    // Request allowed
    await addEvent({
      timestamp: new Date().toISOString(),
      apiKey: apiKeyValue,
      endpoint: "/api/test-simple",
      status: 200,
      reason: "Allowed",
      latencyMs,
    })

    // Update last seen
    await updateLastSeen(apiKeyValue)

    // Return success response with rate limit headers
    const response = NextResponse.json({
      success: true,
      message: "Route is working!",
      apiKey: apiKeyValue.substring(0, 10) + "...",
      rateLimit: {
        minuteUsed: rateLimitResult.minuteCount,
        minuteLimit: apiKey.perMinute,
        dayUsed: rateLimitResult.dayCount,
        dayLimit: apiKey.perDay,
      },
    })

    response.headers.set("X-RateLimit-Limit-Minute", apiKey.perMinute.toString())
    response.headers.set(
      "X-RateLimit-Remaining-Minute",
      (apiKey.perMinute - rateLimitResult.minuteCount).toString()
    )
    response.headers.set("X-RateLimit-Limit-Day", apiKey.perDay.toString())
    response.headers.set(
      "X-RateLimit-Remaining-Day",
      (apiKey.perDay - rateLimitResult.dayCount).toString()
    )

    return response
  } catch (error) {
    console.error("Error in /api/test-simple:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    await ensureRedisConnected()

    const apiKeyValue = request.headers.get("x-api-key")

    if (!apiKeyValue) {
      await addEvent({
        timestamp: new Date().toISOString(),
        apiKey: "anonymous",
        endpoint: "/api/test-simple",
        status: 401,
        reason: "Missing API key",
        latencyMs: Date.now() - startTime,
      })

      return NextResponse.json(
        { error: "Missing x-api-key header" },
        { status: 401 }
      )
    }

    const apiKey = await findApiKeyByValue(apiKeyValue)

    if (!apiKey) {
      await addEvent({
        timestamp: new Date().toISOString(),
        apiKey: apiKeyValue,
        endpoint: "/api/test-simple",
        status: 401,
        reason: "Invalid API key",
        latencyMs: Date.now() - startTime,
      })

      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      )
    }

    if (apiKey.disabled) {
      await addEvent({
        timestamp: new Date().toISOString(),
        apiKey: apiKeyValue,
        endpoint: "/api/test-simple",
        status: 403,
        reason: "API key disabled",
        latencyMs: Date.now() - startTime,
      })

      return NextResponse.json(
        { error: "API key is disabled" },
        { status: 403 }
      )
    }

    const rateLimitResult = await checkRateLimit(
      apiKeyValue,
      apiKey.perMinute,
      apiKey.perDay
    )

    const latencyMs = Date.now() - startTime

    if (rateLimitResult.isOverLimit) {
      await addEvent({
        timestamp: new Date().toISOString(),
        apiKey: apiKeyValue,
        endpoint: "/api/test-simple",
        status: 429,
        reason: "Rate limit exceeded",
        latencyMs,
      })

      const now = new Date()
      const nextMinute = new Date(now)
      nextMinute.setMinutes(nextMinute.getMinutes() + 1)
      nextMinute.setSeconds(0)
      nextMinute.setMilliseconds(0)
      const retryAfter = Math.ceil((nextMinute.getTime() - now.getTime()) / 1000)

      const response = NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter,
        },
        { status: 429 }
      )

      response.headers.set("Retry-After", retryAfter.toString())
      return response
    }

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    await addEvent({
      timestamp: new Date().toISOString(),
      apiKey: apiKeyValue,
      endpoint: "/api/test-simple",
      status: 200,
      reason: "Allowed",
      latencyMs,
    })

    await updateLastSeen(apiKeyValue)

    const response = NextResponse.json({
      success: true,
      message: "Data received",
      received: body,
      timestamp: new Date().toISOString(),
      rateLimit: {
        minuteUsed: rateLimitResult.minuteCount,
        minuteLimit: apiKey.perMinute,
        dayUsed: rateLimitResult.dayCount,
        dayLimit: apiKey.perDay,
      },
    })

    response.headers.set("X-RateLimit-Limit-Minute", apiKey.perMinute.toString())
    response.headers.set(
      "X-RateLimit-Remaining-Minute",
      (apiKey.perMinute - rateLimitResult.minuteCount).toString()
    )
    response.headers.set("X-RateLimit-Limit-Day", apiKey.perDay.toString())
    response.headers.set(
      "X-RateLimit-Remaining-Day",
      (apiKey.perDay - rateLimitResult.dayCount).toString()
    )

    return response
  } catch (error) {
    console.error("Error in /api/test-simple POST:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
