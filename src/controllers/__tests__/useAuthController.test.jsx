import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuthController } from "../useAuthController";

vi.mock("../../api", () => ({
  clearSession: vi.fn(),
  getAccessToken: vi.fn(() => null),
  saveSession: vi.fn()
}));

vi.mock("../../services", () => ({
  authService: {
    logout: vi.fn()
  },
  submitGoogleAuth: vi.fn(),
  submitAuth: vi.fn(async () => ({
    accessToken: "token",
    refreshToken: "refresh",
    user: { id: "u1" }
  }))
}));

describe("useAuthController", () => {
  it("submits auth and refreshes session data", async () => {
    const setLoading = vi.fn();
    const setError = vi.fn();
    const setSuccess = vi.fn();
    const setBusy = vi.fn();
    const setUser = vi.fn();
    const setMe = vi.fn();
    const setGroups = vi.fn();
    const setSelectedGroupId = vi.fn();
    const setGroupDetail = vi.fn();
    const setGroupError = vi.fn();
    const setGroupDetailStatusById = vi.fn();
    const setActiveView = vi.fn();
    const setAuthMode = vi.fn();
    const loadSessionData = vi.fn(async () => {});
    const onResetDashboardState = vi.fn();
    const onResetGroupState = vi.fn();

    const { result } = renderHook(() =>
      useAuthController({
        authMode: "login",
        email: "test@example.com",
        password: "password123",
        displayName: "",
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
      })
    );

    await result.current.onSubmitAuth({ preventDefault: vi.fn() });
    expect(loadSessionData).toHaveBeenCalledTimes(1);
    expect(setUser).toHaveBeenCalled();
    expect(setSuccess).toHaveBeenCalledWith("Logged in.");
  });
});
