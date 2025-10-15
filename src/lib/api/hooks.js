import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './frontend-client';

/**
 * Dashboard hook with auto-refresh every 5 seconds
 */
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: api.getDashboard,
    refetchInterval: 5000, // Real-time updates!
    staleTime: 4000,
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * API Keys list hook
 */
export function useKeys() {
  return useQuery({
    queryKey: ['keys'],
    queryFn: api.getKeys,
  });
}

/**
 * Key detail hook with auto-refresh
 */
export function useKeyDetail(id) {
  return useQuery({
    queryKey: ['keys', id],
    queryFn: () => api.getKeyDetail(id),
    refetchInterval: 5000,
    enabled: !!id,
  });
}

/**
 * Create key mutation
 */
export function useCreateKey() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.createKey,
    onSuccess: () => {
      queryClient.invalidateQueries(['keys']);
    },
  });
}

/**
 * Update key limits mutation
 */
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

/**
 * Disable key mutation
 */
export function useDisableKey() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.disableKey,
    onSuccess: () => {
      queryClient.invalidateQueries(['keys']);
    },
  });
}

/**
 * Settings hook
 */
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: api.getSettings,
  });
}

/**
 * Update settings mutation
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries(['settings']);
    },
  });
}

/**
 * Individual metric hooks (optional - dashboard already provides all data)
 */
export function useMetrics() {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: api.getMetrics,
    refetchInterval: 5000,
  });
}

export function usePerformance() {
  return useQuery({
    queryKey: ['performance'],
    queryFn: api.getPerformance,
    refetchInterval: 5000,
  });
}

export function useLatency() {
  return useQuery({
    queryKey: ['latency'],
    queryFn: api.getLatency,
    refetchInterval: 5000,
  });
}

export function useActiveKeys() {
  return useQuery({
    queryKey: ['activeKeys'],
    queryFn: api.getActiveKeys,
    refetchInterval: 5000,
  });
}

export function useRecentEvents() {
  return useQuery({
    queryKey: ['recentEvents'],
    queryFn: api.getRecentEvents,
    refetchInterval: 5000,
  });
}

export function useTopOffenders() {
  return useQuery({
    queryKey: ['topOffenders'],
    queryFn: api.getTopOffenders,
    refetchInterval: 5000,
  });
}
