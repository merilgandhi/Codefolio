import { createContext, useContext, useEffect, useRef, useState } from 'react';

const ThemeContext = createContext(null);
const validChoice = (value) => value === 'light' || value === 'dark';

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#141218' : '#f8f7fa');
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );
  const initial = document.documentElement.dataset.themePreference;
  const preference = useRef(validChoice(initial) ? initial : null);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const systemChanged = (event) => {
      if (!preference.current) setTheme(event.matches ? 'dark' : 'light');
    };
    const storageChanged = (event) => {
      if (event.key !== 'codefolio-theme' && event.key !== null) return;
      preference.current = validChoice(event.newValue) ? event.newValue : null;
      document.documentElement.dataset.themePreference = preference.current || 'system';
      setTheme(preference.current || (media.matches ? 'dark' : 'light'));
    };
    media.addEventListener('change', systemChanged);
    window.addEventListener('storage', storageChanged);
    return () => {
      media.removeEventListener('change', systemChanged);
      window.removeEventListener('storage', storageChanged);
    };
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    preference.current = next;
    document.documentElement.dataset.themePreference = next;
    try {
      localStorage.setItem('codefolio-theme', next);
    } catch {
      /* In-memory choice remains usable. */
    }
    applyTheme(next);
    setTheme(next);
  };
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
