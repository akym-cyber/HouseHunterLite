#!/usr/bin/env node

/**
 * Cost Monitoring Script for Cloud Services
 * Monitors usage and costs for Firebase, Cloudinary, and other cloud services
 */

const fs = require('fs');
const path = require('path');

class CostMonitor {
  constructor() {
    this.costFile = path.join(__dirname, '..', 'cost-report.json');
    this.budgets = {
      firebase: {
        firestore: { monthlyBudget: 500, unit: 'GB' }, // $0.18/GB stored + $0.06/GB network
        functions: { monthlyBudget: 100, unit: 'GB-hours' }, // $0.000000231/GB-second
        hosting: { monthlyBudget: 50, unit: 'GB' } // $0.026/GB
      },
      cloudinary: {
        storage: { monthlyBudget: 200, unit: 'GB' }, // $0.10/GB
        bandwidth: { monthlyBudget: 500, unit: 'GB' } // $0.10/GB
      }
    };
  }

  async gatherFirebaseMetrics() {
    try {
      // In production, this would use Firebase Admin SDK to get real metrics
      // For now, we'll simulate with mock data
      const mockMetrics = {
        firestore: {
          documentsRead: Math.floor(Math.random() * 1000000),
          documentsWritten: Math.floor(Math.random() * 500000),
          storageSizeGB: Math.random() * 100,
          networkEgressGB: Math.random() * 500,
          costEstimate: Math.random() * 300
        },
        functions: {
          invocations: Math.floor(Math.random() * 10000000),
          computeTimeSeconds: Math.random() * 1000000,
          memoryUsageGB: Math.random() * 1000,
          costEstimate: Math.random() * 50
        },
        hosting: {
          bandwidthGB: Math.random() * 1000,
          storageGB: Math.random() * 10,
          costEstimate: Math.random() * 20
        }
      };

      return mockMetrics;
    } catch (error) {
      console.warn('Failed to gather Firebase metrics:', error.message);
      return null;
    }
  }

  async gatherCloudinaryMetrics() {
    try {
      // In production, this would use Cloudinary Admin API
      const mockMetrics = {
        storage: {
          totalGB: Math.random() * 500,
          imagesCount: Math.floor(Math.random() * 100000),
          videosCount: Math.floor(Math.random() * 10000),
          costEstimate: Math.random() * 100
        },
        bandwidth: {
          monthlyGB: Math.random() * 2000,
          transformations: Math.floor(Math.random() * 1000000),
          costEstimate: Math.random() * 200
        },
        transformations: {
          count: Math.floor(Math.random() * 5000000),
          costEstimate: Math.random() * 50
        }
      };

      return mockMetrics;
    } catch (error) {
      console.warn('Failed to gather Cloudinary metrics:', error.message);
      return null;
    }
  }

  async gatherExpoMetrics() {
    try {
      // In production, this would use EAS API or Expo API
      const mockMetrics = {
        builds: {
          monthlyCount: Math.floor(Math.random() * 100),
          averageBuildTime: Math.random() * 1800, // seconds
          costEstimate: Math.random() * 100
        },
        updates: {
          monthlyUpdates: Math.floor(Math.random() * 50),
          dataTransferGB: Math.random() * 100,
          costEstimate: Math.random() * 20
        }
      };

      return mockMetrics;
    } catch (error) {
      console.warn('Failed to gather Expo metrics:', error.message);
      return null;
    }
  }

  calculateTotalCost(metrics) {
    let totalCost = 0;

    if (metrics.firebase) {
      totalCost += metrics.firebase.firestore.costEstimate || 0;
      totalCost += metrics.firebase.functions.costEstimate || 0;
      totalCost += metrics.firebase.hosting.costEstimate || 0;
    }

    if (metrics.cloudinary) {
      totalCost += metrics.cloudinary.storage.costEstimate || 0;
      totalCost += metrics.cloudinary.bandwidth.costEstimate || 0;
      totalCost += metrics.cloudinary.transformations.costEstimate || 0;
    }

    if (metrics.expo) {
      totalCost += metrics.expo.builds.costEstimate || 0;
      totalCost += metrics.expo.updates.costEstimate || 0;
    }

    return totalCost;
  }

