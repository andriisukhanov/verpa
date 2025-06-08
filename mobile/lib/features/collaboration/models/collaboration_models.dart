import 'package:flutter/material.dart';

enum CollaboratorRole {
  owner('owner', 'Owner', Icons.star, Color(0xFFFFD700)),
  admin('admin', 'Admin', Icons.shield, Color(0xFF4CAF50)),
  editor('editor', 'Editor', Icons.edit, Color(0xFF2196F3)),
  viewer('viewer', 'Viewer', Icons.visibility, Color(0xFF9E9E9E));

  final String value;
  final String displayName;
  final IconData icon;
  final Color color;

  const CollaboratorRole(this.value, this.displayName, this.icon, this.color);
}

enum PermissionType {
  viewParameters('view_parameters', 'View Water Parameters'),
  editParameters('edit_parameters', 'Edit Water Parameters'),
  viewEquipment('view_equipment', 'View Equipment'),
  editEquipment('edit_equipment', 'Edit Equipment'),
  viewInhabitants('view_inhabitants', 'View Inhabitants'),
  editInhabitants('edit_inhabitants', 'Edit Inhabitants'),
  viewSchedules('view_schedules', 'View Schedules'),
  editSchedules('edit_schedules', 'Edit Schedules'),
  viewExpenses('view_expenses', 'View Expenses'),
  editExpenses('edit_expenses', 'Edit Expenses'),
  viewMaintenance('view_maintenance', 'View Maintenance'),
  editMaintenance('edit_maintenance', 'Edit Maintenance'),
  manageCollaborators('manage_collaborators', 'Manage Collaborators'),
  deleteAquarium('delete_aquarium', 'Delete Aquarium');

  final String value;
  final String displayName;

  const PermissionType(this.value, this.displayName);
}

class RolePermissions {
  static const Map<CollaboratorRole, List<PermissionType>> permissions = {
    CollaboratorRole.owner: PermissionType.values,
    CollaboratorRole.admin: [
      PermissionType.viewParameters,
      PermissionType.editParameters,
      PermissionType.viewEquipment,
      PermissionType.editEquipment,
      PermissionType.viewInhabitants,
      PermissionType.editInhabitants,
      PermissionType.viewSchedules,
      PermissionType.editSchedules,
      PermissionType.viewExpenses,
      PermissionType.editExpenses,
      PermissionType.viewMaintenance,
      PermissionType.editMaintenance,
      PermissionType.manageCollaborators,
    ],
    CollaboratorRole.editor: [
      PermissionType.viewParameters,
      PermissionType.editParameters,
      PermissionType.viewEquipment,
      PermissionType.editEquipment,
      PermissionType.viewInhabitants,
      PermissionType.editInhabitants,
      PermissionType.viewSchedules,
      PermissionType.editSchedules,
      PermissionType.viewMaintenance,
      PermissionType.editMaintenance,
    ],
    CollaboratorRole.viewer: [
      PermissionType.viewParameters,
      PermissionType.viewEquipment,
      PermissionType.viewInhabitants,
      PermissionType.viewSchedules,
      PermissionType.viewExpenses,
      PermissionType.viewMaintenance,
    ],
  };

  static bool hasPermission(CollaboratorRole role, PermissionType permission) {
    return permissions[role]?.contains(permission) ?? false;
  }
}

class Collaborator {
  final String id;
  final String userId;
  final String aquariumId;
  final String email;
  final String name;
  final String? avatarUrl;
  final CollaboratorRole role;
  final DateTime joinedAt;
  final DateTime lastActiveAt;
  final bool isOnline;
  final Map<String, dynamic>? customPermissions;

  Collaborator({
    required this.id,
    required this.userId,
    required this.aquariumId,
    required this.email,
    required this.name,
    this.avatarUrl,
    required this.role,
    required this.joinedAt,
    required this.lastActiveAt,
    this.isOnline = false,
    this.customPermissions,
  });

