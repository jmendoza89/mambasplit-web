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
    if (ERROR_MESSAGES[this.status]) return ERROR_MESSAGES[this.status];
    return this.message || "Request failed. Please try again.";
  }
}

function isGenericStatusOnlyMessage(message) {
  if (!message) return false;
  return /^request failed\s*\(\d+\)\.?$/i.test(message.trim())
    || /^session expired\s*\(\d+\)\.?$/i.test(message.trim())
    || /^http\s*\d+\.?$/i.test(message.trim());
}

/**
 * Create an ApiError from a fetch response
 */
export async function createErrorFromResponse(response, fallbackMessage = "Request failed") {
  let raw = "";
  let data = null;
  try {
    raw = await response.text();
  } catch {
    raw = "";
  }

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }

  const validationMessages = data && typeof data === "object" && data.errors && typeof data.errors === "object"
    ? Object.entries(data.errors)
        .flatMap(([field, messages]) => (Array.isArray(messages) ? messages.map((msg) => `${field}: ${msg}`) : []))
    : [];

  const parsedMessage = data && typeof data === "object"
    ? data.message
      || data.detail
      || data.title
      || data.error
      || (validationMessages.length ? validationMessages.join("; ") : null)
    : null;

  const textFallback = raw && !raw.trim().startsWith("<") ? raw.trim() : null;
  const statusMessage = ERROR_MESSAGES[response.status] || `Request failed with HTTP ${response.status}.`;
  const genericFallback = `${fallbackMessage} (${response.status}).`;
  const candidateMessage = parsedMessage || textFallback || genericFallback;
  const message = isGenericStatusOnlyMessage(candidateMessage)
    ? `${statusMessage} (HTTP ${response.status})`
    : candidateMessage;
  return new ApiError(message, response.status, data || raw || null);
}

/**
 * Standard error messages by status code
 */
export const ERROR_MESSAGES = {
  400: "Invalid request. Please review the form values and try again.",
  401: "Authentication required. Please sign in again.",
  403: "Access forbidden. Your account is not allowed to perform this action.",
  404: "Resource not found. It may have been removed or is no longer available.",
  409: "Conflict detected. This action could not be completed because data already exists or was recently changed.",
  422: "Validation failed. Please correct the highlighted values and try again.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "Server error. Please try again in a moment.",
  502: "Bad gateway. The service is temporarily unavailable.",
  503: "Service unavailable. Please try again shortly.",
  504: "Gateway timeout. The server took too long to respond."
};
