require('dotenv').config();

module.exports = {
  expo: {
    scheme: 'acme',
    plugins: ['expo-router', 'expo-font'],
    name: 'HouseHunter',
    slug: 'HouseHunter',
    android: {
      package: 'com.anonymous.HouseHunter'
    },
    extra: {
      // ✅ ADD EAS PROJECT ID HERE:
      eas: {
        projectId: '03857d49-a82b-48c0-8766-dc1f79712cb2'
      },
      cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME,
      cloudinaryUploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
    },
  },
};