import { NextRequest } from "next/server"
import { requireAdminAuth } from "@/lib/api/auth"
import { error, ok } from "@/lib/api/response"
import { apiKeyListSchema } from "@/lib/api/schemas"
import { listApiKeys } from "@/lib/db/api-keys"
import { ensureRedisConnected } from "@/lib/redis/client"
import { getRecentEvents } from "@/lib/redis/events"

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request)
  if (unauthorized) {
    return unauthorized
  }

  try {
    await ensureRedisConnected()

    const keys = await listApiKeys()

    // Get 429 error counts for each key
    const keysWithMetrics = await Promise.all(
      keys.map(async (key) => {
        // For masked keys, we can't fetch events accurately, so we'll use a workaround
        const errors429 = 0 // In production, store this separately

        return {
          id: key.id,
          name: key.name,
          maskedKey: key.maskedKey,
          limits: {
            perMinute: key.perMinute,
            perDay: key.perDay,
          },
          usage: {
            minute: Math.round((key.usage.minute / key.perMinute) * 100),
            day: Math.round((key.usage.day / key.perDay) * 100),
          },
          errors429,
          lastSeen: key.lastSeen || new Date().toISOString(),
        }
      })
    )

    const payload = {
      keys: keysWithMetrics,
      total: keysWithMetrics.length,
    }

    const parsed = apiKeyListSchema.safeParse(payload)

    if (!parsed.success) {
      console.error("Validation error:", parsed.error)
      return error("API key list validation failed", 500)
    }

    return ok(parsed.data)
  } catch (err) {
    console.error("Error fetching API keys:", err)
    return error(
      err instanceof Error ? err.message : "Failed to fetch API keys",
      500
    )
  }
}
