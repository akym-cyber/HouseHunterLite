# 🏠 HouseHunter Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Firebase Setup

#### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication (Email/Password)
4. Create a Firestore database
5. Get your Firebase config

#### Configure Environment Variables
1. Copy `env.example` to `.env`
2. Replace Firebase config values with your actual values:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your-actual-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 3. Start Development Server
```bash
npx expo start
```

## 📱 Features

### ✅ Implemented
- **Authentication**: Login, Register, Forgot Password
- **Property Management**: Create, Read, Update, Delete listings
- **Search & Filter**: Find properties by location, price, type
- **User Profiles**: Owner and tenant dashboards
- **Navigation**: Tab-based navigation with proper routing
- **UI Components**: Modern, responsive design with React Native Paper
- **Firebase Integration**: Real-time database with Firestore

### 🔄 In Progress
- Property images and media
- Messaging system
- Notifications
- Advanced search filters
- Maps integration

## 🗂️ Project Structure

```
HouseHunter/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main app tabs
│   └── property/          # Property-related screens
├── src/
│   ├── components/        # Reusable UI components
│   ├── hooks/            # Custom React hooks
│   ├── services/         # Firebase services
│   ├── styles/           # Theme and styling
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── assets/               # Images, fonts, etc.
└── docs/                 # Documentation
```

## 🔧 Firebase Collections

### Properties Collection
```javascript
{
  id: "auto-generated",
  ownerId: "user-id",
  title: "Beautiful 2BR Apartment",
  description: "Spacious apartment with great amenities",
  propertyType: "apartment",
  addressLine1: "123 Main St",
  city: "New York",
  state: "NY",
  postalCode: "10001",
  price: 2500,
  bedrooms: 2,
  bathrooms: 1,
  status: "available",
  createdAt: "timestamp",
  updatedAt: "timestamp"
}
```

### Users Collection
```javascript
{
  id: "user-id",
  email: "user@example.com",
  firstName: "John",
  lastName: "Doe",
  phone: "+1234567890",
  role: "owner", // or "tenant"
  isVerified: false,
  isActive: true,
  createdAt: "timestamp",
  updatedAt: "timestamp"
}
```

## 🎨 Customization

### Theme
Edit `src/styles/theme.js` to customize colors, fonts, and styling.

### Components
All UI components are in `src/components/` and can be customized.

### Firebase Rules
Set up Firestore security rules in Firebase Console for data protection.

## 🚨 Troubleshooting

### Common Issues

1. **Firebase Connection Error**
   - Check your Firebase config in `.env`
   - Ensure Firestore is enabled in Firebase Console

2. **Authentication Issues**
   - Verify Email/Password auth is enabled in Firebase
   - Check Firebase project settings

3. **Build Errors**
   - Clear cache: `npx expo start --clear`
   - Reinstall dependencies: `npm install`

## 📚 Next Steps

1. Add property images with Firebase Storage
2. Implement real-time messaging
3. Add push notifications
4. Integrate Google Maps
5. Add payment processing
6. Implement advanced search filters

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Happy House Hunting! 🏠✨** 