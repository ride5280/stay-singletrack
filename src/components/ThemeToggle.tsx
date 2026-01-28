'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 w-9 h-9" />
    );
  }

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <button
      onClick={cycleTheme}
      className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
      title={`Theme: ${theme}`}
    >
      {theme === 'light' && <Sun className="w-5 h-5 text-amber-500" />}
      {theme === 'dark' && <Moon className="w-5 h-5 text-blue-400" />}
      {theme === 'system' && <Monitor className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
    </button>
  );
}
