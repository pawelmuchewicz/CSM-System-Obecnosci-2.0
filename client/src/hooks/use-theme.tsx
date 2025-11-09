import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/**
 * Hook for managing theme (light/dark)
 * Prevents hydration mismatch in React
 */
export function useThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return { theme: "light", setTheme: () => {}, isDark: false };

  const isDark = theme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return {
    theme: theme || "light",
    setTheme,
    toggleTheme,
    isDark,
    mounted,
  };
}
