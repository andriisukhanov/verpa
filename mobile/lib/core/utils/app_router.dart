import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../constants/app_constants.dart';
import '../theme/app_theme.dart';
import '../../features/auth/bloc/auth_bloc.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/auth/screens/forgot_password_screen.dart';
import '../../features/auth/screens/biometric_auth_screen.dart';
import '../../features/aquarium/bloc/aquarium_bloc.dart';
import '../../features/dashboard/screens/dashboard_screen.dart';
import '../../features/aquarium/screens/aquarium_detail_screen.dart';
import '../../features/aquarium/screens/add_aquarium_screen.dart';
import '../../features/aquarium/screens/record_parameters_screen.dart';
import '../../features/analytics/screens/analytics_dashboard_screen.dart';
import '../../features/equipment/screens/add_equipment_screen.dart';
import '../../features/equipment/screens/equipment_management_screen.dart';
import '../../features/aquarium/models/aquarium_model.dart';
import '../../features/inhabitants/screens/add_inhabitant_screen.dart';
import '../../features/inhabitants/screens/inhabitant_management_screen.dart';
import '../../features/feeding/screens/feeding_schedule_screen.dart';
import '../../features/water_change/screens/water_change_screen.dart';
import '../../features/water_change/screens/water_change_history_screen.dart';
import '../../features/water_change/models/water_change.dart';
import '../../features/maintenance/screens/maintenance_screen.dart';
import '../../features/social/screens/community_screen.dart';
import '../../features/social/screens/share_aquarium_screen.dart';
import '../../features/social/screens/shared_aquarium_detail_screen.dart';
import '../../features/disease_detection/screens/disease_detection_screen.dart';
import '../../features/disease_detection/screens/disease_details_screen.dart';
import '../../features/disease_detection/screens/disease_guide_screen.dart';
import '../../features/disease_detection/models/disease_detection_result.dart';
import '../../features/barcode_scanner/screens/barcode_scanner_screen.dart';
import '../../features/barcode_scanner/screens/product_detail_screen.dart';
import '../../features/barcode_scanner/screens/add_product_screen.dart';
import '../../features/barcode_scanner/screens/scan_history_screen.dart';
import '../../features/barcode_scanner/screens/product_inventory_screen.dart';
import '../../features/barcode_scanner/models/product.dart';
import '../../features/expenses/screens/expenses_dashboard_screen.dart';
import '../../features/expenses/screens/add_expense_screen.dart';
import '../../features/expenses/screens/add_budget_screen.dart';
import '../../features/expenses/screens/expense_details_screen.dart';
import '../../features/expenses/models/expense.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/settings/screens/settings_screen.dart';
import '../../features/settings/screens/language_selection_screen.dart';
import '../../features/backup/screens/backup_restore_screen.dart';
import '../../features/predictions/screens/predictions_dashboard_screen.dart';
import '../../features/water_testing/screens/water_test_camera_screen.dart';
import '../../features/water_testing/screens/water_test_results_screen.dart';
import '../../features/water_testing/screens/water_test_history_screen.dart';
import '../../features/water_testing/models/test_strip_result.dart';
import '../../features/iot/screens/iot_devices_screen.dart';
import '../../features/iot/screens/iot_device_details_screen.dart';
import '../../features/iot/screens/iot_device_schedule_screen.dart';
import '../../features/iot/models/iot_device.dart';
import '../../features/voice_assistant/screens/voice_history_screen.dart';
import '../../features/collaboration/screens/collaborators_screen.dart';
import '../../features/collaboration/screens/invitations_screen.dart';
import '../../features/marketplace/screens/marketplace_screen.dart';
import '../../features/marketplace/screens/listing_detail_screen.dart';
import '../../features/marketplace/screens/create_listing_screen.dart';
import '../../features/marketplace/screens/my_listings_screen.dart';
import '../../features/marketplace/screens/marketplace_messages_screen.dart';
import '../../features/marketplace/screens/message_detail_screen.dart';
import '../../features/marketplace/screens/seller_profile_screen.dart';
import '../../features/marketplace/models/marketplace_models.dart';
import '../../shared/screens/splash_screen.dart';
import '../../shared/screens/onboarding_screen.dart';

