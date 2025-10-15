import { getRedisClient } from "./client"

const API_KEYS_SET = "api-keys:all" // Set of all API key IDs
const API_KEY_PREFIX = "api-key:" // Prefix for individual key data

export type StoredApiKey = {
  id: string
  name: string
  apiKey: string
  apiKeyHash: string
  ownerEmail: string
  tier: string
  perMinute: number
  perDay: number
  disabled: boolean
  createdAt: string
}

/**
 * Store an API key in Redis
 */
export async function storeApiKey(key: StoredApiKey): Promise<void> {
  const redis = getRedisClient()
  
  // Store the key data
  await redis.hset(
    `${API_KEY_PREFIX}${key.id}`,
    {
      id: key.id,
      name: key.name,
      apiKey: key.apiKey,
      apiKeyHash: key.apiKeyHash,
      ownerEmail: key.ownerEmail,
      tier: key.tier,
      perMinute: key.perMinute.toString(),
      perDay: key.perDay.toString(),
      disabled: key.disabled ? "1" : "0",
      createdAt: key.createdAt,
    }
  )
  
  // Add to the set of all keys
  await redis.sadd(API_KEYS_SET, key.id)
}

/**
 * Get an API key by ID from Redis
 */
export async function getStoredApiKey(id: string): Promise<StoredApiKey | null> {
  const redis = getRedisClient()
  const data = await redis.hgetall(`${API_KEY_PREFIX}${id}`)
  
  if (!data || Object.keys(data).length === 0) {
    return null
  }
  
  return {
    id: data.id,
    name: data.name,
    apiKey: data.apiKey,
    apiKeyHash: data.apiKeyHash,
    ownerEmail: data.ownerEmail,
    tier: data.tier,
    perMinute: parseInt(data.perMinute),
    perDay: parseInt(data.perDay),
    disabled: data.disabled === "1",
    createdAt: data.createdAt,
  }
}

/**
 * Get all API keys from Redis
 */
export async function getAllStoredApiKeys(): Promise<StoredApiKey[]> {
  const redis = getRedisClient()
  const keyIds = await redis.smembers(API_KEYS_SET)
  
  if (keyIds.length === 0) {
    return []
  }
  
  const keys: StoredApiKey[] = []
  for (const id of keyIds) {
    const key = await getStoredApiKey(id)
    if (key) {
      keys.push(key)
    }
  }
  
  return keys
}

/**
 * Update an API key in Redis
 */
export async function updateStoredApiKey(
  id: string,
  updates: Partial<StoredApiKey>
): Promise<void> {
  const redis = getRedisClient()
  const key = await getStoredApiKey(id)
  
  if (!key) {
    throw new Error(`API key ${id} not found`)
  }
  
  const updatedKey = { ...key, ...updates }
  await storeApiKey(updatedKey)
}

/**
 * Delete an API key from Redis
 */
export async function deleteStoredApiKey(id: string): Promise<void> {
  const redis = getRedisClient()
  await redis.del(`${API_KEY_PREFIX}${id}`)
  await redis.srem(API_KEYS_SET, id)
}

/**
 * Find API key by the actual key value (slow - iterates all keys)
 */
export async function findStoredApiKeyByValue(
  apiKeyValue: string
): Promise<StoredApiKey | null> {
  const allKeys = await getAllStoredApiKeys()
  return allKeys.find((k) => k.apiKey === apiKeyValue) || null
}
