import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:flutter_tts/flutter_tts.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:uuid/uuid.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:go_router/go_router.dart';

import '../models/voice_command.dart';
import '../../aquarium/services/aquarium_service.dart';
import '../../aquarium/models/water_parameters.dart';
import '../../feeding/services/feeding_service.dart';
import '../../maintenance/services/maintenance_service.dart';
import '../../iot/services/iot_service.dart';
import '../../iot/models/iot_device.dart';

class VoiceAssistantService {
  static final _speechToText = stt.SpeechToText();
  static final _textToSpeech = FlutterTts();
  static final _assistantStateController = StreamController<VoiceAssistantState>.broadcast();
  
  static VoiceAssistantState _currentState = VoiceAssistantState();
  static bool _isInitialized = false;
  static String? _currentAquariumId;
  static BuildContext? _context;

  // Initialize voice assistant
  static Future<bool> initialize({
    required BuildContext context,
    String? aquariumId,
  }) async {
    _context = context;
    _currentAquariumId = aquariumId;

    // Check microphone permission
    final micPermission = await Permission.microphone.request();
    if (!micPermission.isGranted) {
      _updateState(_currentState.copyWith(
        error: 'Microphone permission denied',
      ));
      return false;
    }

    // Initialize speech to text
    final speechAvailable = await _speechToText.initialize(
      onError: (error) {
        _updateState(_currentState.copyWith(
          error: error.errorMsg,
          isListening: false,
        ));
      },
      onStatus: (status) {
        if (status == 'done') {
          _updateState(_currentState.copyWith(isListening: false));
        }
      },
    );

    if (!speechAvailable) {
      _updateState(_currentState.copyWith(
        error: 'Speech recognition not available',
      ));
      return false;
    }

    // Configure text to speech
    await _configureTTS();

    _isInitialized = true;
    return true;
  }

  // Configure TTS settings
  static Future<void> _configureTTS() async {
    if (Platform.isIOS) {
      await _textToSpeech.setSharedInstance(true);
      await _textToSpeech.setIosAudioCategory(
        IosTextToSpeechAudioCategory.playback,
        [
          IosTextToSpeechAudioCategoryOptions.allowBluetooth,
          IosTextToSpeechAudioCategoryOptions.allowBluetoothA2DP,
          IosTextToSpeechAudioCategoryOptions.mixWithOthers,
        ],
      );
    }

    await _textToSpeech.setLanguage('en-US');
    await _textToSpeech.setSpeechRate(0.5);
    await _textToSpeech.setVolume(1.0);
    await _textToSpeech.setPitch(1.0);
  }

  // Get assistant state stream
  static Stream<VoiceAssistantState> get stateStream => _assistantStateController.stream;

  // Get current state
  static VoiceAssistantState get currentState => _currentState;

  // Update state
  static void _updateState(VoiceAssistantState state) {
    _currentState = state;
    _assistantStateController.add(state);
  }

  // Start listening
  static Future<void> startListening() async {
    if (!_isInitialized) {
      _updateState(_currentState.copyWith(
        error: 'Voice assistant not initialized',
      ));
      return;
    }

    if (_currentState.isListening) return;

    _updateState(_currentState.copyWith(
      isListening: true,
      currentText: '',
      error: null,
    ));

    await _speechToText.listen(
      onResult: (result) {
        _updateState(_currentState.copyWith(
          currentText: result.recognizedWords,
        ));

        if (result.finalResult) {
          _processCommand(result.recognizedWords);
        }
      },
      listenFor: const Duration(seconds: 30),
      pauseFor: const Duration(seconds: 3),
      partialResults: true,
      cancelOnError: true,
      listenMode: stt.ListenMode.confirmation,
    );
  }

  // Stop listening
  static Future<void> stopListening() async {
    if (!_currentState.isListening) return;

    await _speechToText.stop();
    _updateState(_currentState.copyWith(isListening: false));
  }

