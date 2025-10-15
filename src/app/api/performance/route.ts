import { NextRequest } from "next/server"

import { requireAdminAuth } from "@/lib/api/auth"
import { getMockPerformance } from "@/lib/api/mock-data"
import { error, ok } from "@/lib/api/response"
import { performancePointSchema } from "@/lib/api/schemas"

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request)
  if (unauthorized) {
    return unauthorized
  }

  const payload = getMockPerformance()
  const parsed = performancePointSchema.array().safeParse(payload)

  if (!parsed.success) {
    return error("Performance series validation failed", 500)
  }

  return ok(parsed.data)
}