  bool hasPermission(PermissionType permission) {
    // Check custom permissions first
    if (customPermissions != null && customPermissions!.containsKey(permission.value)) {
      return customPermissions![permission.value] as bool;
    }
    // Fall back to role-based permissions
    return RolePermissions.hasPermission(role, permission);
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'userId': userId,
    'aquariumId': aquariumId,
    'email': email,
    'name': name,
    'avatarUrl': avatarUrl,
    'role': role.value,
    'joinedAt': joinedAt.toIso8601String(),
    'lastActiveAt': lastActiveAt.toIso8601String(),
    'isOnline': isOnline,
    'customPermissions': customPermissions,
  };

  factory Collaborator.fromJson(Map<String, dynamic> json) {
    return Collaborator(
      id: json['id'],
      userId: json['userId'],
      aquariumId: json['aquariumId'],
      email: json['email'],
      name: json['name'],
      avatarUrl: json['avatarUrl'],
      role: CollaboratorRole.values.firstWhere(
        (r) => r.value == json['role'],
        orElse: () => CollaboratorRole.viewer,
      ),
      joinedAt: DateTime.parse(json['joinedAt']),
      lastActiveAt: DateTime.parse(json['lastActiveAt']),
      isOnline: json['isOnline'] ?? false,
      customPermissions: json['customPermissions'],
    );
  }

  Collaborator copyWith({
    CollaboratorRole? role,
    DateTime? lastActiveAt,
    bool? isOnline,
    Map<String, dynamic>? customPermissions,
  }) {
    return Collaborator(
      id: id,
      userId: userId,
      aquariumId: aquariumId,
      email: email,
      name: name,
      avatarUrl: avatarUrl,
      role: role ?? this.role,
      joinedAt: joinedAt,
      lastActiveAt: lastActiveAt ?? this.lastActiveAt,
      isOnline: isOnline ?? this.isOnline,
      customPermissions: customPermissions ?? this.customPermissions,
    );
  }
}

class CollaborationInvite {
  final String id;
  final String aquariumId;
  final String aquariumName;
  final String inviterName;
  final String inviterEmail;
  final String inviteeEmail;
  final CollaboratorRole role;
  final String? message;
  final DateTime createdAt;
  final DateTime expiresAt;
  final InviteStatus status;

  CollaborationInvite({
    required this.id,
    required this.aquariumId,
    required this.aquariumName,
    required this.inviterName,
    required this.inviterEmail,
    required this.inviteeEmail,
    required this.role,
    this.message,
    required this.createdAt,
    required this.expiresAt,
    this.status = InviteStatus.pending,
  });

  bool get isExpired => DateTime.now().isAfter(expiresAt);

  Map<String, dynamic> toJson() => {
    'id': id,
    'aquariumId': aquariumId,
    'aquariumName': aquariumName,
    'inviterName': inviterName,
    'inviterEmail': inviterEmail,
    'inviteeEmail': inviteeEmail,
    'role': role.value,
    'message': message,
    'createdAt': createdAt.toIso8601String(),
    'expiresAt': expiresAt.toIso8601String(),
    'status': status.value,
  };

  factory CollaborationInvite.fromJson(Map<String, dynamic> json) {
    return CollaborationInvite(
      id: json['id'],
      aquariumId: json['aquariumId'],
      aquariumName: json['aquariumName'],
      inviterName: json['inviterName'],
      inviterEmail: json['inviterEmail'],
      inviteeEmail: json['inviteeEmail'],
      role: CollaboratorRole.values.firstWhere(
        (r) => r.value == json['role'],
        orElse: () => CollaboratorRole.viewer,
      ),
      message: json['message'],
      createdAt: DateTime.parse(json['createdAt']),
      expiresAt: DateTime.parse(json['expiresAt']),
      status: InviteStatus.values.firstWhere(
        (s) => s.value == json['status'],
        orElse: () => InviteStatus.pending,
      ),
    );
  }
}

enum InviteStatus {
  pending('pending'),
  accepted('accepted'),
  declined('declined'),
  expired('expired');

