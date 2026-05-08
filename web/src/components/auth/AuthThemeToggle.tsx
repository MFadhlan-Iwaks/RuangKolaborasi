'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export default function AuthThemeToggle() {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDarkMode ? 'Mode terang' : 'Mode gelap'}
      className="fixed right-5 top-5 z-30 rounded-xl border border-gray-200 bg-white/90 p-2.5 text-gray-500 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-gray-50 hover:text-gray-700 active:translate-y-0 active:scale-95"
    >
      {isDarkMode ? (
        <Sun key="sun" size={19} className="theme-toggle-icon" />
      ) : (
        <Moon key="moon" size={19} className="theme-toggle-icon" />
      )}
    </button>
  );
}
