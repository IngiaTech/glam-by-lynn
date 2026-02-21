import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { API_BASE_URL } from "@/config/api"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert a snake_case string to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Recursively transform all keys in an object or array from snake_case to camelCase
 */
export function transformKeysToCamelCase<T = any>(data: any): T {
  if (data === null || data === undefined) {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(item => transformKeysToCamelCase(item)) as any
  }

  if (typeof data === 'object' && data.constructor === Object) {
    const transformed: any = {}

    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const camelKey = toCamelCase(key)
        transformed[camelKey] = transformKeysToCamelCase(data[key])
      }
    }

    return transformed
  }

  return data
}

/**
 * Resolve an image URL — prefixes relative paths (local uploads) with the API base URL.
 * Absolute URLs (S3, CDN) are returned as-is.
 */
export function resolveImageUrl(url: string | undefined | null, fallback = "/placeholder.png"): string {
  if (!url) return fallback
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  return `${API_BASE_URL}${url}`
}
