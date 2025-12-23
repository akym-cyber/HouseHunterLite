// Define types for when Sentry is not available
type SeverityLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

interface MockSentryScope {
  setTag: (key: string, value: any) => void;
  setLevel: (level: SeverityLevel) => void;
}

interface MockSentryTransaction {
  setStatus: (status: string) => void;
  finish: () => void;
}

interface MockSentry {
  init: (config: any) => void;
  setUser: (user: any) => void;
  setTag: (key: string, value: any) => void;
  captureException: (error: Error) => void;
  captureMessage: (message: string) => void;
  startTransaction: (config: any) => MockSentryTransaction;
  addBreadcrumb: (breadcrumb: any) => void;
  withScope: (callback: (scope: MockSentryScope) => void) => void;
  SeverityLevel: { [key: string]: SeverityLevel };
  ReactNativeTracing: any;
  reactNavigationIntegration: () => any;
}

let Sentry: MockSentry | null = null;
try {
  Sentry = require('@sentry/react-native');
} catch (error) {
  console.warn('Sentry not available - monitoring disabled');
  // Create a mock Sentry object for development
  Sentry = {
    init: () => {},
    setUser: () => {},
    setTag: () => {},
    captureException: () => {},
    captureMessage: () => {},
    startTransaction: () => ({ setStatus: () => {}, finish: () => {} }),
    addBreadcrumb: () => {},
    withScope: (callback: any) => callback({ setTag: () => {}, setLevel: () => {} }),
    SeverityLevel: { fatal: 'fatal', error: 'error', warning: 'warning', info: 'info', debug: 'debug' },
    ReactNativeTracing: function() {},
    reactNavigationIntegration: () => ({})
  };
}

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
const ENVIRONMENT = process.env.EXPO_PUBLIC_ENVIRONMENT || 'development';

export const initSentry = () => {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    // Performance monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    // Release tracking
    release: process.env.EXPO_PUBLIC_APP_VERSION,
    // Error tracking
    beforeSend: (event) => {
      // Filter out development errors
      if (ENVIRONMENT === 'development' && event.exception) {
        return null;
      }
      return event;
    },
    // User feedback
    integrations: [
      new Sentry.ReactNativeTracing({
        routingInstrumentation: Sentry.reactNavigationIntegration(),
        // Route change tracking
        shouldCreateTransactionForLocationChange: true,
      }),
    ],
  });

  // Set user context
  Sentry.setTag('platform', 'mobile');
  Sentry.setTag('app_version', process.env.EXPO_PUBLIC_APP_VERSION);
};

export const setUserContext = (user: { id: string; email?: string; firstName?: string; lastName?: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: `${user.firstName} ${user.lastName}`.trim(),
  });
};

export const clearUserContext = () => {
  Sentry.setUser(null);
};

export const logError = (error: Error, context?: Record<string, any>) => {
  Sentry.withScope((scope) => {
    if (context) {
      Object.keys(context).forEach(key => {
        scope.setTag(key, context[key]);
      });
    }
    Sentry.captureException(error);
  });
};

export const logMessage = (message: string, level: SeverityLevel = 'info', context?: Record<string, any>) => {
  Sentry.withScope((scope) => {
    scope.setLevel(level);
    if (context) {
      Object.keys(context).forEach(key => {
        scope.setTag(key, context[key]);
      });
    }
    Sentry.captureMessage(message);
  });
};

export const startTransaction = (name: string, op: string) => {
  return Sentry.startTransaction({
    name,
    op,
  });
};

export const addBreadcrumb = (message: string, category?: string, level?: SeverityLevel) => {
  Sentry.addBreadcrumb({
    message,
    category: category || 'custom',
    level: level || 'info',
  });
};

// Performance monitoring
export const measurePerformance = async <T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> => {
  const transaction = startTransaction(name, 'function');
  try {
    const result = await operation();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    throw error;
  } finally {
    transaction.finish();
  }
};
