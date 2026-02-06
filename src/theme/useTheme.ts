import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PaperProvider } from 'react-native-paper';
import { darkTheme } from './dark';
import { lightTheme } from './light';

type ColorScheme = 'light' | 'dark';

type ThemeContextValue = {
  theme: typeof lightTheme;
  scheme: ColorScheme;
  systemScheme: ColorScheme;
  schemeOverride: ColorScheme | null;
  setSchemeOverride: (scheme: ColorScheme | null) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const THEME_STORAGE_KEY = 'theme:schemeOverride';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme() ?? 'light';
  const [schemeOverride, setSchemeOverrideState] = useState<ColorScheme | null>(null);
  const scheme = schemeOverride ?? systemScheme;
  const theme = useMemo(() => (scheme === 'dark' ? darkTheme : lightTheme), [scheme]);

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (!isMounted) return;
        if (stored === 'light' || stored === 'dark') {
          setSchemeOverrideState(stored);
        } else {
          setSchemeOverrideState(null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSchemeOverrideState(null);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const setSchemeOverride = useCallback((next: ColorScheme | null) => {
    setSchemeOverrideState(next);
    const storedValue = next ?? 'system';
    AsyncStorage.setItem(THEME_STORAGE_KEY, storedValue).catch(() => {});
  }, []);

  const value = useMemo(() => ({
    theme,
    scheme,
    systemScheme,
    schemeOverride,
    setSchemeOverride,
  }), [theme, scheme, systemScheme, schemeOverride, setSchemeOverride]);

  return React.createElement(
    ThemeContext.Provider,
    { value },
    React.createElement(PaperProvider, { theme }, children)
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
