import { NextRequest } from "next/server"
import { requireAdminAuth } from "@/lib/api/auth"
import { error, ok } from "@/lib/api/response"
import { apiKeyDetailSchema } from "@/lib/api/schemas"
import { getApiKeyById, updateApiKeyLimits, deleteApiKey } from "@/lib/db/api-keys"
import { ensureRedisConnected } from "@/lib/redis/client"
import { getCurrentUsage } from "@/lib/redis/rate-limiter"
import { getRecentEvents } from "@/lib/redis/events"
import { z } from "zod"

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const unauthorized = requireAdminAuth(request)
  if (unauthorized) {
    return unauthorized
  }

  try {
    await ensureRedisConnected()
    const { id } = await params

    const apiKey = await getApiKeyById(id)

    if (!apiKey) {
      return error("API key not found", 404)
    }

    const usage = await getCurrentUsage(apiKey.apiKey)
    const events = await getRecentEvents(apiKey.apiKey, 50)

    // Generate timeline data (last 60 minutes)
    const minuteTimeline = generateMinuteTimeline()
    // Generate daily timeline (last 30 days)
    const dailyTimeline = generateDailyTimeline()

    const payload = {
      id: apiKey.id,
      name: apiKey.name,
      apiKey: apiKey.apiKey,
      minuteUsage: usage.minute,
      dailyUsage: usage.day,
      minuteTimeline,
      dailyTimeline,
      rateLimit: apiKey.perMinute,
      timeWindowSeconds: 60,
      activityLog: events.map((e) => ({
        timestamp: e.timestamp,
        event: e.status === 429 ? "Blocked" : "Allowed",
        details: `${e.endpoint} - ${e.reason || "OK"}`,
        status: e.status,
      })),
    }

    const parsed = apiKeyDetailSchema.safeParse(payload)

    if (!parsed.success) {
      console.error("Validation error:", parsed.error)
      return error("API key detail validation failed", 500)
    }

    return ok(parsed.data)
  } catch (err) {
    console.error("Error fetching API key detail:", err)
    return error(
      err instanceof Error ? err.message : "Failed to fetch API key detail",
      500
    )
  }
}

const updateLimitsSchema = z.object({
  perMinute: z.number().positive(),
  perDay: z.number().positive(),
})

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const unauthorized = requireAdminAuth(request)
  if (unauthorized) {
    return unauthorized
  }

  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateLimitsSchema.safeParse(body)

    if (!parsed.success) {
      return error("Invalid request body: " + JSON.stringify(parsed.error.issues), 400)
    }

    await updateApiKeyLimits(id, parsed.data.perMinute, parsed.data.perDay)

    return ok({ message: "API key limits updated successfully" })
  } catch (err) {
    console.error("Error updating API key limits:", err)
    return error(
      err instanceof Error ? err.message : "Failed to update API key limits",
      500
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const unauthorized = requireAdminAuth(request)
  if (unauthorized) {
    return unauthorized
  }

  try {
    const { id } = await params
    await deleteApiKey(id)

    return ok({ message: "API key deleted successfully" })
  } catch (err) {
    console.error("Error deleting API key:", err)
    return error(
      err instanceof Error ? err.message : "Failed to delete API key",
      500
    )
  }
}

function generateMinuteTimeline() {
  const timeline = []
  const now = new Date()

  for (let i = 59; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 1000)
    timeline.push({
      time: time.toISOString().slice(11, 16),
      value: 0,
    })
  }

  return timeline
}

function generateDailyTimeline() {
  const timeline = []
  const now = new Date()

  for (let i = 29; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    timeline.push({
      time: time.toISOString().slice(0, 10),
      value: 0,
    })
  }

  return timeline
}
