import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

import '../models/collaboration_models.dart';
import '../../aquarium/models/aquarium_model.dart';
import '../../aquarium/models/water_parameters.dart';
import '../../auth/services/auth_service.dart';

class RealtimeService {
  static const String _wsUrl = 'wss://api.verpa.app/ws';
  static WebSocketChannel? _channel;
  static final Map<String, StreamController<RealtimeUpdate>> _updateStreams = {};
  static final Map<String, List<Collaborator>> _onlineCollaborators = {};
  static Timer? _pingTimer;
  static Timer? _reconnectTimer;
  static bool _isConnected = false;
  static String? _currentUserId;
  static String? _sessionId;
  
  // Retry configuration
  static int _reconnectAttempts = 0;
  static const int _maxReconnectAttempts = 5;
  static const Duration _reconnectDelay = Duration(seconds: 5);

  // Initialize WebSocket connection
  static Future<void> initialize() async {
    _currentUserId = await AuthService.getCurrentUserId();
    _sessionId = const Uuid().v4();
    
    // Monitor connectivity
    Connectivity().onConnectivityChanged.listen((ConnectivityResult result) {
      if (result != ConnectivityResult.none && !_isConnected) {
        _connect();
      } else if (result == ConnectivityResult.none && _isConnected) {
        _disconnect();
      }
    });
    
    await _connect();
  }

  // Connect to WebSocket
  static Future<void> _connect() async {
    if (_isConnected) return;

    try {
      final token = await AuthService.getAuthToken();
      if (token == null) return;

      _channel = WebSocketChannel.connect(
        Uri.parse('$_wsUrl?token=$token&sessionId=$_sessionId'),
      );

      _channel!.stream.listen(
        _handleMessage,
        onError: _handleError,
        onDone: _handleDisconnect,
      );

      // Send initial connection message
      _sendMessage({
        'type': 'connect',
        'userId': _currentUserId,
        'sessionId': _sessionId,
      });

      _isConnected = true;
      _reconnectAttempts = 0;

      // Start ping timer
      _startPingTimer();

      print('WebSocket connected');
    } catch (e) {
      print('WebSocket connection error: $e');
      _scheduleReconnect();
    }
  }

  // Handle incoming messages
  static void _handleMessage(dynamic message) {
    try {
      final data = json.decode(message);
      final type = data['type'] as String;

      switch (type) {
        case 'update':
          _handleRealtimeUpdate(data);
          break;
        case 'collaborator_joined':
          _handleCollaboratorJoined(data);
          break;
        case 'collaborator_left':
          _handleCollaboratorLeft(data);
          break;
        case 'online_collaborators':
          _handleOnlineCollaborators(data);
          break;
        case 'pong':
          // Ping response received
          break;
        case 'error':
          print('WebSocket error: ${data['message']}');
          break;
      }
    } catch (e) {
      print('Error handling WebSocket message: $e');
    }
  }

  // Handle realtime update
  static void _handleRealtimeUpdate(Map<String, dynamic> data) {
    final update = RealtimeUpdate.fromJson(data['update']);
    final controller = _updateStreams[update.aquariumId];
    
    if (controller != null && !controller.isClosed) {
      controller.add(update);
    }
    
    // Also trigger specific update handlers
    _processUpdate(update);
  }

  // Process specific update types
  static void _processUpdate(RealtimeUpdate update) {
    // Here we would update local cache, trigger UI updates, etc.
    switch (update.type) {
      case UpdateType.parameterUpdate:
        // Update cached parameters
        break;
      case UpdateType.equipmentUpdate:
        // Update equipment list
        break;
      case UpdateType.inhabitantUpdate:
        // Update inhabitants
        break;
      case UpdateType.maintenanceUpdate:
        // Update maintenance tasks
        break;
      case UpdateType.collaboratorUpdate:
        // Update collaborator info
        break;
      case UpdateType.settingsUpdate:
        // Update aquarium settings
        break;
      default:
        break;
    }
  }

  // Handle collaborator joined
  static void _handleCollaboratorJoined(Map<String, dynamic> data) {
    final collaborator = Collaborator.fromJson(data['collaborator']);
    final aquariumId = collaborator.aquariumId;
    
    _onlineCollaborators[aquariumId] ??= [];
    _onlineCollaborators[aquariumId]!.add(collaborator);
    
    // Notify listeners
    final update = RealtimeUpdate(
      id: const Uuid().v4(),
      aquariumId: aquariumId,
      type: UpdateType.collaboratorUpdate,
      data: {
        'action': 'joined',
        'collaborator': collaborator.toJson(),
      },
      userId: collaborator.userId,
      timestamp: DateTime.now(),
    );
    
    _handleRealtimeUpdate({'update': update.toJson()});
  }

  // Handle collaborator left
  static void _handleCollaboratorLeft(Map<String, dynamic> data) {
    final userId = data['userId'] as String;
    final aquariumId = data['aquariumId'] as String;
    
    _onlineCollaborators[aquariumId]?.removeWhere((c) => c.userId == userId);
    
    // Notify listeners
    final update = RealtimeUpdate(
      id: const Uuid().v4(),
      aquariumId: aquariumId,
      type: UpdateType.collaboratorUpdate,
      data: {
        'action': 'left',
        'userId': userId,
      },
      userId: userId,
      timestamp: DateTime.now(),
    );
    
    _handleRealtimeUpdate({'update': update.toJson()});
  }