class AppRouter {
  static final GoRouter router = GoRouter(
    initialLocation: AppConstants.splashRoute,
    redirect: _redirect,
    routes: [
      // Splash Screen
      GoRoute(
        path: AppConstants.splashRoute,
        name: 'splash',
        builder: (context, state) => const SplashScreen(),
      ),

      // Onboarding
      GoRoute(
        path: AppConstants.onboardingRoute,
        name: 'onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),

      // Auth Routes
      GoRoute(
        path: AppConstants.loginRoute,
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: AppConstants.registerRoute,
        name: 'register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: AppConstants.forgotPasswordRoute,
        name: 'forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/biometric-auth',
        name: 'biometric-auth',
        builder: (context, state) {
          final redirectTo = state.uri.queryParameters['redirectTo'];
          return BiometricAuthScreen(redirectTo: redirectTo);
        },
      ),

      // Main App Routes
      GoRoute(
        path: AppConstants.dashboardRoute,
        name: 'dashboard',
        builder: (context, state) => const DashboardScreen(),
        routes: [
          // Aquarium Routes
          GoRoute(
            path: 'aquarium/:id',
            name: 'aquarium-detail',
            builder: (context, state) {
              final aquariumId = state.pathParameters['id']!;
              return AquariumDetailScreen(aquariumId: aquariumId);
            },
          ),
          GoRoute(
            path: 'add-aquarium',
            name: 'add-aquarium',
            builder: (context, state) => const AddAquariumScreen(),
          ),
          
          // Profile Routes
          GoRoute(
            path: 'profile',
            name: 'profile',
            builder: (context, state) => const ProfileScreen(),
          ),
          
          // Settings Routes
          GoRoute(
            path: 'settings',
            name: 'settings',
            builder: (context, state) => const SettingsScreen(),
          ),
        ],
      ),
      
      // Parameter Recording Route
      GoRoute(
        path: '/record-parameters/:id',
        name: 'record-parameters',
        builder: (context, state) {
          final aquariumId = state.pathParameters['id']!;
          return RecordParametersScreen(aquariumId: aquariumId);
        },
      ),
      
      // Analytics Route
      GoRoute(
        path: '/analytics/:id',
        name: 'analytics',
        builder: (context, state) {
          final aquariumId = state.pathParameters['id']!;
          return AnalyticsDashboardScreen(aquariumId: aquariumId);
        },
      ),
      
      // Equipment Management Route
      GoRoute(
        path: '/equipment/:id',
        name: 'equipment-management',
        builder: (context, state) {
          final aquariumId = state.pathParameters['id']!;
          return EquipmentManagementScreen(aquariumId: aquariumId);
        },
      ),
      
      // Add/Edit Equipment Route
      GoRoute(
        path: '/add-equipment/:id',
        name: 'add-equipment',
        builder: (context, state) {
          final aquariumId = state.pathParameters['id']!;
          final equipment = state.extra as Equipment?;
          return AddEquipmentScreen(
            aquariumId: aquariumId,
            equipment: equipment,
          );
        },
      ),
      
      // Inhabitant Management Route
      GoRoute(
        path: '/inhabitants/:id',
        name: 'inhabitant-management',
        builder: (context, state) {
          final aquariumId = state.pathParameters['id']!;
          return InhabitantManagementScreen(aquariumId: aquariumId);
        },
      ),
      
      // Add/Edit Inhabitant Route
      GoRoute(
        path: '/add-inhabitant/:id',
        name: 'add-inhabitant',
        builder: (context, state) {
          final aquariumId = state.pathParameters['id']!;
          final inhabitant = state.extra as Inhabitant?;
          return AddInhabitantScreen(
            aquariumId: aquariumId,
            inhabitant: inhabitant,
          );
        },
      ),
      
      // Feeding Schedule Route
      GoRoute(
        path: '/feeding/:id',
        name: 'feeding-schedule',
        builder: (context, state) {
          final aquariumId = state.pathParameters['id']!;
          return FeedingScheduleScreen(aquariumId: aquariumId);
        },
      ),
      
      // Water Change Routes
      GoRoute(
        path: '/water-change-history/:id',
        name: 'water-change-history',
        builder: (context, state) {
          final aquariumId = state.pathParameters['id']!;
          return WaterChangeHistoryScreen(aquariumId: aquariumId);
        },
      ),
      GoRoute(
        path: '/water-change/:id',
        name: 'water-change',
        builder: (context, state) {
          final aquariumId = state.pathParameters['id']!;
          final waterChange = state.extra as WaterChange?;
          return WaterChangeScreen(
            aquariumId: aquariumId,
            waterChange: waterChange,
          );
        },
      ),
      
      // Maintenance Route
      GoRoute(
        path: '/maintenance/:id',
        name: 'maintenance',
        builder: (context, state) {
          final aquariumId = state.pathParameters['id']!;
          return MaintenanceScreen(aquariumId: aquariumId);
        },
      ),
      
      // Social Routes
      GoRoute(
        path: '/community',
        name: 'community',
        builder: (context, state) => const CommunityScreen(),
      ),
      GoRoute(
        path: '/share-aquarium',
        name: 'share-aquarium',
        builder: (context, state) {
          final aquariumId = state.uri.queryParameters['aquariumId'];
          return ShareAquariumScreen(aquariumId: aquariumId);
        },
      ),
      GoRoute(
        path: '/shared-aquarium/:id',
        name: 'shared-aquarium-detail',
        builder: (context, state) {
          final sharedAquariumId = state.pathParameters['id']!;
          return SharedAquariumDetailScreen(sharedAquariumId: sharedAquariumId);
        },
      ),
      
      // Disease Detection Routes
      GoRoute(
        path: '/disease-detection/:id',
        name: 'disease-detection',
        builder: (context, state) {
          final aquariumId = state.pathParameters['id']!;
          // Get aquarium name from bloc
          final aquariumState = context.read<AquariumBloc>().state;
          String aquariumName = 'Aquarium';
          
          if (aquariumState is AquariumsLoaded) {
            final aquarium = aquariumState.aquariums.firstWhere(
              (a) => a.id == aquariumId,
              orElse: () => aquariumState.aquariums.first,
            );
            aquariumName = aquarium.name;
          }
          
          return DiseaseDetectionScreen(
            aquariumId: aquariumId,
            aquariumName: aquariumName,
          );
        },
      ),
      GoRoute(
        path: '/disease-details/:id',
        name: 'disease-details',
        builder: (context, state) {
          final resultId = state.pathParameters['id']!;
          final result = state.extra as DiseaseDetectionResult;
          return DiseaseDetailsScreen(
            resultId: resultId,
            result: result,
          );
        },
      ),
      GoRoute(
        path: '/disease-guide',
        name: 'disease-guide',
        builder: (context, state) {
          final selectedDiseaseId = state.extra as String?;
          return DiseaseGuideScreen(selectedDiseaseId: selectedDiseaseId);
        },
      ),
      GoRoute(
        path: '/disease-history/:id',
        name: 'disease-history',
        builder: (context, state) {
          final aquariumId = state.pathParameters['id']!;
          // TODO: Create disease history screen
          return Scaffold(
            appBar: AppBar(
              title: const Text('Disease History'),
              backgroundColor: AppTheme.primaryColor,
              foregroundColor: Colors.white,
            ),
            body: const Center(
              child: Text('Disease history coming soon'),
            ),
          );
        },
      ),
      
      // Barcode Scanner Routes
      GoRoute(
        path: '/barcode-scanner',
        name: 'barcode-scanner',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          final aquariumId = extra?['aquariumId'] as String?;
          return BarcodeScannerScreen(aquariumId: aquariumId);
        },
      ),
      GoRoute(
        path: '/product/:id',
        name: 'product-detail',
        builder: (context, state) {
          final product = state.extra as Product;
          return ProductDetailScreen(product: product);
        },
      ),
      GoRoute(
        path: '/add-product/:barcode',
        name: 'add-product',
        builder: (context, state) {
          final barcode = state.pathParameters['barcode']!;
          final extra = state.extra as Map<String, dynamic>?;
          final product = extra?['product'] as Product?;
          final aquariumId = extra?['aquariumId'] as String?;
          
          if (barcode == 'manual') {
            return AddProductScreen(
              barcode: extra?['barcode'] as String?,
              aquariumId: aquariumId,
            );
          }
          
          return AddProductScreen(
            barcode: barcode,
            product: product,
            aquariumId: aquariumId,
          );
        },
      ),
      GoRoute(
        path: '/scan-history',
        name: 'scan-history',
        builder: (context, state) => const ScanHistoryScreen(),
      ),
      GoRoute(
        path: '/product-inventory',
        name: 'product-inventory',
        builder: (context, state) {
          final aquariumId = state.uri.queryParameters['aquariumId'];
          return ProductInventoryScreen(aquariumId: aquariumId);
        },
      ),
      
      // Expense Tracking Routes
      GoRoute(
        path: '/expenses/:id',
        name: 'expenses-dashboard',
        builder: (context, state) {
          final aquariumId = state.pathParameters['id']!;
          return ExpensesDashboardScreen(aquariumId: aquariumId);
        },
      ),
      GoRoute(
        path: '/add-expense/:id',
        name: 'add-expense',
        builder: (context, state) {
          final aquariumId = state.pathParameters['id']!;
          final expense = state.extra as Expense?;
          return AddExpenseScreen(
            aquariumId: aquariumId,
            expense: expense,
          );
        },
      ),
      GoRoute(
        path: '/edit-expense/:id',
        name: 'edit-expense',
        builder: (context, state) {
          final expense = state.extra as Expense;
          return AddExpenseScreen(
            aquariumId: expense.aquariumId,
            expense: expense,
          );
        },
      ),
      GoRoute(
        path: '/expense-details/:id',
        name: 'expense-details',
        builder: (context, state) {
          final expenseId = state.pathParameters['id']!;
          final expense = state.extra as Expense;
          return ExpenseDetailsScreen(
            expenseId: expenseId,
            expense: expense,
          );
        },
      ),
      GoRoute(
        path: '/add-budget/:id',
        name: 'add-budget',
        builder: (context, state) {
          final aquariumId = state.pathParameters['id']!;
          final budget = state.extra as Budget?;
          return AddBudgetScreen(
            aquariumId: aquariumId,
            budget: budget,
          );
        },
      ),
      GoRoute(
        path: '/edit-budget/:id',
        name: 'edit-budget',
        builder: (context, state) {
          final budget = state.extra as Budget;
          return AddBudgetScreen(
            aquariumId: budget.aquariumId,
            budget: budget,
          );
        },
      ),
      
      // Backup & Restore Route
      GoRoute(
        path: '/backup-restore',
        name: 'backup-restore',
        builder: (context, state) => const BackupRestoreScreen(),
      ),
      
      // AI Predictions Route
      GoRoute(
        path: '/predictions/:id',
        name: 'predictions',
        builder: (context, state) {
          final aquariumId = state.pathParameters['id']!;
          return PredictionsDashboardScreen(aquariumId: aquariumId);
        },
      ),
      
      // IoT Device Routes
      GoRoute(
        path: '/iot-devices/:id',
        name: 'iot-devices',
        builder: (context, state) {
          final aquariumId = state.pathParameters['id']!;
          // Get aquarium name from bloc
          final aquariumState = context.read<AquariumBloc>().state;
          String aquariumName = 'Aquarium';
          
          if (aquariumState is AquariumsLoaded) {
            final aquarium = aquariumState.aquariums.firstWhere(
              (a) => a.id == aquariumId,
              orElse: () => aquariumState.aquariums.first,
            );
            aquariumName = aquarium.name;
          }
          
          return IoTDevicesScreen(
            aquariumId: aquariumId,
            aquariumName: aquariumName,
          );
        },
      ),
      GoRoute(
        path: '/iot-device-details/:id',
        name: 'iot-device-details',
        builder: (context, state) {
          final aquariumId = state.pathParameters['id']!;
          final device = state.extra as IoTDevice;
          return IoTDeviceDetailsScreen(
            aquariumId: aquariumId,
            device: device,
          );
        },
      ),
      GoRoute(
        path: '/iot-device-schedule/:id',
        name: 'iot-device-schedule',
        builder: (context, state) {
          final aquariumId = state.pathParameters['id']!;
          final device = state.extra as IoTDevice;
          return IoTDeviceScheduleScreen(
            aquariumId: aquariumId,
            device: device,
          );
        },
      ),
      
      // Water Testing Routes
      GoRoute(
        path: '/water-test-camera/:id',
        name: 'water-test-camera',
        builder: (context, state) {
          final aquariumId = state.pathParameters['id']!;
          // Get aquarium name from bloc
          final aquariumState = context.read<AquariumBloc>().state;
          String aquariumName = 'Aquarium';
          
          if (aquariumState is AquariumsLoaded) {
            final aquarium = aquariumState.aquariums.firstWhere(
              (a) => a.id == aquariumId,
              orElse: () => aquariumState.aquariums.first,
            );
            aquariumName = aquarium.name;
          }
          
          return WaterTestCameraScreen(
            aquariumId: aquariumId,
            aquariumName: aquariumName,
          );
        },
      ),
      GoRoute(
        path: '/water-test-results/:id',
        name: 'water-test-results',
        builder: (context, state) {
          final aquariumId = state.pathParameters['id']!;
          final result = state.extra as TestStripResult;
          return WaterTestResultsScreen(
            aquariumId: aquariumId,
            result: result,
          );
        },
      ),
      GoRoute(
        path: '/water-test-history/:id',
        name: 'water-test-history',
        builder: (context, state) {
          final aquariumId = state.pathParameters['id']!;
          return WaterTestHistoryScreen(aquariumId: aquariumId);
        },
      ),
      
      // Language Selection Route
      GoRoute(
        path: '/language-selection',
        name: 'language-selection',
        builder: (context, state) => const LanguageSelectionScreen(),
      ),
      
      // Voice Assistant Route
      GoRoute(
        path: '/voice-history',
        name: 'voice-history',
        builder: (context, state) => const VoiceHistoryScreen(),
      ),
      
      // Collaboration Routes
      GoRoute(
        path: '/collaborators/:id',
        name: 'collaborators',
        builder: (context, state) {
          final aquariumId = state.pathParameters['id']!;
          final aquariumName = state.uri.queryParameters['name'] ?? 'Aquarium';
          return CollaboratorsScreen(
            aquariumId: aquariumId,
            aquariumName: aquariumName,
          );
        },
      ),
      GoRoute(
        path: '/invitations',
        name: 'invitations',
        builder: (context, state) => const InvitationsScreen(),
      ),
      
      // Marketplace Routes
      GoRoute(
        path: '/marketplace',
        name: 'marketplace',
        builder: (context, state) => const MarketplaceScreen(),
      ),
      GoRoute(
        path: '/marketplace/listing/:id',
        name: 'marketplace-listing',
        builder: (context, state) {
          final listingId = state.pathParameters['id']!;
          return ListingDetailScreen(listingId: listingId);
        },
      ),
      GoRoute(
        path: '/marketplace/create-listing',
        name: 'create-listing',
        builder: (context, state) {
          final listing = state.extra as MarketplaceListing?;
          return CreateListingScreen(listing: listing);
        },
      ),
      GoRoute(
        path: '/marketplace/my-listings',
        name: 'my-listings',
        builder: (context, state) => const MyListingsScreen(),
      ),
      GoRoute(
        path: '/marketplace/messages',
        name: 'marketplace-messages',
        builder: (context, state) => const MarketplaceMessagesScreen(),
      ),
      GoRoute(
        path: '/marketplace/message/:id',
        name: 'marketplace-message',
        builder: (context, state) {
          final listingId = state.pathParameters['id']!;
          final listing = state.extra as MarketplaceListing?;
          return MessageDetailScreen(
            listingId: listingId,
            listing: listing,
          );
        },
      ),
      GoRoute(
        path: '/marketplace/seller/:id',
        name: 'seller-profile',
        builder: (context, state) {
          final sellerId = state.pathParameters['id']!;
          return SellerProfileScreen(sellerId: sellerId);
        },
      ),
    ],
  );

