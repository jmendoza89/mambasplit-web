import { createContext, useContext } from "react";

/**
 * Alert context for managing global alerts and busy states
 */
export const AlertContext = createContext({
  // Alert states
  error: "",
  success: "",
  busy: false,
  
  // Alert actions
  setError: () => {},
  setSuccess: () => {},
  setBusy: () => {},
  clearAlerts: () => {}
});

/**
 * Hook to access alert context
 */
export function useAlerts() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlerts must be used within an AlertProvider");
  }
  return context;
}
