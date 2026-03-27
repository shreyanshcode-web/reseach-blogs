import { useEffect, useState } from "react";

const THEME_KEY = "site-theme";

function getPreferredTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-theme", theme);
  window.localStorage.setItem(THEME_KEY, theme);
  window.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
}

export function initializeTheme() {
  applyTheme(getPreferredTheme());
}

export function useTheme() {
  const [theme, setTheme] = useState(() => getPreferredTheme());

  useEffect(() => {
    const syncTheme = (event) => {
      setTheme(event.detail || getPreferredTheme());
    };

    window.addEventListener("themechange", syncTheme);
    window.addEventListener("storage", syncTheme);
    return () => {
      window.removeEventListener("themechange", syncTheme);
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  return {
    theme,
    isDark: theme === "dark",
    toggleTheme,
    setTheme: (nextTheme) => {
      setTheme(nextTheme);
      applyTheme(nextTheme);
    },
  };
}