  // Process voice command
  static Future<void> _processCommand(String text) async {
    if (text.isEmpty) return;

    _updateState(_currentState.copyWith(
      isProcessing: true,
      lastCommand: text,
    ));

    try {
      // Parse command
      final command = _parseCommand(text);
      
      if (command == null) {
        final result = CommandResult(
          success: false,
          message: 'Sorry, I didn\'t understand that command',
          spokenResponse: 'Sorry, I didn\'t understand that. Try saying "help" for available commands.',
          suggestions: [
            'What\'s the temperature?',
            'Show feeding schedule',
            'Record water parameters',
            'Turn on the light',
          ],
        );
        
        _updateState(_currentState.copyWith(
          isProcessing: false,
          lastResult: result,
        ));
        
        await _speak(result.spokenResponse!);
        return;
      }

      // Execute command
      final result = await _executeCommand(command);
      
      _updateState(_currentState.copyWith(
        isProcessing: false,
        lastResult: result,
      ));

      // Speak response
      if (result.spokenResponse != null) {
        await _speak(result.spokenResponse!);
      }

      // Navigate if needed
      if (result.navigateTo != null && _context != null) {
        _context!.push(result.navigateTo!);
      }

      // Save command to history
      await _saveCommandHistory(command, result);
    } catch (e) {
      _updateState(_currentState.copyWith(
        isProcessing: false,
        error: e.toString(),
      ));
    }
  }

  // Parse command from text
  static VoiceCommand? _parseCommand(String text) {
    final lowercaseText = text.toLowerCase().trim();

    for (final pattern in CommandPatterns.patterns) {
      final match = pattern.pattern.firstMatch(lowercaseText);
      if (match != null) {
        return VoiceCommand(
          id: const Uuid().v4(),
          rawText: text,
          processedText: lowercaseText,
          type: pattern.type,
          category: pattern.category,
          parameters: pattern.extractParameters(match),
          timestamp: DateTime.now(),
          confidence: 0.9,
        );
      }
    }

    // If no pattern matches, try to determine intent
    if (lowercaseText.contains('temperature') || 
        lowercaseText.contains('ph') ||
        lowercaseText.contains('ammonia') ||
        lowercaseText.contains('nitrite') ||
        lowercaseText.contains('nitrate')) {
      return VoiceCommand(
        id: const Uuid().v4(),
        rawText: text,
        processedText: lowercaseText,
        type: CommandType.query,
        category: CommandCategory.parameters,
        parameters: {'query': 'parameters'},
        timestamp: DateTime.now(),
        confidence: 0.7,
      );
    }

    return null;
  }

  // Execute command
  static Future<CommandResult> _executeCommand(VoiceCommand command) async {
    switch (command.category) {
      case CommandCategory.parameters:
        return _executeParametersCommand(command);
      case CommandCategory.feeding:
        return _executeFeedingCommand(command);
      case CommandCategory.maintenance:
        return _executeMaintenanceCommand(command);
      case CommandCategory.equipment:
        return _executeEquipmentCommand(command);
      case CommandCategory.iot:
        return _executeIoTCommand(command);
      case CommandCategory.general:
        return _executeGeneralCommand(command);
      default:
        return CommandResult(
          success: false,
          message: 'Command category not supported',
          spokenResponse: 'Sorry, I can\'t handle that type of command yet.',
        );
    }
  }

