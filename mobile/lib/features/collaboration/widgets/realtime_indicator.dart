import 'package:flutter/material.dart';
import 'dart:async';

import '../../../core/theme/app_theme.dart';
import '../models/collaboration_models.dart';
import '../services/realtime_service.dart';

class RealtimeIndicator extends StatefulWidget {
  final String aquariumId;
  final bool showOnlineCount;
  final bool showActivityPulse;

  const RealtimeIndicator({
    super.key,
    required this.aquariumId,
    this.showOnlineCount = true,
    this.showActivityPulse = true,
  });

  @override
  State<RealtimeIndicator> createState() => _RealtimeIndicatorState();
}

class _RealtimeIndicatorState extends State<RealtimeIndicator>
    with SingleTickerProviderStateMixin {
  List<Collaborator> _onlineCollaborators = [];
  StreamSubscription<RealtimeUpdate>? _subscription;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  Timer? _pulseTimer;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );
    _pulseAnimation = Tween<double>(
      begin: 1.0,
      end: 1.3,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));
    
    _loadOnlineCollaborators();
    _subscribeToUpdates();
  }

  @override
  void dispose() {
    _subscription?.cancel();
    _pulseController.dispose();
    _pulseTimer?.cancel();
    super.dispose();
  }

  void _loadOnlineCollaborators() {
    setState(() {
      _onlineCollaborators = RealtimeService.getOnlineCollaborators(widget.aquariumId);
    });
  }

  void _subscribeToUpdates() {
    _subscription = RealtimeService.subscribeToAquarium(widget.aquariumId).listen((update) {
      if (update.type == UpdateType.collaboratorUpdate) {
        _loadOnlineCollaborators();
        if (widget.showActivityPulse) {
          _triggerPulse();
        }
      }
    });
  }

  void _triggerPulse() {
    _pulseController.forward().then((_) {
      _pulseController.reverse();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_onlineCollaborators.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.successColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppTheme.successColor.withOpacity(0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedBuilder(
            animation: _pulseAnimation,
            builder: (context, child) {
              return Transform.scale(
                scale: _pulseAnimation.value,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: AppTheme.successColor,
                    shape: BoxShape.circle,
                  ),
                ),
              );
            },
          ),
          const SizedBox(width: 8),
          if (widget.showOnlineCount)
            Text(
              '${_onlineCollaborators.length} online',
              style: TextStyle(
                fontSize: 12,
                color: AppTheme.successColor,
                fontWeight: FontWeight.w600,
              ),
            )
          else
            const Icon(
              Icons.people,
              size: 16,
              color: AppTheme.successColor,
            ),
        ],
      ),
    );
  }
}

class CollaboratorCursors extends StatefulWidget {
  final String aquariumId;
  final String fieldId;
  final Widget child;

  const CollaboratorCursors({
    super.key,
    required this.aquariumId,
    required this.fieldId,
    required this.child,
  });

  @override
  State<CollaboratorCursors> createState() => _CollaboratorCursorsState();
}

class _CollaboratorCursorsState extends State<CollaboratorCursors> {
  final Map<String, CursorPosition> _cursors = {};
  StreamSubscription<RealtimeUpdate>? _subscription;

  @override
  void initState() {
    super.initState();
    _subscribeToUpdates();
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  void _subscribeToUpdates() {
    // In a real implementation, this would listen for cursor position updates
    // For now, we'll just show a placeholder
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        ..._cursors.entries.map((entry) => _buildCursor(entry.key, entry.value)),
      ],
    );
  }

  Widget _buildCursor(String userId, CursorPosition position) {
    return Positioned(
      left: position.x,
      top: position.y,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
        decoration: BoxDecoration(
          color: position.color,
          borderRadius: BorderRadius.circular(4),
        ),
        child: Text(
          position.userName,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 10,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}

class CursorPosition {
  final double x;
  final double y;
  final Color color;
  final String userName;

  CursorPosition({
    required this.x,
    required this.y,
    required this.color,
    required this.userName,
  });
}

class TypingIndicator extends StatefulWidget {
  final String aquariumId;
  final String fieldId;

  const TypingIndicator({
    super.key,
    required this.aquariumId,
    required this.fieldId,
  });

  @override
  State<TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<TypingIndicator>
    with SingleTickerProviderStateMixin {
  final List<String> _typingUsers = [];
  StreamSubscription<RealtimeUpdate>? _subscription;
  late AnimationController _animationController;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    _animation = CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    );
    _animationController.repeat();
    
    _subscribeToUpdates();
  }

  @override
  void dispose() {
    _subscription?.cancel();
    _animationController.dispose();
    super.dispose();
  }

  void _subscribeToUpdates() {
    // In a real implementation, this would listen for typing indicators
    // For now, we'll just show a placeholder
  }

  @override
  Widget build(BuildContext context) {
    if (_typingUsers.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.grey[200],
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          ..._buildDots(),
          const SizedBox(width: 8),
          Text(
            _typingUsers.length == 1
                ? '${_typingUsers.first} is typing'
                : '${_typingUsers.length} people are typing',
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildDots() {
    return List.generate(3, (index) {
      return AnimatedBuilder(
        animation: _animation,
        builder: (context, child) {
          final offset = (index * 0.3);
          final value = (_animation.value + offset) % 1.0;
          
          return Container(
            margin: const EdgeInsets.only(right: 3),
            child: Transform.translate(
              offset: Offset(0, -4 * (value < 0.5 ? value : 1.0 - value)),
              child: Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: Colors.grey[600],
                  shape: BoxShape.circle,
                ),
              ),
            ),
          );
        },
      );
    });
  }
}

class RealtimeEditingIndicator extends StatelessWidget {
  final List<String> editingUsers;
  final String fieldName;

  const RealtimeEditingIndicator({
    super.key,
    required this.editingUsers,
    required this.fieldName,
  });

  @override
  Widget build(BuildContext context) {
    if (editingUsers.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.amber.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(
          color: Colors.amber.withOpacity(0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.edit,
            size: 14,
            color: Colors.amber[700],
          ),
          const SizedBox(width: 4),
          Text(
            editingUsers.length == 1
                ? '${editingUsers.first} is editing $fieldName'
                : '${editingUsers.length} people are editing $fieldName',
            style: TextStyle(
              fontSize: 11,
              color: Colors.amber[700],
            ),
          ),
        ],
      ),
    );
  }
}