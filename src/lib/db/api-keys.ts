import { nanoid } from "nanoid"
import bcrypt from "bcrypt"
import {
  cacheMetadata,
  getCachedMetadata,
  invalidateMetadata,
} from "@/lib/redis/metadata"
import { getLastSeen } from "@/lib/redis/metadata"
import { getCurrentUsage } from "@/lib/redis/rate-limiter"
import {
  storeApiKey,
  getStoredApiKey,
  getAllStoredApiKeys,
  findStoredApiKeyByValue,
  updateStoredApiKey,
  deleteStoredApiKey,
  type StoredApiKey,
} from "@/lib/redis/api-key-storage"
import {
  storeTier,
  getStoredTier,
  getAllStoredTiers,
  deleteStoredTier,
} from "@/lib/redis/tier-storage"

/**
 * In-memory storage for API keys
 * In production, this would be replaced with Supabase/Postgres
 */

export type ApiKey = {
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

export type Tier = {
  id: string
  name: string
  rateLimit: number // requests per second
  burstLimit: number // max burst
}

// In-memory stores (replace with actual DB in production)
const apiKeysStore = new Map<string, ApiKey>()
const apiKeysByHash = new Map<string, ApiKey>()

// Default tiers
const tiersStore = new Map<string, Tier>([
  [
    "basic",
    {
      id: "basic",
      name: "Basic",
      rateLimit: 20,
      burstLimit: 30,
    },
  ],
  [
    "standard",
    {
      id: "standard",
      name: "Standard",
      rateLimit: 30,
      burstLimit: 50,
    },
  ],
  [
    "premium",
    {
      id: "premium",
      name: "Premium",
      rateLimit: 40,
      burstLimit: 80,
    },
  ],
])

/**
 * Initialize tiers from Redis or create defaults
 */
async function initializeTiers(): Promise<void> {
  try {
    console.log('🔄 Initializing tiers...')
    
    // Load tiers from Redis
    const storedTiers = await getAllStoredTiers()
    console.log(`📦 Found ${storedTiers.length} tiers in Redis:`, storedTiers.map(t => `${t.name}(${t.rateLimit}/s)`))
    
    if (storedTiers.length > 0) {
      // Load existing tiers into memory
      tiersStore.clear()
      for (const tier of storedTiers) {
        tiersStore.set(tier.id, tier)
      }
      console.log(`✅ Loaded ${storedTiers.length} tiers from Redis into memory`)
    } else {
      // Only create defaults if Redis is completely empty AND memory is empty
      const memoryTiers = Array.from(tiersStore.values())
      console.log(`⚠️  No tiers in Redis. Memory has ${memoryTiers.length} tiers.`)
      
      if (memoryTiers.length > 0) {
        console.log('💾 Storing existing memory tiers to Redis...')
        for (const [, tier] of tiersStore) {
          await storeTier(tier)
          console.log(`  - Stored ${tier.name}: ${tier.rateLimit}/s, ${tier.burstLimit} burst`)
        }
        console.log('✅ Memory tiers backed up to Redis')
      } else {
        console.log('🏗️  Creating default tiers...')
        // This should rarely happen - only on first run
        for (const [, tier] of tiersStore) {
          await storeTier(tier)
        }
        console.log('✅ Default tiers created in Redis')
      }
    }
  } catch (error) {
    console.error('❌ Error initializing tiers:', error)
    console.log('🔄 Continuing with in-memory tiers...')
  }
}

// Initialize tiers on module load (global singleton)
const global = globalThis as any
if (!global.__tiersInitialized) {
  global.__tiersInitialized = true
  console.log('🚀 Starting tier initialization (singleton)...')
  initializeTiers()
} else {
  console.log('⚡ Tiers already initialized, skipping...')
}

/**
 * Generate a new API key
 */
function generateApiKey(): string {
  return `sk_${nanoid(32)}`
}

/**
 * Hash an API key for storage
 */
async function hashApiKey(apiKey: string): Promise<string> {
  return await bcrypt.hash(apiKey, 10)
}

/**
 * Verify an API key against a hash
 */
async function verifyApiKey(apiKey: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(apiKey, hash)
}

/**
 * Create a new API key
 */
export async function createApiKey(
  name: string,
  tier: string,
  ownerEmail: string = "admin@example.com"
): Promise<{ id: string; apiKey: string }> {
  const tierConfig = tiersStore.get(tier)
  if (!tierConfig) {
    throw new Error(`Tier ${tier} not found`)
  }

  const id = nanoid()
  const apiKey = generateApiKey()
  const apiKeyHash = await hashApiKey(apiKey)

  // Convert per-second rate to per-minute and per-day
  const perMinute = tierConfig.rateLimit * 60
  const perDay = tierConfig.rateLimit * 60 * 60 * 24

  const newKey: ApiKey = {
    id,
    name,
    apiKey,
    apiKeyHash,
    ownerEmail,
    tier,
    perMinute,
    perDay,
    disabled: false,
    createdAt: new Date().toISOString(),
  }

  apiKeysStore.set(id, newKey)
  apiKeysByHash.set(apiKeyHash, newKey)

  // Store in Redis for persistence
  await storeApiKey(newKey)

  // Cache metadata in Redis
  await cacheMetadata(apiKey, {
    id,
    name,
    tier,
    perMinute,
    perDay,
    disabled: false,
    ownerEmail,
  })

  return { id, apiKey }
}

/**
 * Update API key limits based on current tier configuration
 */
function updateApiKeyWithCurrentTierLimits(key: ApiKey): ApiKey {
  const currentTier = tiersStore.get(key.tier)
  if (currentTier) {
    // Update with current tier limits
    key.perMinute = currentTier.rateLimit * 60
    key.perDay = currentTier.rateLimit * 60 * 60 * 24
  }
  return key
}

/**
 * Find API key by the actual key value
 */
export async function findApiKeyByValue(
  apiKeyValue: string
): Promise<ApiKey | null> {
  console.log("Looking up API key:", apiKeyValue, "Total in-memory keys:", apiKeysStore.size)
  
  // Check cache first
  try {
    const cached = await getCachedMetadata(apiKeyValue)
    if (cached) {
      console.log("Found in cache:", cached)
      
      // Check in-memory first
      let fullKey = apiKeysStore.get(cached.id)
      
      // If not in memory, load from Redis
      if (!fullKey) {
        console.log("Not in memory, loading from Redis...")
        const storedKey = await getStoredApiKey(cached.id)
        if (storedKey && storedKey.apiKey === apiKeyValue) {
          // Restore to in-memory cache with current tier limits
          const updatedKey = updateApiKeyWithCurrentTierLimits(storedKey)
          apiKeysStore.set(updatedKey.id, updatedKey)
          apiKeysByHash.set(updatedKey.apiKeyHash, updatedKey)
          console.log("Restored from Redis:", updatedKey.id)
          return updatedKey
        }
      } else if (fullKey.apiKey === apiKeyValue) {
        return updateApiKeyWithCurrentTierLimits(fullKey)
      }
    }
  } catch (err) {
    console.error("Cache lookup error:", err)
  }

  // Check in-memory store
  const memoryKeys = Array.from(apiKeysStore.values())
  for (const key of memoryKeys) {
    if (key.apiKey === apiKeyValue) {
      console.log("Found key in memory:", key.id)
      const updatedKey = updateApiKeyWithCurrentTierLimits(key)
      
      // Update cache with current limits
      try {
        await cacheMetadata(apiKeyValue, {
          id: updatedKey.id,
          name: updatedKey.name,
          tier: updatedKey.tier,
          perMinute: updatedKey.perMinute,
          perDay: updatedKey.perDay,
          disabled: updatedKey.disabled,
          ownerEmail: updatedKey.ownerEmail,
        })
      } catch (err) {
        console.error("Cache update error:", err)
      }
      return updatedKey
    }
  }

  // Finally, check Redis storage
  console.log("Not in memory, checking Redis...")
  try {
    const storedKey = await findStoredApiKeyByValue(apiKeyValue)
    if (storedKey) {
      console.log("Found in Redis:", storedKey.id)
      
      // Update with current tier limits
      const updatedKey = updateApiKeyWithCurrentTierLimits(storedKey)
      
      // Restore to in-memory cache
      apiKeysStore.set(updatedKey.id, updatedKey)
      apiKeysByHash.set(updatedKey.apiKeyHash, updatedKey)
      
      // Update metadata cache with current limits
      await cacheMetadata(apiKeyValue, {
        id: updatedKey.id,
        name: updatedKey.name,
        tier: updatedKey.tier,
        perMinute: updatedKey.perMinute,
        perDay: updatedKey.perDay,
        disabled: updatedKey.disabled,
        ownerEmail: updatedKey.ownerEmail,
      })
      
      return updatedKey
    }
  } catch (err) {
    console.error("Redis lookup error:", err)
  }

  console.log("API key not found anywhere")
  return null
}

/**
 * Get API key by ID
 */
export async function getApiKeyById(id: string): Promise<ApiKey | null> {
  return apiKeysStore.get(id) || null
}

/**
 * List all API keys with usage info
 */
export async function listApiKeys(): Promise<
  Array<{
    id: string
    name: string
    maskedKey: string
    tier: string
    perMinute: number
    perDay: number
    disabled: boolean
    lastSeen: string | null
    usage: { minute: number; day: number }
  }>
> {
  // Load from Redis if in-memory store is empty
  if (apiKeysStore.size === 0) {
    console.log("In-memory store empty, loading from Redis...")
    const storedKeys = await getAllStoredApiKeys()
    for (const key of storedKeys) {
      apiKeysStore.set(key.id, key)
      apiKeysByHash.set(key.apiKeyHash, key)
    }
    console.log(`Loaded ${storedKeys.length} keys from Redis`)
  }
  
  const keys = Array.from(apiKeysStore.values())

  const keysWithUsage = await Promise.all(
    keys.map(async (key) => {
      const usage = await getCurrentUsage(key.apiKey)
      const lastSeen = await getLastSeen(key.apiKey)

      // Get current tier configuration (in case tier limits were updated)
      const currentTier = tiersStore.get(key.tier)
      const perMinute = currentTier ? currentTier.rateLimit * 60 : key.perMinute
      const perDay = currentTier ? currentTier.rateLimit * 60 * 60 * 24 : key.perDay

      return {
        id: key.id,
        name: key.name,
        maskedKey: maskApiKey(key.apiKey),
        tier: key.tier,
        perMinute: perMinute,
        perDay: perDay,
        disabled: key.disabled,
        lastSeen,
        usage: {
          minute: usage.minute,
          day: usage.day,
        },
      }
    })
  )

  return keysWithUsage
}

/**
 * Update API key limits
 */
export async function updateApiKeyLimits(
  id: string,
  perMinute: number,
  perDay: number
): Promise<void> {
  const key = apiKeysStore.get(id)
  if (!key) {
    throw new Error(`API key ${id} not found`)
  }

  key.perMinute = perMinute
  key.perDay = perDay

  // Update in Redis
  await updateStoredApiKey(id, { perMinute, perDay })

  // Invalidate cache
  await invalidateMetadata(key.apiKey)

  // Update cache with new values
  await cacheMetadata(key.apiKey, {
    id: key.id,
    name: key.name,
    tier: key.tier,
    perMinute,
    perDay,
    disabled: key.disabled,
    ownerEmail: key.ownerEmail,
  })
}

/**
 * Disable an API key
 */
export async function disableApiKey(id: string): Promise<void> {
  const key = apiKeysStore.get(id)
  if (!key) {
    throw new Error(`API key ${id} not found`)
  }

  key.disabled = true

  // Update in Redis
  await updateStoredApiKey(id, { disabled: true })

  // Invalidate cache
  await invalidateMetadata(key.apiKey)
}

/**
 * Permanently delete an API key
 */
export async function deleteApiKey(id: string): Promise<void> {
  let key = apiKeysStore.get(id)
  
  // If not in memory, try loading from Redis
  if (!key) {
    console.log(`Key ${id} not in memory, loading from Redis...`)
    const storedKey = await getStoredApiKey(id)
    if (!storedKey) {
      throw new Error(`API key ${id} not found`)
    }
    key = storedKey
  }

  // Remove from in-memory stores
  apiKeysStore.delete(id)
  apiKeysByHash.delete(key.apiKeyHash)

  // Remove from Redis storage
  await deleteStoredApiKey(id)

  // Invalidate cache
  await invalidateMetadata(key.apiKey)
  
  console.log(`🗑️ Deleted API key: ${key.name} (${id})`)
}

/**
 * Mask an API key for display
 */
function maskApiKey(apiKey: string): string {
  if (apiKey.length < 12) {
    return apiKey
  }
  return `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`
}

/**
 * Tier management
 */

export function getTier(id: string): Tier | null {
  return tiersStore.get(id) || null
}

export function getAllTiers(): Tier[] {
  return Array.from(tiersStore.values())
}

/**
 * Reload tiers from Redis into memory
 */
export async function reloadTiers(): Promise<void> {
  const storedTiers = await getAllStoredTiers()
  tiersStore.clear()
  for (const tier of storedTiers) {
    tiersStore.set(tier.id, tier)
  }
}

export async function updateTier(id: string, updates: Partial<Tier>): Promise<void> {
  const tier = tiersStore.get(id)
  if (!tier) {
    throw new Error(`Tier ${id} not found`)
  }

  Object.assign(tier, updates)
  
  // Persist to Redis
  console.log(`💾 Updating tier in Redis: ${tier.name} (${tier.rateLimit}/s, ${tier.burstLimit} burst)`)
  await storeTier(tier)
}

export async function createTier(name: string, rateLimit: number, burstLimit: number, customId?: string): Promise<Tier> {
  const id = customId || name.toLowerCase().replace(/\s+/g, "-")

  const tier: Tier = {
    id,
    name,
    rateLimit,
    burstLimit,
  }

  tiersStore.set(id, tier)
  
  // Persist to Redis
  console.log(`💾 Storing tier to Redis: ${tier.name} (${tier.rateLimit}/s, ${tier.burstLimit} burst)`)
  await storeTier(tier)
  
  return tier
}
