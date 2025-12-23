# 🚀 HouseHunter Deployment Guide

## Overview

This document outlines the complete deployment automation and production checklist for the HouseHunter React Native application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Automated Testing Pipeline](#automated-testing-pipeline)
- [Build & Deployment Automation](#build--deployment-automation)
- [Production Monitoring](#production-monitoring)
- [Rollback Strategy](#rollback-strategy)
- [Security Audit](#security-audit)
- [Deployment Checklist](#deployment-checklist)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools
- Node.js 18+
- npm or yarn
- Git
- Expo CLI (`npm install -g @expo/cli eas-cli`)
- Firebase CLI (`npm install -g firebase-tools`)

### Required Accounts
- [Expo Application Services (EAS)](https://expo.dev/eas)
- [Firebase](https://firebase.google.com)
- [Sentry](https://sentry.io) (optional)
- [Cloudinary](https://cloudinary.com) (optional)

## Environment Setup

### 1. Environment Variables

Create environment files for different stages:

```bash
# .env.production
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_API_URL=https://api.househunter.com
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn
FIREBASE_PROJECT_ID=your_project_id
CLOUDINARY_CLOUD_NAME=your_cloud_name

# .env.staging
EXPO_PUBLIC_ENVIRONMENT=staging
EXPO_PUBLIC_APP_VERSION=1.0.0-beta.1
EXPO_PUBLIC_API_URL=https://staging-api.househunter.com
```

### 2. EAS Configuration

Create `eas.json`:

```json
{
  "cli": {
    "version": ">= 5.9.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "channel": "production"
    },
    "staging": {
      "channel": "staging"
    }
  },
  "submit": {
    "production": {}
  }
}
```

## Automated Testing Pipeline

### Running Tests Locally

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

### Test Structure

```
src/
├── __tests__/                    # Unit tests
│   ├── components/
│   ├── hooks/
│   └── services/
├── __integration__/              # Integration tests
└── e2e/                          # E2E tests
    ├── init.js
    └── messaging.e2e.js
```

## Build & Deployment Automation

### GitHub Actions CI/CD

The CI/CD pipeline automatically runs on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

#### Pipeline Stages:
1. **Test**: Linting, unit tests, integration tests
2. **E2E Test**: Detox tests (main branch only)
3. **Security Scan**: NPM audit, CodeQL analysis
4. **Build & Deploy**: EAS build for Android/iOS
5. **Monitoring Setup**: Configure production monitoring

### Manual Deployment

```bash
# Run deployment checklist
npm run deployment:checklist

# Build for production
eas build --platform android --profile production
eas build --platform ios --profile production

# Submit to stores
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

## Production Monitoring

### Sentry Integration

```typescript
import { initSentry, logError, measurePerformance } from './src/services/monitoring/sentry';

// Initialize in App.tsx
initSentry();

// Error logging
try {
  // risky operation
} catch (error) {
  logError(error, { userId: '123', action: 'send_message' });
}

// Performance monitoring
const result = await measurePerformance('send_message', async () => {
  return await sendMessage(content);
});
```

### Firebase Crashlytics

Automatically enabled through the Firebase SDK. Crashes and errors are reported to the Firebase console.

### Real User Monitoring (RUM)

Monitor app performance in production:
- App startup time
- Screen load times
- Network request performance
- Memory usage

## Rollback Strategy

### Feature Flags

Control feature rollout and enable instant rollback:

```typescript
import { featureFlagService } from './src/services/featureFlags/featureFlags';

// Check if feature is enabled
const isVoiceMessagesEnabled = await featureFlagService.isEnabled(
  'voice_messages',
  userId,
  { platform: Platform.OS, version: Constants.expoConfig?.version }
);

// Update feature flag (admin only)
await featureFlagService.setFlag('voice_messages', false, adminUserId);
```

### Database Rollback

For schema changes:
1. Create migration scripts with rollback capability
2. Test rollback procedures in staging
3. Keep backup snapshots before major deployments

### App Store Rollback

If needed, submit a new version with feature flags disabled or revert to previous commit.

## Security Audit

### Automated Security Checks

```bash
# Run security audit
npm run security:audit

# Check for vulnerabilities
npm audit --audit-level high

# Code scanning
sonar-scanner
```

### Penetration Testing Checklist

- [ ] API endpoint security testing
- [ ] Authentication bypass attempts
- [ ] Data encryption validation
- [ ] Input validation testing
- [ ] SQL injection prevention
- [ ] Cross-site scripting (XSS) protection

### Data Privacy Compliance

- [ ] GDPR compliance check
- [ ] CCPA compliance verification
- [ ] Data retention policies
- [ ] User consent management
- [ ] Privacy policy updates

## Deployment Checklist

Run the automated deployment checklist:

```bash
npm run deployment:checklist
```

### Manual Checklist

#### Pre-Deployment
- [ ] All tests passing (unit, integration, E2E)
- [ ] Security audit clean
- [ ] Performance baseline met
- [ ] Environment variables configured
- [ ] Feature flags set appropriately
- [ ] Database migrations tested
- [ ] Rollback plan documented

#### During Deployment
- [ ] Monitor deployment progress
- [ ] Check error logs
- [ ] Validate app functionality in staging
- [ ] Run smoke tests

#### Post-Deployment
- [ ] Monitor error rates (< 1%)
- [ ] Check performance metrics
- [ ] Validate user feedback
- [ ] Update documentation
- [ ] Notify stakeholders

## Performance Monitoring

### Baseline Measurement

```bash
# Create performance baseline
npm run performance:baseline

# Compare with baseline
npm run performance:baseline -- --compare
```

### Cost Monitoring

```bash
# Generate cost report
npm run cost:monitor

# Check for budget alerts
npm run cost:monitor -- --alerts
```

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and retry
npm run clear-cache
eas build --platform android --profile production --clear-cache
```

#### Test Failures
```bash
# Run tests with verbose output
npm test -- --verbose

# Debug E2E tests
npm run test:e2e -- --logLevel verbose
```

#### Deployment Issues
```bash
# Check EAS build status
eas build:list

# View build logs
eas build:view <build-id>
```

### Emergency Rollback

1. **Feature Flag Rollback** (Recommended)
   ```bash
   npm run feature-flag -- --disable <feature-name>
   ```

2. **App Store Rollback**
   - Disable problematic features via feature flags
   - Submit hotfix if critical bug
   - Monitor user feedback

3. **Database Rollback**
   ```bash
   # Run migration rollback
   npm run db:rollback -- --to <migration-id>
   ```

## Monitoring & Alerts

### Error Rate Monitoring
- Target: < 1% error rate
- Alert threshold: > 5% error rate
- Critical threshold: > 10% error rate

### Performance Monitoring
- App startup: < 3 seconds
- Screen load: < 1 second
- API response: < 500ms

### Cost Monitoring
- Monthly budget alerts at 80% usage
- Automatic shutdown at 100% budget
- Weekly cost reports

## Support

For deployment issues:
1. Check this documentation
2. Review GitHub Actions logs
3. Check Firebase/Sentry dashboards
4. Contact the development team

---

**Last Updated**: December 2025
**Version**: 1.0.0
