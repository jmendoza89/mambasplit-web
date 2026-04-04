import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AlertContext } from "../../contexts/AlertContext";
import { AuthContext } from "../../contexts/AuthContext";
import AuthView from "../AuthView";

describe("AuthView", () => {
  it("shows signup fields, signup google action, and triggers toggle callback", () => {
    const onToggleAuthMode = vi.fn();
    const onGoogleLogin = vi.fn();
    const setDisplayName = vi.fn();
    const setEmail = vi.fn();
    const setPassword = vi.fn();
    const onSubmitAuth = vi.fn((e) => e.preventDefault());
    const onStartPasswordReset = vi.fn();

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
      resetConfirmPassword: "",
      resetTokenStatus: "idle",
      passwordResetOutbox: null,
      passwordResetTestValue: "",
      showResetTestHarness: false,
      displayName: "",
      setAuthMode: vi.fn(),
      setEmail,
      setPassword,
      setResetConfirmPassword: vi.fn(),
      setDisplayName,
      onSubmitAuth,
      onGoogleLogin,
      googleButtonStatus: "loading",
      onLogout: vi.fn(),
      onToggleAuthMode,
      onStartPasswordReset,
      onReturnToLogin: vi.fn(),
      onRequestPasswordReset: vi.fn(),
      onOpenPasswordResetLink: vi.fn(),
      onSubmitPasswordReset: vi.fn()
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
    expect(screen.getByRole("button", { name: "Sign up with Google" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Forgot password?" }));
    expect(onStartPasswordReset).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Sign up with Google" }));
    expect(onGoogleLogin).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("link", { name: "Login" }));
    expect(onToggleAuthMode).toHaveBeenCalledTimes(1);
  });

  it("does not show the login subtitle in login mode", () => {
    const authContextValue = {
      user: null,
      me: null,
      isAuthenticated: false,
      currentName: "User",
      currentEmail: "-",
      currentId: "-",
      authMode: "login",
      email: "",
      password: "",
      resetConfirmPassword: "",
      resetTokenStatus: "idle",
      passwordResetOutbox: null,
      passwordResetTestValue: "",
      showResetTestHarness: false,
      displayName: "",
      setAuthMode: vi.fn(),
      setEmail: vi.fn(),
      setPassword: vi.fn(),
      setResetConfirmPassword: vi.fn(),
      setDisplayName: vi.fn(),
      onSubmitAuth: vi.fn(),
      onGoogleLogin: vi.fn(),
      googleButtonStatus: "ready",
      onLogout: vi.fn(),
      onToggleAuthMode: vi.fn(),
      onStartPasswordReset: vi.fn(),
      onReturnToLogin: vi.fn(),
      onRequestPasswordReset: vi.fn(),
      onOpenPasswordResetLink: vi.fn(),
      onSubmitPasswordReset: vi.fn()
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

    expect(screen.queryByText("Pick up where your group left off.")).not.toBeInTheDocument();
  });

  it("shows reset harness and opens link action in reset request mode", () => {
    const onRequestPasswordReset = vi.fn((e) => e.preventDefault());
    const onOpenPasswordResetLink = vi.fn();

    const authContextValue = {
      user: null,
      me: null,
      isAuthenticated: false,
      currentName: "User",
      currentEmail: "-",
      currentId: "-",
      authMode: "resetRequest",
      email: "user@example.com",
      password: "",
      resetConfirmPassword: "",
      resetTokenStatus: "idle",
      passwordResetOutbox: {
        toEmail: "user@example.com",
        link: "/?resetToken=abc123"
      },
      passwordResetTestValue: "secret-for-test",
      showResetTestHarness: true,
      displayName: "",
      setAuthMode: vi.fn(),
      setEmail: vi.fn(),
      setPassword: vi.fn(),
      setResetConfirmPassword: vi.fn(),
      setDisplayName: vi.fn(),
      onSubmitAuth: vi.fn(),
      onGoogleLogin: vi.fn(),
      googleButtonStatus: "ready",
      onLogout: vi.fn(),
      onToggleAuthMode: vi.fn(),
      onStartPasswordReset: vi.fn(),
      onReturnToLogin: vi.fn(),
      onRequestPasswordReset,
      onOpenPasswordResetLink,
      onSubmitPasswordReset: vi.fn()
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

    fireEvent.submit(screen.getByRole("button", { name: "Send Reset Link" }).closest("form"));
    expect(onRequestPasswordReset).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("password-reset-harness")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Password Reset Test Harness"));
    fireEvent.click(screen.getByRole("button", { name: "Open Reset Link" }));
    expect(onOpenPasswordResetLink).toHaveBeenCalledWith("/?resetToken=abc123");
    expect(screen.getByText("secret-for-test")).toBeInTheDocument();
  });
});
