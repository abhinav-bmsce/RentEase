import { ThemeContext } from "@/contexts/theme-context";
import { useContext } from "react";

/**
 * Access the theme context.
 * Must be used inside a `<ThemeProvider>`.
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
