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

export async function api(path, method = "GET", body = null, auth = true) {
  const headers = { "Content-Type": "application/json" };
  if (auth && getAccessToken()) {
    headers.Authorization = `Bearer ${getAccessToken()}`;
  }

  const response = await fetch(withBase(path), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (response.status === 204) return null;

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = (data && data.message) || "Request failed.";
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  return data;
}

export const authApi = {
  login: (email, password) => api("/api/v1/auth/login", "POST", { email, password }, false),
  signup: (email, password, displayName) =>
    api("/api/v1/auth/signup", "POST", { email, password, displayName }, false),
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
  details: (groupId) => api(`/api/v1/groups/${groupId}`),
  createEqualExpense: (groupId, payload) => api(`/api/v1/groups/${groupId}/expenses/equal`, "POST", payload),
  createInvite: (groupId, email) => api(`/api/v1/groups/${groupId}/invites`, "POST", { email }),
  acceptInvite: (token) => api("/api/v1/invites/accept", "POST", { token })
};