  // Handle online collaborators list
  static void _handleOnlineCollaborators(Map<String, dynamic> data) {
    final aquariumId = data['aquariumId'] as String;
    final collaboratorsList = data['collaborators'] as List;
    
    _onlineCollaborators[aquariumId] = collaboratorsList
        .map((c) => Collaborator.fromJson(c))
        .toList();
  }

  // Handle errors
  static void _handleError(error) {
    print('WebSocket error: $error');
    _disconnect();
    _scheduleReconnect();
  }

  // Handle disconnect
  static void _handleDisconnect() {
    print('WebSocket disconnected');
    _isConnected = false;
    _pingTimer?.cancel();
    _scheduleReconnect();
  }

  // Schedule reconnection
  static void _scheduleReconnect() {
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      print('Max reconnection attempts reached');
      return;
    }

    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(_reconnectDelay, () {
      _reconnectAttempts++;
      _connect();
    });
  }

  // Start ping timer
  static void _startPingTimer() {
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (_isConnected && _channel != null) {
        _sendMessage({'type': 'ping'});
      }
    });
  }

  // Send message
  static void _sendMessage(Map<String, dynamic> message) {
    if (_isConnected && _channel != null) {
      _channel!.sink.add(json.encode(message));
    }
  }

  // Subscribe to aquarium updates
  static Stream<RealtimeUpdate> subscribeToAquarium(String aquariumId) {
    _updateStreams[aquariumId] ??= StreamController<RealtimeUpdate>.broadcast();
    
    // Notify server about subscription
    _sendMessage({
      'type': 'subscribe',
      'aquariumId': aquariumId,
      'userId': _currentUserId,
    });
    
    return _updateStreams[aquariumId]!.stream;
  }

  // Unsubscribe from aquarium updates
  static void unsubscribeFromAquarium(String aquariumId) {
    _updateStreams[aquariumId]?.close();
    _updateStreams.remove(aquariumId);
    
    // Notify server about unsubscription
    _sendMessage({
      'type': 'unsubscribe',
      'aquariumId': aquariumId,
      'userId': _currentUserId,
    });
  }

  // Get online collaborators
  static List<Collaborator> getOnlineCollaborators(String aquariumId) {
    return _onlineCollaborators[aquariumId] ?? [];
  }

  // Send parameter update
  static void sendParameterUpdate(String aquariumId, WaterParameters parameters) {
    final update = RealtimeUpdate(
      id: const Uuid().v4(),
      aquariumId: aquariumId,
      type: UpdateType.parameterUpdate,
      data: parameters.toJson(),
      userId: _currentUserId!,
      timestamp: DateTime.now(),
    );
    
    _sendMessage({
      'type': 'update',
      'update': update.toJson(),
    });
  }

  // Send equipment update
  static void sendEquipmentUpdate(String aquariumId, String action, Equipment equipment) {
    final update = RealtimeUpdate(
      id: const Uuid().v4(),
      aquariumId: aquariumId,
      type: UpdateType.equipmentUpdate,
      data: {
        'action': action, // 'add', 'update', 'delete'
        'equipment': equipment.toJson(),
      },
      userId: _currentUserId!,
      timestamp: DateTime.now(),
    );
    
    _sendMessage({
      'type': 'update',
      'update': update.toJson(),
    });
  }

  // Send inhabitant update
  static void sendInhabitantUpdate(String aquariumId, String action, Inhabitant inhabitant) {
    final update = RealtimeUpdate(
      id: const Uuid().v4(),
      aquariumId: aquariumId,
      type: UpdateType.inhabitantUpdate,
      data: {
        'action': action, // 'add', 'update', 'delete'
        'inhabitant': inhabitant.toJson(),
      },
      userId: _currentUserId!,
      timestamp: DateTime.now(),
    );
    
    _sendMessage({
      'type': 'update',
      'update': update.toJson(),
    });
  }

  // Send maintenance update
  static void sendMaintenanceUpdate(String aquariumId, String action, Map<String, dynamic> task) {
    final update = RealtimeUpdate(
      id: const Uuid().v4(),
      aquariumId: aquariumId,
      type: UpdateType.maintenanceUpdate,
      data: {
        'action': action, // 'complete', 'add', 'update', 'delete'
        'task': task,
      },
      userId: _currentUserId!,
      timestamp: DateTime.now(),
    );
    
    _sendMessage({
      'type': 'update',
      'update': update.toJson(),
    });
  }

  // Send typing indicator
  static void sendTypingIndicator(String aquariumId, String field, bool isTyping) {
    _sendMessage({
      'type': 'typing',
      'aquariumId': aquariumId,
      'userId': _currentUserId,
      'field': field,
      'isTyping': isTyping,
    });
  }

  // Send cursor position (for collaborative editing)
  static void sendCursorPosition(String aquariumId, String field, int position) {
    _sendMessage({
      'type': 'cursor',
      'aquariumId': aquariumId,
      'userId': _currentUserId,
      'field': field,
      'position': position,
    });
  }

  // Disconnect
  static void _disconnect() {
    _isConnected = false;
    _pingTimer?.cancel();
    _reconnectTimer?.cancel();
    _channel?.sink.close();
    _channel = null;
  }

  // Dispose
  static void dispose() {
    _disconnect();
    for (final controller in _updateStreams.values) {
      controller.close();
    }
    _updateStreams.clear();
    _onlineCollaborators.clear();
  }
}