#!/usr/bin/env node

/**
 * HouseHunter Deployment Checklist
 * Automated pre-deployment verification script
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DeploymentChecklist {
  constructor() {
    this.checks = [];
    this.failures = [];
    this.warnings = [];
  }

  addCheck(name, checkFunction, required = true) {
    this.checks.push({ name, checkFunction, required });
  }

  async runChecks() {
    console.log('🚀 Running HouseHunter Deployment Checklist...\n');

    for (const check of this.checks) {
      try {
        console.log(`⏳ Checking: ${check.name}`);
        const result = await check.checkFunction();

        if (result.passed) {
          console.log(`✅ ${check.name}: PASSED`);
          if (result.message) {
            console.log(`   ${result.message}`);
          }
        } else {
          if (check.required) {
            console.log(`❌ ${check.name}: FAILED`);
            this.failures.push({ name: check.name, reason: result.message });
          } else {
            console.log(`⚠️  ${check.name}: WARNING`);
            this.warnings.push({ name: check.name, reason: result.message });
          }
          if (result.message) {
            console.log(`   ${result.message}`);
          }
        }
      } catch (error) {
        if (check.required) {
          console.log(`❌ ${check.name}: ERROR - ${error.message}`);
          this.failures.push({ name: check.name, reason: error.message });
        } else {
          console.log(`⚠️  ${check.name}: WARNING - ${error.message}`);
          this.warnings.push({ name: check.name, reason: error.message });
        }
      }
      console.log('');
    }

    this.printSummary();
  }

  printSummary() {
    console.log('📊 Deployment Checklist Summary\n');

    if (this.failures.length > 0) {
      console.log('❌ FAILED CHECKS:');
      this.failures.forEach(failure => {
        console.log(`   • ${failure.name}: ${failure.reason}`);
      });
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  WARNINGS:');
      this.warnings.forEach(warning => {
        console.log(`   • ${warning.name}: ${warning.reason}`);
      });
      console.log('');
    }

    const passedChecks = this.checks.length - this.failures.length - this.warnings.length;
    console.log(`📈 Results: ${passedChecks}/${this.checks.length} checks passed`);

    if (this.failures.length > 0) {
      console.log('🚫 DEPLOYMENT BLOCKED: Fix failed checks before proceeding');
      process.exit(1);
    } else if (this.warnings.length > 0) {
      console.log('⚠️  DEPLOYMENT ALLOWED: Address warnings post-deployment');
      process.exit(0);
    } else {
      console.log('🎉 DEPLOYMENT READY: All checks passed');
      process.exit(0);
    }
  }
}

function checkEnvironmentVariables() {
  const required = [
    'EXPO_PUBLIC_ENVIRONMENT',
    'EXPO_PUBLIC_APP_VERSION',
    'EXPO_PUBLIC_API_URL'
  ];

  const optional = [
    'EXPO_PUBLIC_SENTRY_DSN',
    'FIREBASE_PROJECT_ID'
  ];

  let missing = [];
  let warnings = [];

  required.forEach(env => {
    if (!process.env[env]) {
      missing.push(env);
    }
  });

  optional.forEach(env => {
    if (!process.env[env]) {
      warnings.push(env);
    }
  });

  return {
    passed: missing.length === 0,
    message: missing.length > 0
      ? `Missing required environment variables: ${missing.join(', ')}`
      : warnings.length > 0
        ? `Missing optional environment variables: ${warnings.join(', ')}`
        : 'All environment variables configured'
  };
}

function checkPackageJson() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    const issues = [];

    if (!packageJson.version || packageJson.version === '1.0.0') {
      issues.push('Version not updated from default');
    }

    if (!packageJson.scripts.build) {
      issues.push('Build script missing');
    }

    return {
      passed: issues.length === 0,
      message: issues.length > 0 ? `Issues: ${issues.join(', ')}` : 'Package.json valid'
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Cannot parse package.json'
    };
  }
}

function checkFirebaseConfig() {
  try {
    const configPath = path.join('src', 'services', 'firebase', 'firebaseConfig.js');
    const config = require(path.resolve(configPath));

    if (!config.firebaseConfig || !config.firebaseConfig.apiKey) {
      return {
        passed: false,
        message: 'Firebase configuration incomplete'
      };
    }

    return {
      passed: true,
      message: 'Firebase configuration valid'
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Firebase config file not found or invalid'
    };
  }
}

function checkTestCoverage() {
  try {
    // Check if coverage directory exists and has recent data
    const coveragePath = path.join('coverage', 'lcov-report', 'index.html');

    if (!fs.existsSync(coveragePath)) {
      return {
        passed: false,
        message: 'Test coverage report not found - run tests first'
      };
    }

    const stats = fs.statSync(coveragePath);
    const daysSinceUpdate = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceUpdate > 1) {
      return {
        passed: false,
        message: 'Test coverage is outdated - run tests first'
      };
    }

    return {
      passed: true,
      message: 'Test coverage report is current'
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Cannot check test coverage'
    };
  }
}

function checkSecurityAudit() {
  try {
    execSync('npm audit --audit-level high', { stdio: 'pipe' });
    return {
      passed: true,
      message: 'Security audit passed'
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Security vulnerabilities found - run npm audit'
    };
  }
}

function checkBuildArtifacts() {
  const buildDirs = ['ios', 'android'];

  for (const dir of buildDirs) {
    if (!fs.existsSync(dir)) {
      return {
        passed: false,
        message: `Build directory ${dir} missing`
      };
    }
  }

  return {
    passed: true,
    message: 'Build directories exist'
  };
}

function checkGitStatus() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });

    if (status.trim()) {
      return {
        passed: false,
        message: 'Uncommitted changes in working directory'
      };
    }

    return {
      passed: true,
      message: 'Working directory clean'
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Cannot check git status'
    };
  }
}

async function checkFeatureFlags() {
  try {
    // Import the feature flag service dynamically
    const { featureFlagService } = require('../src/services/featureFlags/featureFlags');

    await featureFlagService.initialize();
    const flags = featureFlagService.getAllFlags();

    if (flags.length === 0) {
      return {
        passed: false,
        message: 'No feature flags configured'
      };
    }

    return {
      passed: true,
      message: `${flags.length} feature flags configured`
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Feature flags service not available'
    };
  }
}

// Run the checklist
async function main() {
  const checklist = new DeploymentChecklist();

  // Critical checks (required)
  checklist.addCheck('Environment Variables', checkEnvironmentVariables);
  checklist.addCheck('Package.json Configuration', checkPackageJson);
  checklist.addCheck('Firebase Configuration', checkFirebaseConfig);
  checklist.addCheck('Git Status', checkGitStatus);
  checklist.addCheck('Build Artifacts', checkBuildArtifacts);
  checklist.addCheck('Security Audit', checkSecurityAudit);

  // Important checks (warnings if failed)
  checklist.addCheck('Test Coverage', checkTestCoverage, false);
  checklist.addCheck('Feature Flags', checkFeatureFlags, false);

  await checklist.runChecks();
}

if (require.main === module) {
  main().catch(error => {
    console.error('Deployment checklist failed:', error);
    process.exit(1);
  });
}

module.exports = DeploymentChecklist;
