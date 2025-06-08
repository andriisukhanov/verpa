import 'package:flutter/material.dart';

enum CommandType {
  query('query', 'Query Information'),
  action('action', 'Perform Action'),
  navigation('navigation', 'Navigate Screen'),
  recording('recording', 'Record Data');

  final String value;
  final String displayName;

  const CommandType(this.value, this.displayName);
}

enum CommandCategory {
  parameters('parameters', 'Water Parameters', Icons.science),
  feeding('feeding', 'Feeding', Icons.restaurant),
  maintenance('maintenance', 'Maintenance', Icons.build),
  equipment('equipment', 'Equipment', Icons.settings),
  inhabitants('inhabitants', 'Inhabitants', Icons.pets),
  iot('iot', 'IoT Devices', Icons.sensors),
  general('general', 'General', Icons.help);

  final String value;
  final String displayName;
  final IconData icon;

  const CommandCategory(this.value, this.displayName, this.icon);
}

class VoiceCommand {
  final String id;
  final String rawText;
  final String processedText;
  final CommandType type;
  final CommandCategory category;
  final Map<String, dynamic> parameters;
  final DateTime timestamp;
  final double confidence;

  VoiceCommand({
    required this.id,
    required this.rawText,
    required this.processedText,
    required this.type,
    required this.category,
    this.parameters = const {},
    required this.timestamp,
    this.confidence = 1.0,
  });

  factory VoiceCommand.fromJson(Map<String, dynamic> json) {
    return VoiceCommand(
      id: json['id'],
      rawText: json['rawText'],
      processedText: json['processedText'],
      type: CommandType.values.firstWhere(
        (t) => t.value == json['type'],
        orElse: () => CommandType.query,
      ),
      category: CommandCategory.values.firstWhere(
        (c) => c.value == json['category'],
        orElse: () => CommandCategory.general,
      ),
      parameters: json['parameters'] ?? {},
      timestamp: DateTime.parse(json['timestamp']),
      confidence: json['confidence'] ?? 1.0,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'rawText': rawText,
    'processedText': processedText,
    'type': type.value,
    'category': category.value,
    'parameters': parameters,
    'timestamp': timestamp.toIso8601String(),
    'confidence': confidence,
  };
}

class CommandResult {
  final bool success;
  final String message;
  final String? spokenResponse;
  final Map<String, dynamic>? data;
  final String? navigateTo;
  final List<String>? suggestions;

  CommandResult({
    required this.success,
    required this.message,
    this.spokenResponse,
    this.data,
    this.navigateTo,
    this.suggestions,
  });
}

class CommandPattern {
  final RegExp pattern;
  final CommandType type;
  final CommandCategory category;
  final Function(Match) extractParameters;

