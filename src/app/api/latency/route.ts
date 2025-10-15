import { NextRequest } from "next/server"

import { requireAdminAuth } from "@/lib/api/auth"
import { getMockLatency } from "@/lib/api/mock-data"
import { error, ok } from "@/lib/api/response"
import { latencyPointSchema } from "@/lib/api/schemas"

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request)
  if (unauthorized) {
    return unauthorized
  }

  const payload = getMockLatency()
  const parsed = latencyPointSchema.array().safeParse(payload)

  if (!parsed.success) {
    return error("Latency series validation failed", 500)
  }

  return ok(parsed.data)
}
