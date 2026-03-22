/**
 * Validation utilities for user input across the application.
 * Each validator returns an object: { valid: boolean, error: string | null }
 */

/**
 * Validate email address format
 */
export function validateEmail(email) {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email is required" };
  }

  const trimmed = email.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: "Email is required" };
  }

  // Basic email regex - RFC 5322 simplified
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Invalid email format" };
  }

  if (trimmed.length > 254) {
    return { valid: false, error: "Email is too long (max 254 characters)" };
  }

  return { valid: true, error: null };
}

/**
 * Validate password strength
 */
export function validatePassword(password, options = {}) {
  const { minLength = 8, requireUppercase = false, requireNumber = false, requireSpecial = false } = options;

  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required" };
  }

  if (password.length < minLength) {
    return { valid: false, error: `Password must be at least ${minLength} characters` };
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }

  if (requireNumber && !/\d/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }

  if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, error: "Password must contain at least one special character" };
  }

  return { valid: true, error: null };
}

/**
 * Validate display name
 */
export function validateDisplayName(name) {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Display name is required" };
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "Display name is required" };
  }

  if (trimmed.length < 2) {
    return { valid: false, error: "Display name must be at least 2 characters" };
  }

  if (trimmed.length > 120) {
    return { valid: false, error: "Display name is too long (max 120 characters)" };
  }

  return { valid: true, error: null };
}

/**
 * Validate group name
 */
export function validateGroupName(name) {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Group name is required" };
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "Group name is required" };
  }

  if (trimmed.length > 200) {
    return { valid: false, error: "Group name is too long (max 200 characters)" };
  }

  return { valid: true, error: null };
}

/**
 * Validate expense description
 */
export function validateExpenseDescription(description) {
  if (!description || typeof description !== "string") {
    return { valid: false, error: "Description is required" };
  }

  const trimmed = description.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "Description is required" };
  }

  if (trimmed.length > 200) {
    return { valid: false, error: "Description is too long (max 200 characters)" };
  }

  return { valid: true, error: null };
}

/**
 * Validate expense amount
 */
export function validateExpenseAmount(amount) {
  if (amount === null || amount === undefined || amount === "") {
    return { valid: false, error: "Amount is required" };
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return { valid: false, error: "Amount must be a valid number" };
  }

  if (numericAmount <= 0) {
    return { valid: false, error: "Amount must be greater than zero" };
  }

  if (numericAmount > 999999999) {
    return { valid: false, error: "Amount is too large" };
  }

  // Check for reasonable decimal places (max 2 for currency)
  const decimalPlaces = (amount.toString().split(".")[1] || "").length;
  if (decimalPlaces > 2) {
    return { valid: false, error: "Amount can have at most 2 decimal places" };
  }

  return { valid: true, error: null };
}

/**
 * Validate UUID format
 */
export function validateUuid(id) {
  if (!id || typeof id !== "string") {
    return { valid: false, error: "ID is required" };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(id)) {
    return { valid: false, error: "Invalid ID format" };
  }

  return { valid: true, error: null };
}

export function isUuid(id) {
  return validateUuid(id).valid;
}

/**
 * Batch validate multiple fields
 * Returns first error found or null if all valid
 */
export function validateFields(validations) {
  for (const validation of validations) {
    if (!validation.valid) {
      return validation.error;
    }
  }
  return null;
}

/**
 * Simple validation helpers (backward compatible with existing code)
 */
export function isValidEmail(email) {
  return validateEmail(email).valid;
}

export function isValidPassword(password, minLength = 8) {
  return validatePassword(password, { minLength }).valid;
}

export function isValidGroupName(name) {
  return validateGroupName(name).valid;
}

export function isValidExpenseAmount(amount) {
  return validateExpenseAmount(amount).valid;
}