  // Execute parameters command
  static Future<CommandResult> _executeParametersCommand(VoiceCommand command) async {
    if (_currentAquariumId == null) {
      return CommandResult(
        success: false,
        message: 'No aquarium selected',
        spokenResponse: 'Please select an aquarium first.',
      );
    }

    switch (command.type) {
      case CommandType.query:
        final parameter = command.parameters['parameter'] as String?;
        final aquarium = await AquariumService.getAquarium(_currentAquariumId!);
        
        if (aquarium?.currentParameters == null) {
          return CommandResult(
            success: false,
            message: 'No parameters recorded',
            spokenResponse: 'No water parameters have been recorded yet. Would you like to record them now?',
            suggestions: ['Record water parameters'],
          );
        }

        final params = aquarium!.currentParameters!;
        String value;
        String unit = '';

        switch (parameter) {
          case 'temperature':
            value = params.temperature?.toString() ?? 'not recorded';
            unit = '°F';
            break;
          case 'ph':
            value = params.ph?.toString() ?? 'not recorded';
            break;
          case 'ammonia':
            value = params.ammonia?.toString() ?? 'not recorded';
            unit = ' ppm';
            break;
          case 'nitrite':
            value = params.nitrite?.toString() ?? 'not recorded';
            unit = ' ppm';
            break;
          case 'nitrate':
            value = params.nitrate?.toString() ?? 'not recorded';
            unit = ' ppm';
            break;
          default:
            return CommandResult(
              success: true,
              message: 'Current parameters',
              spokenResponse: 'Here are the current water parameters: '
                  'Temperature ${params.temperature ?? "not recorded"} degrees, '
                  'pH ${params.ph ?? "not recorded"}, '
                  'Ammonia ${params.ammonia ?? "not recorded"} ppm, '
                  'Nitrite ${params.nitrite ?? "not recorded"} ppm, '
                  'Nitrate ${params.nitrate ?? "not recorded"} ppm.',
              data: params.toJson(),
            );
        }

        return CommandResult(
          success: true,
          message: '$parameter: $value$unit',
          spokenResponse: value == 'not recorded' 
              ? 'The $parameter has not been recorded yet.'
              : 'The $parameter is $value$unit.',
          data: {parameter: value},
        );

      case CommandType.navigation:
        return CommandResult(
          success: true,
          message: 'Opening parameters screen',
          spokenResponse: 'Opening the water parameters screen.',
          navigateTo: '/record-parameters/$_currentAquariumId',
        );

      case CommandType.recording:
        final parameter = command.parameters['parameter'] as String;
        final value = command.parameters['value'] as double;
        
        // This would typically update the parameters
        return CommandResult(
          success: true,
          message: 'Parameter recorded',
          spokenResponse: 'I\'ve recorded the $parameter as $value. Please use the parameters screen to save all values.',
          navigateTo: '/record-parameters/$_currentAquariumId',
        );

      default:
        return CommandResult(
          success: false,
          message: 'Unknown command type',
          spokenResponse: 'I\'m not sure how to handle that request.',
        );
    }
  }

  // Execute feeding command
  static Future<CommandResult> _executeFeedingCommand(VoiceCommand command) async {
    if (_currentAquariumId == null) {
      return CommandResult(
        success: false,
        message: 'No aquarium selected',
        spokenResponse: 'Please select an aquarium first.',
      );
    }

    switch (command.type) {
      case CommandType.action:
        if (command.parameters['action'] == 'feed') {
          await FeedingService.recordFeeding(_currentAquariumId!, 'Voice Command');
          return CommandResult(
            success: true,
            message: 'Feeding recorded',
            spokenResponse: 'I\'ve recorded the feeding. The fish have been fed.',
          );
        }
        break;

      case CommandType.query:
        if (command.parameters['query'] == 'next_feeding') {
          final schedule = await FeedingService.getScheduleForAquarium(_currentAquariumId!);
          if (schedule.isEmpty) {
            return CommandResult(
              success: false,
              message: 'No feeding schedule',
              spokenResponse: 'There\'s no feeding schedule set up. Would you like to create one?',
              suggestions: ['Show feeding schedule'],
            );
          }
          
          // Find next feeding time
          final now = DateTime.now();
          final todayMinutes = now.hour * 60 + now.minute;
          
          for (final feeding in schedule) {
            final feedingMinutes = feeding.time.hour * 60 + feeding.time.minute;
            if (feedingMinutes > todayMinutes) {
              return CommandResult(
                success: true,
                message: 'Next feeding at ${feeding.time.format(_context!)}',
                spokenResponse: 'The next feeding is scheduled at ${feeding.time.format(_context!)}.',
                data: {'nextFeeding': feeding.time.format(_context!)},
              );
            }
          }
          
          // If no feeding today, get tomorrow's first
          if (schedule.isNotEmpty) {
            final firstFeeding = schedule.first;
            return CommandResult(
              success: true,
              message: 'Next feeding tomorrow at ${firstFeeding.time.format(_context!)}',
              spokenResponse: 'The next feeding is tomorrow at ${firstFeeding.time.format(_context!)}.',
              data: {'nextFeeding': 'Tomorrow ${firstFeeding.time.format(_context!)}'},
            );
          }
        }
        break;

      case CommandType.navigation:
        return CommandResult(
          success: true,
          message: 'Opening feeding schedule',
          spokenResponse: 'Opening the feeding schedule.',
          navigateTo: '/feeding/$_currentAquariumId',
        );

      default:
        break;
    }

    return CommandResult(
      success: false,
      message: 'Unknown feeding command',
      spokenResponse: 'I couldn\'t process that feeding command.',
    );
  }

