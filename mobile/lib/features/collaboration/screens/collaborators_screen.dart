import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/empty_state.dart';
import '../models/collaboration_models.dart';
import '../services/collaboration_service.dart';
import '../services/realtime_service.dart';
import '../widgets/add_collaborator_dialog.dart';
import '../widgets/collaborator_permissions_dialog.dart';

class CollaboratorsScreen extends StatefulWidget {
  final String aquariumId;
  final String aquariumName;

  const CollaboratorsScreen({
    super.key,
    required this.aquariumId,
    required this.aquariumName,
  });

  @override
  State<CollaboratorsScreen> createState() => _CollaboratorsScreenState();
}

class _CollaboratorsScreenState extends State<CollaboratorsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<Collaborator>? _collaborators;
  List<CollaborationActivity>? _activities;
  bool _isLoading = true;
  CollaboratorRole? _currentUserRole;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
    _subscribeToUpdates();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);

    try {
      final results = await Future.wait([
        CollaborationService.getCollaborators(widget.aquariumId),
        CollaborationService.getActivities(widget.aquariumId),
        CollaborationService.getUserRole(widget.aquariumId),
      ]);

      setState(() {
        _collaborators = results[0] as List<Collaborator>;
        _activities = results[1] as List<CollaborationActivity>;
        _currentUserRole = results[2] as CollaboratorRole?;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  void _subscribeToUpdates() {
    RealtimeService.subscribeToAquarium(widget.aquariumId).listen((update) {
      if (update.type == UpdateType.collaboratorUpdate) {
        _loadData();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Collaborators'),
            Text(
              widget.aquariumName,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.normal),
            ),
          ],
        ),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(text: 'Team'),
            Tab(text: 'Activity'),
          ],
        ),
        actions: [
          if (_currentUserRole == CollaboratorRole.owner ||
              _currentUserRole == CollaboratorRole.admin)
            IconButton(
              icon: const Icon(Icons.person_add),
              onPressed: _showAddCollaboratorDialog,
            ),
        ],
      ),
      body: _isLoading
          ? const LoadingIndicator()
          : TabBarView(
              controller: _tabController,
              children: [
                _buildTeamTab(),
                _buildActivityTab(),
              ],
            ),
    );
  }

  Widget _buildTeamTab() {
    if (_collaborators == null || _collaborators!.isEmpty) {
      return EmptyState(
        icon: Icons.people,
        title: 'No Collaborators',
        message: 'Invite team members to help manage this aquarium',
        actionLabel: 'Add Collaborator',
        onAction: _currentUserRole == CollaboratorRole.owner ||
                _currentUserRole == CollaboratorRole.admin
            ? _showAddCollaboratorDialog
            : null,
      );
    }

    // Get online collaborators
    final onlineCollaborators = RealtimeService.getOnlineCollaborators(widget.aquariumId);
    final onlineUserIds = onlineCollaborators.map((c) => c.userId).toSet();

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _collaborators!.length,
      itemBuilder: (context, index) {
        final collaborator = _collaborators![index];
        final isOnline = onlineUserIds.contains(collaborator.userId);
        
        return _buildCollaboratorCard(
          collaborator.copyWith(isOnline: isOnline),
        );
      },
    );
  }

  Widget _buildCollaboratorCard(Collaborator collaborator) {
    final canManage = _currentUserRole == CollaboratorRole.owner ||
        (_currentUserRole == CollaboratorRole.admin &&
            collaborator.role != CollaboratorRole.owner);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: Stack(
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: collaborator.role.color.withOpacity(0.2),
              backgroundImage: collaborator.avatarUrl != null
                  ? NetworkImage(collaborator.avatarUrl!)
                  : null,
              child: collaborator.avatarUrl == null
                  ? Text(
                      collaborator.name.isNotEmpty
                          ? collaborator.name[0].toUpperCase()
                          : 'U',
                      style: TextStyle(
                        color: collaborator.role.color,
                        fontWeight: FontWeight.bold,
                      ),
                    )
                  : null,
            ),
            if (collaborator.isOnline)
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: AppTheme.successColor,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                ),
              ),
          ],
        ),
        title: Row(
          children: [
            Text(
              collaborator.name,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: collaborator.role.color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: collaborator.role.color.withOpacity(0.3),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    collaborator.role.icon,
                    size: 12,
                    color: collaborator.role.color,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    collaborator.role.displayName,
                    style: TextStyle(
                      fontSize: 12,
                      color: collaborator.role.color,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(collaborator.email),
            const SizedBox(height: 4),
            Text(
              collaborator.isOnline
                  ? 'Online now'
                  : 'Last seen ${_formatLastSeen(collaborator.lastActiveAt)}',
              style: TextStyle(
                fontSize: 12,
                color: collaborator.isOnline
                    ? AppTheme.successColor
                    : Colors.grey[600],
              ),
            ),
          ],
        ),
        trailing: canManage
            ? PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert),
                onSelected: (value) {
                  switch (value) {
                    case 'permissions':
                      _showPermissionsDialog(collaborator);
                      break;
                    case 'change_role':
                      _showChangeRoleDialog(collaborator);
                      break;
                    case 'remove':
                      _showRemoveConfirmation(collaborator);
                      break;
                  }
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(
                    value: 'permissions',
                    child: Row(
                      children: [
                        Icon(Icons.security, color: Colors.black54),
                        SizedBox(width: 8),
                        Text('Permissions'),
                      ],
                    ),
                  ),
                  if (collaborator.role != CollaboratorRole.owner)
                    const PopupMenuItem(
                      value: 'change_role',
                      child: Row(
                        children: [
                          Icon(Icons.swap_horiz, color: Colors.black54),
                          SizedBox(width: 8),
                          Text('Change Role'),
                        ],
                      ),
                    ),
                  if (collaborator.role != CollaboratorRole.owner)
                    const PopupMenuItem(
                      value: 'remove',
                      child: Row(
                        children: [
                          Icon(Icons.person_remove, color: Colors.red),
                          SizedBox(width: 8),
                          Text('Remove', style: TextStyle(color: Colors.red)),
                        ],
                      ),
                    ),
                ],
              )
            : null,
      ),
    );
  }

  Widget _buildActivityTab() {
    if (_activities == null || _activities!.isEmpty) {
      return EmptyState(
        icon: Icons.history,
        title: 'No Activity',
        message: 'Collaboration activity will appear here',
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _activities!.length,
      itemBuilder: (context, index) {
        final activity = _activities![index];
        return _buildActivityItem(activity);
      },
    );
  }

  Widget _buildActivityItem(CollaborationActivity activity) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Timeline indicator
          Column(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  activity.type.icon,
                  size: 20,
                  color: AppTheme.primaryColor,
                ),
              ),
              if (_activities!.indexOf(activity) < _activities!.length - 1)
                Container(
                  width: 2,
                  height: 60,
                  color: Colors.grey[300],
                ),
            ],
          ),
          const SizedBox(width: 16),
          // Activity details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    if (activity.userAvatar != null)
                      CircleAvatar(
                        radius: 12,
                        backgroundImage: NetworkImage(activity.userAvatar!),
                      )
                    else
                      CircleAvatar(
                        radius: 12,
                        backgroundColor: AppTheme.primaryColor,
                        child: Text(
                          activity.userName.isNotEmpty
                              ? activity.userName[0].toUpperCase()
                              : 'U',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    const SizedBox(width: 8),
                    Text(
                      activity.userName,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(activity.description),
                const SizedBox(height: 4),
                Text(
                  _formatActivityTime(activity.timestamp),
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showAddCollaboratorDialog() {
    showDialog(
      context: context,
      builder: (context) => AddCollaboratorDialog(
        aquariumId: widget.aquariumId,
        aquariumName: widget.aquariumName,
        onSuccess: _loadData,
      ),
    );
  }

  void _showPermissionsDialog(Collaborator collaborator) {
    showDialog(
      context: context,
      builder: (context) => CollaboratorPermissionsDialog(
        collaborator: collaborator,
        onUpdate: _loadData,
      ),
    );
  }

  void _showChangeRoleDialog(Collaborator collaborator) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Change Role'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: CollaboratorRole.values
              .where((role) => role != CollaboratorRole.owner)
              .map((role) => RadioListTile<CollaboratorRole>(
                    value: role,
                    groupValue: collaborator.role,
                    onChanged: (value) async {
                      if (value != null) {
                        Navigator.pop(context);
                        await CollaborationService.updateCollaboratorRole(
                          aquariumId: widget.aquariumId,
                          collaboratorId: collaborator.id,
                          newRole: value,
                        );
                        _loadData();
                      }
                    },
                    title: Text(role.displayName),
                    secondary: Icon(role.icon, color: role.color),
                  ))
              .toList(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }

  void _showRemoveConfirmation(Collaborator collaborator) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove Collaborator?'),
        content: Text(
          'Are you sure you want to remove ${collaborator.name} from this aquarium?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await CollaborationService.removeCollaborator(
                aquariumId: widget.aquariumId,
                collaboratorId: collaborator.id,
              );
              _loadData();
            },
            style: TextButton.styleFrom(
              foregroundColor: AppTheme.errorColor,
            ),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
  }

  String _formatLastSeen(DateTime lastSeen) {
    final now = DateTime.now();
    final difference = now.difference(lastSeen);

    if (difference.inMinutes < 1) {
      return 'just now';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inDays < 1) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return DateFormat('MMM d').format(lastSeen);
    }
  }

  String _formatActivityTime(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes} minutes ago';
    } else if (difference.inDays < 1) {
      return '${difference.inHours} hours ago';
    } else if (difference.inDays == 1) {
      return 'Yesterday at ${DateFormat('h:mm a').format(timestamp)}';
    } else if (difference.inDays < 7) {
      return DateFormat('EEEE at h:mm a').format(timestamp);
    } else {
      return DateFormat('MMM d at h:mm a').format(timestamp);
    }
  }
}