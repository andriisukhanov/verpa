import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../models/collaboration_models.dart';
import '../../auth/services/auth_service.dart';
import 'realtime_service.dart';

class CollaborationService {
  static const String _collaboratorsKey = 'collaborators';
  static const String _invitesKey = 'collaboration_invites';
  static const String _activitiesKey = 'collaboration_activities';

  // Get collaborators for aquarium
  static Future<List<Collaborator>> getCollaborators(String aquariumId) async {
    final prefs = await SharedPreferences.getInstance();
    final collaboratorsJson = prefs.getString('$_collaboratorsKey-$aquariumId');
    
    if (collaboratorsJson != null) {
      final List<dynamic> collaboratorsList = json.decode(collaboratorsJson);
      return collaboratorsList.map((c) => Collaborator.fromJson(c)).toList();
    }
    
    // Demo data
    final currentUserId = await AuthService.getCurrentUserId();
    return [
      Collaborator(
        id: '1',
        userId: currentUserId ?? 'user1',
        aquariumId: aquariumId,
        email: 'owner@example.com',
        name: 'Aquarium Owner',
        role: CollaboratorRole.owner,
        joinedAt: DateTime.now().subtract(const Duration(days: 30)),
        lastActiveAt: DateTime.now(),
        isOnline: true,
      ),
    ];
  }

  // Add collaborator
  static Future<bool> addCollaborator({
    required String aquariumId,
    required String email,
    required CollaboratorRole role,
    String? message,
  }) async {
    try {
      // Create invite
      final invite = CollaborationInvite(
        id: const Uuid().v4(),
        aquariumId: aquariumId,
        aquariumName: 'My Aquarium', // TODO: Get actual name
        inviterName: 'Current User', // TODO: Get actual name
        inviterEmail: 'current@example.com', // TODO: Get actual email
        inviteeEmail: email,
        role: role,
        message: message,
        createdAt: DateTime.now(),
        expiresAt: DateTime.now().add(const Duration(days: 7)),
      );
      
      // Save invite
      await _saveInvite(invite);
      
      // Send invite email (in real app)
      // await _sendInviteEmail(invite);
      
      return true;
    } catch (e) {
      print('Error adding collaborator: $e');
      return false;
    }
  }

  // Update collaborator role
  static Future<bool> updateCollaboratorRole({
    required String aquariumId,
    required String collaboratorId,
    required CollaboratorRole newRole,
  }) async {
    try {
      final collaborators = await getCollaborators(aquariumId);
      final index = collaborators.indexWhere((c) => c.id == collaboratorId);
      
      if (index != -1) {
        collaborators[index] = collaborators[index].copyWith(role: newRole);
        await _saveCollaborators(aquariumId, collaborators);
        
        // Notify via realtime
        RealtimeService.sendMaintenanceUpdate(
          aquariumId,
          'role_changed',
          {
            'collaboratorId': collaboratorId,
            'newRole': newRole.value,
          },
        );
        
        return true;
      }
      
      return false;
    } catch (e) {
      print('Error updating collaborator role: $e');
      return false;
    }
  }

  // Remove collaborator
  static Future<bool> removeCollaborator({
    required String aquariumId,
    required String collaboratorId,
  }) async {
    try {
      final collaborators = await getCollaborators(aquariumId);
      collaborators.removeWhere((c) => c.id == collaboratorId);
      await _saveCollaborators(aquariumId, collaborators);
      
      // Log activity
      await logActivity(
        aquariumId: aquariumId,
        type: ActivityType.collaboratorLeft,
        description: 'Collaborator removed from aquarium',
        data: {'collaboratorId': collaboratorId},
      );
      
      return true;
    } catch (e) {
      print('Error removing collaborator: $e');
      return false;
    }
  }

  // Get pending invites
  static Future<List<CollaborationInvite>> getPendingInvites({String? email}) async {
    final prefs = await SharedPreferences.getInstance();
    final invitesJson = prefs.getString(_invitesKey);
    
    if (invitesJson != null) {
      final List<dynamic> invitesList = json.decode(invitesJson);
      var invites = invitesList.map((i) => CollaborationInvite.fromJson(i)).toList();
      
      // Filter by email if provided
      if (email != null) {
        invites = invites.where((i) => i.inviteeEmail == email).toList();
      }
      
      // Filter pending and not expired
      return invites.where((i) => 
        i.status == InviteStatus.pending && !i.isExpired
      ).toList();
    }
    
    return [];
  }

  // Accept invite
  static Future<bool> acceptInvite(String inviteId) async {
    try {
      final invites = await _getAllInvites();
      final inviteIndex = invites.indexWhere((i) => i.id == inviteId);
      
      if (inviteIndex != -1) {
        final invite = invites[inviteIndex];
        
        // Create collaborator
        final collaborator = Collaborator(
          id: const Uuid().v4(),
          userId: await AuthService.getCurrentUserId() ?? '',
          aquariumId: invite.aquariumId,
          email: invite.inviteeEmail,
          name: 'New Collaborator', // TODO: Get from user profile
          role: invite.role,
          joinedAt: DateTime.now(),
          lastActiveAt: DateTime.now(),
        );
        
        // Add to collaborators
        final collaborators = await getCollaborators(invite.aquariumId);
        collaborators.add(collaborator);
        await _saveCollaborators(invite.aquariumId, collaborators);
        
        // Update invite status
        invites.removeAt(inviteIndex);
        await _saveAllInvites(invites);
        
        // Log activity
        await logActivity(
          aquariumId: invite.aquariumId,
          type: ActivityType.collaboratorJoined,
          description: '${collaborator.name} joined the aquarium',
          data: {'collaboratorId': collaborator.id},
        );
        
        return true;
      }
      
      return false;
    } catch (e) {
      print('Error accepting invite: $e');
      return false;
    }
  }