  // Execute maintenance command
  static Future<CommandResult> _executeMaintenanceCommand(VoiceCommand command) async {
    if (_currentAquariumId == null) {
      return CommandResult(
        success: false,
        message: 'No aquarium selected',
        spokenResponse: 'Please select an aquarium first.',
      );
    }

    switch (command.type) {
      case CommandType.query:
        if (command.parameters['query'] == 'pending_tasks') {
          final tasks = await MaintenanceService.getTasksForAquarium(_currentAquariumId!);
          final pendingTasks = tasks.where((t) => !t.isCompleted && !t.isOverdue).toList();
          final overdueTasks = tasks.where((t) => t.isOverdue).toList();
          
          if (pendingTasks.isEmpty && overdueTasks.isEmpty) {
            return CommandResult(
              success: true,
              message: 'No pending tasks',
              spokenResponse: 'Great news! You don\'t have any pending maintenance tasks.',
            );
          }
          
          String response = '';
          if (overdueTasks.isNotEmpty) {
            response += 'You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}. ';
          }
          if (pendingTasks.isNotEmpty) {
            response += 'You have ${pendingTasks.length} pending task${pendingTasks.length > 1 ? 's' : ''}. ';
            response += 'The next one is: ${pendingTasks.first.title}.';
          }
          
          return CommandResult(
            success: true,
            message: '${overdueTasks.length} overdue, ${pendingTasks.length} pending',
            spokenResponse: response,
            data: {
              'overdue': overdueTasks.length,
              'pending': pendingTasks.length,
            },
            navigateTo: '/maintenance/$_currentAquariumId',
          );
        } else if (command.parameters['query'] == 'next_water_change') {
          final tasks = await MaintenanceService.getTasksForAquarium(_currentAquariumId!);
          final waterChangeTasks = tasks.where((t) => 
            t.title.toLowerCase().contains('water change') && !t.isCompleted
          ).toList();
          
          if (waterChangeTasks.isEmpty) {
            return CommandResult(
              success: false,
              message: 'No water change scheduled',
              spokenResponse: 'There\'s no water change scheduled. Would you like to schedule one?',
              suggestions: ['Schedule water change'],
            );
          }
          
          waterChangeTasks.sort((a, b) => a.dueDate.compareTo(b.dueDate));
          final nextTask = waterChangeTasks.first;
          final daysUntil = nextTask.dueDate.difference(DateTime.now()).inDays;
          
          String when;
          if (daysUntil == 0) {
            when = 'today';
          } else if (daysUntil == 1) {
            when = 'tomorrow';
          } else {
            when = 'in $daysUntil days';
          }
          
          return CommandResult(
            success: true,
            message: 'Next water change $when',
            spokenResponse: 'The next water change is scheduled $when.',
            data: {'nextWaterChange': nextTask.dueDate},
          );
        }
        break;

      case CommandType.action:
        if (command.parameters['task'] != null) {
          // This would complete a specific task
          return CommandResult(
            success: true,
            message: 'Task completion',
            spokenResponse: 'Please use the maintenance screen to complete specific tasks.',
            navigateTo: '/maintenance/$_currentAquariumId',
          );
        }
        break;

      default:
        break;
    }

    return CommandResult(
      success: false,
      message: 'Unknown maintenance command',
      spokenResponse: 'I couldn\'t process that maintenance command.',
    );
  }

