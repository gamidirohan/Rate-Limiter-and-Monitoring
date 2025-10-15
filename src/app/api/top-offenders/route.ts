import { NextRequest } from "next/server"

import { requireAdminAuth } from "@/lib/api/auth"
import { getMockTopOffenders } from "@/lib/api/mock-data"
import { error, ok } from "@/lib/api/response"
import { topOffenderSchema } from "@/lib/api/schemas"

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request)
  if (unauthorized) {
    return unauthorized
  }

  const payload = getMockTopOffenders()
  const parsed = topOffenderSchema.array().safeParse(payload)

  if (!parsed.success) {
    return error("Top offenders validation failed", 500)
  }

  return ok(parsed.data)
}