  checkBudgets(metrics) {
    const alerts = [];

    // Firebase Firestore budget check
    if (metrics.firebase?.firestore) {
      const firestoreUsage = metrics.firebase.firestore.storageSizeGB + metrics.firebase.firestore.networkEgressGB;
      if (firestoreUsage > this.budgets.firebase.firestore.monthlyBudget * 0.8) {
        alerts.push({
          service: 'Firebase Firestore',
          type: 'warning',
          message: `Usage at ${(firestoreUsage / this.budgets.firebase.firestore.monthlyBudget * 100).toFixed(1)}% of budget`,
          current: firestoreUsage.toFixed(2),
          budget: this.budgets.firebase.firestore.monthlyBudget
        });
      }
    }

    // Cloudinary storage budget check
    if (metrics.cloudinary?.storage) {
      if (metrics.cloudinary.storage.totalGB > this.budgets.cloudinary.storage.monthlyBudget * 0.8) {
        alerts.push({
          service: 'Cloudinary Storage',
          type: 'warning',
          message: `Storage at ${(metrics.cloudinary.storage.totalGB / this.budgets.cloudinary.storage.monthlyBudget * 100).toFixed(1)}% of budget`,
          current: metrics.cloudinary.storage.totalGB.toFixed(2),
          budget: this.budgets.cloudinary.storage.monthlyBudget
        });
      }
    }

    // Cloudinary bandwidth budget check
    if (metrics.cloudinary?.bandwidth) {
      if (metrics.cloudinary.bandwidth.monthlyGB > this.budgets.cloudinary.bandwidth.monthlyBudget * 0.8) {
        alerts.push({
          service: 'Cloudinary Bandwidth',
          type: 'warning',
          message: `Bandwidth at ${(metrics.cloudinary.bandwidth.monthlyGB / this.budgets.cloudinary.bandwidth.monthlyBudget * 100).toFixed(1)}% of budget`,
          current: metrics.cloudinary.bandwidth.monthlyGB.toFixed(2),
          budget: this.budgets.cloudinary.bandwidth.monthlyBudget
        });
      }
    }

    return alerts;
  }

  async generateReport() {
    console.log('💰 Gathering Cost Metrics...\n');

    const report = {
      timestamp: new Date().toISOString(),
      period: 'monthly',
      metrics: {
        firebase: await this.gatherFirebaseMetrics(),
        cloudinary: await this.gatherCloudinaryMetrics(),
        expo: await this.gatherExpoMetrics()
      }
    };

    report.totalCost = this.calculateTotalCost(report.metrics);
    report.alerts = this.checkBudgets(report.metrics);

    // Save report
    fs.writeFileSync(this.costFile, JSON.stringify(report, null, 2));
    console.log(`✅ Cost report saved to ${this.costFile}`);

    // Display summary
    console.log('\n📊 Cost Monitoring Report');
    console.log('=========================');

    if (report.metrics.firebase) {
      console.log(`🔥 Firebase: $${report.metrics.firebase.firestore?.costEstimate?.toFixed(2) || 0} (Firestore) + $${report.metrics.firebase.functions?.costEstimate?.toFixed(2) || 0} (Functions) + $${report.metrics.firebase.hosting?.costEstimate?.toFixed(2) || 0} (Hosting)`);
    }

    if (report.metrics.cloudinary) {
      console.log(`☁️  Cloudinary: $${report.metrics.cloudinary.storage?.costEstimate?.toFixed(2) || 0} (Storage) + $${report.metrics.cloudinary.bandwidth?.costEstimate?.toFixed(2) || 0} (Bandwidth)`);
    }

    if (report.metrics.expo) {
      console.log(`⚡ Expo: $${report.metrics.expo.builds?.costEstimate?.toFixed(2) || 0} (Builds) + $${report.metrics.expo.updates?.costEstimate?.toFixed(2) || 0} (Updates)`);
    }

    console.log(`💵 Total Estimated Cost: $${report.totalCost.toFixed(2)}`);

    if (report.alerts.length > 0) {
      console.log('\n🚨 Budget Alerts:');
      report.alerts.forEach(alert => {
        console.log(`   ${alert.service}: ${alert.message}`);
      });
    }

    return report;
  }

  async compareWithPrevious() {
    try {
      if (!fs.existsSync(this.costFile)) {
        console.log('⚠️  No previous cost report found. Run this script first to generate a baseline.');
        return;
      }

      const previousReport = JSON.parse(fs.readFileSync(this.costFile, 'utf8'));
      const currentReport = await this.generateReport();

      console.log('\n📈 Cost Trend Analysis');
      console.log('======================');

      const costDiff = currentReport.totalCost - previousReport.totalCost;
      const percentChange = previousReport.totalCost > 0 ? (costDiff / previousReport.totalCost) * 100 : 0;

      if (Math.abs(percentChange) > 10) {
        console.log(`🚨 Cost Change: ${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}% ($${costDiff.toFixed(2)})`);
      } else {
        console.log(`✅ Cost Change: ${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}% ($${costDiff.toFixed(2)})`);
      }

      return {
        previousCost: previousReport.totalCost,
        currentCost: currentReport.totalCost,
        difference: costDiff,
        percentChange
      };

    } catch (error) {
      console.error('Error comparing costs:', error.message);
      return null;
    }
  }
}

// CLI interface
async function main() {
  const monitor = new CostMonitor();
  const args = process.argv.slice(2);

  if (args.includes('--compare') || args.includes('-c')) {
    await monitor.compareWithPrevious();
  } else if (args.includes('--alerts') || args.includes('-a')) {
    const report = await monitor.generateReport();
    const criticalAlerts = report.alerts.filter(alert => alert.type === 'critical');
    if (criticalAlerts.length > 0) {
      console.log('\n🚫 CRITICAL ALERTS:');
      criticalAlerts.forEach(alert => {
        console.log(`   ${alert.service}: ${alert.message}`);
      });
      process.exit(1);
    } else {
      console.log('\n✅ No critical cost alerts');
    }
  } else {
    await monitor.generateReport();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Cost monitoring failed:', error);
    process.exit(1);
  });
}

module.exports = CostMonitor;
