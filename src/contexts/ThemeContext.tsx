import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = sessionStorage.getItem('clinic_flow_theme');
      if (stored === 'dark' || stored === 'light') return stored;
    } catch {}
    
    // Fallback to system preferences
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {}
    
    return 'light';
  });

  useEffect(() => {
    try {
      const root = window.document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark-theme');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark-theme');
        root.setAttribute('data-theme', 'light');
      }
      sessionStorage.setItem('clinic_flow_theme', theme);
    } catch (e) {
      console.error('Failed to set theme attributes', e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
