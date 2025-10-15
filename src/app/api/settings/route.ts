import { NextRequest } from "next/server"
import { requireAdminAuth } from "@/lib/api/auth"
import { error, ok } from "@/lib/api/response"
import { settingsSchema, tierSchema } from "@/lib/api/schemas"
import { getAllTiers, updateTier, createTier, reloadTiers } from "@/lib/db/api-keys"
import { env } from "@/lib/env"
import { z } from "zod"

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request)
  if (unauthorized) {
    return unauthorized
  }

  try {
    // Reload tiers from Redis to ensure we have the latest data
    await reloadTiers()
    
    const tiers = getAllTiers()

    const payload = {
      defaultRateLimit: env.RATE_DEFAULT_PER_MINUTE / 60, // Convert to per-second
      defaultBurstLimit: Math.round((env.RATE_DEFAULT_PER_MINUTE / 60) * 1.5),
      tiers: tiers.map((t) => ({
        id: t.id,
        name: t.name,
        rateLimit: t.rateLimit,
        burstLimit: t.burstLimit,
      })),
    }

    const parsed = settingsSchema.safeParse(payload)

    if (!parsed.success) {
      console.error("Validation error:", parsed.error)
      return error("Settings validation failed", 500)
    }

    return ok(parsed.data)
  } catch (err) {
    console.error("Error fetching settings:", err)
    return error(
      err instanceof Error ? err.message : "Failed to fetch settings",
      500
    )
  }
}

const updateSettingsSchema = z.object({
  defaultRateLimit: z.number().positive().optional(),
  defaultBurstLimit: z.number().positive().optional(),
  tiers: z.array(tierSchema).optional(),
})

export async function PATCH(request: NextRequest) {
  const unauthorized = requireAdminAuth(request)
  if (unauthorized) {
    return unauthorized
  }

  try {
    const body = await request.json()
    const parsed = updateSettingsSchema.safeParse(body)

    if (!parsed.success) {
      return error("Invalid request body: " + JSON.stringify(parsed.error.issues), 400)
    }

    // Update tiers if provided
    if (parsed.data.tiers) {
      for (const tier of parsed.data.tiers) {
        try {
          await updateTier(tier.id, {
            name: tier.name,
            rateLimit: tier.rateLimit,
            burstLimit: tier.burstLimit,
          })
        } catch {
          // Tier doesn't exist, create it with the provided ID
          await createTier(tier.name, tier.rateLimit, tier.burstLimit, tier.id)
        }
      }
    }

    return ok({ message: "Settings updated successfully" })
  } catch (err) {
    console.error("Error updating settings:", err)
    return error(
      err instanceof Error ? err.message : "Failed to update settings",
      500
    )
  }
}
