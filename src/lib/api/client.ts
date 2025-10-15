import "server-only"

import { env } from "@/lib/env"
import { headers as nextHeaders } from "next/headers"

interface AdminFetchOptions extends RequestInit {
  skipAuth?: boolean
}

function buildHeaders(options?: AdminFetchOptions) {
  const headers = new Headers(options?.headers)
  if (!options?.skipAuth) {
    headers.set("x-admin-token", env.ADMIN_API_TOKEN)
  }
  headers.set("accept", "application/json")
  return headers
}

async function getAbsoluteUrl(path: string) {
  // If already absolute, return as is
  if (/^https?:\/\//.test(path)) return path

  // Prefer deriving from the incoming request headers to ensure correct host/port in dev and prod
  let baseFromHeaders: string | null = null
  try {
    const h = await nextHeaders()
    const host = h.get("x-forwarded-host") ?? h.get("host")
    const proto = h.get("x-forwarded-proto") ?? "http"
    if (host) {
      baseFromHeaders = `${proto}://${host}`
    }
  } catch {
    // headers() may throw if called outside a request context; ignore and use fallbacks
  }

  const base =
    baseFromHeaders ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000"

  // Ensure no double slash
  return base.replace(/\/$/, "") + (path.startsWith("/") ? path : "/" + path)
}

export async function adminFetch<T>(path: string, options?: AdminFetchOptions): Promise<T> {
  const url = await getAbsoluteUrl(path)
  const res = await fetch(url, {
    ...options,
    headers: buildHeaders(options),
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`Admin API request failed: ${res.status} ${url}`)
  }

  const json = (await res.json()) as { success: boolean; data?: T; error?: { message?: string } }

  if (!json.success || !json.data) {
    throw new Error(json.error?.message ?? "Unexpected admin API response")
  }

  return json.data
}
