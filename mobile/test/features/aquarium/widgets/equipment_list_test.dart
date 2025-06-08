import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/intl.dart';
import 'package:verpa/features/aquarium/models/aquarium_model.dart';
import 'package:verpa/features/aquarium/widgets/equipment_list.dart';

void main() {
  // Helper function to create a test widget
  Widget createTestWidget(List<Equipment> equipment, {VoidCallback? onAddEquipment}) {
    return MaterialApp(
      home: Scaffold(
        body: EquipmentList(
          equipment: equipment,
          onAddEquipment: onAddEquipment,
        ),
      ),
    );
  }

  // Test data
  final testEquipment = [
    Equipment(
      id: 'eq1',
      name: 'Fluval FX6 Filter',
      type: EquipmentType.filter,
      brand: 'Fluval',
      model: 'FX6',
      purchaseDate: DateTime(2024, 1, 15),
      warrantyExpiry: DateTime(2025, 1, 15),
      notes: 'High-performance canister filter',
      specifications: {
        'flowRate': '2130 L/h',
        'mediaCapacity': '5.9L',
        'power': '41W',
      },
      isActive: true,
    ),
    Equipment(
      id: 'eq2',
      name: 'Eheim Heater',
      type: EquipmentType.heater,
      brand: 'Eheim',
      model: 'Jager 300W',
      purchaseDate: DateTime(2024, 2, 1),
      warrantyExpiry: DateTime(2026, 2, 1),
      notes: 'Reliable heater with automatic shut-off',
      specifications: {
        'wattage': '300W',
        'range': '65-93°F',
      },
      isActive: true,
    ),
    Equipment(
      id: 'eq3',
      name: 'LED Light',
      type: EquipmentType.lighting,
      brand: 'Fluval',
      model: 'Plant 3.0',
      purchaseDate: DateTime(2023, 12, 1),
      warrantyExpiry: DateTime(2024, 12, 1), // Expired warranty
      notes: 'Full spectrum LED for planted tanks',
      specifications: {
        'power': '59W',
        'lumens': '7600',
        'spectrum': 'Full',
      },
      isActive: true,
    ),
    Equipment(
      id: 'eq4',
      name: 'CO2 System',
      type: EquipmentType.co2System,
      brand: 'Aquatek',
      model: 'Premium',
      purchaseDate: DateTime(2024, 3, 1),
      warrantyExpiry: DateTime(2025, 3, 1),
      notes: 'Complete CO2 injection system',
      specifications: {
        'tankSize': '5lb',
        'regulator': 'Dual stage',
      },
      isActive: false, // Inactive equipment
    ),
  ];

  group('EquipmentList Widget', () {
    testWidgets('displays equipment list correctly', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testEquipment));

      // Check title
      expect(find.text('Equipment'), findsOneWidget);

      // Check equipment count
      expect(find.text('${testEquipment.length} items'), findsOneWidget);

      // Check each equipment item is displayed
      expect(find.text('Fluval FX6 Filter'), findsOneWidget);
      expect(find.text('Eheim Heater'), findsOneWidget);
      expect(find.text('LED Light'), findsOneWidget);
      expect(find.text('CO2 System'), findsOneWidget);
    });

    testWidgets('displays empty state when no equipment', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget([]));

      expect(find.text('Equipment'), findsOneWidget);
      expect(find.text('0 items'), findsOneWidget);
      expect(find.text('No equipment added yet'), findsOneWidget);
      expect(find.text('Add your first equipment to track maintenance'), findsOneWidget);
      expect(find.byIcon(Icons.build_outlined), findsOneWidget);
    });

    testWidgets('shows add button when callback provided', (WidgetTester tester) async {
      bool addPressed = false;
      await tester.pumpWidget(createTestWidget(
        testEquipment,
        onAddEquipment: () => addPressed = true,
      ));

      expect(find.byIcon(Icons.add), findsOneWidget);
      
      await tester.tap(find.byIcon(Icons.add));
      await tester.pump();
      
      expect(addPressed, isTrue);
    });

    testWidgets('hides add button when no callback provided', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testEquipment));

      expect(find.byIcon(Icons.add), findsNothing);
    });

    testWidgets('displays correct equipment type icons', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testEquipment));

      // Filter icon
      expect(find.byIcon(Icons.filter_alt), findsOneWidget);
      // Heater icon
      expect(find.byIcon(Icons.thermostat), findsOneWidget);
      // Lighting icon
      expect(find.byIcon(Icons.lightbulb), findsOneWidget);
      // CO2 System icon
      expect(find.byIcon(Icons.air), findsOneWidget);
    });

    testWidgets('shows brand and model information', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testEquipment));

      expect(find.text('Fluval FX6'), findsOneWidget);
      expect(find.text('Eheim Jager 300W'), findsOneWidget);
      expect(find.text('Fluval Plant 3.0'), findsOneWidget);
      expect(find.text('Aquatek Premium'), findsOneWidget);
    });

    testWidgets('displays warranty status correctly', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testEquipment));

      // Active warranties
      expect(find.text('Warranty until Jan 15, 2025'), findsOneWidget);
      expect(find.text('Warranty until Feb 1, 2026'), findsOneWidget);
      expect(find.text('Warranty until Mar 1, 2025'), findsOneWidget);

      // Expired warranty
      expect(find.text('Warranty expired'), findsOneWidget);
      expect(find.byIcon(Icons.warning_amber_rounded), findsOneWidget);
    });

    testWidgets('shows inactive equipment badge', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testEquipment));

      // Find the inactive badge
      expect(find.text('Inactive'), findsOneWidget);
      
      // Check the badge is styled correctly
      final container = tester.widget<Container>(
        find.ancestor(
          of: find.text('Inactive'),
          matching: find.byType(Container),
        ).first,
      );
      expect(container.decoration, isNotNull);
    });

    testWidgets('handles tap on equipment item', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testEquipment));

      // Tap on first equipment item
      await tester.tap(find.text('Fluval FX6 Filter'));
      await tester.pump();

      // No crash should occur (navigation would be handled by parent)
      expect(find.text('Fluval FX6 Filter'), findsOneWidget);
    });

    testWidgets('displays equipment without warranty correctly', (WidgetTester tester) async {
      final equipmentWithoutWarranty = [
        Equipment(
          id: 'eq5',
          name: 'Basic Pump',
          type: EquipmentType.pump,
          brand: 'Generic',
          model: 'GP-100',
          purchaseDate: DateTime(2024, 1, 1),
          warrantyExpiry: null, // No warranty
          isActive: true,
        ),
      ];

      await tester.pumpWidget(createTestWidget(equipmentWithoutWarranty));

      expect(find.text('Basic Pump'), findsOneWidget);
      expect(find.text('Generic GP-100'), findsOneWidget);
      // Should not show warranty text
      expect(find.textContaining('Warranty'), findsNothing);
    });

    testWidgets('handles equipment without brand/model', (WidgetTester tester) async {
      final minimalEquipment = [
        Equipment(
          id: 'eq6',
          name: 'Custom Filter',
          type: EquipmentType.filter,
          brand: null,
          model: null,
          purchaseDate: DateTime.now(),
          isActive: true,
        ),
      ];

      await tester.pumpWidget(createTestWidget(minimalEquipment));

      expect(find.text('Custom Filter'), findsOneWidget);
      // Should not crash when brand/model are null
      expect(find.byType(EquipmentList), findsOneWidget);
    });

    testWidgets('scrolls when equipment list is long', (WidgetTester tester) async {
      // Create a long list of equipment
      final longEquipmentList = List.generate(
        20,
        (index) => Equipment(
          id: 'eq$index',
          name: 'Equipment $index',
          type: EquipmentType.values[index % EquipmentType.values.length],
          brand: 'Brand $index',
          model: 'Model $index',
          purchaseDate: DateTime.now(),
          isActive: true,
        ),
      );

      await tester.pumpWidget(createTestWidget(longEquipmentList));

      // Check first item is visible
      expect(find.text('Equipment 0'), findsOneWidget);

      // Scroll to bottom
      await tester.drag(find.byType(ListView), const Offset(0, -500));
      await tester.pump();

      // Later items should now be visible
      expect(find.text('Equipment 0'), findsNothing);
    });

    testWidgets('displays all equipment types correctly', (WidgetTester tester) async {
      final allTypesEquipment = EquipmentType.values.map((type) {
        return Equipment(
          id: type.toString(),
          name: '${type.name} Equipment',
          type: type,
          brand: 'Test Brand',
          model: 'Test Model',
          purchaseDate: DateTime.now(),
          isActive: true,
        );
      }).toList();

      await tester.pumpWidget(createTestWidget(allTypesEquipment));

      // Check all equipment types are displayed
      for (final equipment in allTypesEquipment) {
        expect(find.text(equipment.name), findsOneWidget);
      }

      // Check specific icons for each type
      expect(find.byIcon(Icons.filter_alt), findsOneWidget); // filter
      expect(find.byIcon(Icons.thermostat), findsOneWidget); // heater
      expect(find.byIcon(Icons.lightbulb), findsOneWidget); // lighting
      expect(find.byIcon(Icons.air), findsOneWidget); // pump
      expect(find.byIcon(Icons.waves), findsOneWidget); // wavemaker
      expect(find.byIcon(Icons.cleaning_services), findsOneWidget); // skimmer
      expect(find.byIcon(Icons.air), findsOneWidget); // co2System
      expect(find.byIcon(Icons.thermostat_auto), findsOneWidget); // chiller
      expect(find.byIcon(Icons.straighten), findsOneWidget); // doser
      expect(find.byIcon(Icons.build), findsAtLeastNWidgets(1)); // other
    });

    testWidgets('card styling is correct', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testEquipment));

      // Find all cards
      final cards = find.byType(Card);
      expect(cards, findsNWidgets(testEquipment.length + 1)); // +1 for main card

      // Check card properties
      final firstEquipmentCard = tester.widget<Card>(cards.at(1));
      expect(firstEquipmentCard.elevation, isNull); // Uses default
      expect(firstEquipmentCard.margin, isNull); // Uses default
    });

    testWidgets('handles very long equipment names', (WidgetTester tester) async {
      final longNameEquipment = [
        Equipment(
          id: 'eq_long',
          name: 'This is a very long equipment name that should be handled properly without overflow',
          type: EquipmentType.filter,
          brand: 'Very Long Brand Name That Goes On',
          model: 'Super Long Model Name With Many Characters',
          purchaseDate: DateTime.now(),
          isActive: true,
        ),
      ];

      await tester.pumpWidget(createTestWidget(longNameEquipment));

      // Should render without overflow errors
      expect(find.byType(EquipmentList), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('respects theme colors', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(
            primarySwatch: Colors.purple,
            cardTheme: const CardTheme(
              color: Colors.grey,
            ),
          ),
          home: Scaffold(
            body: EquipmentList(
              equipment: testEquipment,
            ),
          ),
        ),
      );

      // Icons should use theme colors
      final icon = tester.widget<Icon>(find.byIcon(Icons.filter_alt));
      expect(icon.color, isNotNull);
    });
  });
}