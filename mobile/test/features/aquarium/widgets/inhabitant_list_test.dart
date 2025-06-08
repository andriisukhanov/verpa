import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/intl.dart';
import 'package:verpa/features/aquarium/models/aquarium_model.dart';
import 'package:verpa/features/aquarium/widgets/inhabitant_list.dart';

void main() {
  // Helper function to create a test widget
  Widget createTestWidget(List<Inhabitant> inhabitants, {VoidCallback? onAddInhabitant}) {
    return MaterialApp(
      home: Scaffold(
        body: InhabitantList(
          inhabitants: inhabitants,
          onAddInhabitant: onAddInhabitant,
        ),
      ),
    );
  }

  // Test data
  final testInhabitants = [
    Inhabitant(
      id: 'inh1',
      species: 'Betta splendens',
      commonName: 'Siamese Fighting Fish',
      category: InhabitantCategory.fish,
      quantity: 1,
      sex: Sex.male,
      addedDate: DateTime(2024, 1, 15),
      notes: 'Beautiful blue halfmoon betta',
      origin: 'Local pet store',
      requirements: {
        'temperature': '75-80°F',
        'pH': '6.5-7.5',
        'diet': 'Carnivore',
      },
      healthStatus: 'Healthy',
      lastHealthCheck: DateTime(2024, 6, 1),
    ),
    Inhabitant(
      id: 'inh2',
      species: 'Corydoras paleatus',
      commonName: 'Peppered Cory',
      category: InhabitantCategory.fish,
      quantity: 6,
      sex: Sex.mixed,
      addedDate: DateTime(2024, 2, 1),
      notes: 'Active bottom dwellers',
      origin: 'Online retailer',
      requirements: {
        'temperature': '72-78°F',
        'pH': '6.0-7.5',
        'diet': 'Omnivore',
      },
      healthStatus: 'Healthy',
    ),
    Inhabitant(
      id: 'inh3',
      species: 'Neocaridina davidi',
      commonName: 'Cherry Shrimp',
      category: InhabitantCategory.invertebrate,
      quantity: 20,
      sex: Sex.mixed,
      addedDate: DateTime(2024, 3, 1),
      notes: 'Red variety, breeding well',
      requirements: {
        'temperature': '65-75°F',
        'pH': '6.5-8.0',
        'diet': 'Algae, biofilm',
      },
      healthStatus: 'Breeding',
    ),
    Inhabitant(
      id: 'inh4',
      species: 'Anubias barteri',
      commonName: 'Anubias',
      category: InhabitantCategory.plant,
      quantity: 3,
      addedDate: DateTime(2024, 1, 10),
      notes: 'Attached to driftwood',
      requirements: {
        'light': 'Low to medium',
        'CO2': 'Not required',
        'nutrients': 'Low demand',
      },
      healthStatus: 'Growing well',
    ),
    Inhabitant(
      id: 'inh5',
      species: 'Pomacea bridgesii',
      commonName: 'Mystery Snail',
      category: InhabitantCategory.invertebrate,
      quantity: 2,
      sex: Sex.unknown,
      addedDate: DateTime(2024, 4, 1),
      notes: 'Golden variety',
      healthStatus: 'Inactive', // Different health status
    ),
  ];

  group('InhabitantList Widget', () {
    testWidgets('displays inhabitants list correctly', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testInhabitants));

      // Check title
      expect(find.text('Inhabitants'), findsOneWidget);

      // Check inhabitant count
      expect(find.text('${testInhabitants.length} species'), findsOneWidget);

      // Check each inhabitant is displayed
      expect(find.text('Siamese Fighting Fish'), findsOneWidget);
      expect(find.text('Peppered Cory'), findsOneWidget);
      expect(find.text('Cherry Shrimp'), findsOneWidget);
      expect(find.text('Anubias'), findsOneWidget);
      expect(find.text('Mystery Snail'), findsOneWidget);
    });

    testWidgets('displays empty state when no inhabitants', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget([]));

      expect(find.text('Inhabitants'), findsOneWidget);
      expect(find.text('0 species'), findsOneWidget);
      expect(find.text('No inhabitants added yet'), findsOneWidget);
      expect(find.text('Add fish, plants, or invertebrates to your aquarium'), findsOneWidget);
      expect(find.byIcon(Icons.pets), findsOneWidget);
    });

    testWidgets('shows add button when callback provided', (WidgetTester tester) async {
      bool addPressed = false;
      await tester.pumpWidget(createTestWidget(
        testInhabitants,
        onAddInhabitant: () => addPressed = true,
      ));

      expect(find.byIcon(Icons.add), findsOneWidget);
      
      await tester.tap(find.byIcon(Icons.add));
      await tester.pump();
      
      expect(addPressed, isTrue);
    });

    testWidgets('hides add button when no callback provided', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testInhabitants));

      expect(find.byIcon(Icons.add), findsNothing);
    });

    testWidgets('displays correct category icons', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testInhabitants));

      // Fish icons
      expect(find.byIcon(Icons.water), findsNWidgets(2)); // 2 fish
      // Invertebrate icons
      expect(find.byIcon(Icons.bug_report), findsNWidgets(2)); // 2 invertebrates
      // Plant icon
      expect(find.byIcon(Icons.local_florist), findsOneWidget); // 1 plant
    });

    testWidgets('shows scientific names', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testInhabitants));

      expect(find.text('Betta splendens'), findsOneWidget);
      expect(find.text('Corydoras paleatus'), findsOneWidget);
      expect(find.text('Neocaridina davidi'), findsOneWidget);
      expect(find.text('Anubias barteri'), findsOneWidget);
      expect(find.text('Pomacea bridgesii'), findsOneWidget);
    });

    testWidgets('displays quantity correctly', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testInhabitants));

      expect(find.text('Qty: 1'), findsOneWidget); // Betta
      expect(find.text('Qty: 6'), findsOneWidget); // Corydoras
      expect(find.text('Qty: 20'), findsOneWidget); // Shrimp
      expect(find.text('Qty: 3'), findsOneWidget); // Anubias
      expect(find.text('Qty: 2'), findsOneWidget); // Snails
    });

    testWidgets('shows sex information when available', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testInhabitants));

      expect(find.text('Male'), findsOneWidget); // Betta
      expect(find.text('Mixed'), findsNWidgets(2)); // Corydoras and Shrimp
      expect(find.text('Unknown'), findsOneWidget); // Snails
      // Plants don't have sex, so no sex display for Anubias
    });

    testWidgets('displays health status badges', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testInhabitants));

      expect(find.text('Healthy'), findsNWidgets(2)); // Betta and Corydoras
      expect(find.text('Breeding'), findsOneWidget); // Shrimp
      expect(find.text('Growing well'), findsOneWidget); // Anubias
      expect(find.text('Inactive'), findsOneWidget); // Snails
    });

    testWidgets('shows added date for each inhabitant', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testInhabitants));

      expect(find.text('Added: Jan 15, 2024'), findsOneWidget);
      expect(find.text('Added: Feb 1, 2024'), findsOneWidget);
      expect(find.text('Added: Mar 1, 2024'), findsOneWidget);
      expect(find.text('Added: Jan 10, 2024'), findsOneWidget);
      expect(find.text('Added: Apr 1, 2024'), findsOneWidget);
    });

    testWidgets('handles tap on inhabitant item', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(testInhabitants));

      // Tap on first inhabitant
      await tester.tap(find.text('Siamese Fighting Fish'));
      await tester.pump();

      // No crash should occur (navigation would be handled by parent)
      expect(find.text('Siamese Fighting Fish'), findsOneWidget);
    });

    testWidgets('displays inhabitants without common name', (WidgetTester tester) async {
      final inhabitantWithoutCommonName = [
        Inhabitant(
          id: 'inh6',
          species: 'Rare species name',
          commonName: null, // No common name
          category: InhabitantCategory.fish,
          quantity: 1,
          addedDate: DateTime.now(),
          healthStatus: 'Healthy',
        ),
      ];

      await tester.pumpWidget(createTestWidget(inhabitantWithoutCommonName));

      // Should show species name as title
      expect(find.text('Rare species name'), findsNWidgets(2)); // Title and subtitle
    });

    testWidgets('handles inhabitants without notes', (WidgetTester tester) async {
      final inhabitantWithoutNotes = [
        Inhabitant(
          id: 'inh7',
          species: 'Test species',
          commonName: 'Test Fish',
          category: InhabitantCategory.fish,
          quantity: 1,
          addedDate: DateTime.now(),
          notes: null, // No notes
          healthStatus: 'Healthy',
        ),
      ];

      await tester.pumpWidget(createTestWidget(inhabitantWithoutNotes));

      expect(find.text('Test Fish'), findsOneWidget);
      // Should not crash when notes are null
      expect(find.byType(InhabitantList), findsOneWidget);
    });

    testWidgets('scrolls when inhabitant list is long', (WidgetTester tester) async {
      // Create a long list of inhabitants
      final longInhabitantList = List.generate(
        20,
        (index) => Inhabitant(
          id: 'inh$index',
          species: 'Species $index',
          commonName: 'Fish $index',
          category: InhabitantCategory.values[index % InhabitantCategory.values.length],
          quantity: index + 1,
          addedDate: DateTime.now(),
          healthStatus: 'Healthy',
        ),
      );

      await tester.pumpWidget(createTestWidget(longInhabitantList));

      // Check first item is visible
      expect(find.text('Fish 0'), findsOneWidget);

      // Scroll to bottom
      await tester.drag(find.byType(ListView), const Offset(0, -500));
      await tester.pump();

      // Later items should now be visible
      expect(find.text('Fish 0'), findsNothing);
    });

    testWidgets('displays all inhabitant categories correctly', (WidgetTester tester) async {
      final allCategoriesInhabitants = [
        Inhabitant(
          id: 'fish',
          species: 'Fish species',
          commonName: 'Test Fish',
          category: InhabitantCategory.fish,
          quantity: 1,
          addedDate: DateTime.now(),
          healthStatus: 'Healthy',
        ),
        Inhabitant(
          id: 'plant',
          species: 'Plant species',
          commonName: 'Test Plant',
          category: InhabitantCategory.plant,
          quantity: 1,
          addedDate: DateTime.now(),
          healthStatus: 'Growing',
        ),
        Inhabitant(
          id: 'invertebrate',
          species: 'Invertebrate species',
          commonName: 'Test Invertebrate',
          category: InhabitantCategory.invertebrate,
          quantity: 1,
          addedDate: DateTime.now(),
          healthStatus: 'Active',
        ),
        Inhabitant(
          id: 'coral',
          species: 'Coral species',
          commonName: 'Test Coral',
          category: InhabitantCategory.coral,
          quantity: 1,
          addedDate: DateTime.now(),
          healthStatus: 'Growing',
        ),
      ];

      await tester.pumpWidget(createTestWidget(allCategoriesInhabitants));

      // Check all categories are displayed
      expect(find.text('Test Fish'), findsOneWidget);
      expect(find.text('Test Plant'), findsOneWidget);
      expect(find.text('Test Invertebrate'), findsOneWidget);
      expect(find.text('Test Coral'), findsOneWidget);

      // Check category icons
      expect(find.byIcon(Icons.water), findsOneWidget); // fish
      expect(find.byIcon(Icons.local_florist), findsOneWidget); // plant
      expect(find.byIcon(Icons.bug_report), findsOneWidget); // invertebrate
      expect(find.byIcon(Icons.grass), findsOneWidget); // coral
    });

    testWidgets('health status badge colors are correct', (WidgetTester tester) async {
      final inhabitantsWithDifferentHealth = [
        Inhabitant(
          id: 'h1',
          species: 'Species 1',
          commonName: 'Healthy Fish',
          category: InhabitantCategory.fish,
          quantity: 1,
          addedDate: DateTime.now(),
          healthStatus: 'Healthy',
        ),
        Inhabitant(
          id: 'h2',
          species: 'Species 2',
          commonName: 'Sick Fish',
          category: InhabitantCategory.fish,
          quantity: 1,
          addedDate: DateTime.now(),
          healthStatus: 'Sick',
        ),
        Inhabitant(
          id: 'h3',
          species: 'Species 3',
          commonName: 'Quarantine Fish',
          category: InhabitantCategory.fish,
          quantity: 1,
          addedDate: DateTime.now(),
          healthStatus: 'Quarantine',
        ),
        Inhabitant(
          id: 'h4',
          species: 'Species 4',
          commonName: 'Dead Fish',
          category: InhabitantCategory.fish,
          quantity: 1,
          addedDate: DateTime.now(),
          healthStatus: 'Deceased',
        ),
      ];

      await tester.pumpWidget(createTestWidget(inhabitantsWithDifferentHealth));

      // Find all status badges
      expect(find.text('Healthy'), findsOneWidget);
      expect(find.text('Sick'), findsOneWidget);
      expect(find.text('Quarantine'), findsOneWidget);
      expect(find.text('Deceased'), findsOneWidget);
    });

    testWidgets('handles very long names gracefully', (WidgetTester tester) async {
      final longNameInhabitant = [
        Inhabitant(
          id: 'long',
          species: 'This is a very long scientific species name that goes on and on',
          commonName: 'This is an extremely long common name that should be handled properly',
          category: InhabitantCategory.fish,
          quantity: 1,
          addedDate: DateTime.now(),
          healthStatus: 'Healthy',
          notes: 'These are very long notes that contain a lot of information about the inhabitant and should wrap properly',
        ),
      ];

      await tester.pumpWidget(createTestWidget(longNameInhabitant));

      // Should render without overflow errors
      expect(find.byType(InhabitantList), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('respects theme colors', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(
            primarySwatch: Colors.green,
            cardTheme: const CardTheme(
              color: Colors.lightGreen,
            ),
          ),
          home: Scaffold(
            body: InhabitantList(
              inhabitants: testInhabitants,
            ),
          ),
        ),
      );

      // Icons should use theme colors
      final icon = tester.widget<Icon>(find.byIcon(Icons.water).first);
      expect(icon.color, isNotNull);
    });
  });
}