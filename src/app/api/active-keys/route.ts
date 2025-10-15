import { NextRequest } from "next/server"

import { requireAdminAuth } from "@/lib/api/auth"
import { getMockActiveKeys } from "@/lib/api/mock-data"
import { error, ok } from "@/lib/api/response"
import { activeKeySchema } from "@/lib/api/schemas"

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request)
  if (unauthorized) {
    return unauthorized
  }

  const payload = getMockActiveKeys()
  const parsed = activeKeySchema.array().safeParse(payload)

  if (!parsed.success) {
    return error("Active key usage validation failed", 500)
  }

  return ok(parsed.data)
}
