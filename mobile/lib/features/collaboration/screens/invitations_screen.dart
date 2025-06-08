import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../auth/services/auth_service.dart';
import '../models/collaboration_models.dart';
import '../services/collaboration_service.dart';

class InvitationsScreen extends StatefulWidget {
  const InvitationsScreen({super.key});

  @override
  State<InvitationsScreen> createState() => _InvitationsScreenState();
}

class _InvitationsScreenState extends State<InvitationsScreen> {
  List<CollaborationInvite>? _invites;
  bool _isLoading = true;
  String? _userEmail;

  @override
  void initState() {
    super.initState();
    _loadInvites();
  }

  Future<void> _loadInvites() async {
    setState(() => _isLoading = true);

    try {
      // Get current user email
      final user = await AuthService.getCurrentUser();
      _userEmail = user?.email;
      
      if (_userEmail != null) {
        final invites = await CollaborationService.getPendingInvites(
          email: _userEmail,
        );
        
        setState(() {
          _invites = invites;
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Collaboration Invitations'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const LoadingIndicator()
          : _invites == null || _invites!.isEmpty
              ? EmptyState(
                  icon: Icons.mail_outline,
                  title: 'No Invitations',
                  message: 'You don\'t have any pending collaboration invitations',
                  actionLabel: 'Refresh',
                  onAction: _loadInvites,
                )
              : RefreshIndicator(
                  onRefresh: _loadInvites,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _invites!.length,
                    itemBuilder: (context, index) {
                      return _buildInviteCard(_invites![index]);
                    },
                  ),
                ),
    );
  }

  Widget _buildInviteCard(CollaborationInvite invite) {
    final daysLeft = invite.expiresAt.difference(DateTime.now()).inDays;
    final isExpiringSoon = daysLeft <= 2;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with aquarium info
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.05),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.water,
                  color: AppTheme.primaryColor,
                  size: 32,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        invite.aquariumName,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            invite.role.icon,
                            size: 14,
                            color: invite.role.color,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Invited as ${invite.role.displayName}',
                            style: TextStyle(
                              fontSize: 14,
                              color: invite.role.color,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          // Inviter info
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: AppTheme.primaryColor.withOpacity(0.2),
                      child: Text(
                        invite.inviterName.isNotEmpty
                            ? invite.inviterName[0].toUpperCase()
                            : 'U',
                        style: TextStyle(
                          color: AppTheme.primaryColor,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            invite.inviterName,
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          Text(
                            invite.inviterEmail,
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
                
                if (invite.message != null && invite.message!.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey[100],
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.grey[300]!),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.message,
                              size: 16,
                              color: Colors.grey[600],
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Personal Message',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          invite.message!,
                          style: const TextStyle(fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                ],
                
                const SizedBox(height: 16),
                
                // Permissions preview
                _buildPermissionsPreview(invite.role),
                
                const SizedBox(height: 16),
                
                // Expiry info
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isExpiringSoon
                        ? Colors.orange.withOpacity(0.1)
                        : Colors.grey[100],
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.timer,
                        size: 14,
                        color: isExpiringSoon ? Colors.orange : Colors.grey[600],
                      ),
                      const SizedBox(width: 4),
                      Text(
                        daysLeft > 0
                            ? 'Expires in $daysLeft days'
                            : 'Expires today',
                        style: TextStyle(
                          fontSize: 12,
                          color: isExpiringSoon ? Colors.orange : Colors.grey[600],
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          // Action buttons
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey[50],
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(12),
                bottomRight: Radius.circular(12),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: CustomButton(
                    text: 'Decline',
                    variant: ButtonVariant.outline,
                    onPressed: () => _handleInvite(invite, false),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: CustomButton(
                    text: 'Accept',
                    onPressed: () => _handleInvite(invite, true),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPermissionsPreview(CollaboratorRole role) {
    final permissions = RolePermissions.permissions[role] ?? [];
    final viewPermissions = permissions.where((p) => p.value.startsWith('view')).length;
    final editPermissions = permissions.where((p) => p.value.startsWith('edit')).length;
    final managePermissions = permissions.where((p) => p.value.startsWith('manage')).length;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: role.color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: role.color.withOpacity(0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Permissions as ${role.displayName}',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: role.color,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 12,
            runSpacing: 8,
            children: [
              if (viewPermissions > 0)
                _buildPermissionChip(
                  Icons.visibility,
                  '$viewPermissions View',
                  Colors.blue,
                ),
              if (editPermissions > 0)
                _buildPermissionChip(
                  Icons.edit,
                  '$editPermissions Edit',
                  Colors.green,
                ),
              if (managePermissions > 0)
                _buildPermissionChip(
                  Icons.settings,
                  '$managePermissions Manage',
                  Colors.orange,
                ),
              if (role == CollaboratorRole.owner)
                _buildPermissionChip(
                  Icons.star,
                  'Full Access',
                  Colors.amber,
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPermissionChip(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withOpacity(0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleInvite(CollaborationInvite invite, bool accept) async {
    final action = accept ? 'accept' : 'decline';
    
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('${accept ? 'Accept' : 'Decline'} Invitation?'),
        content: Text(
          accept
              ? 'You will be added as a ${invite.role.displayName} to ${invite.aquariumName}.'
              : 'Are you sure you want to decline this invitation?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(accept ? 'Accept' : 'Decline'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      bool success;
      if (accept) {
        success = await CollaborationService.acceptInvite(invite.id);
      } else {
        success = await CollaborationService.declineInvite(invite.id);
      }

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              accept
                  ? 'Invitation accepted! You can now access ${invite.aquariumName}.'
                  : 'Invitation declined.',
            ),
            backgroundColor: AppTheme.successColor,
          ),
        );
        _loadInvites();
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to $action invitation'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }
}