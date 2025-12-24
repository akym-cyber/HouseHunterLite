require('dotenv').config();

module.exports = {
  expo: {
    scheme: 'acme',
    plugins: ['expo-router', 'expo-font'],
    name: 'HouseHunter',
    slug: 'HouseHunter',
    version: '1.0.0', // Add version
    platforms: ['ios', 'android', 'web'],
    orientation: 'portrait', // Set orientation
    icon: './assets/icon.png', // Required for builds
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png', // Required for builds
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: ['**/*'], // Bundle all assets
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.anonymous.HouseHunter' // Add iOS bundle ID
    },
    android: {
      package: 'com.anonymous.HouseHunter',
      adaptiveIcon: { // Required for Android 8+
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff'
      }
    },
    web: {
      favicon: './assets/favicon.png' // If supporting web
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