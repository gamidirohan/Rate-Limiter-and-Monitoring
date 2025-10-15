import { NextRequest } from "next/server"

import { env } from "@/lib/env"
import { error } from "@/lib/api/response"

export function requireAdminAuth(request: NextRequest) {
  const token = request.headers.get("x-admin-token")
  if (!token || token !== env.ADMIN_API_TOKEN) {
    return error("Unauthorized", 401)
  }
  return null
}
