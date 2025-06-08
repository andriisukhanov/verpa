import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/intl.dart';
import 'package:verpa/features/aquarium/models/aquarium_model.dart';
import 'package:verpa/features/aquarium/widgets/parameter_display.dart';

void main() {
  // Helper function to create a test widget
  Widget createTestWidget(WaterParameters parameters, {bool showTimestamp = true}) {
    return MaterialApp(
      home: Scaffold(
        body: ParameterDisplay(
          parameters: parameters,
          showTimestamp: showTimestamp,
        ),
      ),
    );
  }

  // Test data
  final normalParameters = WaterParameters(
    temperature: 78.0,
    ph: 7.2,
    ammonia: 0.0,
    nitrite: 0.0,
    nitrate: 10.0,
    recordedAt: DateTime(2024, 6, 1, 14, 30),
  );

  final criticalParameters = WaterParameters(
    temperature: 85.0, // Too high
    ph: 8.5, // Too high
    ammonia: 0.5, // Critical - should be 0
    nitrite: 0.25, // Critical - should be 0
    nitrate: 50.0, // Warning - too high
    recordedAt: DateTime.now(),
  );

  final completeParameters = WaterParameters(
    temperature: 78.0,
    ph: 7.2,
    ammonia: 0.0,
    nitrite: 0.0,
    nitrate: 10.0,
    salinity: 35.0,
    kh: 8.0,
    gh: 10.0,
    phosphate: 0.05,
    calcium: 420.0,
    magnesium: 1350.0,
    alkalinity: 8.5,
    notes: 'All parameters are within acceptable ranges.',
    recordedAt: DateTime.now(),
  );

  group('ParameterDisplay Widget', () {
    testWidgets('displays normal parameters correctly', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(normalParameters));

      // Check title
      expect(find.text('Water Parameters'), findsOneWidget);

      // Check timestamp
      expect(
        find.text(DateFormat('MMM d, h:mm a').format(normalParameters.recordedAt)),
        findsOneWidget,
      );

      // Check primary parameters
      expect(find.text('Primary Parameters'), findsOneWidget);
      expect(find.text('Temperature'), findsOneWidget);
      expect(find.text('78.0 °F'), findsOneWidget);
      expect(find.text('pH'), findsOneWidget);
      expect(find.text('7.2'), findsOneWidget);
      expect(find.text('Ammonia'), findsOneWidget);
      expect(find.text('0.0 ppm'), findsOneWidget);
      expect(find.text('Nitrite'), findsOneWidget);
      expect(find.text('0.0 ppm'), findsOneWidget);
      expect(find.text('Nitrate'), findsOneWidget);
      expect(find.text('10.0 ppm'), findsOneWidget);
    });

    testWidgets('hides timestamp when showTimestamp is false', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(normalParameters, showTimestamp: false));

      // Title should still be there but no timestamp
      expect(find.text('Water Parameters'), findsNothing);
      expect(
        find.text(DateFormat('MMM d, h:mm a').format(normalParameters.recordedAt)),
        findsNothing,
      );
    });

    testWidgets('displays warning icons for out-of-range values', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(criticalParameters));

      // Should show error icons for critical parameters
      expect(find.byIcon(Icons.error), findsNWidgets(2)); // Ammonia and Nitrite
      
      // Should show warning icons for warning parameters
      expect(find.byIcon(Icons.warning), findsNWidgets(3)); // Temperature, pH, and Nitrate
    });

    testWidgets('displays critical parameters in error color', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(criticalParameters));

      // Find ammonia value text
      final ammoniaText = tester.widget<Text>(find.text('0.5 ppm'));
      expect(ammoniaText.style?.color, isNotNull);
      
      // Find nitrite value text
      final nitriteText = tester.widget<Text>(find.text('0.25 ppm'));
      expect(nitriteText.style?.color, isNotNull);
    });

    testWidgets('displays ideal range tooltips', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(normalParameters));

      // Check for info icons
      expect(find.byIcon(Icons.info_outline), findsNWidgets(5)); // All primary parameters have ideal ranges

      // Verify tooltip content
      final tooltips = tester.widgetList<Tooltip>(find.byType(Tooltip));
      expect(tooltips.any((t) => t.message == 'Ideal: 75-80'), isTrue);
      expect(tooltips.any((t) => t.message == 'Ideal: 6.8-7.5'), isTrue);
      expect(tooltips.any((t) => t.message == 'Ideal: 0'), isTrue);
      expect(tooltips.any((t) => t.message == 'Ideal: <20'), isTrue);
    });

    testWidgets('displays additional parameters section when present', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(completeParameters));

      // Check section title
      expect(find.text('Additional Parameters'), findsOneWidget);

      // Check additional parameters
      expect(find.text('Salinity'), findsOneWidget);
      expect(find.text('35.0 ppt'), findsOneWidget);
      expect(find.text('KH'), findsOneWidget);
      expect(find.text('8.0 dKH'), findsOneWidget);
      expect(find.text('GH'), findsOneWidget);
      expect(find.text('10.0 dGH'), findsOneWidget);
      expect(find.text('Phosphate'), findsOneWidget);
      expect(find.text('0.05 ppm'), findsOneWidget);
      expect(find.text('Calcium'), findsOneWidget);
      expect(find.text('420.0 ppm'), findsOneWidget);
      expect(find.text('Magnesium'), findsOneWidget);
      expect(find.text('1350.0 ppm'), findsOneWidget);
      expect(find.text('Alkalinity'), findsOneWidget);
      expect(find.text('8.5 dKH'), findsOneWidget);
    });

    testWidgets('hides additional parameters section when empty', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(normalParameters));

      // Should not show additional parameters section
      expect(find.text('Additional Parameters'), findsNothing);
    });

    testWidgets('displays notes when present', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(completeParameters));

      // Check notes section
      expect(find.text('Notes'), findsOneWidget);
      expect(find.text('All parameters are within acceptable ranges.'), findsOneWidget);
      expect(find.byType(Divider), findsOneWidget);
    });

    testWidgets('hides notes section when empty', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(normalParameters));

      // Should not show notes section
      expect(find.text('Notes'), findsNothing);
      expect(find.byType(Divider), findsNothing);
    });

    testWidgets('handles null parameter values gracefully', (WidgetTester tester) async {
      final partialParameters = WaterParameters(
        temperature: 78.0,
        ph: null, // Null pH
        ammonia: 0.0,
        nitrite: null, // Null nitrite
        nitrate: 10.0,
        recordedAt: DateTime.now(),
      );

      await tester.pumpWidget(createTestWidget(partialParameters));

      // Should display non-null values
      expect(find.text('78.0 °F'), findsOneWidget);
      expect(find.text('0.0 ppm'), findsOneWidget); // Ammonia
      expect(find.text('10.0 ppm'), findsOneWidget); // Nitrate

      // Should not display null values
      expect(find.textContaining('pH'), findsOneWidget); // Label exists
      expect(find.text('null'), findsNothing); // But no null value shown
    });

    testWidgets('warning thresholds work correctly', (WidgetTester tester) async {
      // Test temperature thresholds
      final lowTempParams = WaterParameters(
        temperature: 70.0, // Below 72
        recordedAt: DateTime.now(),
      );
      await tester.pumpWidget(createTestWidget(lowTempParams));
      expect(find.byIcon(Icons.warning), findsOneWidget);

      await tester.pumpWidget(Container()); // Clear

      // Test pH thresholds
      final lowPhParams = WaterParameters(
        ph: 6.0, // Below 6.5
        recordedAt: DateTime.now(),
      );
      await tester.pumpWidget(createTestWidget(lowPhParams));
      expect(find.byIcon(Icons.warning), findsOneWidget);

      await tester.pumpWidget(Container()); // Clear

      // Test nitrate threshold
      final highNitrateParams = WaterParameters(
        nitrate: 45.0, // Above 40
        recordedAt: DateTime.now(),
      );
      await tester.pumpWidget(createTestWidget(highNitrateParams));
      expect(find.byIcon(Icons.warning), findsOneWidget);
    });

    testWidgets('critical thresholds work correctly', (WidgetTester tester) async {
      // Test ammonia threshold
      final ammoniaParams = WaterParameters(
        ammonia: 0.1, // Any value above 0 is critical
        recordedAt: DateTime.now(),
      );
      await tester.pumpWidget(createTestWidget(ammoniaParams));
      expect(find.byIcon(Icons.error), findsOneWidget);

      await tester.pumpWidget(Container()); // Clear

      // Test nitrite threshold
      final nitriteParams = WaterParameters(
        nitrite: 0.05, // Any value above 0 is critical
        recordedAt: DateTime.now(),
      );
      await tester.pumpWidget(createTestWidget(nitriteParams));
      expect(find.byIcon(Icons.error), findsOneWidget);
    });

    testWidgets('layout is correct with card and padding', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(normalParameters));

      // Check card exists
      expect(find.byType(Card), findsOneWidget);

      // Check padding
      final padding = tester.widget<Padding>(
        find.descendant(
          of: find.byType(Card),
          matching: find.byType(Padding),
        ).first,
      );
      expect(padding.padding, const EdgeInsets.all(16));
    });

    testWidgets('parameter rows have correct structure', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(normalParameters));

      // Find parameter rows
      final rows = find.descendant(
        of: find.byType(Card),
        matching: find.byType(Row),
      );

      // Should have multiple rows
      expect(rows, findsWidgets);
    });

    testWidgets('handles edge cases with empty notes', (WidgetTester tester) async {
      final paramsWithEmptyNotes = WaterParameters(
        temperature: 78.0,
        notes: '', // Empty string
        recordedAt: DateTime.now(),
      );

      await tester.pumpWidget(createTestWidget(paramsWithEmptyNotes));

      // Should not show notes section for empty string
      expect(find.text('Notes'), findsNothing);
    });

    testWidgets('displays values with correct formatting', (WidgetTester tester) async {
      final preciseParams = WaterParameters(
        temperature: 78.567,
        ph: 7.234,
        ammonia: 0.012,
        recordedAt: DateTime.now(),
      );

      await tester.pumpWidget(createTestWidget(preciseParams));

      // Values should be displayed as provided (no rounding in widget)
      expect(find.text('78.567 °F'), findsOneWidget);
      expect(find.text('7.234'), findsOneWidget);
      expect(find.text('0.012 ppm'), findsOneWidget);
    });

    testWidgets('parameter items without units display correctly', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(normalParameters));

      // pH has no unit
      expect(find.text('7.2'), findsOneWidget); // No unit suffix
      expect(find.text('7.2 '), findsNothing); // No trailing space
    });
  });
}