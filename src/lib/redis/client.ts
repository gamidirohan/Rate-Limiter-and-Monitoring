import Redis from "ioredis"
import { env } from "@/lib/env"

let redisInstance: Redis | null = null

export function getRedisClient(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      lazyConnect: true,
    })

    redisInstance.on("error", (err) => {
      console.error("Redis Client Error", err)
    })

    redisInstance.on("connect", () => {
      console.log("Redis Client Connected")
    })
  }

  return redisInstance
}

// Export redis instance for direct use
export const redis = getRedisClient()

export async function ensureRedisConnected(): Promise<void> {
  const client = getRedisClient()
  if (client.status === "ready") {
    return // Already connected
  }
  if (client.status === "connecting") {
    // Wait for existing connection attempt
    return new Promise((resolve, reject) => {
      client.once("ready", resolve)
      client.once("error", reject)
    })
  }
  if (client.status === "end" || client.status === "close") {
    // Client was disconnected, create a new one
    redisInstance = null
    return ensureRedisConnected()
  }
  // Connect if not connected
  try {
    await client.connect()
  } catch (error) {
    // If connection fails due to already connecting, wait for it
    if (error.message.includes("already connecting")) {
      return new Promise((resolve, reject) => {
        client.once("ready", resolve)
        client.once("error", reject)
      })
    }
    throw error
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit()
    redisInstance = null
  }
}
