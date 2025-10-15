import { NextRequest, NextResponse } from "next/server"

/**
 * Test endpoint for rate limiting
 * This is the endpoint clients will use to test their API keys
 */
export async function GET(request: NextRequest) {
  try {
    // Dynamically import to avoid circular dependencies
    const { rateLimitMiddleware, createRateLimitedResponse } = await import(
      "@/lib/middleware/rate-limit"
    )

    // Apply rate limiting
    const rateLimitResult = await rateLimitMiddleware(request, "/api/data")

    // Check if request should be blocked
    const errorResponse = createRateLimitedResponse(rateLimitResult)
    if (errorResponse) {
      return errorResponse
    }

    // Request is allowed - return success response with rate limit headers
    const response = NextResponse.json(
      {
        success: true,
        message: "Request successful",
        data: {
          timestamp: new Date().toISOString(),
          resource: "test-data",
          value: Math.random(),
        },
      },
      { status: 200 }
    )

    // Add rate limit headers
    if (rateLimitResult.allowed) {
      response.headers.set(
        "X-RateLimit-Limit-Minute",
        rateLimitResult.minuteLimit.toString()
      )
      response.headers.set(
        "X-RateLimit-Remaining-Minute",
        (rateLimitResult.minuteLimit - rateLimitResult.minuteCount).toString()
      )
      response.headers.set(
        "X-RateLimit-Limit-Day",
        rateLimitResult.dayLimit.toString()
      )
      response.headers.set(
        "X-RateLimit-Remaining-Day",
        (rateLimitResult.dayLimit - rateLimitResult.dayCount).toString()
      )
    }

    return response
  } catch (error) {
    console.error("Error in /api/data:", error)
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
  try {
    // Dynamically import to avoid circular dependencies
    const { rateLimitMiddleware, createRateLimitedResponse } = await import(
      "@/lib/middleware/rate-limit"
    )

    // Apply rate limiting
    const rateLimitResult = await rateLimitMiddleware(request, "/api/data")

    // Check if request should be blocked
    const errorResponse = createRateLimitedResponse(rateLimitResult)
    if (errorResponse) {
      return errorResponse
    }

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    // Request is allowed - return success response
    const response = NextResponse.json(
      {
        success: true,
        message: "Data received",
        received: body,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )

    // Add rate limit headers
    if (rateLimitResult.allowed) {
      response.headers.set(
        "X-RateLimit-Limit-Minute",
        rateLimitResult.minuteLimit.toString()
      )
      response.headers.set(
        "X-RateLimit-Remaining-Minute",
        (rateLimitResult.minuteLimit - rateLimitResult.minuteCount).toString()
      )
      response.headers.set(
        "X-RateLimit-Limit-Day",
        rateLimitResult.dayLimit.toString()
      )
      response.headers.set(
        "X-RateLimit-Remaining-Day",
        (rateLimitResult.dayLimit - rateLimitResult.dayCount).toString()
      )
    }

    return response
  } catch (error) {
    console.error("Error in /api/data POST:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
