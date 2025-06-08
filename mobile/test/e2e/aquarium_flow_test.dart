import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:flutter/material.dart';

import '../../lib/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Aquarium Management E2E Tests', () {
    testWidgets('Complete aquarium creation and management flow', (WidgetTester tester) async {
      // Start the app
      app.main();
      await tester.pumpAndSettle();

      // Skip onboarding if present
      final skipButton = find.text('Skip');
      if (skipButton.evaluate().isNotEmpty) {
        await tester.tap(skipButton);
        await tester.pumpAndSettle();
      }

      // Login flow
      await _performLogin(tester);

      // Navigate to aquariums
      await tester.tap(find.byIcon(Icons.water));
      await tester.pumpAndSettle();

      // Create new aquarium
      await _createAquarium(tester);

      // Add water parameters
      await _recordWaterParameters(tester);

      // Add inhabitants
      await _addInhabitants(tester);

      // Add equipment
      await _addEquipment(tester);

      // Verify aquarium details
      await _verifyAquariumDetails(tester);

      // Test water change
      await _performWaterChange(tester);

      // Test feeding schedule
      await _setupFeedingSchedule(tester);
    });
  });
}

Future<void> _performLogin(WidgetTester tester) async {
  // Find and tap login button
  final loginButton = find.text('Login');
  if (loginButton.evaluate().isNotEmpty) {
    await tester.tap(loginButton);
    await tester.pumpAndSettle();

    // Enter email
    await tester.enterText(
      find.byType(TextField).first,
      'test@example.com',
    );

    // Enter password
    await tester.enterText(
      find.byType(TextField).last,
      'password123',
    );

    // Tap login
    await tester.tap(find.text('Sign In'));
    await tester.pumpAndSettle();

    // Wait for navigation
    await tester.pump(const Duration(seconds: 2));
  }
}

Future<void> _createAquarium(WidgetTester tester) async {
  // Tap FAB to create new aquarium
  await tester.tap(find.byType(FloatingActionButton));
  await tester.pumpAndSettle();

  // Enter aquarium details
  await tester.enterText(
    find.widgetWithText(TextField, 'Aquarium Name'),
    'My Test Tank',
  );

  // Select aquarium type
  await tester.tap(find.text('Select Type'));
  await tester.pumpAndSettle();
  await tester.tap(find.text('Freshwater'));
  await tester.pumpAndSettle();

  // Enter volume
  await tester.enterText(
    find.widgetWithText(TextField, 'Volume'),
    '200',
  );

  // Enter dimensions
  await tester.enterText(
    find.widgetWithText(TextField, 'Length (cm)'),
    '100',
  );
  await tester.enterText(
    find.widgetWithText(TextField, 'Width (cm)'),
    '40',
  );
  await tester.enterText(
    find.widgetWithText(TextField, 'Height (cm)'),
    '50',
  );

  // Save aquarium
  await tester.tap(find.text('Create Aquarium'));
  await tester.pumpAndSettle();

  // Verify creation
  expect(find.text('My Test Tank'), findsOneWidget);
}

Future<void> _recordWaterParameters(WidgetTester tester) async {
  // Navigate to aquarium details
  await tester.tap(find.text('My Test Tank'));
  await tester.pumpAndSettle();

  // Go to parameters tab
  await tester.tap(find.text('Parameters'));
  await tester.pumpAndSettle();

  // Tap record parameters
  await tester.tap(find.byIcon(Icons.add_chart));
  await tester.pumpAndSettle();

  // Enter parameters
  await tester.enterText(
    find.widgetWithText(TextField, 'Temperature (°C)'),
    '25',
  );
  await tester.enterText(
    find.widgetWithText(TextField, 'pH'),
    '7.0',
  );
  await tester.enterText(
    find.widgetWithText(TextField, 'Ammonia (ppm)'),
    '0',
  );
  await tester.enterText(
    find.widgetWithText(TextField, 'Nitrite (ppm)'),
    '0',
  );
  await tester.enterText(
    find.widgetWithText(TextField, 'Nitrate (ppm)'),
    '10',
  );

  // Save parameters
  await tester.tap(find.text('Save'));
  await tester.pumpAndSettle();

  // Verify parameters displayed
  expect(find.text('25°C'), findsOneWidget);
  expect(find.text('pH: 7.0'), findsOneWidget);
}

