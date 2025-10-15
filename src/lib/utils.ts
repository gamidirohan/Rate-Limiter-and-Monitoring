import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date to readable string
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Mask API key for display
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 12) return key;
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

/**
 * Format number with commas
 */
export function formatNumber(num: number | undefined): string {
  return num?.toLocaleString() || '0';
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (!total || total === 0) return 0;
  return Math.round((value / total) * 100);
}
