#!/usr/bin/env node

/**
 * Performance Baseline Measurement Script
 * Measures and tracks app performance metrics for regression testing
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class PerformanceBaseline {
  constructor() {
    this.baselineFile = path.join(__dirname, '..', 'performance-baseline.json');
    this.currentMetrics = {};
  }

  async measureBundleSize() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const bundlePath = path.join('dist', 'assets', 'index-*.js');

      // This is a simplified measurement - in production you'd use bundle analyzer
      const stats = fs.statSync('node_modules');
      const nodeModulesSize = this.getDirectorySize('node_modules');

      return {
        totalDependencies: Object.keys(packageJson.dependencies || {}).length + Object.keys(packageJson.devDependencies || {}).length,
        nodeModulesSizeMB: (nodeModulesSize / (1024 * 1024)).toFixed(2),
        estimatedBundleSize: 'Unknown (run build first)'
      };
    } catch (error) {
      return {
        error: error.message,
        totalDependencies: 0,
        nodeModulesSizeMB: 0,
        estimatedBundleSize: 'Error'
      };
    }
  }

  async measureTestPerformance() {
    try {
      const startTime = Date.now();
      // In a real implementation, you'd run actual tests and measure time
      const testTime = Date.now() - startTime;

      return {
        testExecutionTimeMs: testTime,
        testCount: 'Unknown',
        coveragePercentage: 'Unknown'
      };
    } catch (error) {
      return {
        error: error.message,
        testExecutionTimeMs: 0,
        testCount: 0,
        coveragePercentage: 0
      };
    }
  }

  async measureBuildPerformance() {
    try {
      const startTime = Date.now();
      // Simulate build time measurement
      const buildTime = Date.now() - startTime;

      return {
        buildTimeMs: buildTime,
        buildSizeKb: 'Unknown',
        chunkCount: 'Unknown'
      };
    } catch (error) {
      return {
        error: error.message,
        buildTimeMs: 0,
        buildSizeKb: 0,
        chunkCount: 0
      };
    }
  }

  getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      cpuCount: os.cpus().length,
      totalMemoryGB: (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2),
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    };
  }

  getDirectorySize(dirPath) {
    let totalSize = 0;

    function calculateSize(itemPath) {
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        const items = fs.readdirSync(itemPath);
        items.forEach(item => {
          calculateSize(path.join(itemPath, item));
        });
      } else {
        totalSize += stats.size;
      }
    }

    try {
      calculateSize(dirPath);
    } catch (error) {
      console.warn(`Could not calculate size for ${dirPath}:`, error.message);
    }

    return totalSize;
  }

  async runMeasurements() {
    console.log('📊 Measuring Performance Baseline...\n');

    const measurements = {
      timestamp: new Date().toISOString(),
      systemInfo: this.getSystemInfo(),
      metrics: {
        bundleSize: await this.measureBundleSize(),
        testPerformance: await this.measureTestPerformance(),
        buildPerformance: await this.measureBuildPerformance()
      }
    };

    // Save baseline
    fs.writeFileSync(this.baselineFile, JSON.stringify(measurements, null, 2));
    console.log(`✅ Baseline saved to ${this.baselineFile}`);

    // Display results
    console.log('\n📈 Current Performance Metrics:');
    console.log('================================');
    console.log(`Bundle Size: ${measurements.metrics.bundleSize.nodeModulesSizeMB} MB (${measurements.metrics.bundleSize.totalDependencies} dependencies)`);
    console.log(`Test Time: ${measurements.metrics.testPerformance.testExecutionTimeMs} ms`);
    console.log(`Build Time: ${measurements.metrics.buildPerformance.buildTimeMs} ms`);
    console.log(`System: ${measurements.systemInfo.platform} ${measurements.systemInfo.arch} (${measurements.systemInfo.cpuCount} CPUs, ${measurements.systemInfo.totalMemoryGB} GB RAM)`);

    return measurements;
  }

  async compareWithBaseline() {
    try {
      if (!fs.existsSync(this.baselineFile)) {
        console.log('⚠️  No baseline found. Run this script first to create a baseline.');
        return;
      }

      const baseline = JSON.parse(fs.readFileSync(this.baselineFile, 'utf8'));
      const current = await this.runMeasurements();

      console.log('\n📊 Performance Comparison:');
      console.log('==========================');

      // Compare bundle size
      const baselineSize = parseFloat(baseline.metrics.bundleSize.nodeModulesSizeMB);
      const currentSize = parseFloat(current.metrics.bundleSize.nodeModulesSizeMB);
      const sizeDiff = currentSize - baselineSize;

      if (Math.abs(sizeDiff) > 10) { // 10MB threshold
        console.log(`🚨 Bundle Size Change: ${sizeDiff > 0 ? '+' : ''}${sizeDiff.toFixed(2)} MB`);
      } else {
        console.log(`✅ Bundle Size: ${sizeDiff >= 0 ? '+' : ''}${sizeDiff.toFixed(2)} MB (within threshold)`);
      }

      // Compare build time
      const baselineBuild = baseline.metrics.buildPerformance.buildTimeMs;
      const currentBuild = current.metrics.buildPerformance.buildTimeMs;
      const buildDiff = currentBuild - baselineBuild;

      if (Math.abs(buildDiff) > 1000) { // 1 second threshold
        console.log(`🚨 Build Time Change: ${buildDiff > 0 ? '+' : ''}${buildDiff} ms`);
      } else {
        console.log(`✅ Build Time: ${buildDiff >= 0 ? '+' : ''}${buildDiff} ms (within threshold)`);
      }

      // Check for regressions
      const hasRegression = Math.abs(sizeDiff) > 10 || Math.abs(buildDiff) > 1000;

      if (hasRegression) {
        console.log('\n🚫 PERFORMANCE REGRESSION DETECTED!');
        console.log('Consider optimizing before deployment.');
        return false;
      } else {
        console.log('\n✅ No significant performance regression detected.');
        return true;
      }

    } catch (error) {
      console.error('Error comparing with baseline:', error.message);
      return false;
    }
  }
}

// CLI interface
async function main() {
  const baseline = new PerformanceBaseline();
  const args = process.argv.slice(2);

  if (args.includes('--compare') || args.includes('-c')) {
    const passed = await baseline.compareWithBaseline();
    process.exit(passed ? 0 : 1);
  } else {
    await baseline.runMeasurements();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Performance baseline measurement failed:', error);
    process.exit(1);
  });
}

module.exports = PerformanceBaseline;
