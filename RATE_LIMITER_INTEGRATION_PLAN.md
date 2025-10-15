# Rate Limiter Frontend Integration Plan

## Current Project Overview

Your `props-navigation` project is a **Next.js 13** application with:
- **App Router** (modern Next.js architecture ✅)
- **SCSS Modules** for styling
- **Framer Motion** for animations
- **Zustand** for state management
- Existing Header with animated navigation

## Integration Strategy

We'll build the Rate Limiter admin interface **alongside** your existing pages, leveraging:
1. Your existing Next.js 13 setup (compatible with the backend's Next.js 14)
2. Your SCSS architecture and design patterns
3. A new `/admin` route section for the Rate Limiter dashboard

---

## Phase-by-Phase Implementation

### **Phase 1: Dependencies & Configuration** 📦

#### Install Required Packages
```bash
npm install @tanstack/react-query recharts zod
npm install -D @types/node
```

**Why these?**
- `@tanstack/react-query`: API data fetching, caching, and real-time updates
- `recharts`: Charts for dashboard metrics (performance, latency, usage)
- `zod`: Type-safe API validation matching backend schemas

#### Create Environment Configuration
**File: `.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_ADMIN_API_TOKEN=local-admin-token
```

#### Add TypeScript Support (Optional but Recommended)
Your project uses `.js` files, but the Rate Limiter requires TypeScript types.
**Options:**
1. Convert gradually to `.tsx` as we build
2. Use JSDoc comments for type hints
3. Mix `.js` and `.tsx` files (Next.js supports this)

**Recommendation:** Use `.tsx` for new Rate Limiter pages only.

---

### **Phase 2: Core API Client Layer** 🔌

Create the communication bridge to the backend.

#### File Structure
```
src/
  lib/
    api/
      client.js           # Fetch wrapper with auth headers
      types.js            # TypeScript/JSDoc types for API responses
      hooks.js            # React Query hooks for each endpoint
    config.js             # Environment variables
    utils.js              # Helper functions (formatDate, maskKey, etc.)
```

#### Key Implementation: `lib/api/client.js`

```javascript
// lib/api/client.js
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN;

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function apiClient(endpoint, options = {}) {
  const { requiresAuth = true, headers = {}, ...restOptions } = options;

  const config = {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(requiresAuth && { 'x-admin-token': ADMIN_TOKEN }),
      ...headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new ApiError(
      result.error?.message || 'API request failed',
      response.status,
      result
    );
  }

  return result.data; // Unwrap { success: true, data: ... }
}

// API methods
export const api = {
  // Dashboard
  getDashboard: () => apiClient('/api/dashboard'),
  
  // API Keys
  getKeys: () => apiClient('/api/keys'),
  getKeyDetail: (id) => apiClient(`/api/keys/${id}`),
  createKey: (data) => apiClient('/api/admin/api-keys', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateKeyLimits: (id, limits) => apiClient(`/api/keys/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(limits),
  }),
  disableKey: (id) => apiClient(`/api/keys/${id}`, {
    method: 'DELETE',
  }),
  
  // Settings
  getSettings: () => apiClient('/api/settings'),
  updateSettings: (settings) => apiClient('/api/settings', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  }),
  
  // Test rate-limited endpoint
  testRateLimit: (apiKey) => apiClient('/api/data', {
    requiresAuth: false,
    headers: { 'x-api-key': apiKey },
  }),
};
```

#### React Query Hooks: `lib/api/hooks.js`

```javascript
// lib/api/hooks.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

// Dashboard with auto-refresh every 5 seconds
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: api.getDashboard,
    refetchInterval: 5000, // Real-time updates!
    staleTime: 4000,
  });
}

// API Keys list
export function useKeys() {
  return useQuery({
    queryKey: ['keys'],
    queryFn: api.getKeys,
  });
}

// Key detail with auto-refresh
export function useKeyDetail(id) {
  return useQuery({
    queryKey: ['keys', id],
    queryFn: () => api.getKeyDetail(id),
    refetchInterval: 5000,
    enabled: !!id,
  });
}

// Create key mutation
export function useCreateKey() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.createKey,
    onSuccess: () => {
      queryClient.invalidateQueries(['keys']);
    },
  });
}

// Update key limits mutation
export function useUpdateKeyLimits(id) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (limits) => api.updateKeyLimits(id, limits),
    onSuccess: () => {
      queryClient.invalidateQueries(['keys', id]);
      queryClient.invalidateQueries(['keys']);
    },
  });
}

// Disable key mutation
export function useDisableKey() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.disableKey,
    onSuccess: () => {
      queryClient.invalidateQueries(['keys']);
    },
  });
}