  static String? _redirect(BuildContext context, GoRouterState state) {
    final authState = context.read<AuthBloc>().state;
    final location = state.uri.path;

    // Handle splash screen
    if (location == AppConstants.splashRoute) {
      return null; // Let splash screen handle navigation
    }

    // Check if user is authenticated
    final isAuthenticated = authState is AuthAuthenticated;
    
    // Protected routes
    final protectedRoutes = [
      AppConstants.dashboardRoute,
      '/dashboard/aquarium',
      '/dashboard/add-aquarium',
      '/dashboard/profile',
      '/dashboard/settings',
      '/record-parameters',
      '/analytics',
      '/equipment',
      '/add-equipment',
      '/inhabitants',
      '/add-inhabitant',
      '/feeding',
      '/water-change-history',
      '/water-change',
      '/maintenance',
      '/community',
      '/share-aquarium',
      '/shared-aquarium',
      '/disease-detection',
      '/disease-details',
      '/disease-guide',
      '/disease-history',
      '/barcode-scanner',
      '/product',
      '/add-product',
      '/scan-history',
      '/product-inventory',
      '/expenses',
      '/add-expense',
      '/edit-expense',
      '/expense-details',
      '/add-budget',
      '/edit-budget',
      '/backup-restore',
      '/language-selection',
      '/predictions',
      '/water-test-camera',
      '/water-test-results',
      '/water-test-history',
      '/iot-devices',
      '/iot-device-details',
      '/iot-device-schedule',
      '/voice-history',
      '/collaborators',
      '/invitations',
      '/marketplace',
    ];

    final isProtectedRoute = protectedRoutes.any((route) => location.startsWith(route));

    // Redirect unauthenticated users from protected routes
    if (!isAuthenticated && isProtectedRoute) {
      return AppConstants.loginRoute;
    }

    // Redirect authenticated users from auth routes
    if (isAuthenticated && _isAuthRoute(location)) {
      return AppConstants.dashboardRoute;
    }

    return null; // No redirect needed
  }

