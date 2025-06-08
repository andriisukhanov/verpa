import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../models/collaboration_models.dart';
import '../services/collaboration_service.dart';

class AddCollaboratorDialog extends StatefulWidget {
  final String aquariumId;
  final String aquariumName;
  final VoidCallback? onSuccess;

  const AddCollaboratorDialog({
    super.key,
    required this.aquariumId,
    required this.aquariumName,
    this.onSuccess,
  });

  @override
  State<AddCollaboratorDialog> createState() => _AddCollaboratorDialogState();
}

class _AddCollaboratorDialogState extends State<AddCollaboratorDialog> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _messageController = TextEditingController();
  CollaboratorRole _selectedRole = CollaboratorRole.viewer;
  bool _isLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Add Collaborator'),
      content: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Email field
              TextFormField(
                controller: _emailController,
                decoration: const InputDecoration(
                  labelText: 'Email Address',
                  hintText: 'collaborator@example.com',
                  prefixIcon: Icon(Icons.email),
                ),
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter an email address';
                  }
                  if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                    return 'Please enter a valid email address';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 20),

              // Role selection
              const Text(
                'Select Role',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              ...CollaboratorRole.values
                  .where((role) => role != CollaboratorRole.owner)
                  .map((role) => _buildRoleOption(role)),
              const SizedBox(height: 20),

              // Personal message
              TextFormField(
                controller: _messageController,
                decoration: const InputDecoration(
                  labelText: 'Personal Message (Optional)',
                  hintText: 'Add a personal message to the invitation',
                  prefixIcon: Icon(Icons.message),
                  alignLabelWithHint: true,
                ),
                maxLines: 3,
                maxLength: 200,
                textInputAction: TextInputAction.done,
              ),
              const SizedBox(height: 20),

              // Permission preview
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: AppTheme.primaryColor.withOpacity(0.2),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.info_outline,
                          size: 16,
                          color: AppTheme.primaryColor,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${_selectedRole.displayName} Permissions',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _getRoleDescription(_selectedRole),
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
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isLoading ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        CustomButton(
          text: 'Send Invitation',
          isLoading: _isLoading,
          onPressed: _sendInvitation,
          size: ButtonSize.small,
        ),
      ],
    );
  }

  Widget _buildRoleOption(CollaboratorRole role) {
    final isSelected = _selectedRole == role;
    
    return InkWell(
      onTap: () => setState(() => _selectedRole = role),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.all(12),
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? role.color : Colors.grey[300]!,
            width: isSelected ? 2 : 1,
          ),
          color: isSelected ? role.color.withOpacity(0.05) : null,
        ),
        child: Row(
          children: [
            Icon(
              role.icon,
              size: 20,
              color: role.color,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    role.displayName,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: isSelected ? role.color : null,
                    ),
                  ),
                  Text(
                    _getRoleShortDescription(role),
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              Icon(
                Icons.check_circle,
                size: 20,
                color: role.color,
              ),
          ],
        ),
      ),
    );
  }

  String _getRoleShortDescription(CollaboratorRole role) {
    switch (role) {
      case CollaboratorRole.admin:
        return 'Can manage everything except owner settings';
      case CollaboratorRole.editor:
        return 'Can edit aquarium data and parameters';
      case CollaboratorRole.viewer:
        return 'Can view aquarium data only';
      case CollaboratorRole.owner:
        return 'Full access to all features';
    }
  }

  String _getRoleDescription(CollaboratorRole role) {
    final permissions = RolePermissions.permissions[role] ?? [];
    final permissionCount = permissions.length;
    
    switch (role) {
      case CollaboratorRole.admin:
        return 'Admins have $permissionCount permissions including managing collaborators, editing all aquarium data, and performing maintenance tasks.';
      case CollaboratorRole.editor:
        return 'Editors have $permissionCount permissions to view and edit aquarium parameters, equipment, inhabitants, and maintenance tasks.';
      case CollaboratorRole.viewer:
        return 'Viewers have $permissionCount permissions to view aquarium data, parameters, equipment, and maintenance history.';
      case CollaboratorRole.owner:
        return 'Owners have full access to all features and settings.';
    }
  }

  Future<void> _sendInvitation() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final success = await CollaborationService.addCollaborator(
        aquariumId: widget.aquariumId,
        email: _emailController.text.trim(),
        role: _selectedRole,
        message: _messageController.text.trim().isEmpty 
            ? null 
            : _messageController.text.trim(),
      );

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Invitation sent to ${_emailController.text}',
            ),
            backgroundColor: AppTheme.successColor,
          ),
        );
        Navigator.pop(context);
        widget.onSuccess?.call();
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Failed to send invitation'),
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
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
}