import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/loading_view.dart';
import '../../../shared/widgets/error_view.dart';
import '../../aquarium/bloc/aquarium_bloc.dart';
import '../../aquarium/models/aquarium_model.dart';

class EquipmentManagementScreen extends StatefulWidget {
  final String aquariumId;

  const EquipmentManagementScreen({
    super.key,
    required this.aquariumId,
  });

  @override
  State<EquipmentManagementScreen> createState() => _EquipmentManagementScreenState();
}

class _EquipmentManagementScreenState extends State<EquipmentManagementScreen> {
  @override
  void initState() {
    super.initState();
    _loadAquarium();
  }

  void _loadAquarium() {
    context.read<AquariumBloc>().add(
      AquariumDetailRequested(aquariumId: widget.aquariumId),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Equipment Management'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: BlocBuilder<AquariumBloc, AquariumState>(
        builder: (context, state) {
          if (state is AquariumLoading || state is AquariumsLoading) {
            return const LoadingView();
          }

          if (state is AquariumError) {
            return ErrorView(
              message: state.message,
              onRetry: _loadAquarium,
            );
          }

          if (state is AquariumLoaded) {
            return _buildContent(state.aquarium);
          }

          if (state is AquariumsLoaded) {
            final aquarium = state.aquariums.firstWhere(
              (a) => a.id == widget.aquariumId,
              orElse: () => throw Exception('Aquarium not found'),
            );
            return _buildContent(aquarium);
          }

          return const SizedBox.shrink();
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          context.push('/add-equipment/${widget.aquariumId}');
        },
        backgroundColor: AppTheme.primaryColor,
        icon: const Icon(Icons.add),
        label: const Text('Add Equipment'),
      ),
    );
  }

  Widget _buildContent(Aquarium aquarium) {
    if (aquarium.equipment.isEmpty) {
      return _buildEmptyState();
    }

    return RefreshIndicator(
      onRefresh: () async => _loadAquarium(),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: aquarium.equipment.length,
        itemBuilder: (context, index) {
          final equipment = aquarium.equipment[index];
          return _buildEquipmentCard(equipment);
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.build_circle,
              size: 80,
              color: AppTheme.greyColor,
            ),
            const SizedBox(height: 24),
            Text(
              'No Equipment Added',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: AppTheme.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Start adding equipment to track maintenance and keep your aquarium running smoothly',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppTheme.textSecondary,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 32),
            CustomButton(
              text: 'Add First Equipment',
              icon: Icons.add,
              onPressed: () {
                context.push('/add-equipment/${widget.aquariumId}');
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEquipmentCard(Equipment equipment) {
    final dateFormatter = DateFormat('MMM d, yyyy');
    final now = DateTime.now();
    final isMaintenanceDue = equipment.nextMaintenanceDate != null &&
        equipment.nextMaintenanceDate!.isBefore(now);

    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 16),
      child: InkWell(
        onTap: () {
          _showEquipmentDetails(equipment);
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: equipment.type.color.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      equipment.type.icon,
                      color: equipment.type.color,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          equipment.name,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (equipment.brand != null || equipment.model != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            [equipment.brand, equipment.model]
                                .where((e) => e != null)
                                .join(' - '),
                            style: TextStyle(
                              color: AppTheme.textSecondary,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  _buildStatusChip(equipment.isActive),
                ],
              ),
              
              const SizedBox(height: 16),
              const Divider(height: 1),
              const SizedBox(height: 16),
              
              // Info Grid
              Row(
                children: [
                  Expanded(
                    child: _buildInfoItem(
                      icon: Icons.category,
                      label: 'Type',
                      value: equipment.type.displayName,
                    ),
                  ),
                  if (equipment.purchaseDate != null)
                    Expanded(
                      child: _buildInfoItem(
                        icon: Icons.shopping_cart,
                        label: 'Purchased',
                        value: dateFormatter.format(equipment.purchaseDate!),
                      ),
                    ),
                ],
              ),
              
              const SizedBox(height: 12),
              
              Row(
                children: [
                  if (equipment.lastMaintenanceDate != null)
                    Expanded(
                      child: _buildInfoItem(
                        icon: Icons.build,
                        label: 'Last Maintenance',
                        value: dateFormatter.format(equipment.lastMaintenanceDate!),
                      ),
                    ),
                  if (equipment.nextMaintenanceDate != null)
                    Expanded(
                      child: _buildInfoItem(
                        icon: Icons.schedule,
                        label: 'Next Maintenance',
                        value: dateFormatter.format(equipment.nextMaintenanceDate!),
                        color: isMaintenanceDue ? AppTheme.errorColor : null,
                      ),
                    ),
                ],
              ),
              
              if (isMaintenanceDue) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.errorColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: AppTheme.errorColor.withOpacity(0.3),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.warning,
                        color: AppTheme.errorColor,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Maintenance overdue',
                        style: TextStyle(
                          color: AppTheme.errorColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              
              const SizedBox(height: 16),
              
              // Actions
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton.icon(
                    onPressed: () {
                      context.push('/add-equipment/${widget.aquariumId}', 
                        extra: equipment,
                      );
                    },
                    icon: const Icon(Icons.edit, size: 18),
                    label: const Text('Edit'),
                  ),
                  const SizedBox(width: 8),
                  TextButton.icon(
                    onPressed: () => _confirmDelete(equipment),
                    icon: const Icon(Icons.delete, size: 18),
                    label: const Text('Delete'),
                    style: TextButton.styleFrom(
                      foregroundColor: AppTheme.errorColor,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusChip(bool isActive) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: isActive 
          ? AppTheme.successColor.withOpacity(0.1)
          : AppTheme.greyColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isActive 
            ? AppTheme.successColor.withOpacity(0.3)
            : AppTheme.greyColor.withOpacity(0.3),
        ),
      ),
      child: Text(
        isActive ? 'Active' : 'Inactive',
        style: TextStyle(
          color: isActive ? AppTheme.successColor : AppTheme.greyColor,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildInfoItem({
    required IconData icon,
    required String label,
    required String value,
    Color? color,
  }) {
    return Row(
      children: [
        Icon(
          icon,
          size: 16,
          color: color ?? AppTheme.textSecondary,
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 12,
                ),
              ),
              Text(
                value,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  void _showEquipmentDetails(Equipment equipment) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _EquipmentDetailsSheet(
        equipment: equipment,
        onEdit: () {
          Navigator.pop(context);
          context.push('/add-equipment/${widget.aquariumId}', 
            extra: equipment,
          );
        },
        onDelete: () {
          Navigator.pop(context);
          _confirmDelete(equipment);
        },
        onToggleStatus: () {
          Navigator.pop(context);
          _toggleEquipmentStatus(equipment);
        },
        onMaintenanceComplete: () {
          Navigator.pop(context);
          _recordMaintenance(equipment);
        },
      ),
    );
  }

  void _confirmDelete(Equipment equipment) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Equipment'),
        content: Text('Are you sure you want to delete "${equipment.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<AquariumBloc>().add(
                AquariumEquipmentRemoveRequested(
                  aquariumId: widget.aquariumId,
                  equipmentId: equipment.id,
                ),
              );
            },
            style: TextButton.styleFrom(
              foregroundColor: AppTheme.errorColor,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _toggleEquipmentStatus(Equipment equipment) {
    final updatedEquipment = equipment.copyWith(
      isActive: !equipment.isActive,
    );
    
    context.read<AquariumBloc>().add(
      AquariumEquipmentUpdateRequested(
        aquariumId: widget.aquariumId,
        equipment: updatedEquipment,
      ),
    );
  }

  void _recordMaintenance(Equipment equipment) {
    final updatedEquipment = equipment.copyWith(
      lastMaintenanceDate: DateTime.now(),
      nextMaintenanceDate: equipment.nextMaintenanceDate != null
          ? DateTime.now().add(const Duration(days: 30)) // Default 30 days
          : null,
    );
    
    context.read<AquariumBloc>().add(
      AquariumEquipmentUpdateRequested(
        aquariumId: widget.aquariumId,
        equipment: updatedEquipment,
      ),
    );
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Maintenance recorded successfully'),
        backgroundColor: AppTheme.successColor,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}

class _EquipmentDetailsSheet extends StatelessWidget {
  final Equipment equipment;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onToggleStatus;
  final VoidCallback onMaintenanceComplete;

  const _EquipmentDetailsSheet({
    required this.equipment,
    required this.onEdit,
    required this.onDelete,
    required this.onToggleStatus,
    required this.onMaintenanceComplete,
  });

  @override
  Widget build(BuildContext context) {
    final dateFormatter = DateFormat('MMM d, yyyy');
    final now = DateTime.now();
    final isMaintenanceDue = equipment.nextMaintenanceDate != null &&
        equipment.nextMaintenanceDate!.isBefore(now);

    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(20),
          topRight: Radius.circular(20),
        ),
      ),
      child: Column(
        children: [
          // Handle
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          
          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: equipment.type.color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(
                    equipment.type.icon,
                    color: equipment.type.color,
                    size: 32,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        equipment.name,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (equipment.brand != null || equipment.model != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          [equipment.brand, equipment.model]
                              .where((e) => e != null)
                              .join(' - '),
                          style: TextStyle(
                            color: AppTheme.textSecondary,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          const Divider(),
          
          // Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Quick Actions
                  if (isMaintenanceDue || equipment.isActive) ...[
                    Row(
                      children: [
                        if (isMaintenanceDue)
                          Expanded(
                            child: CustomButton(
                              text: 'Mark Maintenance Done',
                              icon: Icons.check_circle,
                              variant: ButtonVariant.primary,
                              size: ButtonSize.medium,
                              onPressed: onMaintenanceComplete,
                            ),
                          ),
                        if (isMaintenanceDue && equipment.isActive)
                          const SizedBox(width: 12),
                        if (equipment.isActive && !isMaintenanceDue)
                          Expanded(
                            child: CustomButton(
                              text: equipment.isActive ? 'Deactivate' : 'Activate',
                              icon: equipment.isActive ? Icons.pause : Icons.play_arrow,
                              variant: ButtonVariant.outline,
                              size: ButtonSize.medium,
                              onPressed: onToggleStatus,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 24),
                  ],
                  
                  // Details
                  _buildDetailSection(
                    title: 'Equipment Information',
                    children: [
                      _buildDetailRow('Type', equipment.type.displayName),
                      _buildDetailRow('Status', equipment.isActive ? 'Active' : 'Inactive'),
                      if (equipment.brand != null)
                        _buildDetailRow('Brand', equipment.brand!),
                      if (equipment.model != null)
                        _buildDetailRow('Model', equipment.model!),
                    ],
                  ),
                  
                  const SizedBox(height: 24),
                  
                  _buildDetailSection(
                    title: 'Dates',
                    children: [
                      if (equipment.purchaseDate != null)
                        _buildDetailRow(
                          'Purchase Date',
                          dateFormatter.format(equipment.purchaseDate!),
                        ),
                      if (equipment.lastMaintenanceDate != null)
                        _buildDetailRow(
                          'Last Maintenance',
                          dateFormatter.format(equipment.lastMaintenanceDate!),
                        ),
                      if (equipment.nextMaintenanceDate != null)
                        _buildDetailRow(
                          'Next Maintenance',
                          dateFormatter.format(equipment.nextMaintenanceDate!),
                          valueColor: isMaintenanceDue ? AppTheme.errorColor : null,
                        ),
                    ],
                  ),
                  
                  if (equipment.notes != null) ...[
                    const SizedBox(height: 24),
                    _buildDetailSection(
                      title: 'Notes',
                      children: [
                        Text(
                          equipment.notes!,
                          style: TextStyle(
                            color: AppTheme.textSecondary,
                            fontSize: 14,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
          
          // Actions
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -5),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: CustomButton(
                    text: 'Edit',
                    icon: Icons.edit,
                    variant: ButtonVariant.outline,
                    onPressed: onEdit,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: CustomButton(
                    text: 'Delete',
                    icon: Icons.delete,
                    variant: ButtonVariant.outline,
                    onPressed: onDelete,
                    foregroundColor: AppTheme.errorColor,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailSection({
    required String title,
    required List<Widget> children,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        ...children,
      ],
    );
  }

  Widget _buildDetailRow(String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 14,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: valueColor,
            ),
          ),
        ],
      ),
    );
  }
}