  static bool _isAuthRoute(String location) {
    final authRoutes = [
      AppConstants.loginRoute,
      AppConstants.registerRoute,
      AppConstants.forgotPasswordRoute,
      AppConstants.onboardingRoute,
    ];
    return authRoutes.contains(location);
  }
}

// Custom page transitions
class SlidePageTransition extends CustomTransitionPage<void> {
  const SlidePageTransition({
    required super.child,
    required super.key,
    super.name,
    super.arguments,
    super.restorationId,
    this.direction = SlideDirection.leftToRight,
  }) : super(transitionsBuilder: _slideTransition);

  final SlideDirection direction;

  static Widget _slideTransition(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    return SlideTransition(
      position: animation.drive(
        Tween(begin: const Offset(1.0, 0.0), end: Offset.zero).chain(
          CurveTween(curve: Curves.easeInOut),
        ),
      ),
      child: child,
    );
  }
}

class FadePageTransition extends CustomTransitionPage<void> {
  const FadePageTransition({
    required super.child,
    required super.key,
    super.name,
    super.arguments,
    super.restorationId,
  }) : super(transitionsBuilder: _fadeTransition);

  static Widget _fadeTransition(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    return FadeTransition(opacity: animation, child: child);
  }
}

enum SlideDirection {
  leftToRight,
  rightToLeft,
  topToBottom,
  bottomToTop,
}