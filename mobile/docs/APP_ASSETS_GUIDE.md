# App Assets Generation Guide

This guide explains how to generate app icons and splash screens for the Verpa mobile app.

## Prerequisites

1. Install ImageMagick (for converting SVG to PNG):
```bash
# Ubuntu/Debian
sudo apt-get install imagemagick

# macOS
brew install imagemagick

# Windows (using Chocolatey)
choco install imagemagick
```

2. Ensure Flutter dependencies are installed:
```bash
cd /path/to/verpa/mobile
flutter pub get
```

## Asset Files

The app includes SVG source files for icons and branding:

- `/assets/icons/app_icon.svg` - Main app icon (water drop with fish)
- `/assets/images/splash_logo.svg` - Splash screen logo

## Generating Assets

### Option 1: Using the Generation Script

Run the provided script:
```bash
cd /path/to/verpa/mobile
./scripts/generate_assets.sh
```

This script will:
1. Convert SVG files to PNG format
2. Generate app icons for iOS and Android
3. Create splash screens for both platforms

### Option 2: Manual Generation

1. **Convert SVG to PNG:**
```bash
# App icon (1024x1024)
convert -background none -density 1200 assets/icons/app_icon.svg -resize 1024x1024 assets/icons/app_icon.png

# Adaptive icon foreground (432x432)
convert -background none -density 1200 assets/icons/app_icon.svg -resize 432x432 assets/icons/app_icon_foreground.png

# Splash logo (600x600)
convert -background none -density 1200 assets/images/splash_logo.svg -resize 600x600 assets/images/splash_logo.png
```

2. **Generate launcher icons:**
```bash
flutter pub run flutter_launcher_icons
```

3. **Generate splash screens:**
```bash
flutter pub run flutter_native_splash:create
```

## Platform-Specific Assets

### Android
- App icons are generated in `android/app/src/main/res/mipmap-*` directories
- Adaptive icons use separate background and foreground layers
- Splash screen is configured in `android/app/src/main/res/drawable/`

### iOS
- App icons are generated in `ios/Runner/Assets.xcassets/AppIcon.appiconset/`
- Splash screen uses `LaunchScreen.storyboard`

## Design Guidelines

### App Icon
- Primary color: #1E88E5 (Material Blue 600)
- Features a water drop shape with fish silhouette
- Works well on both light and dark backgrounds
- Adaptive icon for Android includes padding for system shapes

### Splash Screen
- Matches the primary brand color
- Includes animated logo and loading indicator
- Consistent with the app's aquatic theme

## Customization

To customize the app branding:

1. Edit the SVG files in `/assets/icons/` and `/assets/images/`
2. Update colors in `pubspec.yaml` under `flutter_launcher_icons` and `flutter_native_splash`
3. Regenerate assets using the steps above

## Troubleshooting

### ImageMagick Policy Error
If you get a policy error when converting SVG files, edit the ImageMagick policy:
```bash
sudo nano /etc/ImageMagick-6/policy.xml
```

Comment out or modify the line:
```xml
<!-- <policy domain="coder" rights="none" pattern="SVG" /> -->
```

### Flutter Command Not Found
Ensure Flutter is in your PATH:
```bash
export PATH="$PATH:/path/to/flutter/bin"
```

### Asset Not Displaying
1. Run `flutter clean`
2. Delete the app from your device/simulator
3. Run `flutter pub get`
4. Rebuild the app

## Brand Assets

Additional brand assets can be found in:
- App colors: `lib/core/theme/app_theme.dart`
- Brand constants: `lib/core/constants/app_branding.dart`
- Custom splash screen: `lib/shared/screens/app_splash_screen.dart`