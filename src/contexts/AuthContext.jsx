import { createContext, useContext } from "react";

/**
 * Authentication context containing user state and auth actions
 */
export const AuthContext = createContext({
  // User state
  user: null,
  me: null,
  isAuthenticated: false,
  
  // Computed user info
  currentName: "User",
  currentEmail: "-",
  currentPhone: "",
  currentId: "-",
  currentAvatarUrl: "",
  
  // Auth form state
  authMode: "login",
  email: "",
  password: "",
  resetConfirmPassword: "",
  resetTokenStatus: "idle",
  passwordResetOutbox: null,
  passwordResetTestValue: "",
  showResetTestHarness: false,
  displayName: "",
  
  // Auth actions
  setAuthMode: () => {},
  setEmail: () => {},
  setPassword: () => {},
  setResetConfirmPassword: () => {},
  setDisplayName: () => {},
  onSubmitAuth: () => {},
  onGoogleLogin: () => {},
  onLogout: () => {},
  onToggleAuthMode: () => {},
  onStartPasswordReset: () => {},
  onReturnToLogin: () => {},
  onRequestPasswordReset: () => {},
  onOpenPasswordResetLink: () => {},
  onSubmitPasswordReset: () => {}
});

/**
 * Hook to access authentication context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
