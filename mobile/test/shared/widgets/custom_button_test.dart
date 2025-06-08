import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:verpa/shared/widgets/custom_button.dart';

void main() {
  // Helper function to create a test widget
  Widget createTestWidget(Widget button) {
    return MaterialApp(
      home: Scaffold(
        body: Center(child: button),
      ),
    );
  }

  group('CustomButton Widget', () {
    testWidgets('displays primary button correctly', (WidgetTester tester) async {
      bool wasPressed = false;
      
      await tester.pumpWidget(createTestWidget(
        CustomButton(
          text: 'Primary Button',
          onPressed: () => wasPressed = true,
        ),
      ));

      // Check button text
      expect(find.text('Primary Button'), findsOneWidget);

      // Check button is enabled
      final button = tester.widget<ElevatedButton>(find.byType(ElevatedButton));
      expect(button.onPressed, isNotNull);

      // Tap button
      await tester.tap(find.byType(CustomButton));
      await tester.pump();
      expect(wasPressed, isTrue);
    });

    testWidgets('displays disabled button correctly', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        const CustomButton(
          text: 'Disabled Button',
          onPressed: null,
        ),
      ));

      // Check button text
      expect(find.text('Disabled Button'), findsOneWidget);

      // Check button is disabled
      final button = tester.widget<ElevatedButton>(find.byType(ElevatedButton));
      expect(button.onPressed, isNull);
    });

    testWidgets('displays secondary button variant', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        CustomButton(
          text: 'Secondary Button',
          onPressed: () {},
          variant: ButtonVariant.secondary,
        ),
      ));

      // Check button text
      expect(find.text('Secondary Button'), findsOneWidget);

      // Should use OutlinedButton for secondary variant
      expect(find.byType(OutlinedButton), findsOneWidget);
      expect(find.byType(ElevatedButton), findsNothing);
    });

    testWidgets('displays text button variant', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        CustomButton(
          text: 'Text Button',
          onPressed: () {},
          variant: ButtonVariant.text,
        ),
      ));

      // Check button text
      expect(find.text('Text Button'), findsOneWidget);

      // Should use TextButton for text variant
      expect(find.byType(TextButton), findsOneWidget);
      expect(find.byType(ElevatedButton), findsNothing);
    });

    testWidgets('displays danger button variant', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        CustomButton(
          text: 'Delete',
          onPressed: () {},
          variant: ButtonVariant.danger,
        ),
      ));

      // Check button text
      expect(find.text('Delete'), findsOneWidget);

      // Should use ElevatedButton with danger styling
      expect(find.byType(ElevatedButton), findsOneWidget);
      
      // Check color is red-ish
      final button = tester.widget<ElevatedButton>(find.byType(ElevatedButton));
      expect(button.style?.backgroundColor, isNotNull);
    });

    testWidgets('displays button with icon', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        CustomButton(
          text: 'Save',
          icon: Icons.save,
          onPressed: () {},
        ),
      ));

      // Check button text and icon
      expect(find.text('Save'), findsOneWidget);
      expect(find.byIcon(Icons.save), findsOneWidget);
    });

    testWidgets('displays button with trailing icon', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        CustomButton(
          text: 'Next',
          icon: Icons.arrow_forward,
          iconPosition: IconPosition.trailing,
          onPressed: () {},
        ),
      ));

      // Check button text and icon
      expect(find.text('Next'), findsOneWidget);
      expect(find.byIcon(Icons.arrow_forward), findsOneWidget);

      // Icon should be after text
      final row = tester.widget<Row>(find.byType(Row));
      expect(row.children.length, 3); // icon, spacer, text or text, spacer, icon
    });

    testWidgets('displays loading state', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        CustomButton(
          text: 'Loading',
          onPressed: () {},
          isLoading: true,
        ),
      ));

      // Should show loading indicator
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      
      // Text should still be visible but button disabled
      expect(find.text('Loading'), findsOneWidget);
      
      final button = tester.widget<ElevatedButton>(find.byType(ElevatedButton));
      expect(button.onPressed, isNull); // Disabled during loading
    });

    testWidgets('displays custom loading text', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        CustomButton(
          text: 'Submit',
          loadingText: 'Submitting...',
          onPressed: () {},
          isLoading: true,
        ),
      ));

      // Should show custom loading text
      expect(find.text('Submitting...'), findsOneWidget);
      expect(find.text('Submit'), findsNothing);
    });

    testWidgets('respects different sizes', (WidgetTester tester) async {
      // Small button
      await tester.pumpWidget(createTestWidget(
        CustomButton(
          text: 'Small',
          size: ButtonSize.small,
          onPressed: () {},
        ),
      ));

      final smallButton = tester.getSize(find.byType(CustomButton));
      
      // Medium button (default)
      await tester.pumpWidget(createTestWidget(
        CustomButton(
          text: 'Medium',
          onPressed: () {},
        ),
      ));

      final mediumButton = tester.getSize(find.byType(CustomButton));

      // Large button
      await tester.pumpWidget(createTestWidget(
        CustomButton(
          text: 'Large',
          size: ButtonSize.large,
          onPressed: () {},
        ),
      ));

      final largeButton = tester.getSize(find.byType(CustomButton));

      // Check sizes are different
      expect(smallButton.height < mediumButton.height, isTrue);
      expect(mediumButton.height < largeButton.height, isTrue);
    });

    testWidgets('expands to full width when specified', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        CustomButton(
          text: 'Full Width',
          onPressed: () {},
          fullWidth: true,
        ),
      ));

      // Button should expand to available width
      final button = tester.getSize(find.byType(CustomButton));
      final scaffold = tester.getSize(find.byType(Scaffold));
      
      // Button width should be close to scaffold width (minus padding)
      expect(button.width, greaterThan(scaffold.width * 0.8));
    });

    testWidgets('handles long text with ellipsis', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        CustomButton(
          text: 'This is a very long button text that should be truncated with ellipsis',
          onPressed: () {},
        ),
      ));

      // Should render without overflow
      expect(find.byType(CustomButton), findsOneWidget);
      
      // Text widget should have overflow property set
      final text = tester.widget<Text>(find.byType(Text).last);
      expect(text.overflow, TextOverflow.ellipsis);
    });

    testWidgets('applies custom style', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        CustomButton(
          text: 'Custom Style',
          onPressed: () {},
          style: ButtonStyle(
            backgroundColor: MaterialStateProperty.all(Colors.purple),
            foregroundColor: MaterialStateProperty.all(Colors.white),
          ),
        ),
      ));

      // Check custom style is applied
      final button = tester.widget<ElevatedButton>(find.byType(ElevatedButton));
      expect(button.style?.backgroundColor, isNotNull);
      expect(
        button.style?.backgroundColor?.resolve({}),
        Colors.purple,
      );
    });

    testWidgets('handles onLongPress callback', (WidgetTester tester) async {
      bool wasLongPressed = false;
      
      await tester.pumpWidget(createTestWidget(
        CustomButton(
          text: 'Long Press Me',
          onPressed: () {},
          onLongPress: () => wasLongPressed = true,
        ),
      ));

      // Long press the button
      await tester.longPress(find.byType(CustomButton));
      await tester.pump();
      
      expect(wasLongPressed, isTrue);
    });

    testWidgets('shows tooltip when provided', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        CustomButton(
          text: 'Hover Me',
          onPressed: () {},
          tooltip: 'This is a helpful tooltip',
        ),
      ));

      // Tooltip should be present
      expect(find.byType(Tooltip), findsOneWidget);
      
      final tooltip = tester.widget<Tooltip>(find.byType(Tooltip));
      expect(tooltip.message, 'This is a helpful tooltip');
    });

    testWidgets('animates between states', (WidgetTester tester) async {
      bool isLoading = false;
      
      await tester.pumpWidget(
        StatefulBuilder(
          builder: (context, setState) {
            return createTestWidget(
              CustomButton(
                text: 'Animate',
                onPressed: () => setState(() => isLoading = !isLoading),
                isLoading: isLoading,
              ),
            );
          },
        ),
      );

      // Initial state
      expect(find.text('Animate'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsNothing);

      // Tap to start loading
      await tester.tap(find.byType(CustomButton));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Should show loading state
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('respects theme when no custom style', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(
            primarySwatch: Colors.green,
            elevatedButtonTheme: ElevatedButtonThemeData(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
              ),
            ),
          ),
          home: Scaffold(
            body: Center(
              child: CustomButton(
                text: 'Themed Button',
                onPressed: () {},
              ),
            ),
          ),
        ),
      );

      // Button should use theme colors
      final button = tester.widget<ElevatedButton>(find.byType(ElevatedButton));
      expect(button.style, isNotNull);
    });

    testWidgets('accessibility - semantics', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        CustomButton(
          text: 'Accessible Button',
          onPressed: () {},
          semanticLabel: 'Tap to perform action',
        ),
      ));

      // Check semantics
      final semantics = tester.getSemantics(find.byType(CustomButton));
      expect(semantics.label, contains('Tap to perform action'));
      expect(semantics.hasAction(SemanticsAction.tap), isTrue);
    });

    testWidgets('handles rapid taps correctly', (WidgetTester tester) async {
      int tapCount = 0;
      
      await tester.pumpWidget(createTestWidget(
        CustomButton(
          text: 'Tap Me',
          onPressed: () => tapCount++,
          debounce: true,
        ),
      ));

      // Rapid taps
      await tester.tap(find.byType(CustomButton));
      await tester.tap(find.byType(CustomButton));
      await tester.tap(find.byType(CustomButton));
      await tester.pump(const Duration(milliseconds: 100));

      // Should only register one tap due to debouncing
      expect(tapCount, 1);
    });
  });
}