import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/intl.dart';
import 'package:verpa/features/aquarium/models/aquarium_model.dart';
import 'package:verpa/features/aquarium/widgets/aquarium_info_card.dart';

void main() {
  // Helper function to create a test widget
  Widget createTestWidget(Aquarium aquarium) {
    return MaterialApp(
      home: Scaffold(
        body: AquariumInfoCard(aquarium: aquarium),
      ),
    );
  }

  // Test data
  final testAquarium = Aquarium(
    id: 'aquarium1',
    name: 'Test Tank',
    type: AquariumType.freshwater,
    volume: 100,
    volumeUnit: VolumeUnit.liters,
    dimensions: const Dimensions(
      length: 100,
      width: 40,
      height: 50,
    ),
    waterType: WaterType.freshwater,
    description: 'A beautiful community tank',
    location: 'Living Room',
    equipment: [],
    inhabitants: [],
    waterParameters: [],
    healthScore: 85,
    isActive: true,
    createdAt: DateTime(2024, 1, 15),
    updatedAt: DateTime(2024, 1, 15),
  );

  group('AquariumInfoCard Widget', () {
    testWidgets('displays aquarium information correctly', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testAquarium));

      // Check title
      expect(find.text('Aquarium Information'), findsOneWidget);

      // Check basic info
      expect(find.text('Type'), findsOneWidget);
      expect(find.text('Freshwater'), findsOneWidget);
      
      expect(find.text('Water Type'), findsOneWidget);
      expect(find.text('Freshwater'), findsOneWidget);
      
      expect(find.text('Volume'), findsOneWidget);
      expect(find.text('100 liters'), findsOneWidget);
      
      expect(find.text('Dimensions'), findsOneWidget);
      expect(find.text('100" × 40" × 50" cm'), findsOneWidget);
    });

    testWidgets('displays location when provided', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testAquarium));

      expect(find.text('Location'), findsOneWidget);
      expect(find.text('Living Room'), findsOneWidget);
    });

    testWidgets('does not display location when null', (WidgetTester tester) async {
      final aquariumWithoutLocation = testAquarium.copyWith(location: null);
      await tester.pumpWidget(createTestWidget(aquariumWithoutLocation));

      expect(find.text('Location'), findsNothing);
    });

    testWidgets('displays creation date correctly', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testAquarium));

      expect(find.text('Created'), findsOneWidget);
      expect(
        find.text(DateFormat('MMM d, yyyy').format(testAquarium.createdAt)),
        findsOneWidget,
      );
    });

    testWidgets('displays description when provided', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testAquarium));

      expect(find.text('Description'), findsOneWidget);
      expect(find.text('A beautiful community tank'), findsOneWidget);
    });

    testWidgets('does not display description section when null', (WidgetTester tester) async {
      final aquariumWithoutDescription = testAquarium.copyWith(description: null);
      await tester.pumpWidget(createTestWidget(aquariumWithoutDescription));

      expect(find.text('Description'), findsNothing);
      expect(find.byType(Divider), findsNothing);
    });

    testWidgets('displays correct icons for each info row', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testAquarium));

      expect(find.byIcon(Icons.category), findsOneWidget);
      expect(find.byIcon(Icons.water), findsOneWidget);
      expect(find.byIcon(Icons.straighten), findsOneWidget);
      expect(find.byIcon(Icons.aspect_ratio), findsOneWidget);
      expect(find.byIcon(Icons.location_on), findsOneWidget);
      expect(find.byIcon(Icons.calendar_today), findsOneWidget);
    });

    testWidgets('handles different aquarium types correctly', (WidgetTester tester) async {
      // Test saltwater aquarium
      final saltwaterAquarium = testAquarium.copyWith(
        type: AquariumType.saltwater,
        waterType: WaterType.saltwater,
      );
      await tester.pumpWidget(createTestWidget(saltwaterAquarium));
      expect(find.text('Saltwater'), findsNWidgets(2)); // Type and Water Type

      await tester.pumpWidget(Container()); // Clear widget tree

      // Test planted aquarium
      final plantedAquarium = testAquarium.copyWith(
        type: AquariumType.planted,
      );
      await tester.pumpWidget(createTestWidget(plantedAquarium));
      expect(find.text('Planted'), findsOneWidget);

      await tester.pumpWidget(Container()); // Clear widget tree

      // Test reef aquarium
      final reefAquarium = testAquarium.copyWith(
        type: AquariumType.reef,
      );
      await tester.pumpWidget(createTestWidget(reefAquarium));
      expect(find.text('Reef'), findsOneWidget);
    });

    testWidgets('handles different volume units correctly', (WidgetTester tester) async {
      // Test gallons
      final gallonAquarium = testAquarium.copyWith(
        volume: 50,
        volumeUnit: VolumeUnit.gallons,
      );
      await tester.pumpWidget(createTestWidget(gallonAquarium));
      expect(find.text('50 gallons'), findsOneWidget);

      await tester.pumpWidget(Container()); // Clear widget tree

      // Test UK gallons
      final ukGallonAquarium = testAquarium.copyWith(
        volume: 40,
        volumeUnit: VolumeUnit.ukGallons,
      );
      await tester.pumpWidget(createTestWidget(ukGallonAquarium));
      expect(find.text('40 uk gallons'), findsOneWidget);
    });

    testWidgets('handles different water types correctly', (WidgetTester tester) async {
      // Test brackish water
      final brackishAquarium = testAquarium.copyWith(
        waterType: WaterType.brackish,
      );
      await tester.pumpWidget(createTestWidget(brackishAquarium));
      expect(find.text('Brackish'), findsOneWidget);
    });

    testWidgets('formats dimensions with different units', (WidgetTester tester) async {
      // Test inches
      final inchAquarium = testAquarium.copyWith(
        dimensions: const Dimensions(
          length: 40,
          width: 16,
          height: 20,
          unit: DimensionUnit.inches,
        ),
      );
      await tester.pumpWidget(createTestWidget(inchAquarium));
      expect(find.text('40" × 16" × 20" inches'), findsOneWidget);
    });

    testWidgets('layout is responsive and scrollable', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testAquarium));

      // Check that the card exists
      expect(find.byType(Card), findsOneWidget);

      // Check padding
      final padding = tester.widget<Padding>(
        find.descendant(
          of: find.byType(Card),
          matching: find.byType(Padding),
        ).first,
      );
      expect(padding.padding, const EdgeInsets.all(16));

      // Check column layout
      expect(find.byType(Column), findsWidgets);
    });

    testWidgets('text styles are applied correctly', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testAquarium));

      // Check title style
      final titleText = tester.widget<Text>(find.text('Aquarium Information'));
      expect(titleText.style?.fontWeight, FontWeight.bold);

      // Check description title style
      final descriptionTitle = tester.widget<Text>(find.text('Description'));
      expect(descriptionTitle.style?.fontWeight, FontWeight.w600);
    });

    testWidgets('info rows have correct structure', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testAquarium));

      // Find all rows with icons
      final iconRows = find.descendant(
        of: find.byType(Card),
        matching: find.byType(Row),
      );

      // Should have multiple rows (one for each info item)
      expect(iconRows, findsWidgets);
    });

    testWidgets('handles edge cases gracefully', (WidgetTester tester) async {
      // Test with minimal data
      final minimalAquarium = Aquarium(
        id: 'min1',
        name: 'Minimal Tank',
        type: AquariumType.freshwater,
        volume: 0,
        volumeUnit: VolumeUnit.liters,
        dimensions: const Dimensions(length: 0, width: 0, height: 0),
        waterType: WaterType.freshwater,
        equipment: [],
        inhabitants: [],
        waterParameters: [],
        healthScore: 0,
        isActive: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      await tester.pumpWidget(createTestWidget(minimalAquarium));

      // Should still render without errors
      expect(find.byType(AquariumInfoCard), findsOneWidget);
      expect(find.text('0 liters'), findsOneWidget);
    });

    testWidgets('handles very long text gracefully', (WidgetTester tester) async {
      final longTextAquarium = testAquarium.copyWith(
        description: 'This is a very long description that might wrap to multiple lines. ' * 10,
        location: 'A very long location name that should be handled properly',
      );

      await tester.pumpWidget(createTestWidget(longTextAquarium));

      // Should render without overflow
      expect(find.byType(AquariumInfoCard), findsOneWidget);
      
      // The text should be present (even if wrapped)
      expect(
        find.textContaining('This is a very long description'),
        findsOneWidget,
      );
    });

    testWidgets('respects theme colors', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(
            primarySwatch: Colors.red,
            cardTheme: const CardTheme(
              color: Colors.yellow,
            ),
          ),
          home: Scaffold(
            body: AquariumInfoCard(aquarium: testAquarium),
          ),
        ),
      );

      // Card should use theme color
      final card = tester.widget<Card>(find.byType(Card));
      expect(card.color, null); // Uses theme default

      // Icons should use primary color
      final icon = tester.widget<Icon>(find.byIcon(Icons.category));
      expect(icon.color, isNotNull);
    });
  });
}