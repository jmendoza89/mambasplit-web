const RESET_STORE_KEY = "mambasplit_mock_reset_tokens";
const RESET_HISTORY_KEY = "mambasplit_mock_reset_history";
const TOKEN_TTL_MS = 1000 * 60 * 30;

function loadStore() {
  const raw = localStorage.getItem(RESET_STORE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStore(tokens) {
  localStorage.setItem(RESET_STORE_KEY, JSON.stringify(tokens));
}

function loadHistory() {
  const raw = localStorage.getItem(RESET_HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(RESET_HISTORY_KEY, JSON.stringify(history));
}

function createToken() {
  const randomBytes = new Uint8Array(16);
  window.crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function findToken(tokens, token) {
  if (!token) return null;
  return tokens.find((entry) => entry.token === token) || null;
}

export function createMockPasswordResetRequest(email, now = Date.now()) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const token = createToken();
  const expiresAt = now + TOKEN_TTL_MS;
  const record = {
    token,
    email: normalizedEmail,
    createdAt: now,
    expiresAt,
    usedAt: null
  };

  const existing = loadStore();
  const nextStore = [record, ...existing].slice(0, 20);
  saveStore(nextStore);

  return {
    toEmail: normalizedEmail,
    token,
    createdAt: now,
    expiresAt,
    link: `/?resetToken=${encodeURIComponent(token)}`
  };
}

export function verifyMockPasswordResetToken(token, now = Date.now()) {
  const store = loadStore();
  const entry = findToken(store, token);
  if (!entry) return { status: "invalid", email: "" };
  if (entry.usedAt) return { status: "used", email: entry.email };
  if (now > entry.expiresAt) return { status: "expired", email: entry.email };
  return { status: "valid", email: entry.email };
}

export function consumeMockPasswordResetToken(token, password, now = Date.now()) {
  const status = verifyMockPasswordResetToken(token, now);
  if (status.status !== "valid") {
    return { status: status.status, email: status.email || "" };
  }

  const store = loadStore();
  const nextStore = store.map((entry) => {
    if (entry.token !== token) return entry;
    return { ...entry, usedAt: now };
  });
  saveStore(nextStore);

  const history = loadHistory();
  const historyEntry = {
    token,
    email: status.email,
    password,
    resetAt: now
  };
  saveHistory([historyEntry, ...history].slice(0, 20));

  return { status: "reset", email: status.email, resetAt: now };
}

export function getLatestMockPasswordResetEmail() {
  const store = loadStore();
  if (!store.length) return null;
  const latest = store[0];
  return {
    toEmail: latest.email,
    token: latest.token,
    createdAt: latest.createdAt,
    expiresAt: latest.expiresAt,
    link: `/?resetToken=${encodeURIComponent(latest.token)}`
  };
}

export function getLatestMockPasswordResetResult() {
  const history = loadHistory();
  return history[0] || null;
}

export function clearMockPasswordResetStore() {
  localStorage.removeItem(RESET_STORE_KEY);
  localStorage.removeItem(RESET_HISTORY_KEY);
}
