const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN ?? "local-admin-token"
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379"
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
const RATE_DEFAULT_PER_MINUTE = parseInt(
  process.env.RATE_DEFAULT_PER_MINUTE ?? "60",
  10
)
const RATE_DEFAULT_PER_DAY = parseInt(
  process.env.RATE_DEFAULT_PER_DAY ?? "5000",
  10
)

export const env = {
  ADMIN_API_TOKEN,
  REDIS_URL,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  RATE_DEFAULT_PER_MINUTE,
  RATE_DEFAULT_PER_DAY,
}
