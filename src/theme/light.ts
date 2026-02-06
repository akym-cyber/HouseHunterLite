import { MD3LightTheme } from 'react-native-paper';
import { AppColors, lightAppColors } from './colors';

export type AppTheme = typeof MD3LightTheme & { app: AppColors };

export const lightTheme: AppTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: lightAppColors.primary,
    secondary: lightAppColors.secondary,
    background: lightAppColors.background,
    surface: lightAppColors.surface,
    error: lightAppColors.error,
    onPrimary: lightAppColors.iconOnDark,
    onSecondary: lightAppColors.iconOnDark,
    onBackground: lightAppColors.textPrimary,
    onSurface: lightAppColors.textPrimary,
    onError: lightAppColors.iconOnDark,
    outline: lightAppColors.border,
    surfaceVariant: lightAppColors.surfaceVariant,
    onSurfaceVariant: lightAppColors.textSecondary,
  },
  app: lightAppColors,
};
