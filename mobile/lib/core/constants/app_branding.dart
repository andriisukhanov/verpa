import 'package:flutter/material.dart';

class AppBranding {
  // App Name
  static const String appName = 'Verpa';
  static const String appTagline = 'Smart Aquarium Management';
  static const String appFullName = 'Verpa - Smart Aquarium Management';
  
  // Company Info
  static const String companyName = 'Verpa Technologies';
  static const String companyWebsite = 'https://verpa.app';
  static const String supportEmail = 'support@verpa.app';
  
  // App Store Info
  static const String appStoreId = 'com.verpa.aquarium';
  static const String playStoreId = 'com.verpa.aquarium';
  
  // Social Media
  static const String twitterHandle = '@verpaapp';
  static const String instagramHandle = '@verpaapp';
  static const String facebookPage = 'verpaapp';
  
  // Legal URLs
  static const String privacyPolicyUrl = 'https://verpa.app/privacy';
  static const String termsOfServiceUrl = 'https://verpa.app/terms';
  static const String helpCenterUrl = 'https://help.verpa.app';
  
  // Brand Colors (matching app theme)
  static const Color primaryBrandColor = Color(0xFF1E88E5);
  static const Color secondaryBrandColor = Color(0xFF00ACC1);
  static const Color accentBrandColor = Color(0xFFFF6B35);
  
  // Feature Descriptions
  static const List<String> appFeatures = [
    'Track water parameters with ease',
    'Manage multiple aquariums',
    'Get maintenance reminders',
    'Monitor fish health',
    'Analyze aquarium trends',
    'Connect with experts',
  ];
  
  // Marketing Messages
  static const String onboardingTitle1 = 'Welcome to Verpa';
  static const String onboardingMessage1 = 'Your smart companion for aquarium management';
  
  static const String onboardingTitle2 = 'Track Parameters';
  static const String onboardingMessage2 = 'Monitor water quality, temperature, and more with detailed analytics';
  
  static const String onboardingTitle3 = 'Stay Informed';
  static const String onboardingMessage3 = 'Get timely reminders for maintenance, feeding, and water changes';
  
  static const String onboardingTitle4 = 'Healthy Aquariums';
  static const String onboardingMessage4 = 'Keep your fish happy with intelligent health monitoring';
  
  // App Benefits
  static const Map<String, String> benefits = {
    'Easy Tracking': 'Log water parameters in seconds with our intuitive interface',
    'Smart Reminders': 'Never miss a feeding or maintenance task again',
    'Health Insights': 'AI-powered analysis helps prevent problems before they occur',
    'Multiple Tanks': 'Manage all your aquariums from one convenient app',
    'Beautiful Charts': 'Visualize trends and patterns with stunning analytics',
    'Expert Support': 'Access to aquarium experts when you need help',
  };
  
  // Subscription Tiers
  static const Map<String, Map<String, dynamic>> subscriptionTiers = {
    'free': {
      'name': 'Starter',
      'price': 'Free',
      'features': [
        '1 Aquarium',
        'Basic parameter tracking',
        'Weekly reminders',
        '30-day history',
      ],
    },
    'pro': {
      'name': 'Pro',
      'price': '\$9.99/month',
      'features': [
        'Unlimited aquariums',
        'Advanced analytics',
        'Custom reminders',
        'Unlimited history',
        'Export data',
        'Priority support',
      ],
    },
    'premium': {
      'name': 'Premium',
      'price': '\$19.99/month',
      'features': [
        'Everything in Pro',
        'AI health predictions',
        'Expert consultations',
        'Custom reports',
        'API access',
        'White-glove support',
      ],
    },
  };
}