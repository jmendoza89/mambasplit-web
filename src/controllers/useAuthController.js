import { useEffect } from "react";
import { clearSession, getAccessToken, saveSession } from "../api";
import { authService, submitAuth, submitGoogleAuth } from "../services";

const GOOGLE_SCRIPT_ID = "google-identity-services-script";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_TOKEN_MISSING_ERROR = "Google login failed: no ID token was returned. Please try again.";
let googleScriptPromise = null;

function ensureGoogleScriptLoaded() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load Google Sign-In.")), {
        once: true
      });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Google Sign-In."));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

export function useAuthController({
  authMode,
  email,
  password,
  displayName,
  setLoading,
  setError,
  setSuccess,
  setBusy,
  setUser,
  setMe,
  setGroups,
  setSelectedGroupId,
  setGroupDetail,
  setGroupError,
  setGroupDetailStatusById,
  setActiveView,
  setAuthMode,
  loadSessionData,
  onResetDashboardState,
  onResetGroupState
}) {
  const isAuthenticated = Boolean(getAccessToken());

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      if (!getAccessToken()) {
        clearSession();
        setUser(null);
        setMe(null);
        setLoading(false);
        return;
      }

      try {
        await loadSessionData();
      } catch {
        clearSession();
        setUser(null);
        setMe(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadSessionData, setError, setLoading, setMe, setUser]);

  async function onSubmitAuth(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const payload = await submitAuth(authMode, email, password, displayName);
      saveSession(payload);
      setUser(payload.user || null);
      await loadSessionData();
      setSuccess(authMode === "login" ? "Logged in." : "Account created.");
    } catch (err) {
      if (err.status === 401) {
        setError("Invalid credentials.");
      } else {
        setError(err.message || "Unable to complete request.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function onGoogleLoginSuccess(credentialResponse) {
    const idToken = credentialResponse?.credential;
    if (!idToken) {
      setError(GOOGLE_TOKEN_MISSING_ERROR);
      return;
    }

    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const payload = await submitGoogleAuth(idToken);
      saveSession(payload);
      setUser(payload.user || null);
      await loadSessionData();
      setSuccess("Logged in with Google.");
    } catch (err) {
      setError(err.message || "Google login failed.");
    } finally {
      setBusy(false);
    }
  }

  function onGoogleLoginError() {
    setError(GOOGLE_TOKEN_MISSING_ERROR);
  }

  async function onGoogleLogin() {
    setError("");
    setSuccess("");

    if (!GOOGLE_CLIENT_ID) {
      setError("Google login is not configured.");
      return;
    }

    try {
      await ensureGoogleScriptLoaded();
      if (!window.google?.accounts?.id) {
        throw new Error("Google login is unavailable.");
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: onGoogleLoginSuccess
      });

      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          onGoogleLoginError();
        }
      });
    } catch (err) {
      setError(err.message || "Google login failed.");
    }
  }

  async function onLogout() {
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      await authService.logout();
    } catch {
      // Always clear local state on logout attempt.
    } finally {
      clearSession();
      setUser(null);
      setMe(null);
      setGroups([]);
      setSelectedGroupId("");
      setGroupDetail(null);
      setGroupError("");
      setGroupDetailStatusById({});
      setActiveView("dashboard");
      setAuthMode("login");
      onResetDashboardState();
      onResetGroupState();
      setBusy(false);
    }
  }

  function onToggleAuthMode() {
    setError("");
    setSuccess("");
    setAuthMode((prev) => (prev === "login" ? "signup" : "login"));
  }

  return {
    isAuthenticated,
    onSubmitAuth,
    onGoogleLogin,
    onLogout,
    onToggleAuthMode
  };
}