  // Execute equipment command
  static Future<CommandResult> _executeEquipmentCommand(VoiceCommand command) async {
    if (_currentAquariumId == null) {
      return CommandResult(
        success: false,
        message: 'No aquarium selected',
        spokenResponse: 'Please select an aquarium first.',
      );
    }

    switch (command.type) {
      case CommandType.action:
        final action = command.parameters['action'] as String;
        final equipmentName = command.parameters['equipment'] as String;
        
        // Check IoT devices first
        final devices = await IoTService.getDevicesForAquarium(_currentAquariumId!);
        final matchingDevice = devices.firstWhere(
          (d) => d.name.toLowerCase().contains(equipmentName.toLowerCase()),
          orElse: () => devices.firstWhere(
            (d) => d.type.displayName.toLowerCase().contains(equipmentName.toLowerCase()),
            orElse: () => IoTDevice(
              id: '',
              aquariumId: '',
              name: '',
              type: DeviceType.lightController,
              connectionType: ConnectionType.wifi,
              lastSeen: DateTime.now(),
              addedAt: DateTime.now(),
            ),
          ),
        );
        
        if (matchingDevice.id.isNotEmpty) {
          final commandType = action == 'turn_on' ? CommandType.turnOn : CommandType.turnOff;
          final success = await IoTService.sendCommand(
            DeviceCommand(
              deviceId: matchingDevice.id,
              type: commandType,
            ),
          );
          
          return CommandResult(
            success: success,
            message: success ? 'Device ${action.replaceAll('_', ' ')}' : 'Failed to control device',
            spokenResponse: success 
              ? 'I\'ve turned ${action == 'turn_on' ? 'on' : 'off'} the ${matchingDevice.name}.'
              : 'Sorry, I couldn\'t control the ${matchingDevice.name}.',
          );
        }
        
        return CommandResult(
          success: false,
          message: 'Equipment not found',
          spokenResponse: 'I couldn\'t find equipment called "$equipmentName". Try saying "list equipment" to see available devices.',
          suggestions: ['List equipment', 'Show IoT devices'],
        );

      case CommandType.query:
        if (command.parameters['query'] == 'list_equipment') {
          final aquarium = await AquariumService.getAquarium(_currentAquariumId!);
          final equipment = aquarium?.equipment ?? [];
          final devices = await IoTService.getDevicesForAquarium(_currentAquariumId!);
          
          if (equipment.isEmpty && devices.isEmpty) {
            return CommandResult(
              success: true,
              message: 'No equipment',
              spokenResponse: 'You don\'t have any equipment or IoT devices set up yet.',
            );
          }
          
          String response = 'You have ';
          if (equipment.isNotEmpty) {
            response += '${equipment.length} equipment item${equipment.length > 1 ? 's' : ''}: ';
            response += equipment.map((e) => e.name).join(', ');
          }
          if (devices.isNotEmpty) {
            if (equipment.isNotEmpty) response += '. And ';
            response += '${devices.length} IoT device${devices.length > 1 ? 's' : ''}: ';
            response += devices.map((d) => d.name).join(', ');
          }
          response += '.';
          
          return CommandResult(
            success: true,
            message: 'Equipment listed',
            spokenResponse: response,
            data: {
              'equipment': equipment.map((e) => e.name).toList(),
              'devices': devices.map((d) => d.name).toList(),
            },
          );
        }
        break;

      default:
        break;
    }

    return CommandResult(
      success: false,
      message: 'Unknown equipment command',
      spokenResponse: 'I couldn\'t process that equipment command.',
    );
  }

