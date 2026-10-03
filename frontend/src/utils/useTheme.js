import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'voting-app-theme';

// Reads the choice the no-flash script in index.html already applied, so the
// toggle starts in the same state the page was painted with.
const readStored = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch (err) {
    // Private browsing can refuse storage; following the system is a fine default
    return 'system';
  }
};

/*
 * Light / dark / follow-the-system, remembered between visits.
 *
 * 'system' leaves the document without a data-theme attribute, which is what
 * lets the prefers-color-scheme rules in tokens.css decide. An explicit choice
 * stamps the attribute, and those rules step aside.
 */
const useTheme = () => {
  const [theme, setTheme] = useState(readStored);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);

    try {
      if (theme === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, theme);
    } catch (err) {
      // Not being able to remember the choice should not break the page
    }
  }, [theme]);

  // Whatever is on screen right now, regardless of how it was decided
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  // One button, two states: flip to the opposite of what is currently showing
  const toggle = useCallback(() => {
    setTheme(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved]);

  return { theme, resolved, setTheme, toggle };
};

export default useTheme;
