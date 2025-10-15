import { getRedisClient } from "./client"
import { getMetadataKey } from "./keys"

export type ApiKeyMetadata = {
  id: string
  name: string
  tier: string
  perMinute: number
  perDay: number
  disabled: boolean
  ownerEmail?: string
}

/**
 * Cache API key metadata in Redis
 */
export async function cacheMetadata(
  apiKey: string,
  metadata: ApiKeyMetadata
): Promise<void> {
  const redis = getRedisClient()
  const key = getMetadataKey(apiKey)

  await redis.setex(key, 24 * 60 * 60, JSON.stringify(metadata))
}

/**
 * Get cached metadata from Redis
 */
export async function getCachedMetadata(
  apiKey: string
): Promise<ApiKeyMetadata | null> {
  const redis = getRedisClient()
  const key = getMetadataKey(apiKey)

  const data = await redis.get(key)
  if (!data) {
    return null
  }

  return JSON.parse(data) as ApiKeyMetadata
}

/**
 * Invalidate cached metadata
 */
export async function invalidateMetadata(apiKey: string): Promise<void> {
  const redis = getRedisClient()
  const key = getMetadataKey(apiKey)

  await redis.del(key)
}

/**
 * Update last seen timestamp for an API key
 */
export async function updateLastSeen(apiKey: string): Promise<void> {
  const redis = getRedisClient()
  const key = `lastseen:${apiKey}`

  await redis.set(key, new Date().toISOString(), "EX", 7 * 24 * 60 * 60)
}

/**
 * Get last seen timestamp
 */
export async function getLastSeen(apiKey: string): Promise<string | null> {
  const redis = getRedisClient()
  const key = `lastseen:${apiKey}`

  return await redis.get(key)
}