  // Execute IoT command
  static Future<CommandResult> _executeIoTCommand(VoiceCommand command) async {
    if (_currentAquariumId == null) {
      return CommandResult(
        success: false,
        message: 'No aquarium selected',
        spokenResponse: 'Please select an aquarium first.',
      );
    }

    switch (command.type) {
      case CommandType.navigation:
        return CommandResult(
          success: true,
          message: 'Opening IoT devices',
          spokenResponse: 'Opening the IoT devices screen.',
          navigateTo: '/iot-devices/$_currentAquariumId',
        );

      case CommandType.action:
        if (command.parameters['action'] == 'connect') {
          return CommandResult(
            success: true,
            message: 'Device connection',
            spokenResponse: 'Please use the IoT devices screen to connect new devices.',
            navigateTo: '/iot-devices/$_currentAquariumId',
          );
        }
        break;

      default:
        break;
    }

    return CommandResult(
      success: false,
      message: 'Unknown IoT command',
      spokenResponse: 'I couldn\'t process that IoT command.',
    );
  }

  // Execute general command
  static Future<CommandResult> _executeGeneralCommand(VoiceCommand command) async {
    switch (command.type) {
      case CommandType.navigation:
        final screen = command.parameters['screen'] as String? ?? '';
        String? route;
        
        if (screen.contains('dashboard')) {
          route = '/dashboard';
        } else if (screen.contains('setting')) {
          route = '/dashboard/settings';
        } else if (screen.contains('profile')) {
          route = '/dashboard/profile';
        } else if (screen.contains('community')) {
          route = '/community';
        } else if (screen.contains('expense')) {
          route = _currentAquariumId != null ? '/expenses/$_currentAquariumId' : null;
        } else if (screen.contains('backup')) {
          route = '/backup-restore';
        }
        
        if (route != null) {
          return CommandResult(
            success: true,
            message: 'Navigating to $screen',
            spokenResponse: 'Opening $screen.',
            navigateTo: route,
          );
        }
        
        return CommandResult(
          success: false,
          message: 'Unknown screen',
          spokenResponse: 'I don\'t know how to open "$screen".',
          suggestions: [
            'Show dashboard',
            'Open settings',
            'Show profile',
          ],
        );

      case CommandType.query:
        if (command.parameters['query'] == 'help') {
          return CommandResult(
            success: true,
            message: 'Voice commands help',
            spokenResponse: 'You can ask me about water parameters, feeding schedules, '
                'maintenance tasks, or control your IoT devices. '
                'Try saying: "What\'s the temperature?", "Feed the fish", '
                '"Turn on the light", or "Show feeding schedule".',
            suggestions: [
              'What\'s the temperature?',
              'Show feeding schedule',
              'What maintenance tasks are due?',
              'Turn on the light',
              'List equipment',
              'Record water parameters',
            ],
          );
        }
        break;

      default:
        break;
    }

    return CommandResult(
      success: false,
      message: 'Unknown command',
      spokenResponse: 'I\'m not sure how to help with that.',
    );
  }

  // Speak text
  static Future<void> _speak(String text) async {
    await _textToSpeech.speak(text);
  }

  // Save command history
  static Future<void> _saveCommandHistory(VoiceCommand command, CommandResult result) async {
    final prefs = await SharedPreferences.getInstance();
    final history = prefs.getStringList('voice_command_history') ?? [];
    
    history.add('${command.timestamp.toIso8601String()}|${command.rawText}|${result.success}');
    
    // Keep only last 50 commands
    if (history.length > 50) {
      history.removeRange(0, history.length - 50);
    }
    
    await prefs.setStringList('voice_command_history', history);
  }

  // Get command history
  static Future<List<Map<String, dynamic>>> getCommandHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final history = prefs.getStringList('voice_command_history') ?? [];
    
    return history.map((entry) {
      final parts = entry.split('|');
      return {
        'timestamp': DateTime.parse(parts[0]),
        'command': parts[1],
        'success': parts[2] == 'true',
      };
    }).toList();
  }

  // Clean up
  static void dispose() {
    _speechToText.cancel();
    _textToSpeech.stop();
    _assistantStateController.close();
  }
}