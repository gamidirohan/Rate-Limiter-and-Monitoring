import { NextRequest } from "next/server"

import { requireAdminAuth } from "@/lib/api/auth"
import { getMockRecentEvents } from "@/lib/api/mock-data"
import { error, ok } from "@/lib/api/response"
import { recentEventSchema } from "@/lib/api/schemas"

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request)
  if (unauthorized) {
    return unauthorized
  }

  const payload = getMockRecentEvents()
  const parsed = recentEventSchema.array().safeParse(payload)

  if (!parsed.success) {
    return error("Recent events validation failed", 500)
  }

  return ok(parsed.data)
}
