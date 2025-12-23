#!/usr/bin/env node

/**
 * Security Audit Script
 * Automated security checks for HouseHunter
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SecurityAuditor {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.passed = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  addIssue(severity, category, description, recommendation) {
    const issue = { severity, category, description, recommendation };
    if (severity === 'high' || severity === 'critical') {
      this.issues.push(issue);
      this.log(`${category}: ${description}`, 'error');
    } else {
      this.warnings.push(issue);
      this.log(`${category}: ${description}`, 'warning');
    }
  }

  addPassed(category, description) {
    this.passed.push({ category, description });
    this.log(`${category}: ${description}`, 'info');
  }

  async checkDependencies() {
    try {
      this.log('Checking for vulnerable dependencies...');
      const auditResult = execSync('npm audit --audit-level moderate --json', { encoding: 'utf8' });
      const audit = JSON.parse(auditResult);

      if (audit.metadata && audit.metadata.vulnerabilities) {
        const vulns = audit.metadata.vulnerabilities;
        if (vulns.high > 0 || vulns.critical > 0) {
          this.addIssue('high', 'Dependencies', `${vulns.high + vulns.critical} high/critical vulnerabilities found`, 'Run npm audit fix or update vulnerable packages');
        } else if (vulns.moderate > 0 || vulns.low > 0) {
          this.addIssue('medium', 'Dependencies', `${vulns.moderate + vulns.low} moderate/low vulnerabilities found`, 'Review and update vulnerable packages');
        } else {
          this.addPassed('Dependencies', 'No critical vulnerabilities found');
        }
      }
    } catch (error) {
      this.addIssue('medium', 'Dependencies', 'Failed to run dependency audit', 'Check npm audit manually');
    }
  }

  async checkEnvironmentVariables() {
    this.log('Checking environment variable security...');

    const envFiles = ['.env', '.env.production', '.env.staging', '.env.local'];
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /key/i,
      /token/i,
      /api_key/i,
      /private/i
    ];

    for (const envFile of envFiles) {
      if (fs.existsSync(envFile)) {
        const content = fs.readFileSync(envFile, 'utf8');
        const lines = content.split('\n');

        for (const line of lines) {
          if (line.trim() && !line.startsWith('#')) {
            const [key] = line.split('=');
            if (key) {
              const isSensitive = sensitivePatterns.some(pattern => pattern.test(key));
              if (isSensitive) {
                // Check if value looks like a placeholder
                const [, value] = line.split('=');
                if (value && (value.includes('your_') || value.includes('TODO') || value.length < 10)) {
                  this.addIssue('high', 'Environment', `Sensitive variable ${key} appears to be a placeholder`, 'Replace with actual secure value');
                }
              }
            }
          }
        }
      }
    }

    this.addPassed('Environment', 'Environment variables checked');
  }

  async checkFirebaseSecurity() {
    this.log('Checking Firebase security configuration...');

    try {
      const configPath = path.join('src', 'services', 'firebase', 'firebaseConfig.js');
      if (!fs.existsSync(configPath)) {
        this.addIssue('high', 'Firebase', 'Firebase config file not found', 'Create proper Firebase configuration');
        return;
      }

      const config = require(path.resolve(configPath));

      if (!config.firebaseConfig) {
        this.addIssue('high', 'Firebase', 'Firebase config not exported', 'Export firebaseConfig object');
        return;
      }

      const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
      const missing = requiredFields.filter(field => !config.firebaseConfig[field]);

      if (missing.length > 0) {
        this.addIssue('high', 'Firebase', `Missing Firebase config fields: ${missing.join(', ')}`, 'Add missing configuration fields');
      } else {
        this.addPassed('Firebase', 'Firebase configuration complete');
      }

      // Check for security rules
      const rulesFiles = ['firestore.rules', 'storage.rules', 'database.rules'];
      for (const rulesFile of rulesFiles) {
        if (!fs.existsSync(rulesFile)) {
          this.addIssue('medium', 'Firebase', `${rulesFile} not found`, 'Create and deploy Firebase security rules');
        }
      }

    } catch (error) {
      this.addIssue('medium', 'Firebase', 'Failed to check Firebase configuration', 'Verify Firebase setup manually');
    }
  }

  async checkCodeSecurity() {
    this.log('Checking code for security issues...');

    // Check for common security issues in source code
    const sourceDirs = ['src'];
    const securityPatterns = [
      { pattern: /console\.log\(.*password.*\)/i, issue: 'Passwords logged to console', severity: 'high' },
      { pattern: /apiKey\s*[:=]\s*['"`][^'"`]*['"`]/i, issue: 'API keys in source code', severity: 'critical' },
      { pattern: /debugger\s*;?/i, issue: 'Debugger statements in code', severity: 'medium' },
      { pattern: /eval\s*\(/i, issue: 'Use of eval() function', severity: 'high' },
    ];

    for (const dir of sourceDirs) {
      if (fs.existsSync(dir)) {
        this.scanDirectory(dir, securityPatterns);
      }
    }
  }

  scanDirectory(dirPath, patterns) {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        this.scanDirectory(fullPath, patterns);
      } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.ts') || item.endsWith('.tsx'))) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const { pattern, issue, severity } of patterns) {
            if (pattern.test(content)) {
              this.addIssue(severity, 'Code Security', `${issue} in ${fullPath}`, 'Remove or fix security vulnerability');
            }
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }
  }

  async checkPermissions() {
    this.log('Checking app permissions...');

    try {
      const appConfigPath = 'app.config.js';
      if (fs.existsSync(appConfigPath)) {
        const config = require(path.resolve(appConfigPath));

        // Check for reasonable permissions
        const requiredPermissions = ['CAMERA', 'MEDIA_LIBRARY', 'LOCATION'];
        const configPermissions = config.expo?.plugins || [];

        for (const permission of requiredPermissions) {
          const hasPermission = configPermissions.some(plugin =>
            plugin && typeof plugin === 'object' && plugin[0] &&
            plugin[0].includes('permissions') &&
            plugin[1] && plugin[1][permission]
          );

          if (!hasPermission) {
            this.addIssue('low', 'Permissions', `Consider adding ${permission} permission with proper usage description`, 'Add permission with user-facing explanation');
          }
        }

        this.addPassed('Permissions', 'App permissions reviewed');
      } else {
        this.addIssue('medium', 'Permissions', 'app.config.js not found', 'Create app configuration file');
      }
    } catch (error) {
      this.addIssue('medium', 'Permissions', 'Failed to check permissions', 'Review app permissions manually');
    }
  }

  async generateReport() {
    console.log('\n🔒 Security Audit Report');
    console.log('========================\n');

    if (this.issues.length > 0) {
      console.log('🚨 CRITICAL ISSUES:');
      this.issues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.severity.toUpperCase()}] ${issue.category}`);
        console.log(`   ${issue.description}`);
        console.log(`   💡 ${issue.recommendation}\n`);
      });
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  WARNINGS:');
      this.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. [${warning.severity.toUpperCase()}] ${warning.category}`);
        console.log(`   ${warning.description}`);
        console.log(`   💡 ${warning.recommendation}\n`);
      });
    }

    if (this.passed.length > 0) {
      console.log('✅ PASSED CHECKS:');
      this.passed.forEach((passed, index) => {
        console.log(`${index + 1}. ${passed.category}: ${passed.description}`);
      });
      console.log('');
    }

    const summary = {
      timestamp: new Date().toISOString(),
      criticalIssues: this.issues.length,
      warnings: this.warnings.length,
      passed: this.passed.length,
      overall: this.issues.length === 0 ? 'SECURE' : 'VULNERABLE'
    };

    console.log('📊 SUMMARY:');
    console.log(`   Critical Issues: ${summary.criticalIssues}`);
    console.log(`   Warnings: ${summary.warnings}`);
    console.log(`   Passed Checks: ${summary.passed}`);
    console.log(`   Overall Status: ${summary.overall}`);

    // Save report
    const reportPath = path.join('security-audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      summary,
      issues: this.issues,
      warnings: this.warnings,
      passed: this.passed
    }, null, 2));

    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    return summary;
  }

  async runAudit() {
    console.log('🔒 Starting HouseHunter Security Audit...\n');

    await this.checkDependencies();
    await this.checkEnvironmentVariables();
    await this.checkFirebaseSecurity();
    await this.checkCodeSecurity();
    await this.checkPermissions();

    const report = await this.generateReport();

    // Exit with error code if there are critical issues
    if (report.criticalIssues > 0) {
      console.log('\n🚫 SECURITY AUDIT FAILED: Critical issues must be resolved before deployment');
      process.exit(1);
    } else if (report.warnings > 0) {
      console.log('\n⚠️  SECURITY AUDIT COMPLETED: Review warnings before deployment');
      process.exit(0);
    } else {
      console.log('\n✅ SECURITY AUDIT PASSED: No security issues found');
      process.exit(0);
    }
  }
}

// CLI interface
async function main() {
  const auditor = new SecurityAuditor();
  await auditor.runAudit();
}

if (require.main === module) {
  main().catch(error => {
    console.error('Security audit failed:', error);
    process.exit(1);
  });
}

module.exports = SecurityAuditor;
