import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';

import 'core/api/api_client.dart';
import 'core/storage/storage_service.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_provider.dart';
import 'core/utils/app_router.dart';
import 'core/localization/app_localizations.dart';
import 'core/localization/language_provider.dart';
import 'features/auth/bloc/auth_bloc.dart';
import 'features/aquarium/bloc/aquarium_bloc.dart';
import 'features/aquarium/services/aquarium_service.dart';
import 'features/notifications/services/aquarium_notification_service.dart';
import 'features/collaboration/services/realtime_service.dart';
import 'shared/services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  await Firebase.initializeApp();
  
  // Initialize Hive
  await Hive.initFlutter();
  
  // Load environment variables
  await dotenv.load(fileName: ".env");
  
  // Initialize services
  await StorageService.init();
  await NotificationService.init();
  await AquariumNotificationService.init();
  await RealtimeService.initialize();
  
  // Set up notification navigation handler
  _setupNotificationNavigation();
  
  runApp(const VerpaApp());
}

class VerpaApp extends StatelessWidget {
  const VerpaApp({super.key});

  @override
  Widget build(BuildContext context) {
    final apiClient = ApiClient();
    final storageService = StorageService();
    
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => LanguageProvider(),
        ),
        ChangeNotifierProvider(
          create: (_) => ThemeProvider(),
        ),
      ],
      child: MultiBlocProvider(
        providers: [
          BlocProvider(
            create: (context) => AuthBloc(
              apiClient: apiClient,
              storageService: storageService,
            )..add(AuthCheckRequested()),
          ),
          BlocProvider(
            create: (context) => AquariumBloc(
              aquariumService: AquariumService(
                apiClient: apiClient,
                storageService: storageService,
              ),
            ),
          ),
        ],
        child: Consumer2<LanguageProvider, ThemeProvider>(
          builder: (context, languageProvider, themeProvider, child) {
            return MaterialApp.router(
              title: 'Verpa - Smart Aquarium Management',
              theme: AppTheme.lightTheme,
              darkTheme: AppTheme.darkTheme,
              themeMode: themeProvider.themeMode,
              routerConfig: AppRouter.router,
              locale: languageProvider.currentLocale,
              supportedLocales: AppLocales.supportedLocales,
              localizationsDelegates: const [
                AppLocalizations.delegate,
                GlobalMaterialLocalizations.delegate,
                GlobalWidgetsLocalizations.delegate,
                GlobalCupertinoLocalizations.delegate,
              ],
              debugShowCheckedModeBanner: false,
            );
          },
        ),
      ),
    );
  }
}

void _setupNotificationNavigation() {
  // Handle notification taps
  NotificationService.onNotificationTap = (String? payload) {
    if (payload == null || payload.isEmpty) return;
    
    // Parse notification payload
    final parts = payload.split(':');
    if (parts.length != 2) return;
    
    final type = parts[0];
    final id = parts[1];
    
    // Navigate based on notification type
    switch (type) {
      case 'aquarium':
        AppRouter.router.push('/dashboard/aquarium/$id');
        break;
      case 'equipment':
        AppRouter.router.push('/equipment/$id');
        break;
      case 'feeding':
        AppRouter.router.push('/feeding/$id');
        break;
      case 'parameters':
        AppRouter.router.push('/record-parameters/$id');
        break;
      case 'health':
        AppRouter.router.push('/dashboard/aquarium/$id');
        break;
      case 'test':
        // Test notification, no navigation needed
        break;
    }
  };
}