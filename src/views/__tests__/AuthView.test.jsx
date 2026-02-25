import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AuthView from "../AuthView";

describe("AuthView", () => {
  it("shows signup fields, signup google action, and triggers toggle callback", () => {
    const onToggleAuthMode = vi.fn();
    const setDisplayName = vi.fn();
    const setEmail = vi.fn();
    const setPassword = vi.fn();
    const onSubmitAuth = vi.fn((e) => e.preventDefault());
    const onGoogleLogin = vi.fn();

    render(
      <AuthView
        authMode="signup"
        displayName=""
        email=""
        password=""
        busy={false}
        onSubmitAuth={onSubmitAuth}
        onGoogleLogin={onGoogleLogin}
        onToggleAuthMode={onToggleAuthMode}
        setDisplayName={setDisplayName}
        setEmail={setEmail}
        setPassword={setPassword}
      />
    );

    expect(screen.getByLabelText("Display Name")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign up with Google" }));
    expect(onGoogleLogin).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("link", { name: "Login" }));
    expect(onToggleAuthMode).toHaveBeenCalledTimes(1);
  });
});
