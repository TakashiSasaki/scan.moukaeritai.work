import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeColor = 'blue' | 'indigo' | 'violet' | 'emerald' | 'rose' | 'amber';
export type ThemeMode = 'light' | 'dark';

interface ColorPalette {
  primary: string;
  primaryForeground: string;
}

const palettes: Record<ThemeColor, ColorPalette> = {
  blue: { primary: '#2563eb', primaryForeground: '#ffffff' },
  indigo: { primary: '#6366f1', primaryForeground: '#ffffff' },
  violet: { primary: '#8b5cf6', primaryForeground: '#ffffff' },
  emerald: { primary: '#10b981', primaryForeground: '#ffffff' },
  rose: { primary: '#f43f5e', primaryForeground: '#ffffff' },
  amber: { primary: '#f59e0b', primaryForeground: '#ffffff' },
};

interface ThemeContextType {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeColor, setThemeColor] = useState<ThemeColor>(() => {
    return (localStorage.getItem('theme-color') as ThemeColor) || 'blue';
  });

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('theme-mode') as ThemeMode) || 'light';
  });

  useEffect(() => {
    const palette = palettes[themeColor];
    document.documentElement.style.setProperty('--primary', palette.primary);
    document.documentElement.style.setProperty('--primary-foreground', palette.primaryForeground);
    localStorage.setItem('theme-color', themeColor);
  }, [themeColor]);

  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'dark') {
      root.classList.add('dark');
      root.style.setProperty('--surface', '#0f172a'); // Slate 950
      root.style.setProperty('--surface-container', '#1e293b'); // Slate 800
      root.style.setProperty('--surface-container-high', '#334155'); // Slate 700
      root.style.setProperty('--on-surface', '#f8fafc'); // Slate 50
      root.style.setProperty('--on-surface-variant', '#94a3b8'); // Slate 400
      root.style.setProperty('--outline', '#334155'); // Slate 700
    } else {
      root.classList.remove('dark');
      root.style.setProperty('--surface', '#f8fafc'); // Slate 50
      root.style.setProperty('--surface-container', '#ffffff');
      root.style.setProperty('--surface-container-high', '#f1f5f9'); // Slate 100
      root.style.setProperty('--on-surface', '#0f172a'); // Slate 950
      root.style.setProperty('--on-surface-variant', '#64748b'); // Slate 500
      root.style.setProperty('--outline', '#e2e8f0'); // Slate 200
    }
    localStorage.setItem('theme-mode', themeMode);
  }, [themeMode]);

  return (
    <ThemeContext.Provider value={{ themeColor, setThemeColor, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
