import { NextRequest, NextResponse } from "next/server"
import { requireAdminAuth } from "@/lib/api/auth"
import { error, ok } from "@/lib/api/response"
import { z } from "zod"
import { createApiKey } from "@/lib/db/api-keys"

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  tier: z.enum(["basic", "standard", "premium"]),
  ownerEmail: z.string().email().optional(),
})

/**
 * POST /api/admin/api-keys - Create a new API key
 */
export async function POST(request: NextRequest) {
  const unauthorized = requireAdminAuth(request)
  if (unauthorized) {
    return unauthorized
  }

  try {
    const body = await request.json()
    const parsed = createKeySchema.safeParse(body)

    if (!parsed.success) {
      return error("Invalid request body: " + JSON.stringify(parsed.error.issues), 400)
    }

    const { name, tier, ownerEmail } = parsed.data

    const result = await createApiKey(name, tier, ownerEmail)

    return ok({
      id: result.id,
      apiKey: result.apiKey,
      message: "API key created successfully",
    })
  } catch (err: unknown) {
    console.error("Error creating API key:", err)
    return error(
      err instanceof Error ? err.message : "Failed to create API key",
      500
    )
  }
}
