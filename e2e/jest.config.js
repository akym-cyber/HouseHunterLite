module.exports = {
  preset: 'detox/expo',
  setupFilesAfterEnv: ['<rootDir>/init.js'],
  testEnvironment: 'detox',
  testMatch: ['**/*.e2e.js'],
  testTimeout: 120000,
  reporters: ['detox/runners/jest/reporter'],
  verbose: true
};
