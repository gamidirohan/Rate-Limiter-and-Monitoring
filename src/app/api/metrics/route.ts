import { NextRequest } from "next/server"

import { requireAdminAuth } from "@/lib/api/auth"
import { getMockMetrics } from "@/lib/api/mock-data"
import { error, ok } from "@/lib/api/response"
import { dashboardMetricsSchema } from "@/lib/api/schemas"

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request)
  if (unauthorized) {
    return unauthorized
  }

  const payload = getMockMetrics()
  const parsed = dashboardMetricsSchema.safeParse(payload)

  if (!parsed.success) {
    return error("Metrics payload validation failed", 500)
  }

  return ok(parsed.data)
}
