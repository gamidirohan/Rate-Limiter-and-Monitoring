---
applyTo: '**'
---

# **Rate Limiter Monitoring System — Architecture Context**

### **1. Overview**

A full-stack rate-limiting platform that provides a **real-time monitoring dashboard**, **API key management**, and **tier-based rate configuration**.
The backend uses **Node.js + Redis** for atomic rate enforcement and **Supabase (Auth + Postgres)** for persistent metadata.
Frontend built in **Next.js 14 (App Router)** with **TypeScript**, **Tailwind + shadcn/ui**, and **Recharts** for live analytics.
Primary goals: production-feasible demo, modular design, secure admin console, and extensible data models for future billing tiers.

---

### **2. Frontend Pages & Components**

#### **Pages**

USE APP ROUTER (server components where possible, client for interactivity).

1. **Dashboard (/admin)**

   * **Purpose:** Overview of system health and recent events.
   * **Top cards:**

     * Total Requests
     * Blocked Requests
     * Average Latency
     * Max Latency
   * **Performance Panel:**

     * Requests Per Second (RPS) line chart (+%/-% delta)
     * Latency (ms) chart
   * **Active Keys Panel:** progress bars per key (usage %)
   * **Recent Events Table:** timestamp, type, key, details (Allowed/Blocked)
   * **Top Offenders Table:** key vs. blocked requests
   * **Header Controls:** refresh button, time-range selector (“Last 30 min”), auth status.

2. **API Keys Page (/admin/keys)**

   * Paginated searchable list of keys.
   * Columns: Name | Key (masked) | Limits (per-min / per-day) | Minute Usage | Daily Usage | 429 Errors | Last Seen.
   * Progress bars for usage, hover tooltip for percentage.
   * “New API Key” button (modal form).
   * Search field + Pagination controls.

3. **API Key Details (/admin/keys/[id])**

   * Shows per-key metrics and settings.
   * **Charts:**

     * Minute Timeline (last 60 minutes)
     * Daily Timeline (last 30 days)
   * **Activity Log Table:** timestamp | event | details (endpoint, status 200/429, color-coded).
   * **Settings Panel:**

     * Inputs: Rate Limit, Time Window (seconds).
     * Buttons: Update Limits (blue) | Disable Key (red).

4. **Settings / Administration (/admin/settings)**

   * **API Key Management:** “Create New API Key” button.
   * **Global Rate Limiter Settings:** Default Rate Limit (req/s) + Default Burst Limit.
   * **Tier Configurations Table:** Tier Name | Rate Limit | Burst Limit | Edit actions.
   * **Add New Tier** button to append tier rows.

#### **Shared Components**

* **LayoutShell:** Sidebar (nav items Dashboard | API Keys | Settings | Docs) + Topbar (user avatar, refresh).
* **Charts:** RPSLineChart, LatencyChart, UtilizationRadial, TimelineChart.
* **Tables:** GenericTable (sortable + paginated), EventsTable, KeysTable.
* **Forms:** CreateKeyForm, UpdateLimitForm, TierForm.
* **Widgets:** Card, Badge, ProgressBar, MaskedKey, CopyToClipboard, EmptyState, LoaderSpinner.
* **FilterBar:** apiKey, endpoint, status, time range.
* **Realtime Updates:** Short-interval polling (1–5 s) or WebSocket for live metrics.

---

### **3. Frontend Monitoring Metrics & UI**

| Category              | Metrics / Visuals                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Aggregate Metrics** | Total Requests Today, Total 429s Today, Active Keys Now, Avg/Max Latency                                   |
| **Per-Key Metrics**   | per-minute/day usage, limits, 429s (min/day), latency (avg/p50/p95), error rate                            |
| **Charts**            | Line charts for RPS & Latency, Bar/Line for Error Rates, Radial usage gauge, Heatmap (activity per minute) |
| **Tables**            | Top Offenders, Recent Events, Keys List (searchable + sortable)                                            |
| **Filters**           | apiKey / endpoint / status (2xx/4xx/5xx/429) / time range (last 15 min – 24 h)                             |
| **Exports**           | CSV export for keys/events table                                                                           |
| **Visual Behavior**   | Smooth transitions, theme dark mode, chart tooltips, live updates ≤ 5 s delay                              |

---

### **4. Backend Architecture**

#### **Tech Stack**

* **Node.js 20 + TypeScript**
* **Fastify (or Express)** server
* **Redis** for rate count storage and event streams
* **Supabase (Postgres + Auth)** for API key metadata and admin users
* **Next.js 14** (SSR frontend)
* **Zod**, **pino**, **Vitest/Jest** for schemas / logging / testing

#### **Core Services**

* **Client Gateway (API Rate Limited)**

  * Example: `GET /api/data`
  * Middleware: validates `x-api-key`, checks limits in Redis, returns 429 if exceeded.
