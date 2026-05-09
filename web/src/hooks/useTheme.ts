'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';

type ThemeMode = 'light' | 'dark';
type ThemeToggleOrigin = { clientX: number; clientY: number };
type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

const STORAGE_KEY = 'ruangkolaborasi-theme';
const themeListeners = new Set<() => void>();

function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';

  const savedTheme = window.localStorage.getItem(STORAGE_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  return savedTheme === 'dark' || (!savedTheme && prefersDark) ? 'dark' : 'light';
}

function getServerTheme(): ThemeMode {
  return 'light';
}

function notifyThemeListeners() {
  themeListeners.forEach((listener) => listener());
}

function subscribeToTheme(listener: () => void) {
  themeListeners.add(listener);

  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY) notifyThemeListeners();
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemThemeChange = () => {
    if (!window.localStorage.getItem(STORAGE_KEY)) notifyThemeListeners();
  };

  window.addEventListener('storage', handleStorage);
  mediaQuery.addEventListener('change', handleSystemThemeChange);

  return () => {
    themeListeners.delete(listener);
    window.removeEventListener('storage', handleStorage);
    mediaQuery.removeEventListener('change', handleSystemThemeChange);
  };
}

function applyTheme(theme: ThemeMode, persist = true) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  if (persist) window.localStorage.setItem(STORAGE_KEY, theme);
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getStoredTheme,
    getServerTheme
  );

  useEffect(() => {
    applyTheme(theme, false);
  }, [theme]);

  function toggleTheme(origin?: ThemeToggleOrigin) {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const x = origin?.clientX ?? window.innerWidth - 48;
    const y = origin?.clientY ?? 32;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
    const viewTransitionDocument = document as ViewTransitionDocument;

    root.style.setProperty('--theme-reveal-x', `${x}px`);
    root.style.setProperty('--theme-reveal-y', `${y}px`);
    root.style.setProperty('--theme-reveal-radius', `${endRadius}px`);

    const switchTheme = () => {
      const nextTheme = getStoredTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      notifyThemeListeners();
    };

    if (!viewTransitionDocument.startViewTransition || prefersReducedMotion) {
      switchTheme();
      return;
    }

    root.classList.add('theme-transitioning');

    const transition = viewTransitionDocument.startViewTransition(() => {
      flushSync(() => {
        switchTheme();
      });
    });

    transition.finished.finally(() => {
      root.classList.remove('theme-transitioning');
    });
  }

  return {
    theme,
    isDarkMode: theme === 'dark',
    toggleTheme,
  };
}
