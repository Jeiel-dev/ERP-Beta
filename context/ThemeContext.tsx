import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type LayoutMode = 'classic' | 'modern';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  layoutMode: LayoutMode;
  toggleLayoutMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'dark';
  });

  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    const saved = localStorage.getItem('layoutMode');
    return (saved as LayoutMode) || 'classic';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('layoutMode', layoutMode);
    // You could set a data attribute on body if you wanted global CSS selectors based on layout
    document.body.setAttribute('data-layout', layoutMode);
  }, [layoutMode]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleLayoutMode = () => {
    setLayoutMode(prev => prev === 'classic' ? 'modern' : 'classic');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, layoutMode, toggleLayoutMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};