* **Admin API (Authenticated via Supabase JWT)**

  ```
  POST /admin/api-keys           → create key
  GET  /admin/keys               → list keys (paginated)
  GET  /admin/keys/:id           → key detail
  PATCH /admin/keys/:id/limits   → update limits
  POST /admin/keys/:id/disable   → disable key
  GET  /admin/metrics            → global aggregates
  GET  /admin/usage/:apiKey      → per-key usage series
  GET  /admin/events             → recent events feed
  ```
* **Rate Limiter Middleware Flow**

  1. Extract `x-api-key`.
  2. Load metadata from Redis cache → fallback Postgres → refresh cache.
  3. Execute Lua script to atomically INCR minute and day counters.
  4. If limit exceeded → XADD event to Redis stream (`Blocked`) and return 429.
  5. Else allow request and optionally log (`Allowed`).

#### **Auth Flow**

* Admin dashboard via Supabase Auth (email/OAuth).
* API clients send `x-api-key`; each key mapped to owner & tier.

#### **Env Config**

```bash
REDIS_URL=redis://...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
RATE_DEFAULT_PER_MINUTE=60
RATE_DEFAULT_PER_DAY=5000
```

---

### **5. Redis Design & Data Models**

#### **Key Patterns**

| Type                  | Key                              | TTL               | Notes                                |
| --------------------- | -------------------------------- | ----------------- | ------------------------------------ |
| Minute counter        | `rl:<apiKey>:min:<YYYYMMDDHHMM>` | 70–90 s           | per-minute window                    |
| Daily counter         | `rl:<apiKey>:day:<YYYYMMDD>`     | ~25 h             | per-day window                       |
| Metadata cache        | `meta:<apiKey>`                  | 24 h              | cached limits & tier                 |
| Events stream         | `events:<apiKey>`                | stream trim ~100k | timestamp, endpoint, status, latency |
| Global RPS (optional) | `global:rps:<YYYYMMDDHHMMSS>`    | short             | time-bucketed aggregate              |

#### **Lua Atomic Script**

```lua
-- KEYS[1]=minuteKey, KEYS[2]=dayKey; ARGV[1]=minTTL, ARGV[2]=dayTTL, ARGV[3]=minLimit, ARGV[4]=dayLimit
local m = redis.call('INCR', KEYS[1])
if m == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local d = redis.call('INCR', KEYS[2])
if d == 1 then redis.call('PEXPIRE', KEYS[2], ARGV[2]) end
local over = (m > tonumber(ARGV[3])) or (d > tonumber(ARGV[4]))
return {m, d, over and 1 or 0}
```

#### **Postgres Schema**

```sql
CREATE TABLE api_keys (
  id uuid PRIMARY KEY,
  name text,
  api_key_hash text UNIQUE,
  owner_email text,
  tier text,
  per_minute int,
  per_day int,
  disabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE audit_events (
  id bigserial PRIMARY KEY,
  api_key_id uuid REFERENCES api_keys(id),
  ts timestamptz,
  endpoint text,
  status int,
  reason text,
  latency_ms int
);
```

---

### **6. Deployment & Testing**

#### **Deployment (Just to keep in mind, not to implement)**

* **Docker Compose:** app + redis + (optional supabase local).
* **Environments:** dev (local) → staging → prod.
* **Next.js** served via Vercel / Docker; API via Fly.io / Render / Railway.
* **CI/CD:** Lint + TypeCheck + Test on PRs.

#### **Requirements**

* **Frontend:** Next.js 14, TypeScript, Tailwind, shadcn/ui, Recharts, TanStack Query.
* **Backend:** Node 20, Fastify, ioredis, pg, zod, pino, Vitest.

#### **Testing & Criteria (Just to keep in mind, not to implement)**

* **Unit Tests:** Lua wrapper, TTL logic, metadata cache, error paths.
* **Integration:** Dockerized Redis; simulate bursts (50+ concurrent requests).
* **E2E:**

  * Create two keys → send traffic → observe correct 429 responses.
  * Dashboard reflects real-time counts and charts update ≤ 5 s.
  * Disabled key blocks instantly (within cache TTL).
* **Acceptance Benchmarks:**

  * 60/min limit → 61st request returns 429 + `Retry-After`.
  * Daily limit checked independently.
  * p50 decision < 1 ms (backend), p99 < 5 ms.
  * 0 data loss on restart (Redis persistence).
* **Security:** All admin routes JWT-guarded; keys masked in UI and logs; strict CORS.

---

**Purpose:**
This file defines the **entire architectural context** (UI pages, components, backend modules, data model, tech stack, testing and deployment standards) for Copilot and team understanding — **not an implementation task**.
