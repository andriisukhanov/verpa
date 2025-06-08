class AppConstants {
  // App Info
  static const String appName = 'Verpa';
  static const String appTagline = 'Smart Aquarium Management';
  static const String appVersion = '1.0.0';
  
  // Storage Keys
  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userDataKey = 'user_data';
  static const String onboardingCompleteKey = 'onboarding_complete';
  static const String themeKey = 'theme_mode';
  static const String languageKey = 'language_code';
  
  // Hive Boxes
  static const String userBoxName = 'user_box';
  static const String aquariumBoxName = 'aquarium_box';
  static const String settingsBoxName = 'settings_box';
  static const String cacheBoxName = 'cache_box';
  
  // API
  static const String defaultApiUrl = 'http://localhost:3000/api/v1';
  static const String mobileApiUrl = 'http://localhost:3100/api/v1';
  
  // Timeouts
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration cacheTimeout = Duration(hours: 1);
  
  // Pagination
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;
  
  // Image
  static const int maxImageSize = 5 * 1024 * 1024; // 5MB
  static const List<String> supportedImageFormats = ['jpg', 'jpeg', 'png', 'webp'];
  
  // Water Parameters Ranges
  static const Map<String, Map<String, double>> waterParameterRanges = {
    'temperature': {'min': 20.0, 'max': 30.0, 'unit': 1}, // Celsius
    'ph': {'min': 6.0, 'max': 8.5, 'unit': 0.1},
    'ammonia': {'min': 0.0, 'max': 0.25, 'unit': 0.01}, // ppm
    'nitrite': {'min': 0.0, 'max': 0.25, 'unit': 0.01}, // ppm
    'nitrate': {'min': 0.0, 'max': 40.0, 'unit': 1}, // ppm
    'hardness': {'min': 5.0, 'max': 25.0, 'unit': 1}, // dGH
    'alkalinity': {'min': 80.0, 'max': 120.0, 'unit': 1}, // ppm
  };
  
  // Aquarium Types
  static const List<String> aquariumTypes = [
    'Freshwater Community',
    'Freshwater Planted',
    'Saltwater Fish Only',
    'Saltwater Reef',
    'Brackish',
    'Coldwater',
    'Biotope',
    'Species Only',
  ];
  
  // Event Types
  static const List<String> eventTypes = [
    'Water Change',
    'Feeding',
    'Testing',
    'Cleaning',
    'Maintenance',
    'Medication',
    'Plant Care',
    'Equipment Check',
    'Other',
  ];
  
  // Notification Types
  static const List<String> notificationTypes = [
    'reminder',
    'alert',
    'achievement',
    'system',
  ];
  
  // Animation Durations
  static const Duration shortAnimation = Duration(milliseconds: 200);
  static const Duration mediumAnimation = Duration(milliseconds: 300);
  static const Duration longAnimation = Duration(milliseconds: 500);
  
  // Routes
  static const String splashRoute = '/';
  static const String onboardingRoute = '/onboarding';
  static const String loginRoute = '/login';
  static const String registerRoute = '/register';
  static const String forgotPasswordRoute = '/forgot-password';
  static const String dashboardRoute = '/dashboard';
  static const String aquariumDetailRoute = '/aquarium/:id';
  static const String addAquariumRoute = '/add-aquarium';
  static const String profileRoute = '/profile';
  static const String settingsRoute = '/settings';
  static const String eventsRoute = '/events';
  static const String addEventRoute = '/add-event';
  
  // Error Messages
  static const String networkErrorMessage = 'Please check your internet connection and try again.';
  static const String serverErrorMessage = 'Something went wrong. Please try again later.';
  static const String validationErrorMessage = 'Please check your input and try again.';
  static const String authErrorMessage = 'Authentication failed. Please log in again.';
  
  // Success Messages
  static const String loginSuccessMessage = 'Welcome back!';
  static const String registerSuccessMessage = 'Account created successfully! Please verify your email.';
  static const String aquariumCreatedMessage = 'Aquarium created successfully!';
  static const String aquariumUpdatedMessage = 'Aquarium updated successfully!';
  static const String eventCreatedMessage = 'Event created successfully!';
  static const String parametersRecordedMessage = 'Water parameters recorded successfully!';
}