  CommandPattern({
    required this.pattern,
    required this.type,
    required this.category,
    required this.extractParameters,
  });
}

// Predefined command patterns
class CommandPatterns {
  static final List<CommandPattern> patterns = [
    // Water Parameters
    CommandPattern(
      pattern: RegExp(r'what(?:\'s| is) (?:the )?(?:current )?temperature', caseSensitive: false),
      type: CommandType.query,
      category: CommandCategory.parameters,
      extractParameters: (match) => {'parameter': 'temperature'},
    ),
    CommandPattern(
      pattern: RegExp(r'what(?:\'s| is) (?:the )?(?:current )?ph', caseSensitive: false),
      type: CommandType.query,
      category: CommandCategory.parameters,
      extractParameters: (match) => {'parameter': 'ph'},
    ),
    CommandPattern(
      pattern: RegExp(r'record (?:water )?parameters', caseSensitive: false),
      type: CommandType.navigation,
      category: CommandCategory.parameters,
      extractParameters: (match) => {},
    ),
    CommandPattern(
      pattern: RegExp(r'set temperature to (\d+(?:\.\d+)?)', caseSensitive: false),
      type: CommandType.recording,
      category: CommandCategory.parameters,
      extractParameters: (match) => {
        'parameter': 'temperature',
        'value': double.parse(match.group(1)!),
      },
    ),
    
    // Feeding
    CommandPattern(
      pattern: RegExp(r'feed (?:the )?fish', caseSensitive: false),
      type: CommandType.action,
      category: CommandCategory.feeding,
      extractParameters: (match) => {'action': 'feed'},
    ),
    CommandPattern(
      pattern: RegExp(r'when(?:\'s| is) (?:the )?next feeding', caseSensitive: false),
      type: CommandType.query,
      category: CommandCategory.feeding,
      extractParameters: (match) => {'query': 'next_feeding'},
    ),
    CommandPattern(
      pattern: RegExp(r'show feeding schedule', caseSensitive: false),
      type: CommandType.navigation,
      category: CommandCategory.feeding,
      extractParameters: (match) => {},
    ),
    
    // Maintenance
    CommandPattern(
      pattern: RegExp(r'what maintenance (?:tasks )?(?:are )?(?:due|pending)', caseSensitive: false),
      type: CommandType.query,
      category: CommandCategory.maintenance,
      extractParameters: (match) => {'query': 'pending_tasks'},
    ),
    CommandPattern(
      pattern: RegExp(r'complete maintenance (?:task )?(.+)', caseSensitive: false),
      type: CommandType.action,
      category: CommandCategory.maintenance,
      extractParameters: (match) => {'task': match.group(1)},
    ),
    CommandPattern(
      pattern: RegExp(r'when(?:\'s| is) (?:the )?next water change', caseSensitive: false),
      type: CommandType.query,
      category: CommandCategory.maintenance,
      extractParameters: (match) => {'query': 'next_water_change'},
    ),
    
    // Equipment
    CommandPattern(
      pattern: RegExp(r'turn (?:on|off) (?:the )?(.+)', caseSensitive: false),
      type: CommandType.action,
      category: CommandCategory.equipment,
      extractParameters: (match) {
        final text = match.group(0)!;
        final isOn = text.contains('on');
        final equipment = match.group(1)!;
        return {
          'action': isOn ? 'turn_on' : 'turn_off',
          'equipment': equipment,
        };
      },
    ),
    CommandPattern(
      pattern: RegExp(r'list (?:all )?equipment', caseSensitive: false),
      type: CommandType.query,
      category: CommandCategory.equipment,
      extractParameters: (match) => {'query': 'list_equipment'},
    ),
    
    // IoT Devices
    CommandPattern(
      pattern: RegExp(r'(?:show|list) (?:iot )?devices', caseSensitive: false),
      type: CommandType.navigation,
      category: CommandCategory.iot,
      extractParameters: (match) => {},
    ),
    CommandPattern(
      pattern: RegExp(r'connect (?:to )?(.+)', caseSensitive: false),
      type: CommandType.action,
      category: CommandCategory.iot,
      extractParameters: (match) => {
        'action': 'connect',
        'device': match.group(1),
      },
    ),
    
    // General
    CommandPattern(
      pattern: RegExp(r'(?:show|open) (.+)', caseSensitive: false),
      type: CommandType.navigation,
      category: CommandCategory.general,
      extractParameters: (match) => {'screen': match.group(1)},
    ),
    CommandPattern(
      pattern: RegExp(r'help', caseSensitive: false),
      type: CommandType.query,
      category: CommandCategory.general,
      extractParameters: (match) => {'query': 'help'},
    ),
  ];
}

class VoiceAssistantState {
  final bool isListening;
  final bool isProcessing;
  final String? currentText;
  final String? lastCommand;
  final CommandResult? lastResult;
  final String? error;

  VoiceAssistantState({
    this.isListening = false,
    this.isProcessing = false,
    this.currentText,
    this.lastCommand,
    this.lastResult,
    this.error,
  });

  VoiceAssistantState copyWith({
    bool? isListening,
    bool? isProcessing,
    String? currentText,
    String? lastCommand,
    CommandResult? lastResult,
    String? error,
  }) {
    return VoiceAssistantState(
      isListening: isListening ?? this.isListening,
      isProcessing: isProcessing ?? this.isProcessing,
      currentText: currentText ?? this.currentText,
      lastCommand: lastCommand ?? this.lastCommand,
      lastResult: lastResult ?? this.lastResult,
      error: error ?? this.error,
    );
  }
}