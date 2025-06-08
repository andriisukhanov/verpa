import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../models/collaboration_models.dart';
import '../services/collaboration_service.dart';

class CollaboratorPermissionsDialog extends StatefulWidget {
  final Collaborator collaborator;
  final VoidCallback? onUpdate;

  const CollaboratorPermissionsDialog({
    super.key,
    required this.collaborator,
    this.onUpdate,
  });

  @override
  State<CollaboratorPermissionsDialog> createState() =>
      _CollaboratorPermissionsDialogState();
}

class _CollaboratorPermissionsDialogState
    extends State<CollaboratorPermissionsDialog> {
  late Map<String, bool> _customPermissions;
  bool _isLoading = false;
  bool _hasChanges = false;

  @override
  void initState() {
    super.initState();
    _initializePermissions();
  }

  void _initializePermissions() {
    _customPermissions = {};
    
    // Initialize with current custom permissions or role defaults
    for (final permission in PermissionType.values) {
      if (widget.collaborator.customPermissions != null &&
          widget.collaborator.customPermissions!.containsKey(permission.value)) {
        _customPermissions[permission.value] = 
            widget.collaborator.customPermissions![permission.value] as bool;
      } else {
        _customPermissions[permission.value] = 
            widget.collaborator.hasPermission(permission);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Manage Permissions'),
          const SizedBox(height: 4),
          Text(
            widget.collaborator.name,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[600],
              fontWeight: FontWeight.normal,
            ),
          ),
        ],
      ),
      content: SizedBox(
        width: double.maxFinite,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Current role indicator
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: widget.collaborator.role.color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: widget.collaborator.role.color.withOpacity(0.3),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    widget.collaborator.role.icon,
                    size: 20,
                    color: widget.collaborator.role.color,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Current Role: ${widget.collaborator.role.displayName}',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: widget.collaborator.role.color,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            
            // Permission list
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  children: [
                    _buildPermissionSection(
                      'View Permissions',
                      [
                        PermissionType.viewParameters,
                        PermissionType.viewEquipment,
                        PermissionType.viewInhabitants,
                        PermissionType.viewSchedules,
                        PermissionType.viewExpenses,
                        PermissionType.viewMaintenance,
                      ],
                    ),
                    const SizedBox(height: 16),
                    _buildPermissionSection(
                      'Edit Permissions',
                      [
                        PermissionType.editParameters,
                        PermissionType.editEquipment,
                        PermissionType.editInhabitants,
                        PermissionType.editSchedules,
                        PermissionType.editExpenses,
                        PermissionType.editMaintenance,
                      ],
                    ),
                    const SizedBox(height: 16),
                    _buildPermissionSection(
                      'Management Permissions',
                      [
                        PermissionType.manageCollaborators,
                        PermissionType.deleteAquarium,
                      ],
                    ),
                  ],
                ),
              ),
            ),
            
            if (_hasChanges)
              Container(
                margin: const EdgeInsets.only(top: 12),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.info_outline,
                      size: 16,
                      color: Colors.orange[700],
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Custom permissions override role defaults',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.orange[700],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isLoading ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        if (_hasChanges)
          TextButton(
            onPressed: _isLoading ? null : _resetPermissions,
            child: const Text('Reset to Role Defaults'),
          ),
        CustomButton(
          text: 'Save Changes',
          isLoading: _isLoading,
          onPressed: _hasChanges ? _savePermissions : null,
          size: ButtonSize.small,
        ),
      ],
    );
  }

  Widget _buildPermissionSection(String title, List<PermissionType> permissions) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        ...permissions.map((permission) => _buildPermissionTile(permission)),
      ],
    );
  }

  Widget _buildPermissionTile(PermissionType permission) {
    final roleHasPermission = RolePermissions.hasPermission(
      widget.collaborator.role,
      permission,
    );
    final currentValue = _customPermissions[permission.value] ?? false;
    final isModified = currentValue != roleHasPermission;
    
    // Disable certain permissions based on role
    final isDisabled = widget.collaborator.role == CollaboratorRole.viewer &&
        (permission == PermissionType.manageCollaborators ||
         permission == PermissionType.deleteAquarium);

    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        color: isModified ? Colors.blue.withOpacity(0.05) : null,
        borderRadius: BorderRadius.circular(4),
      ),
      child: CheckboxListTile(
        value: currentValue,
        onChanged: isDisabled
            ? null
            : (value) {
                setState(() {
                  _customPermissions[permission.value] = value ?? false;
                  _checkForChanges();
                });
              },
        title: Text(
          permission.displayName,
          style: TextStyle(
            fontSize: 14,
            color: isDisabled ? Colors.grey : null,
          ),
        ),
        secondary: isModified
            ? Tooltip(
                message: roleHasPermission
                    ? 'Role default: Allowed'
                    : 'Role default: Not allowed',
                child: Icon(
                  Icons.info_outline,
                  size: 18,
                  color: Colors.blue[700],
                ),
              )
            : null,
        controlAffinity: ListTileControlAffinity.leading,
        dense: true,
        contentPadding: const EdgeInsets.only(left: 0, right: 8),
      ),
    );
  }

  void _checkForChanges() {
    bool hasChanges = false;
    
    for (final permission in PermissionType.values) {
      final roleHasPermission = RolePermissions.hasPermission(
        widget.collaborator.role,
        permission,
      );
      final currentValue = _customPermissions[permission.value] ?? false;
      
      if (currentValue != roleHasPermission) {
        hasChanges = true;
        break;
      }
    }
    
    setState(() => _hasChanges = hasChanges);
  }

  void _resetPermissions() {
    setState(() {
      _initializePermissions();
      _hasChanges = false;
    });
  }

  Future<void> _savePermissions() async {
    setState(() => _isLoading = true);

    try {
      // Filter out permissions that match role defaults
      final customPermissions = <String, bool>{};
      
      for (final permission in PermissionType.values) {
        final roleHasPermission = RolePermissions.hasPermission(
          widget.collaborator.role,
          permission,
        );
        final currentValue = _customPermissions[permission.value] ?? false;
        
        if (currentValue != roleHasPermission) {
          customPermissions[permission.value] = currentValue;
        }
      }

      final success = await CollaborationService.updateCustomPermissions(
        aquariumId: widget.collaborator.aquariumId,
        collaboratorId: widget.collaborator.id,
        permissions: customPermissions,
      );

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Permissions updated successfully'),
            backgroundColor: AppTheme.successColor,
          ),
        );
        Navigator.pop(context);
        widget.onUpdate?.call();
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to update permissions'),
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