  final String value;
  const InviteStatus(this.value);
}

class CollaborationActivity {
  final String id;
  final String aquariumId;
  final String userId;
  final String userName;
  final String? userAvatar;
  final ActivityType type;
  final String description;
  final Map<String, dynamic>? data;
  final DateTime timestamp;

  CollaborationActivity({
    required this.id,
    required this.aquariumId,
    required this.userId,
    required this.userName,
    this.userAvatar,
    required this.type,
    required this.description,
    this.data,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'aquariumId': aquariumId,
    'userId': userId,
    'userName': userName,
    'userAvatar': userAvatar,
    'type': type.value,
    'description': description,
    'data': data,
    'timestamp': timestamp.toIso8601String(),
  };

  factory CollaborationActivity.fromJson(Map<String, dynamic> json) {
    return CollaborationActivity(
      id: json['id'],
      aquariumId: json['aquariumId'],
      userId: json['userId'],
      userName: json['userName'],
      userAvatar: json['userAvatar'],
      type: ActivityType.values.firstWhere(
        (t) => t.value == json['type'],
        orElse: () => ActivityType.other,
      ),
      description: json['description'],
      data: json['data'],
      timestamp: DateTime.parse(json['timestamp']),
    );
  }
}

enum ActivityType {
  parameterRecorded('parameter_recorded', Icons.science),
  equipmentAdded('equipment_added', Icons.settings),
  equipmentRemoved('equipment_removed', Icons.settings),
  inhabitantAdded('inhabitant_added', Icons.pets),
  inhabitantRemoved('inhabitant_removed', Icons.pets),
  maintenanceCompleted('maintenance_completed', Icons.check_circle),
  waterChanged('water_changed', Icons.water_drop),
  collaboratorJoined('collaborator_joined', Icons.person_add),
  collaboratorLeft('collaborator_left', Icons.person_remove),
  roleChanged('role_changed', Icons.shield),
  settingsChanged('settings_changed', Icons.settings),
  other('other', Icons.info);

  final String value;
  final IconData icon;

  const ActivityType(this.value, this.icon);
}

class RealtimeUpdate {
  final String id;
  final String aquariumId;
  final UpdateType type;
  final Map<String, dynamic> data;
  final String userId;
  final DateTime timestamp;

  RealtimeUpdate({
    required this.id,
    required this.aquariumId,
    required this.type,
    required this.data,
    required this.userId,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'aquariumId': aquariumId,
    'type': type.value,
    'data': data,
    'userId': userId,
    'timestamp': timestamp.toIso8601String(),
  };

  factory RealtimeUpdate.fromJson(Map<String, dynamic> json) {
    return RealtimeUpdate(
      id: json['id'],
      aquariumId: json['aquariumId'],
      type: UpdateType.values.firstWhere(
        (t) => t.value == json['type'],
        orElse: () => UpdateType.other,
      ),
      data: json['data'],
      userId: json['userId'],
      timestamp: DateTime.parse(json['timestamp']),
    );
  }
}

enum UpdateType {
  parameterUpdate('parameter_update'),
  equipmentUpdate('equipment_update'),
  inhabitantUpdate('inhabitant_update'),
  maintenanceUpdate('maintenance_update'),
  collaboratorUpdate('collaborator_update'),
  settingsUpdate('settings_update'),
  other('other');

  final String value;
  const UpdateType(this.value);
}

class CollaborationSession {
  final String sessionId;
  final String aquariumId;
  final String userId;
  final DateTime startedAt;
  final DateTime? endedAt;
  final List<String> viewedScreens;
  final Map<String, int> actionsCount;

  CollaborationSession({
    required this.sessionId,
    required this.aquariumId,
    required this.userId,
    required this.startedAt,
    this.endedAt,
    this.viewedScreens = const [],
    this.actionsCount = const {},
  });

  Duration get duration => (endedAt ?? DateTime.now()).difference(startedAt);
}