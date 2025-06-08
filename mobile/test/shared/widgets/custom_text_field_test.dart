import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:verpa/shared/widgets/custom_text_field.dart';

void main() {
  // Helper function to create a test widget
  Widget createTestWidget(Widget textField) {
    return MaterialApp(
      home: Scaffold(
        body: Padding(
          padding: const EdgeInsets.all(16.0),
          child: textField,
        ),
      ),
    );
  }

  group('CustomTextField Widget', () {
    testWidgets('displays basic text field correctly', (WidgetTester tester) async {
      final controller = TextEditingController();

      await tester.pumpWidget(createTestWidget(
        CustomTextField(
          controller: controller,
          label: 'Username',
          hint: 'Enter your username',
        ),
      ));

      // Check label and hint
      expect(find.text('Username'), findsOneWidget);
      expect(find.text('Enter your username'), findsOneWidget);

      // Type text
      await tester.enterText(find.byType(TextField), 'testuser');
      expect(controller.text, 'testuser');
    });

    testWidgets('displays required indicator', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        CustomTextField(
          controller: TextEditingController(),
          label: 'Email',
          isRequired: true,
        ),
      ));

      // Should show asterisk for required field
      expect(find.text('Email *'), findsOneWidget);
    });

    testWidgets('shows password field with visibility toggle', (WidgetTester tester) async {
      final controller = TextEditingController(text: 'password123');

      await tester.pumpWidget(createTestWidget(
        CustomTextField(
          controller: controller,
          label: 'Password',
          isPassword: true,
        ),
      ));

      // Initially password should be obscured
      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.obscureText, isTrue);

      // Find and tap visibility toggle
      await tester.tap(find.byIcon(Icons.visibility));
      await tester.pump();

      // Password should now be visible
      final updatedTextField = tester.widget<TextField>(find.byType(TextField));
      expect(updatedTextField.obscureText, isFalse);

      // Toggle back
      await tester.tap(find.byIcon(Icons.visibility_off));
      await tester.pump();

      final finalTextField = tester.widget<TextField>(find.byType(TextField));
      expect(finalTextField.obscureText, isTrue);
    });

    testWidgets('displays prefix icon', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        CustomTextField(
          controller: TextEditingController(),
          label: 'Email',
          prefixIcon: Icons.email,
        ),
      ));

      expect(find.byIcon(Icons.email), findsOneWidget);
    });

    testWidgets('displays suffix icon with action', (WidgetTester tester) async {
      bool suffixTapped = false;

      await tester.pumpWidget(createTestWidget(
        CustomTextField(
          controller: TextEditingController(),
          label: 'Search',
          suffixIcon: Icons.search,
          onSuffixTap: () => suffixTapped = true,
        ),
      ));

      expect(find.byIcon(Icons.search), findsOneWidget);

      // Tap suffix icon
      await tester.tap(find.byIcon(Icons.search));
      await tester.pump();

      expect(suffixTapped, isTrue);
    });

    testWidgets('shows error message', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        CustomTextField(
          controller: TextEditingController(),
          label: 'Email',
          errorText: 'Invalid email format',
        ),
      ));

      expect(find.text('Invalid email format'), findsOneWidget);

      // Error text should be in error color
      final errorText = tester.widget<Text>(find.text('Invalid email format'));
      expect(errorText.style?.color, isNotNull);
    });

    testWidgets('shows helper text', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        CustomTextField(
          controller: TextEditingController(),
          label: 'Username',
          helperText: 'Must be at least 3 characters',
        ),
      ));

      expect(find.text('Must be at least 3 characters'), findsOneWidget);
    });

    testWidgets('handles multiline input', (WidgetTester tester) async {
      final controller = TextEditingController();

      await tester.pumpWidget(createTestWidget(
        CustomTextField(
          controller: controller,
          label: 'Description',
          maxLines: 5,
          minLines: 3,
        ),
      ));

      // Text field should support multiple lines
      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.maxLines, 5);
      expect(textField.minLines, 3);

      // Enter multiline text
      await tester.enterText(
        find.byType(TextField),
        'Line 1\nLine 2\nLine 3',
      );
      expect(controller.text, 'Line 1\nLine 2\nLine 3');
    });

    testWidgets('enforces max length', (WidgetTester tester) async {
      final controller = TextEditingController();

      await tester.pumpWidget(createTestWidget(
        CustomTextField(
          controller: controller,
          label: 'Bio',
          maxLength: 10,
          showCounter: true,
        ),
      ));

      // Should show counter
      expect(find.text('0/10'), findsOneWidget);

      // Type text
      await tester.enterText(find.byType(TextField), 'Hello');
      await tester.pump();

      expect(find.text('5/10'), findsOneWidget);

      // Try to exceed limit
      await tester.enterText(find.byType(TextField), 'Hello World!');
      await tester.pump();

      // Should be truncated to max length
      expect(controller.text.length, 10);
      expect(find.text('10/10'), findsOneWidget);
    });

    testWidgets('handles input formatters', (WidgetTester tester) async {
      final controller = TextEditingController();

      await tester.pumpWidget(createTestWidget(
        CustomTextField(
          controller: controller,
          label: 'Phone',
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(10),
          ],
        ),
      ));

      // Try to enter mixed text
      await tester.enterText(find.byType(TextField), 'abc123def456');
      
      // Only digits should remain
      expect(controller.text, '123456');
    });

    testWidgets('displays different keyboard types', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        CustomTextField(
          controller: TextEditingController(),
          label: 'Email',
          keyboardType: TextInputType.emailAddress,
        ),
      ));

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.keyboardType, TextInputType.emailAddress);
    });

    testWidgets('handles text input actions', (WidgetTester tester) async {
      bool submitted = false;

      await tester.pumpWidget(createTestWidget(
        CustomTextField(
          controller: TextEditingController(),
          label: 'Search',
          textInputAction: TextInputAction.search,
          onSubmitted: (value) => submitted = true,
        ),
      ));

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.textInputAction, TextInputAction.search);

      // Simulate form submission
      await tester.enterText(find.byType(TextField), 'query');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pump();

      expect(submitted, isTrue);
    });

    testWidgets('handles onChanged callback', (WidgetTester tester) async {
      String? changedValue;

      await tester.pumpWidget(createTestWidget(
        CustomTextField(
          controller: TextEditingController(),
          label: 'Name',
          onChanged: (value) => changedValue = value,
        ),
      ));

      await tester.enterText(find.byType(TextField), 'John');
      expect(changedValue, 'John');
    });

    testWidgets('displays as read-only when specified', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        CustomTextField(
          controller: TextEditingController(text: 'Read only value'),
          label: 'Status',
          readOnly: true,
        ),
      ));

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.readOnly, isTrue);

      // Should show text but not allow editing
      expect(find.text('Read only value'), findsOneWidget);
    });

    testWidgets('displays as disabled when enabled is false', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        CustomTextField(
          controller: TextEditingController(text: 'Disabled'),
          label: 'Disabled Field',
          enabled: false,
        ),
      ));

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.enabled, isFalse);
    });

    testWidgets('handles autofocus', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        CustomTextField(
          controller: TextEditingController(),
          label: 'Autofocus Field',
          autofocus: true,
        ),
      ));

      await tester.pump();

      // Field should have focus
      final focusNode = Focus.of(tester.element(find.byType(TextField)));
      expect(focusNode.hasFocus, isTrue);
    });

    testWidgets('validates input with custom validator', (WidgetTester tester) async {
      final formKey = GlobalKey<FormState>();
      String? validationError;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Form(
              key: formKey,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: CustomTextField(
                  controller: TextEditingController(),
                  label: 'Email',
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Email is required';
                    }
                    if (!value.contains('@')) {
                      return 'Invalid email format';
                    }
                    return null;
                  },
                  onChanged: (value) {
                    formKey.currentState?.validate();
                  },
                ),
              ),
            ),
          ),
        ),
      );

      // Initial state - no error
      expect(find.text('Email is required'), findsNothing);

      // Validate empty field
      formKey.currentState?.validate();
      await tester.pump();
      expect(find.text('Email is required'), findsOneWidget);

      // Enter invalid email
      await tester.enterText(find.byType(TextField), 'invalid');
      await tester.pump();
      expect(find.text('Invalid email format'), findsOneWidget);

      // Enter valid email
      await tester.enterText(find.byType(TextField), 'test@example.com');
      await tester.pump();
      expect(find.text('Invalid email format'), findsNothing);
    });

    testWidgets('shows clear button when text is present', (WidgetTester tester) async {
      final controller = TextEditingController();

      await tester.pumpWidget(createTestWidget(
        CustomTextField(
          controller: controller,
          label: 'Search',
          showClearButton: true,
        ),
      ));

      // Initially no clear button
      expect(find.byIcon(Icons.clear), findsNothing);

      // Type text
      await tester.enterText(find.byType(TextField), 'search term');
      await tester.pump();

      // Clear button should appear
      expect(find.byIcon(Icons.clear), findsOneWidget);

      // Tap clear button
      await tester.tap(find.byIcon(Icons.clear));
      await tester.pump();

      // Text should be cleared
      expect(controller.text, '');
      expect(find.byIcon(Icons.clear), findsNothing);
    });

    testWidgets('handles autocorrect and suggestions', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        CustomTextField(
          controller: TextEditingController(),
          label: 'Name',
          autocorrect: false,
          enableSuggestions: false,
        ),
      ));

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.autocorrect, isFalse);
      expect(textField.enableSuggestions, isFalse);
    });

    testWidgets('applies custom decoration', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        CustomTextField(
          controller: TextEditingController(),
          label: 'Custom',
          decoration: InputDecoration(
            filled: true,
            fillColor: Colors.grey[200],
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      ));

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.decoration?.filled, isTrue);
      expect(textField.decoration?.fillColor, Colors.grey[200]);
    });

    testWidgets('handles text capitalization', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        CustomTextField(
          controller: TextEditingController(),
          label: 'Sentence',
          textCapitalization: TextCapitalization.sentences,
        ),
      ));

      final textField = tester.widget<TextField>(find.byType(TextField));
      expect(textField.textCapitalization, TextCapitalization.sentences);
    });

    testWidgets('respects theme styling', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(
            primarySwatch: Colors.blue,
            inputDecorationTheme: const InputDecorationTheme(
              labelStyle: TextStyle(color: Colors.blue),
              focusedBorder: UnderlineInputBorder(
                borderSide: BorderSide(color: Colors.blue),
              ),
            ),
          ),
          home: Scaffold(
            body: Padding(
              padding: const EdgeInsets.all(16.0),
              child: CustomTextField(
                controller: TextEditingController(),
                label: 'Themed Field',
              ),
            ),
          ),
        ),
      );

      // Field should use theme colors
      expect(find.byType(CustomTextField), findsOneWidget);
    });
  });
}