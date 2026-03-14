import { ApiError, createErrorFromResponse } from "./utils/apiError";

const STORAGE_KEYS = {
  access: "mambasplit_access_token",
  refresh: "mambasplit_refresh_token",
  user: "mambasplit_user"
};

function apiBase() {
  return (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
}

function withBase(path) {
  return `${apiBase()}${path}`;
}

let refreshInFlight = null;
const DEFAULT_TIMEOUT_MS = 10000;
const parsedTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS);
const REQUEST_TIMEOUT_MS = Number.isFinite(parsedTimeout) && parsedTimeout > 0
  ? parsedTimeout
  : DEFAULT_TIMEOUT_MS;

export function getAccessToken() {
  return localStorage.getItem(STORAGE_KEYS.access);
}

export function getRefreshToken() {
  return localStorage.getItem(STORAGE_KEYS.refresh);
}

export function getStoredUser() {
  const raw = localStorage.getItem(STORAGE_KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSession(payload) {
  localStorage.setItem(STORAGE_KEYS.access, payload.accessToken);
  localStorage.setItem(STORAGE_KEYS.refresh, payload.refreshToken);
  if (payload.user) {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(payload.user));
  }
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.access);
  localStorage.removeItem(STORAGE_KEYS.refresh);
  localStorage.removeItem(STORAGE_KEYS.user);
}

async function request(path, method = "GET", body = null, auth = true) {
  const headers = { "Content-Type": "application/json" };
  if (auth && getAccessToken()) {
    headers.Authorization = `Bearer ${getAccessToken()}`;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(withBase(path), {
      method,
      headers,
      signal: controller.signal,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new ApiError(`Request timed out after ${REQUEST_TIMEOUT_MS}ms.`, 408, err);
    }
    throw new ApiError("Unable to reach the API. Check that the backend is running.", 0, err);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;

  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("Session expired.");

  refreshInFlight = (async () => {
    const response = await request("/api/v1/auth/refresh", "POST", { refreshToken }, false);
    if (!response.ok) {
      clearSession();
      throw await createErrorFromResponse(response, "Session expired");
    }

    const data = await response.json();
    if (data?.accessToken) {
      localStorage.setItem(STORAGE_KEYS.access, data.accessToken);
    }
    if (data?.refreshToken) {
      localStorage.setItem(STORAGE_KEYS.refresh, data.refreshToken);
    }
    return data;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function api(path, method = "GET", body = null, auth = true) {
  let response = await request(path, method, body, auth);
  const isAuthRoute = path.startsWith("/api/v1/auth/");
  if (auth && !isAuthRoute && (response.status === 401 || response.status === 403)) {
    await refreshAccessToken();
    response = await request(path, method, body, auth);
  }

  if (response.status === 204) return null;

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw await createErrorFromResponse(response, "Request failed");
  }

  return data;
}

export const authApi = {
  login: (email, password) => api("/api/v1/auth/login", "POST", { email, password }, false),
  signup: (email, password, displayName) =>
    api("/api/v1/auth/signup", "POST", { email, password, displayName }, false),
  googleLogin: (idToken) => api("/api/v1/auth/google", "POST", { idToken }, false),
  logout: async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return;
    await api("/api/v1/auth/logout", "POST", { refreshToken }, false);
  }
};

export const meApi = {
  fetchMe: () => api("/api/v1/me")
};

export const groupsApi = {
  list: () => api("/api/v1/groups"),
  create: (name) => api("/api/v1/groups", "POST", { name }),
  delete: (groupId) => api(`/api/v1/groups/${groupId}`, "DELETE"),
  details: (groupId) => api(`/api/v1/groups/${groupId}/details`),
  createEqualExpense: (groupId, payload) => api(`/api/v1/groups/${groupId}/expenses/equal`, "POST", payload),
  deleteExpense: (groupId, expenseId) => api(`/api/v1/groups/${groupId}/expenses/${expenseId}`, "DELETE"),
  createSettlement: (groupId, payload) => api(`/api/v1/groups/${groupId}/settlements`, "POST", payload),
  listSettlements: (groupId) => api(`/api/v1/groups/${groupId}/settlements`),
  createInvite: (groupId, email) => api(`/api/v1/groups/${groupId}/invites`, "POST", { email }),
  listGroupInvites: (groupId) => api(`/api/v1/groups/${groupId}/invites`),
  cancelInvite: (groupId, token) => api(`/api/v1/groups/${groupId}/invites/${encodeURIComponent(token)}`, "DELETE"),
  acceptInvite: (token) => api("/api/v1/invites/accept", "POST", { token })
};

export const invitesApi = {
  listPendingByEmail: (email) => api(`/api/v1/invites?email=${encodeURIComponent(email)}`),
  acceptById: (inviteId) => api(`/api/v1/invites/${inviteId}/accept`, "POST")
};

export const usersApi = {
  search: (query = "", groupId = "") => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (groupId) params.set("groupId", groupId);
    const suffix = params.toString();
    return api(`/api/v1/users/search${suffix ? `?${suffix}` : ""}`);
  }
};

export const settlementsApi = {
  getById: (settlementId) => api(`/api/v1/settlements/${settlementId}`),
  listByUser: (userId) => api(`/api/v1/users/${userId}/settlements`)
};
