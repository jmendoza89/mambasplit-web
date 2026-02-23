import { authApi } from "../api";

export async function submitAuth(authMode, email, password, displayName) {
  if (authMode === "login") {
    return authApi.login(email.trim(), password);
  }
  return authApi.signup(email.trim(), password, displayName.trim());
}

export const authService = {
  logout: authApi.logout
};
