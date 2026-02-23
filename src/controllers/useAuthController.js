import { useEffect } from "react";
import { clearSession, getAccessToken, saveSession } from "../api";
import { authService, submitAuth } from "../services";

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
    onLogout,
    onToggleAuthMode
  };
}
