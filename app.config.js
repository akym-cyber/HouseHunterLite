require('dotenv').config();

module.exports = {
  expo: {
    scheme: 'acme',
    plugins: ['expo-router', 'expo-font'],
    name: 'HouseHunter',
    slug: 'HouseHunter',
    version: '1.0.0',
    platforms: ['ios', 'android', 'web'],
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.anonymous.HouseHunter'
    },
    android: {
      package: 'com.anonymous.HouseHunter',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff'
      }
    },
    // ✅ CRITICAL: ADD WEB CONFIG
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
      output: 'single', // Important for proper static export
      build: {
        output: 'dist' // Explicitly tell Expo to output to 'dist'
      }
    },
    extra: {
      eas: {
        projectId: '03857d49-a82b-48c0-8766-dc1f79712cb2'
      },
      cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME,
      cloudinaryUploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
    },
  },
};