// Settings
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: api.getSettings,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries(['settings']);
    },
  });
}
```

---

### **Phase 3: Admin Layout Shell** 🏗️

Create a new layout specifically for `/admin/*` routes with sidebar navigation.

#### File: `src/app/admin/layout.jsx`

```jsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import styles from './admin.module.scss';

export default function AdminLayout({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <div className={styles.adminLayout}>
        <AdminSidebar />
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </QueryClientProvider>
  );
}
```

#### File: `src/components/admin/AdminSidebar.jsx`

```jsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminSidebar.module.scss';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/keys', label: 'API Keys', icon: '🔑' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <Link href="/">Rate Limiter</Link>
      </div>
      
      <nav className={styles.nav}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </Link>
        ))}
      </nav>
      
      <div className={styles.footer}>
        <Link href="/" className={styles.backLink}>
          ← Back to Site
        </Link>
      </div>
    </aside>
  );
}
```

#### Styling: `src/components/admin/AdminSidebar.module.scss`

```scss
.sidebar {
  width: 250px;
  height: 100vh;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  color: white;
  padding: 20px;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  
  .logo {
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 40px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    
    a {
      color: white;
      text-decoration: none;
    }
  }
  
  .nav {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .navItem {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(255, 255, 255, 0.05);
      color: white;
    }
    
    &.active {
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
      font-weight: 600;
    }
    
    .icon {
      font-size: 20px;
    }
  }
  
  .footer {
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    
    .backLink {
      color: rgba(255, 255, 255, 0.5);
      text-decoration: none;
      font-size: 14px;
      
      &:hover {
        color: white;
      }
    }
  }
}
```

---

### **Phase 4: Dashboard Page** 📈

The main monitoring interface showing real-time metrics.

#### File: `src/app/admin/page.jsx`

```jsx
'use client';

import { useDashboard } from '@/lib/api/hooks';
import MetricsCards from '@/components/admin/dashboard/MetricsCards';
import PerformanceChart from '@/components/admin/dashboard/PerformanceChart';
import LatencyChart from '@/components/admin/dashboard/LatencyChart';
import ActiveKeysPanel from '@/components/admin/dashboard/ActiveKeysPanel';
import RecentEventsTable from '@/components/admin/dashboard/RecentEventsTable';
import TopOffendersTable from '@/components/admin/dashboard/TopOffendersTable';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import styles from './dashboard.module.scss';

export default function AdminDashboard() {
  const { data, isLoading, error, dataUpdatedAt } = useDashboard();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className={styles.error}>Error: {error.message}</div>;

  const { metrics, performance, latency, activeKeys, recentEvents, topOffenders } = data;

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1>Dashboard</h1>
        <div className={styles.lastUpdate}>
          Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
        </div>
      </header>

      {/* Top Metrics Cards */}
      <MetricsCards metrics={metrics} />

      {/* Charts Row */}
      <div className={styles.chartsRow}>
        <PerformanceChart data={performance} />
        <LatencyChart data={latency} />
      </div>

      {/* Active Keys Panel */}
      <ActiveKeysPanel keys={activeKeys} />

      {/* Tables Row */}
      <div className={styles.tablesRow}>
        <RecentEventsTable events={recentEvents} />
        <TopOffendersTable offenders={topOffenders} />
      </div>
    </div>
  );
}
```

#### Component: `MetricsCards.jsx`

```jsx
// src/components/admin/dashboard/MetricsCards.jsx
import styles from './MetricsCards.module.scss';

