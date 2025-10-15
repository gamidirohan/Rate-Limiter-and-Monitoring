/**
 * Redis Key Patterns for Rate Limiter
 */

export function getMinuteKey(apiKey: string): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, "0")
  const day = String(now.getUTCDate()).padStart(2, "0")
  const hour = String(now.getUTCHours()).padStart(2, "0")
  const minute = String(now.getUTCMinutes()).padStart(2, "0")

  return `rl:${apiKey}:min:${year}${month}${day}${hour}${minute}`
}

export function getDayKey(apiKey: string): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, "0")
  const day = String(now.getUTCDate()).padStart(2, "0")

  return `rl:${apiKey}:day:${year}${month}${day}`
}

export function getMetadataKey(apiKey: string): string {
  return `meta:${apiKey}`
}

export function getEventsStreamKey(apiKey: string): string {
  return `events:${apiKey}`
}

export function getGlobalEventsStreamKey(): string {
  return `events:global`
}

export function getGlobalRPSKey(): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, "0")
  const day = String(now.getUTCDate()).padStart(2, "0")
  const hour = String(now.getUTCHours()).padStart(2, "0")
  const minute = String(now.getUTCMinutes()).padStart(2, "0")
  const second = String(now.getUTCSeconds()).padStart(2, "0")

  return `global:rps:${year}${month}${day}${hour}${minute}${second}`
}
