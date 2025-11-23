/**
 * Error handling utilities
 * Formats API errors for display
 */

/**
 * Extract error message from API error response
 * Handles FastAPI validation errors (array of objects) and string errors
 */
export function extractErrorMessage(err: any, fallbackMessage: string = "An error occurred"): string {
  // Handle validation errors from FastAPI
  if (err.response?.data?.detail) {
    const detail = err.response.data.detail;

    // If detail is an array of validation errors
    if (Array.isArray(detail)) {
      return detail.map((e: any) => e.msg || e.message || String(e)).join(", ");
    } else if (typeof detail === "string") {
      return detail;
    } else if (typeof detail === "object") {
      // If detail is an object, try to extract message
      return detail.msg || detail.message || JSON.stringify(detail);
    }
  }

  // Check for other common error message locations
  if (err.response?.data?.message) {
    return err.response.data.message;
  }

  if (err.message) {
    return err.message;
  }

  return fallbackMessage;
}
