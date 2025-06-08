import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../models/aquarium_model.dart';

class EquipmentList extends StatelessWidget {
  final List<Equipment> equipment;
  final Function(Equipment)? onEdit;
  final Function(Equipment)? onDelete;

  const EquipmentList({
    super.key,
    required this.equipment,
    this.onEdit,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: equipment.map((item) => _buildEquipmentCard(context, item)).toList(),
    );
  }

  Widget _buildEquipmentCard(BuildContext context, Equipment equipment) {
    final needsMaintenance = equipment.nextMaintenance != null &&
        equipment.nextMaintenance!.isBefore(DateTime.now().add(const Duration(days: 7)));

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: _getEquipmentColor(equipment.type).withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            _getEquipmentIcon(equipment.type),
            color: _getEquipmentColor(equipment.type),
          ),
        ),
        title: Row(
          children: [
            Text(
              equipment.name,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            const SizedBox(width: 8),
            if (!equipment.isActive)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppTheme.greyColor.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Inactive',
                  style: TextStyle(
                    fontSize: 10,
                    color: AppTheme.greyColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            if (needsMaintenance)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppTheme.warningColor.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Maintenance Due',
                  style: TextStyle(
                    fontSize: 10,
                    color: AppTheme.warningColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              '${equipment.type}${equipment.brand != null ? ' • ${equipment.brand}' : ''}${equipment.model != null ? ' ${equipment.model}' : ''}',
              style: TextStyle(
                fontSize: 12,
                color: AppTheme.textSecondary,
              ),
            ),
            if (equipment.nextMaintenance != null) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(
                    Icons.schedule,
                    size: 14,
                    color: needsMaintenance ? AppTheme.warningColor : AppTheme.textSecondary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Next maintenance: ${DateFormat('MMM d').format(equipment.nextMaintenance!)}',
                    style: TextStyle(
                      fontSize: 12,
                      color: needsMaintenance ? AppTheme.warningColor : AppTheme.textSecondary,
                      fontWeight: needsMaintenance ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
        trailing: PopupMenuButton<String>(
          icon: const Icon(Icons.more_vert),
          onSelected: (value) {
            switch (value) {
              case 'edit':
                onEdit?.call(equipment);
                break;
              case 'delete':
                onDelete?.call(equipment);
                break;
              case 'toggle':
                // TODO: Toggle active status
                break;
            }
          },
          itemBuilder: (context) => [
            const PopupMenuItem(
              value: 'edit',
              child: Row(
                children: [
                  Icon(Icons.edit, size: 20),
                  SizedBox(width: 8),
                  Text('Edit'),
                ],
              ),
            ),
            PopupMenuItem(
              value: 'toggle',
              child: Row(
                children: [
                  Icon(
                    equipment.isActive ? Icons.power_off : Icons.power,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(equipment.isActive ? 'Turn Off' : 'Turn On'),
                ],
              ),
            ),
            const PopupMenuItem(
              value: 'delete',
              child: Row(
                children: [
                  Icon(Icons.delete, size: 20, color: Colors.red),
                  SizedBox(width: 8),
                  Text('Delete', style: TextStyle(color: Colors.red)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getEquipmentIcon(String type) {
    switch (type.toLowerCase()) {
      case 'filter':
        return Icons.filter_alt;
      case 'heater':
        return Icons.thermostat;
      case 'light':
      case 'lighting':
        return Icons.lightbulb;
      case 'pump':
        return Icons.water;
      case 'co2':
        return Icons.bubble_chart;
      case 'skimmer':
        return Icons.cleaning_services;
      case 'chiller':
        return Icons.ac_unit;
      case 'wavemaker':
        return Icons.waves;
      case 'doser':
        return Icons.medical_services;
      default:
        return Icons.settings;
    }
  }

  Color _getEquipmentColor(String type) {
    switch (type.toLowerCase()) {
      case 'filter':
        return AppTheme.primaryColor;
      case 'heater':
        return AppTheme.errorColor;
      case 'light':
      case 'lighting':
        return AppTheme.accentColor;
      case 'pump':
        return AppTheme.secondaryColor;
      case 'co2':
        return AppTheme.successColor;
      case 'skimmer':
        return AppTheme.infoColor;
      case 'chiller':
        return Colors.blue;
      case 'wavemaker':
        return Colors.teal;
      case 'doser':
        return Colors.purple;
      default:
        return AppTheme.greyColor;
    }
  }
}