import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type ThemeName = 'dark' | 'light';

export interface Theme {
  name: ThemeName;
  bgMain: string;
  bgPanel: string;
  bgToolbar: string;
  bgStatusbar: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  monacoTheme: string;
}

const DARK: Theme = {
  name: 'dark',
  bgMain: '#1e1e1e',
  bgPanel: '#1a1a2e',
  bgToolbar: '#1e1e1e',
  bgStatusbar: '#0d0d0d',
  border: '#2a2a2a',
  borderSubtle: '#333',
  textPrimary: '#ccc',
  textSecondary: '#888',
  textMuted: '#555',
  monacoTheme: 'vs-dark',
};

const LIGHT: Theme = {
  name: 'light',
  bgMain: '#f0f2f5',
  bgPanel: '#dde0f0',
  bgToolbar: '#ffffff',
  bgStatusbar: '#f8f8f8',
  border: '#e2e2e2',
  borderSubtle: '#ebebeb',
  textPrimary: '#1a1a1a',
  textSecondary: '#666',
  textMuted: '#aaa',
  monacoTheme: 'vs',
};

interface ThemeCtx { theme: Theme; toggle: () => void; }
const Ctx = createContext<ThemeCtx>({ theme: DARK, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState<ThemeName>(() => {
    try {
      const s = localStorage.getItem('lvgl-theme') as ThemeName;
      if (s === 'light' || s === 'dark') {
        document.documentElement.dataset.theme = s;
        return s;
      }
    } catch {}
    const auto: ThemeName = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    document.documentElement.dataset.theme = auto;
    return auto;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = name;
    try { localStorage.setItem('lvgl-theme', name); } catch {}
  }, [name]);

  const theme = name === 'light' ? LIGHT : DARK;
  return (
    <Ctx.Provider value={{ theme, toggle: () => setName(n => n === 'dark' ? 'light' : 'dark') }}>
      {children}
    </Ctx.Provider>
  );
}

export const useTheme = () => useContext(Ctx);
