import { API_BASE_URL, ADMIN_TOKEN } from './config';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Frontend API client wrapper with authentication
 * @param {string} endpoint - API endpoint path
 * @param {object} options - Fetch options
 * @returns {Promise<any>} - Unwrapped data from API response
 */
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

/**
 * Frontend API methods for all endpoints
 */
export const api = {
  // Dashboard
  getDashboard: () => apiClient('/api/dashboard'),
  
  // API Keys
  getKeys: async () => {
    const data = await apiClient('/api/keys');
    // Backend returns { keys: [...], total: N }
    return { data: data.keys, total: data.total };
  },
  getKeyDetail: (id) => apiClient(`/api/keys/${id}`),
  createKey: async (data) => {
    const result = await apiClient('/api/admin/api-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    // Backend returns { id, apiKey, message }
    return { data: result };
  },
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

  // Individual metric endpoints (if needed)
  getMetrics: () => apiClient('/api/metrics'),
  getPerformance: () => apiClient('/api/performance'),
  getLatency: () => apiClient('/api/latency'),
  getActiveKeys: () => apiClient('/api/active-keys'),
  getRecentEvents: () => apiClient('/api/events'),
  getTopOffenders: () => apiClient('/api/top-offenders'),
};
