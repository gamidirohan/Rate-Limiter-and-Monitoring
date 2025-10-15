import { redis } from './client'
import { Tier } from '@/lib/db/api-keys'

const TIER_PREFIX = 'tier:'
const TIER_SET_KEY = 'tiers:all'

/**
 * Store a tier in Redis
 */
export async function storeTier(tier: Tier): Promise<void> {
  const key = `${TIER_PREFIX}${tier.id}`
  
  await redis.hset(key, {
    id: tier.id,
    name: tier.name,
    rateLimit: tier.rateLimit.toString(),
    burstLimit: tier.burstLimit.toString(),
  })
  
  // Add to the set of all tier IDs
  await redis.sadd(TIER_SET_KEY, tier.id)
}

/**
 * Get a tier from Redis by ID
 */
export async function getStoredTier(id: string): Promise<Tier | null> {
  const key = `${TIER_PREFIX}${id}`
  const data = await redis.hgetall(key)
  
  if (!data || Object.keys(data).length === 0) {
    return null
  }
  
  return {
    id: data.id,
    name: data.name,
    rateLimit: parseInt(data.rateLimit),
    burstLimit: parseInt(data.burstLimit),
  }
}

/**
 * Get all tiers from Redis
 */
export async function getAllStoredTiers(): Promise<Tier[]> {
  const tierIds = await redis.smembers(TIER_SET_KEY)
  
  if (tierIds.length === 0) {
    return []
  }
  
  const tiers: Tier[] = []
  for (const id of tierIds) {
    const tier = await getStoredTier(id)
    if (tier) {
      tiers.push(tier)
    }
  }
  
  return tiers
}

/**
 * Delete a tier from Redis
 */
export async function deleteStoredTier(id: string): Promise<void> {
  const key = `${TIER_PREFIX}${id}`
  await redis.del(key)
  await redis.srem(TIER_SET_KEY, id)
}

/**
 * Check if a tier exists in Redis
 */
export async function tierExists(id: string): Promise<boolean> {
  return await redis.sismember(TIER_SET_KEY, id) === 1
}
