import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:verpa/shared/widgets/loading_overlay.dart';

void main() {
  // Helper function to create a test widget
  Widget createTestWidget({
    required bool isLoading,
    String? message,
    Widget? child,
    Color? backgroundColor,
    double? opacity,
    bool dismissible = false,
    VoidCallback? onDismiss,
    Widget? customIndicator,
  }) {
    return MaterialApp(
      home: Scaffold(
        body: LoadingOverlay(
          isLoading: isLoading,
          message: message,
          backgroundColor: backgroundColor,
          opacity: opacity,
          dismissible: dismissible,
          onDismiss: onDismiss,
          customIndicator: customIndicator,
          child: child ??
              const Center(
                child: Text('Content'),
              ),
        ),
      ),
    );
  }

  group('LoadingOverlay Widget', () {
    testWidgets('shows content when not loading', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(isLoading: false));

      // Content should be visible
      expect(find.text('Content'), findsOneWidget);
      
      // No loading indicator
      expect(find.byType(CircularProgressIndicator), findsNothing);
      
      // No overlay
      expect(find.byType(Stack), findsNothing);
    });

    testWidgets('shows loading overlay when loading', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(isLoading: true));

      // Content should still be in the tree but behind overlay
      expect(find.text('Content'), findsOneWidget);
      
      // Loading indicator should be visible
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      
      // Stack should be present
      expect(find.byType(Stack), findsOneWidget);
    });

    testWidgets('displays loading message', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        isLoading: true,
        message: 'Loading data...',
      ));

      expect(find.text('Loading data...'), findsOneWidget);
    });

    testWidgets('shows default loading message when none provided', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(isLoading: true));

      expect(find.text('Loading...'), findsOneWidget);
    });

    testWidgets('uses custom background color', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        isLoading: true,
        backgroundColor: Colors.blue,
      ));

      // Find the colored container
      final coloredBox = tester.widget<ColoredBox>(
        find.descendant(
          of: find.byType(Stack),
          matching: find.byType(ColoredBox),
        ).first,
      );

      expect(coloredBox.color, Colors.blue.withOpacity(0.7));
    });

    testWidgets('uses custom opacity', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        isLoading: true,
        backgroundColor: Colors.black,
        opacity: 0.5,
      ));

      // Find the colored container
      final coloredBox = tester.widget<ColoredBox>(
        find.descendant(
          of: find.byType(Stack),
          matching: find.byType(ColoredBox),
        ).first,
      );

      expect(coloredBox.color, Colors.black.withOpacity(0.5));
    });

    testWidgets('handles dismissible overlay', (WidgetTester tester) async {
      bool dismissed = false;

      await tester.pumpWidget(createTestWidget(
        isLoading: true,
        dismissible: true,
        onDismiss: () => dismissed = true,
      ));

      // Tap on the overlay
      await tester.tap(find.byType(GestureDetector));
      await tester.pump();

      expect(dismissed, isTrue);
    });

    testWidgets('ignores taps when not dismissible', (WidgetTester tester) async {
      bool dismissed = false;

      await tester.pumpWidget(createTestWidget(
        isLoading: true,
        dismissible: false,
        onDismiss: () => dismissed = true,
      ));

      // Try to tap on the overlay
      await tester.tap(find.byType(Stack));
      await tester.pump();

      expect(dismissed, isFalse);
    });

    testWidgets('uses custom loading indicator', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        isLoading: true,
        customIndicator: const Icon(
          Icons.hourglass_empty,
          size: 48,
          color: Colors.white,
        ),
      ));

      // Custom indicator should be visible
      expect(find.byIcon(Icons.hourglass_empty), findsOneWidget);
      
      // Default indicator should not be visible
      expect(find.byType(CircularProgressIndicator), findsNothing);
    });

    testWidgets('animates overlay appearance', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(isLoading: false));

      // Initially no overlay
      expect(find.byType(Stack), findsNothing);

      // Start loading
      await tester.pumpWidget(createTestWidget(isLoading: true));
      
      // Animation starts
      await tester.pump();
      
      // Find AnimatedOpacity
      final animatedOpacity = tester.widget<AnimatedOpacity>(
        find.byType(AnimatedOpacity).first,
      );
      expect(animatedOpacity.opacity, 0.0); // Starts from 0

      // Complete animation
      await tester.pumpAndSettle();
      
      // Overlay should be fully visible
      final finalOpacity = tester.widget<AnimatedOpacity>(
        find.byType(AnimatedOpacity).first,
      );
      expect(finalOpacity.opacity, 1.0);
    });

    testWidgets('prevents interaction with underlying content', (WidgetTester tester) async {
      bool buttonPressed = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LoadingOverlay(
              isLoading: true,
              child: Center(
                child: ElevatedButton(
                  onPressed: () => buttonPressed = true,
                  child: const Text('Press Me'),
                ),
              ),
            ),
          ),
        ),
      );

      // Try to tap the button
      await tester.tap(find.byType(ElevatedButton));
      await tester.pump();

      // Button should not be pressed due to overlay
      expect(buttonPressed, isFalse);
    });

    testWidgets('allows interaction when not loading', (WidgetTester tester) async {
      bool buttonPressed = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LoadingOverlay(
              isLoading: false,
              child: Center(
                child: ElevatedButton(
                  onPressed: () => buttonPressed = true,
                  child: const Text('Press Me'),
                ),
              ),
            ),
          ),
        ),
      );

      // Tap the button
      await tester.tap(find.byType(ElevatedButton));
      await tester.pump();

      // Button should be pressed
      expect(buttonPressed, isTrue);
    });

    testWidgets('handles state changes correctly', (WidgetTester tester) async {
      // Start with loading
      await tester.pumpWidget(createTestWidget(isLoading: true));
      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      // Stop loading
      await tester.pumpWidget(createTestWidget(isLoading: false));
      await tester.pumpAndSettle();
      expect(find.byType(CircularProgressIndicator), findsNothing);

      // Start loading again
      await tester.pumpWidget(createTestWidget(isLoading: true));
      await tester.pumpAndSettle();
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('positions loading indicator correctly', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        isLoading: true,
        child: Container(
          width: 300,
          height: 300,
          color: Colors.red,
          child: const Center(child: Text('Content')),
        ),
      ));

      // Loading indicator should be centered
      final center = find.ancestor(
        of: find.byType(CircularProgressIndicator),
        matching: find.byType(Center),
      );
      expect(center, findsWidgets);
    });

    testWidgets('handles long loading messages', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        isLoading: true,
        message: 'This is a very long loading message that might wrap to multiple lines',
      ));

      // Message should be displayed
      expect(
        find.text('This is a very long loading message that might wrap to multiple lines'),
        findsOneWidget,
      );

      // Text should have proper styling
      final text = tester.widget<Text>(
        find.text('This is a very long loading message that might wrap to multiple lines'),
      );
      expect(text.textAlign, TextAlign.center);
    });

    testWidgets('uses theme colors when no custom colors provided', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(
            primarySwatch: Colors.purple,
            progressIndicatorTheme: const ProgressIndicatorThemeData(
              color: Colors.purple,
            ),
          ),
          home: Scaffold(
            body: LoadingOverlay(
              isLoading: true,
              child: const Center(child: Text('Content')),
            ),
          ),
        ),
      );

      // Progress indicator should use theme color
      final progressIndicator = tester.widget<CircularProgressIndicator>(
        find.byType(CircularProgressIndicator),
      );
      expect(progressIndicator.color, isNull); // Uses theme
    });

    testWidgets('maintains child widget state during loading', (WidgetTester tester) async {
      final controller = TextEditingController(text: 'Initial text');

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LoadingOverlay(
              isLoading: false,
              child: TextField(controller: controller),
            ),
          ),
        ),
      );

      // Change text
      await tester.enterText(find.byType(TextField), 'New text');
      expect(controller.text, 'New text');

      // Show loading overlay
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LoadingOverlay(
              isLoading: true,
              child: TextField(controller: controller),
            ),
          ),
        ),
      );

      // Text should be preserved
      expect(controller.text, 'New text');

      // Hide loading overlay
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LoadingOverlay(
              isLoading: false,
              child: TextField(controller: controller),
            ),
          ),
        ),
      );

      // Text should still be preserved
      expect(controller.text, 'New text');
    });

    testWidgets('respects safe area', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: SafeArea(
            child: LoadingOverlay(
              isLoading: true,
              child: const Center(child: Text('Content')),
            ),
          ),
        ),
      );

      // Loading overlay should respect safe area
      expect(find.byType(SafeArea), findsOneWidget);
    });

    testWidgets('handles rapid loading state changes', (WidgetTester tester) async {
      // Rapidly toggle loading state
      for (int i = 0; i < 10; i++) {
        await tester.pumpWidget(createTestWidget(isLoading: i % 2 == 0));
        await tester.pump(const Duration(milliseconds: 50));
      }

      // Should end in non-loading state
      await tester.pumpAndSettle();
      expect(find.byType(CircularProgressIndicator), findsNothing);
    });
  });
}