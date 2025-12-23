import 'jest-expo';
import '@testing-library/jest-native/extend-expect';

// Mock Firebase
jest.mock('firebase/app');
jest.mock('firebase/firestore');
jest.mock('firebase/auth');
jest.mock('firebase/storage');

// Mock Expo modules
jest.mock('expo-constants');
jest.mock('expo-linking');
jest.mock('expo-notifications');
jest.mock('expo-device');
jest.mock('expo-location');
jest.mock('expo-av');
jest.mock('expo-image-picker');
jest.mock('expo-file-system');
jest.mock('expo-splash-screen');

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  startTransaction: jest.fn(() => ({
    setStatus: jest.fn(),
    finish: jest.fn()
  })),
  addBreadcrumb: jest.fn(),
  withScope: jest.fn((callback) => callback({ setTag: jest.fn(), setLevel: jest.fn() })),
  SeverityLevel: {
    fatal: 'fatal',
    error: 'error',
    warning: 'warning',
    info: 'info',
    debug: 'debug'
  },
  ReactNativeTracing: jest.fn(),
  reactNavigationIntegration: jest.fn()
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({
    isConnected: true,
    type: 'wifi',
  }),
  addEventListener: jest.fn(),
}));

// Mock React Native Gesture Handler
jest.mock('react-native-gesture-handler', () => ({
  PanGestureHandler: 'PanGestureHandler',
  State: { END: 5 },
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => ({
  Provider: 'Provider',
  Text: 'Text',
  TextInput: 'TextInput',
  Button: 'Button',
  Card: 'Card',
  Avatar: 'Avatar',
  IconButton: 'IconButton',
  Divider: 'Divider',
  FAB: 'FAB',
  Chip: 'Chip',
  Banner: 'Banner',
  ProgressBar: 'ProgressBar',
  Modal: 'Modal',
  Portal: 'Portal',
  Searchbar: 'Searchbar',
}));

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');

// Global test utilities
global.fetch = jest.fn();

// Mock timers
jest.useFakeTimers();

// Silence console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
