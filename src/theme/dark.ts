import { MD3DarkTheme } from 'react-native-paper';
import { AppColors, darkAppColors } from './colors';

export type AppTheme = typeof MD3DarkTheme & { app: AppColors };

export const darkTheme: AppTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkAppColors.primary,
    secondary: darkAppColors.secondary,
    background: darkAppColors.background,
    surface: darkAppColors.surface,
    error: darkAppColors.error,
    onPrimary: darkAppColors.iconOnDark,
    onSecondary: darkAppColors.iconOnDark,
    onBackground: darkAppColors.textPrimary,
    onSurface: darkAppColors.textPrimary,
    onError: darkAppColors.iconOnDark,
    outline: darkAppColors.border,
    surfaceVariant: darkAppColors.surfaceVariant,
    onSurfaceVariant: darkAppColors.textSecondary,
  },
  app: darkAppColors,
};