  // Decline invite
  static Future<bool> declineInvite(String inviteId) async {
    try {
      final invites = await _getAllInvites();
      invites.removeWhere((i) => i.id == inviteId);
      await _saveAllInvites(invites);
      return true;
    } catch (e) {
      print('Error declining invite: $e');
      return false;
    }
  }

  // Get collaboration activities
  static Future<List<CollaborationActivity>> getActivities(String aquariumId, {int limit = 50}) async {
    final prefs = await SharedPreferences.getInstance();
    final activitiesJson = prefs.getString('$_activitiesKey-$aquariumId');
    
    if (activitiesJson != null) {
      final List<dynamic> activitiesList = json.decode(activitiesJson);
      var activities = activitiesList.map((a) => CollaborationActivity.fromJson(a)).toList();
      
      // Sort by timestamp descending
      activities.sort((a, b) => b.timestamp.compareTo(a.timestamp));
      
      // Limit results
      if (activities.length > limit) {
        activities = activities.take(limit).toList();
      }
      
      return activities;
    }
    
    return [];
  }

  // Log activity
  static Future<void> logActivity({
    required String aquariumId,
    required ActivityType type,
    required String description,
    Map<String, dynamic>? data,
  }) async {
    try {
      final currentUserId = await AuthService.getCurrentUserId();
      final activity = CollaborationActivity(
        id: const Uuid().v4(),
        aquariumId: aquariumId,
        userId: currentUserId ?? '',
        userName: 'Current User', // TODO: Get actual name
        type: type,
        description: description,
        data: data,
        timestamp: DateTime.now(),
      );
      
      final activities = await getActivities(aquariumId, limit: 100);
      activities.insert(0, activity);
      
      // Keep only last 100 activities
      if (activities.length > 100) {
        activities.removeRange(100, activities.length);
      }
      
      await _saveActivities(aquariumId, activities);
    } catch (e) {
      print('Error logging activity: $e');
    }
  }

  // Check user permissions
  static Future<bool> hasPermission({
    required String aquariumId,
    required PermissionType permission,
  }) async {
    try {
      final currentUserId = await AuthService.getCurrentUserId();
      final collaborators = await getCollaborators(aquariumId);
      final collaborator = collaborators.firstWhere(
        (c) => c.userId == currentUserId,
        orElse: () => collaborators.first, // Fallback to owner for testing
      );
      
      return collaborator.hasPermission(permission);
    } catch (e) {
      print('Error checking permission: $e');
      return false;
    }
  }

  // Get user role
  static Future<CollaboratorRole?> getUserRole(String aquariumId) async {
    try {
      final currentUserId = await AuthService.getCurrentUserId();
      final collaborators = await getCollaborators(aquariumId);
      final collaborator = collaborators.firstWhere(
        (c) => c.userId == currentUserId,
        orElse: () => collaborators.first, // Fallback to owner for testing
      );
      
      return collaborator.role;
    } catch (e) {
      print('Error getting user role: $e');
      return null;
    }
  }

  // Update custom permissions
  static Future<bool> updateCustomPermissions({
    required String aquariumId,
    required String collaboratorId,
    required Map<String, bool> permissions,
  }) async {
    try {
      final collaborators = await getCollaborators(aquariumId);
      final index = collaborators.indexWhere((c) => c.id == collaboratorId);
      
      if (index != -1) {
        collaborators[index] = collaborators[index].copyWith(
          customPermissions: permissions.map((k, v) => MapEntry(k, v)),
        );
        await _saveCollaborators(aquariumId, collaborators);
        return true;
      }
      
      return false;
    } catch (e) {
      print('Error updating custom permissions: $e');
      return false;
    }
  }

  // Private helper methods
  static Future<void> _saveCollaborators(String aquariumId, List<Collaborator> collaborators) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      '$_collaboratorsKey-$aquariumId',
      json.encode(collaborators.map((c) => c.toJson()).toList()),
    );
  }

  static Future<void> _saveInvite(CollaborationInvite invite) async {
    final invites = await _getAllInvites();
    invites.add(invite);
    await _saveAllInvites(invites);
  }

  static Future<List<CollaborationInvite>> _getAllInvites() async {
    final prefs = await SharedPreferences.getInstance();
    final invitesJson = prefs.getString(_invitesKey);
    
    if (invitesJson != null) {
      final List<dynamic> invitesList = json.decode(invitesJson);
      return invitesList.map((i) => CollaborationInvite.fromJson(i)).toList();
    }
    
    return [];
  }

  static Future<void> _saveAllInvites(List<CollaborationInvite> invites) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _invitesKey,
      json.encode(invites.map((i) => i.toJson()).toList()),
    );
  }

  static Future<void> _saveActivities(String aquariumId, List<CollaborationActivity> activities) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      '$_activitiesKey-$aquariumId',
      json.encode(activities.map((a) => a.toJson()).toList()),
    );
  }
}