Future<void> _addInhabitants(WidgetTester tester) async {
  // Go to inhabitants tab
  await tester.tap(find.text('Inhabitants'));
  await tester.pumpAndSettle();

  // Add inhabitant
  await tester.tap(find.byIcon(Icons.add));
  await tester.pumpAndSettle();

  // Search for species
  await tester.enterText(
    find.widgetWithText(TextField, 'Search species'),
    'Neon Tetra',
  );
  await tester.pumpAndSettle();

  // Select species
  await tester.tap(find.text('Neon Tetra').first);
  await tester.pumpAndSettle();

  // Enter quantity
  await tester.enterText(
    find.widgetWithText(TextField, 'Quantity'),
    '10',
  );

  // Save inhabitant
  await tester.tap(find.text('Add'));
  await tester.pumpAndSettle();

  // Verify inhabitant added
  expect(find.text('Neon Tetra'), findsOneWidget);
  expect(find.text('10'), findsOneWidget);
}

Future<void> _addEquipment(WidgetTester tester) async {
  // Go to equipment tab
  await tester.tap(find.text('Equipment'));
  await tester.pumpAndSettle();

  // Add equipment
  await tester.tap(find.byIcon(Icons.add));
  await tester.pumpAndSettle();

  // Enter equipment details
  await tester.enterText(
    find.widgetWithText(TextField, 'Equipment Name'),
    'Fluval FX6',
  );

  // Select type
  await tester.tap(find.text('Select Type'));
  await tester.pumpAndSettle();
  await tester.tap(find.text('Filter'));
  await tester.pumpAndSettle();

  // Enter brand and model
  await tester.enterText(
    find.widgetWithText(TextField, 'Brand'),
    'Fluval',
  );
  await tester.enterText(
    find.widgetWithText(TextField, 'Model'),
    'FX6',
  );

  // Save equipment
  await tester.tap(find.text('Add Equipment'));
  await tester.pumpAndSettle();

  // Verify equipment added
  expect(find.text('Fluval FX6'), findsOneWidget);
}

Future<void> _verifyAquariumDetails(WidgetTester tester) async {
  // Go back to overview
  await tester.tap(find.text('Overview'));
  await tester.pumpAndSettle();

  // Verify all details are present
  expect(find.text('My Test Tank'), findsOneWidget);
  expect(find.text('200L'), findsOneWidget);
  expect(find.text('Freshwater'), findsOneWidget);
  expect(find.text('1 Species'), findsOneWidget);
  expect(find.text('1 Equipment'), findsOneWidget);
}

Future<void> _performWaterChange(WidgetTester tester) async {
  // Navigate to water changes
  await tester.tap(find.byIcon(Icons.water_drop));
  await tester.pumpAndSettle();

  // Record water change
  await tester.tap(find.byType(FloatingActionButton));
  await tester.pumpAndSettle();

  // Enter volume changed
  await tester.enterText(
    find.widgetWithText(TextField, 'Volume Changed'),
    '50',
  );

  // Save water change
  await tester.tap(find.text('Record'));
  await tester.pumpAndSettle();

  // Verify water change recorded
  expect(find.text('50L'), findsOneWidget);
  expect(find.text('25%'), findsOneWidget);
}

Future<void> _setupFeedingSchedule(WidgetTester tester) async {
  // Navigate back
  await tester.pageBack();
  await tester.pumpAndSettle();

  // Navigate to feeding
  await tester.tap(find.byIcon(Icons.restaurant));
  await tester.pumpAndSettle();

  // Add feeding schedule
  await tester.tap(find.byType(FloatingActionButton));
  await tester.pumpAndSettle();

  // Enter schedule details
  await tester.enterText(
    find.widgetWithText(TextField, 'Schedule Name'),
    'Morning Feed',
  );

  // Set time
  await tester.tap(find.widgetWithText(TextField, 'Time'));
  await tester.pumpAndSettle();
  await tester.tap(find.text('OK'));
  await tester.pumpAndSettle();

  // Select days
  await tester.tap(find.text('Mon'));
  await tester.tap(find.text('Wed'));
  await tester.tap(find.text('Fri'));

  // Save schedule
  await tester.tap(find.text('Save'));
  await tester.pumpAndSettle();

  // Verify schedule created
  expect(find.text('Morning Feed'), findsOneWidget);
  expect(find.text('Mon, Wed, Fri'), findsOneWidget);
}

// Helper extension for common actions
extension on WidgetTester {
  Future<void> pageBack() async {
    final backButton = find.byType(BackButton);
    if (backButton.evaluate().isNotEmpty) {
      await tap(backButton);
      await pumpAndSettle();
    } else {
      // Try iOS-style back gesture
      await drag(find.byType(MaterialApp), const Offset(300, 0));
      await pumpAndSettle();
    }
  }
}