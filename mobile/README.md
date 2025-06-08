# Verpa Mobile App

A Flutter-based mobile application for the Verpa aquarium management system.

## Features

- Cross-platform support (iOS & Android)
- Real-time aquarium monitoring
- Water parameter tracking with analytics
- Equipment and inhabitant management
- Feeding schedule with reminders
- Push notifications for maintenance and alerts
- Offline support with data synchronization
- Beautiful charts and visualizations

## Getting Started

### Prerequisites

- Flutter SDK (3.10.0 or higher)
- Dart SDK (3.0.0 or higher)
- Android Studio / Xcode for platform-specific development
- VS Code or Android Studio with Flutter plugins
- Firebase account for push notifications

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   flutter pub get
   ```

3. Set up Firebase:
   - Create a Firebase project
   - Add Android/iOS apps to your Firebase project
   - Download and add configuration files:
     - `android/app/google-services.json` for Android
     - `ios/Runner/GoogleService-Info.plist` for iOS

4. Run the app:
   ```bash
   flutter run
   ```

### Environment Setup

Create a `.env` file in the root directory with the following variables:
```
API_BASE_URL=https://api.verpa.com
API_KEY=your_api_key_here
```

## Project Structure

```
lib/
├── core/           # Core functionality, utilities, constants
│   ├── api/        # API client and interceptors
│   ├── constants/  # App constants and branding
│   ├── storage/    # Local storage service
│   ├── theme/      # App theme and styling
│   └── utils/      # Utilities and helpers
├── features/       # Feature modules
│   ├── auth/       # Authentication
│   ├── aquarium/   # Aquarium management
│   ├── analytics/  # Charts and analytics
│   ├── equipment/  # Equipment tracking
│   ├── feeding/    # Feeding schedules
│   ├── inhabitants/# Fish and inhabitant management
│   ├── notifications/# Push notifications
│   └── settings/   # App settings
├── shared/         # Shared widgets and services
└── main.dart       # Application entry point
```

## Key Features Implementation

### Authentication
- Email/password login
- Social login support (Google, Apple)
- Secure token storage
- Automatic token refresh

### Aquarium Management
- Multiple aquarium support
- Real-time parameter tracking
- Health score calculation
- Alert system for critical values

### Analytics
- Interactive charts with fl_chart
- Parameter trend analysis
- Health score history
- Predictive insights

### Notifications
- Local notifications for reminders
- Push notifications for alerts
- Customizable notification preferences
- Feeding and maintenance schedules

### Offline Support
- Hive local database
- Automatic data synchronization
- Conflict resolution
- Queue system for offline actions

## App Assets

See [APP_ASSETS_GUIDE.md](docs/APP_ASSETS_GUIDE.md) for instructions on generating app icons and splash screens.

## Testing

Run tests with:
```bash
# Unit tests
flutter test

# Integration tests
flutter test integration_test
```

## Building

### Android
```bash
# Development build
flutter build apk --debug

# Release build
flutter build apk --release

# App Bundle for Play Store
flutter build appbundle --release
```

### iOS
```bash
# Development build
flutter build ios --debug

# Release build
flutter build ios --release
```

## Deployment

### Android
1. Generate signing key:
   ```bash
   keytool -genkey -v -keystore ~/key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias key
   ```

2. Configure signing in `android/app/build.gradle`

3. Build release APK or App Bundle

### iOS
1. Open `ios/Runner.xcworkspace` in Xcode
2. Configure signing & capabilities
3. Archive and upload to App Store Connect

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.