export default function MetricsCards({ metrics }) {
  const cards = [
    {
      label: 'Total Requests',
      value: metrics.totalRequests.toLocaleString(),
      icon: '📊',
      color: 'blue',
    },
    {
      label: 'Blocked Requests',
      value: metrics.blockedRequests.toLocaleString(),
      icon: '🚫',
      color: 'red',
    },
    {
      label: 'Avg Latency',
      value: `${metrics.averageLatencyMs.toFixed(1)}ms`,
      icon: '⚡',
      color: 'yellow',
    },
    {
      label: 'Max Latency',
      value: `${metrics.maxLatencyMs}ms`,
      icon: '🔥',
      color: 'orange',
    },
  ];

  return (
    <div className={styles.metricsGrid}>
      {cards.map((card) => (
        <div key={card.label} className={`${styles.card} ${styles[card.color]}`}>
          <div className={styles.icon}>{card.icon}</div>
          <div className={styles.content}>
            <div className={styles.label}>{card.label}</div>
            <div className={styles.value}>{card.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

#### Component: `PerformanceChart.jsx` (using Recharts)

```jsx
// src/components/admin/dashboard/PerformanceChart.jsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './Charts.module.scss';

export default function PerformanceChart({ data }) {
  return (
    <div className={styles.chartCard}>
      <h3>Requests Per Second</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="time" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
          <Line
            type="monotone"
            dataKey="rps"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

### **Phase 5: API Keys Management** 🔑

#### File: `src/app/admin/keys/page.jsx`

```jsx
'use client';

import { useKeys, useCreateKey } from '@/lib/api/hooks';
import { useState } from 'react';
import KeysTable from '@/components/admin/keys/KeysTable';
import CreateKeyDialog from '@/components/admin/keys/CreateKeyDialog';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import styles from './keys.module.scss';

export default function ApiKeysPage() {
  const { data, isLoading, error } = useKeys();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className={styles.error}>Error: {error.message}</div>;

  return (
    <div className={styles.keysPage}>
      <header className={styles.header}>
        <h1>API Keys</h1>
        <button
          className={styles.createButton}
          onClick={() => setShowCreateDialog(true)}
        >
          + Create New Key
        </button>
      </header>

      <KeysTable keys={data.keys} />

      {showCreateDialog && (
        <CreateKeyDialog onClose={() => setShowCreateDialog(false)} />
      )}
    </div>
  );
}
```

#### File: `src/app/admin/keys/[id]/page.jsx`

```jsx
'use client';

import { useKeyDetail, useUpdateKeyLimits, useDisableKey } from '@/lib/api/hooks';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import styles from './keyDetail.module.scss';

export default function KeyDetailPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const { data, isLoading, error } = useKeyDetail(id);
  const updateLimits = useUpdateKeyLimits(id);
  const disableKey = useDisableKey();
  
  const [perMinute, setPerMinute] = useState('');
  const [perDay, setPerDay] = useState('');

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className={styles.error}>Error: {error.message}</div>;

  const handleUpdateLimits = async (e) => {
    e.preventDefault();
    try {
      await updateLimits.mutateAsync({
        perMinute: parseInt(perMinute),
        perDay: parseInt(perDay),
      });
      alert('Limits updated successfully!');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDisable = async () => {
    if (!confirm('Are you sure you want to disable this API key? This cannot be undone.')) {
      return;
    }
    
    try {
      await disableKey.mutateAsync(id);
      alert('Key disabled successfully');
      router.push('/admin/keys');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className={styles.keyDetail}>
      <header className={styles.header}>
        <h1>{data.name}</h1>
        <div className={styles.keyDisplay}>
          <code>{data.apiKey}</code>
          <button onClick={() => navigator.clipboard.writeText(data.apiKey)}>
            📋 Copy
          </button>
        </div>
      </header>

      {/* Usage Stats */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <h3>Minute Usage</h3>
          <div className={styles.progress}>
            <div
              className={styles.progressBar}
              style={{ width: `${(data.minuteUsage / data.rateLimit) * 100}%` }}
            />
          </div>
          <p>{data.minuteUsage} / {data.rateLimit}</p>
        </div>
        
        <div className={styles.statCard}>
          <h3>Daily Usage</h3>
          <div className={styles.progress}>
            <div
              className={styles.progressBar}
              style={{ width: `${(data.dailyUsage / (data.rateLimit * 1440)) * 100}%` }}
            />
          </div>
          <p>{data.dailyUsage} / {data.rateLimit * 1440}</p>
        </div>
      </div>

      {/* Update Limits Form */}
      <form className={styles.updateForm} onSubmit={handleUpdateLimits}>
        <h3>Update Rate Limits</h3>
        <div className={styles.formGroup}>
          <label>Per Minute</label>
          <input
            type="number"
            value={perMinute}
            onChange={(e) => setPerMinute(e.target.value)}
            placeholder={data.rateLimit}
            min="1"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Per Day</label>
          <input
            type="number"
            value={perDay}
            onChange={(e) => setPerDay(e.target.value)}
            placeholder={data.rateLimit * 1440}
            min="1"
          />
        </div>
        <div className={styles.actions}>
          <button type="submit" className={styles.updateButton}>
            Update Limits
          </button>
          <button
            type="button"
            onClick={handleDisable}
            className={styles.disableButton}
          >
            Disable Key
          </button>
        </div>
      </form>

      {/* Activity Log */}
      <div className={styles.activityLog}>
        <h3>Activity Log</h3>
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Event</th>
              <th>Details</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.activityLog.map((event, i) => (
              <tr key={i}>
                <td>{new Date(event.timestamp).toLocaleString()}</td>
                <td>{event.event}</td>
                <td>{event.details}</td>
                <td className={event.status === 200 ? styles.success : styles.blocked}>
                  {event.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

### **Phase 6: Settings Page** ⚙️

#### File: `src/app/admin/settings/page.jsx`

```jsx
'use client';

import { useSettings, useUpdateSettings } from '@/lib/api/hooks';
import { useState } from 'react';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import styles from './settings.module.scss';

export default function SettingsPage() {
  const { data, isLoading, error } = useSettings();
  const updateSettings = useUpdateSettings();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className={styles.error}>Error: {error.message}</div>;

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(data);
      alert('Settings saved successfully!');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className={styles.settingsPage}>
      <header className={styles.header}>
        <h1>Settings</h1>
        <button onClick={handleSave} className={styles.saveButton}>
          Save Changes
        </button>
      </header>

      <section className={styles.section}>
        <h2>Global Rate Limits</h2>
        <div className={styles.formGroup}>
          <label>Default Rate Limit (requests/minute)</label>
          <input
            type="number"
            value={data.defaultRateLimit}
            onChange={(e) => {
              data.defaultRateLimit = parseInt(e.target.value);
            }}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2>Tier Configurations</h2>
        <table className={styles.tiersTable}>
          <thead>
            <tr>
              <th>Tier Name</th>
              <th>Per Minute</th>
              <th>Per Day</th>
              <th>Burst Limit</th>
            </tr>
          </thead>
          <tbody>
            {data.tiers.map((tier) => (
              <tr key={tier.id}>
                <td>{tier.name}</td>
                <td>
                  <input
                    type="number"
                    value={tier.perMinute}
                    onChange={(e) => {
                      tier.perMinute = parseInt(e.target.value);
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={tier.perDay}
                    onChange={(e) => {
                      tier.perDay = parseInt(e.target.value);
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={tier.burstLimit}
                    onChange={(e) => {
                      tier.burstLimit = parseInt(e.target.value);
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
```

---

## Summary: What We'll Build Together

### **Folder Structure Overview**
```
src/
  app/
    admin/                         # NEW - Admin section
      layout.jsx                   # React Query provider + sidebar
      page.jsx                     # Dashboard
      dashboard.module.scss
      keys/
        page.jsx                   # Keys list
        keys.module.scss
        [id]/
          page.jsx                 # Key detail
          keyDetail.module.scss
      settings/
        page.jsx                   # Settings
        settings.module.scss
      
  components/
    admin/                         # NEW - Admin components
      AdminSidebar.jsx
      AdminSidebar.module.scss
      LoadingSpinner.jsx
      dashboard/
        MetricsCards.jsx
        PerformanceChart.jsx
        LatencyChart.jsx
        ActiveKeysPanel.jsx
        RecentEventsTable.jsx
        TopOffendersTable.jsx
      keys/
        KeysTable.jsx
        CreateKeyDialog.jsx
  
  lib/                             # NEW - API layer
    api/
      client.js                    # Fetch wrapper
      hooks.js                     # React Query hooks
      types.js                     # Type definitions
    config.js
    utils.js
```

### **Key Features We'll Implement**

1. **Real-time Dashboard** 📊
   - Auto-refreshing metrics every 5 seconds
   - Live charts showing RPS and latency
   - Recent events feed
   - Top offenders table

2. **API Keys Management** 🔑
   - Create new keys with tier selection
   - View all keys in searchable table
   - Detailed view with usage timeline
   - Update limits and disable keys

3. **Settings Panel** ⚙️
   - Configure global rate limits
   - Manage tier configurations
   - Add/edit/remove tiers

4. **Consistent UI** 🎨
   - Match your existing SCSS architecture
   - Dark theme sidebar (distinct from main site)
   - Smooth animations (leveraging Framer Motion where needed)
   - Responsive design

---

## Next Steps for Implementation

When you're ready to start building:

### **Session 1: API Layer**
- Create `lib/` folder structure
- Implement `client.js` with all API methods
- Add React Query hooks
- Test connection to backend

### **Session 2: Admin Layout**
- Build `admin/layout.jsx` with React Query provider
- Create `AdminSidebar` component
- Style the admin shell

### **Session 3: Dashboard Page**
- Implement `admin/page.jsx`
- Create `MetricsCards` component
- Add Recharts for performance/latency
- Build events and offenders tables

### **Session 4: API Keys Pages**
- Build keys list page
- Create key detail page
- Implement create/update/disable functionality

### **Session 5: Settings & Polish**
- Build settings page
- Add loading states and error handling
- Test end-to-end flow
- Add final polish and animations

---

## Questions to Consider

1. **Do you want to convert to TypeScript** for the new admin pages, or stick with JavaScript + JSDoc?
2. **Should we add dark mode** to match the admin sidebar aesthetic?
3. **Do you want to keep your existing header** when in admin section, or hide it?
4. **Any specific color scheme** preferences for the admin dashboard?

---

## Backend Connection Checklist

Before we start:
- [ ] Backend running on `http://localhost:3000`
- [ ] Redis running and connected
- [ ] Environment variable `ADMIN_API_TOKEN` set in backend
- [ ] Can access `http://localhost:3000/api/dashboard` with curl

Let me know when you're ready to start with Phase 1! 🚀
