import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AlertContext } from "../../contexts/AlertContext";
import { AuthContext } from "../../contexts/AuthContext";
import AuthView from "../AuthView";

describe("AuthView", () => {
  it("shows signup fields, signup google action, and triggers toggle callback", () => {
    const onToggleAuthMode = vi.fn();
    const setDisplayName = vi.fn();
    const setEmail = vi.fn();
    const setPassword = vi.fn();
    const onSubmitAuth = vi.fn((e) => e.preventDefault());
    const onGoogleLogin = vi.fn();

    const authContextValue = {
      user: null,
      me: null,
      isAuthenticated: false,
      currentName: "User",
      currentEmail: "-",
      currentId: "-",
      authMode: "signup",
      email: "",
      password: "",
      displayName: "",
      setAuthMode: vi.fn(),
      setEmail,
      setPassword,
      setDisplayName,
      onSubmitAuth,
      onGoogleLogin,
      onLogout: vi.fn(),
      onToggleAuthMode
    };

    const alertContextValue = {
      error: "",
      success: "",
      busy: false,
      setError: vi.fn(),
      setSuccess: vi.fn(),
      setBusy: vi.fn(),
      clearAlerts: vi.fn()
    };

    render(
      <AuthContext.Provider value={authContextValue}>
        <AlertContext.Provider value={alertContextValue}>
          <AuthView />
        </AlertContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getByLabelText("Display Name")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign up with Google" }));
    expect(onGoogleLogin).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("link", { name: "Login" }));
    expect(onToggleAuthMode).toHaveBeenCalledTimes(1);
  });
});
