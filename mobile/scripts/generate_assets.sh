#!/bin/bash

# This script generates PNG assets from SVG files for app icons and splash screen
# Requires ImageMagick to be installed: sudo apt-get install imagemagick

echo "Generating app assets..."

# Generate app icon in various sizes
if command -v convert &> /dev/null; then
    # App icon - 1024x1024 master
    convert -background none -density 1200 assets/icons/app_icon.svg -resize 1024x1024 assets/icons/app_icon.png
    
    # App icon foreground for adaptive icon
    convert -background none -density 1200 assets/icons/app_icon.svg -resize 432x432 assets/icons/app_icon_foreground.png
    
    # Splash logo
    convert -background none -density 1200 assets/images/splash_logo.svg -resize 600x600 assets/images/splash_logo.png
    
    echo "✅ Assets generated successfully!"
else
    echo "⚠️  ImageMagick not found. Please install it to generate PNG assets."
    echo "For now, creating placeholder PNG files..."
    
    # Create placeholder files
    touch assets/icons/app_icon.png
    touch assets/icons/app_icon_foreground.png
    touch assets/images/splash_logo.png
fi

# Run Flutter commands to generate launcher icons and splash screen
echo "Running Flutter asset generation..."

# Install dependencies
flutter pub get

# Generate launcher icons
flutter pub run flutter_launcher_icons

# Generate splash screen
flutter pub run flutter_native_splash:create

echo "✅ Asset generation complete!"