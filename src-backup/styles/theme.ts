import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { ThemeColors } from '../types/common';

// Light theme colors
export const lightColors: ThemeColors = {
  primary: '#2196F3',
  secondary: '#FF9800',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  error: '#F44336',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  success: '#4CAF50',
  warning: '#FF9800',
  info: '#2196F3',
};

// Dark theme colors
export const darkColors: ThemeColors = {
  primary: '#90CAF9',
  secondary: '#FFB74D',
  background: '#121212',
  surface: '#1E1E1E',
  error: '#EF5350',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  border: '#424242',
  success: '#81C784',
  warning: '#FFB74D',
  info: '#90CAF9',
};

// Light theme
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: lightColors.primary,
    secondary: lightColors.secondary,
    background: lightColors.background,
    surface: lightColors.surface,
    error: lightColors.error,
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: lightColors.text,
    onSurface: lightColors.text,
    onError: '#FFFFFF',
    outline: lightColors.border,
    surfaceVariant: lightColors.surface,
    onSurfaceVariant: lightColors.textSecondary,
  },
  custom: lightColors,
};

// Dark theme
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkColors.primary,
    secondary: darkColors.secondary,
    background: darkColors.background,
    surface: darkColors.surface,
    error: darkColors.error,
    onPrimary: '#000000',
    onSecondary: '#000000',
    onBackground: darkColors.text,
    onSurface: darkColors.text,
    onError: '#000000',
    outline: darkColors.border,
    surfaceVariant: darkColors.surface,
    onSurfaceVariant: darkColors.textSecondary,
  },
  custom: darkColors,
};

// Default theme (light)
export const defaultTheme = lightTheme;

// Theme configuration
export const themeConfig = {
  light: lightTheme,
  dark: darkTheme,
  default: defaultTheme,
}; 