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
  currentId: "-",
  
  // Auth form state
  authMode: "login",
  email: "",
  password: "",
  displayName: "",
  
  // Auth actions
  setAuthMode: () => {},
  setEmail: () => {},
  setPassword: () => {},
  setDisplayName: () => {},
  onSubmitAuth: () => {},
  onGoogleLogin: () => {},
  onLogout: () => {},
  onToggleAuthMode: () => {}
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
