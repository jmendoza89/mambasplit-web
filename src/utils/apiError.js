/**
 * Standardized API error class with status code and message.
 */
export class ApiError extends Error {
  constructor(message, status, originalError = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.originalError = originalError;
  }

  /**
   * Check if this is an auth-related error
   */
  isAuthError() {
    return this.status === 401 || this.status === 403;
  }

  /**
   * Check if this error is likely recoverable with retry
   */
  isRetryable() {
    return this.status >= 500 || this.status === 429 || this.status === 408;
  }

  /**
   * Get a user-friendly error message
   */
  getUserMessage() {
    if (this.status === 401) return "Please log in again.";
    if (this.status === 403) return "You don't have permission to access this resource.";
    if (this.status === 404) return "Resource not found.";
    if (this.status === 429) return "Too many requests. Please try again later.";
    if (this.status >= 500) return "Server error. Please try again.";
    return this.message || "Request failed. Please try again.";
  }
}

/**
 * Create an ApiError from a fetch response
 */
export async function createErrorFromResponse(response, fallbackMessage = "Request failed") {
  let data = null;
  try {
    data = await response.json();
  } catch {
    // Response has no JSON body
  }

  const message = (data && data.message) || `${fallbackMessage} (${response.status}).`;
  return new ApiError(message, response.status);
}

/**
 * Standard error messages by status code
 */
export const ERROR_MESSAGES = {
  400: "Invalid request.",
  401: "Authentication required.",
  403: "Access forbidden.",
  404: "Resource not found.",
  409: "Conflict with existing data.",
  422: "Invalid data provided.",
  429: "Too many requests.",
  500: "Server error.",
  502: "Bad gateway.",
  503: "Service unavailable.",
  504: "Gateway timeout."
};
