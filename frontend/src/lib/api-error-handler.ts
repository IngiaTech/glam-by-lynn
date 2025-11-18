/**
 * API Error Handling Utilities
 * Centralized error handling for API requests
 */

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    // Axios error
    if ("response" in error && error.response) {
      const response = error.response as any;

      // FastAPI validation error format
      if (response.data?.detail) {
        if (Array.isArray(response.data.detail)) {
          // Pydantic validation errors
          return response.data.detail
            .map((err: any) => `${err.loc.join(".")}: ${err.msg}`)
            .join(", ");
        }
        return response.data.detail;
      }

      // Generic error message
      if (response.data?.message) {
        return response.data.message;
      }

      // Status-based messages
      if (response.status === 404) {
        return "The requested resource was not found.";
      }
      if (response.status === 401) {
        return "You are not authorized. Please sign in.";
      }
      if (response.status === 403) {
        return "You don't have permission to access this resource.";
      }
      if (response.status === 500) {
        return "Server error. Please try again later.";
      }
      if (response.status >= 500) {
        return "Server error. Please try again later.";
      }
    }

    // Network error
    if ("code" in error && error.code === "ERR_NETWORK") {
      return "Network error. Please check your internet connection.";
    }

    // Timeout error
    if ("code" in error && error.code === "ECONNABORTED") {
      return "Request timeout. Please try again.";
    }

    // Generic message property
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
  }

  return "An unexpected error occurred. Please try again.";
}

/**
 * Parse API error into structured format
 */
export function parseApiError(error: unknown): ApiError {
  const message = getErrorMessage(error);

  let status: number | undefined;
  let code: string | undefined;
  let details: any;

  if (typeof error === "object" && error !== null) {
    if ("response" in error) {
      const response = (error as any).response;
      status = response?.status;
      details = response?.data;
    }
    if ("code" in error) {
      code = (error as any).code;
    }
  }

  return {
    message,
    status,
    code,
    details,
  };
}

/**
 * Handle API error with optional callback
 */
export function handleApiError(
  error: unknown,
  options?: {
    onError?: (error: ApiError) => void;
    defaultMessage?: string;
  }
): string {
  const apiError = parseApiError(error);

  // Call custom error handler if provided
  options?.onError?.(apiError);

  // Log error in development
  if (process.env.NODE_ENV === "development") {
    console.error("API Error:", apiError);
  }

  // TODO: Send to error monitoring service (e.g., Sentry)
  // logErrorToMonitoring(apiError);

  return options?.defaultMessage || apiError.message;
}

/**
 * Check if error is network-related
 */
export function isNetworkError(error: unknown): boolean {
  if (typeof error === "object" && error !== null) {
    if ("code" in error) {
      const code = (error as any).code;
      return code === "ERR_NETWORK" || code === "ECONNABORTED";
    }
    if ("message" in error && typeof (error as any).message === "string") {
      const message = (error as any).message.toLowerCase();
      return message.includes("network") || message.includes("timeout");
    }
  }
  return false;
}

/**
 * Check if error is authentication-related
 */
export function isAuthError(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "response" in error) {
    const status = (error as any).response?.status;
    return status === 401 || status === 403;
  }
  return false;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "response" in error) {
    const status = (error as any).response?.status;
    const hasValidationDetails = Array.isArray(
      (error as any).response?.data?.detail
    );
    return status === 422 || (status === 400 && hasValidationDetails);
  }
  return false;
}

/**
 * Retry helper for failed requests
 */
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;

      // Don't retry on validation or auth errors
      if (isValidationError(error) || isAuthError(error)) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }

  throw lastError;
}
