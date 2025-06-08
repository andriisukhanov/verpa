import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../models/aquarium_model.dart';

class InhabitantList extends StatelessWidget {
  final List<Inhabitant> inhabitants;
  final Function(Inhabitant)? onEdit;
  final Function(Inhabitant)? onDelete;

  const InhabitantList({
    super.key,
    required this.inhabitants,
    this.onEdit,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    // Group inhabitants by species
    final groupedInhabitants = <String, List<Inhabitant>>{};
    for (final inhabitant in inhabitants) {
      final key = inhabitant.species;
      groupedInhabitants.putIfAbsent(key, () => []).add(inhabitant);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Summary Card
        _buildSummaryCard(context),
        const SizedBox(height: 16),
        
        // Inhabitants List
        ...groupedInhabitants.entries.map((entry) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  entry.key,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              ...entry.value.map((inhabitant) => _buildInhabitantCard(context, inhabitant)),
              const SizedBox(height: 8),
            ],
          );
        }),
      ],
    );
  }

  Widget _buildSummaryCard(BuildContext context) {
    final totalCount = inhabitants.fold<int>(0, (sum, i) => sum + i.quantity);
    final speciesCount = inhabitants.map((i) => i.species).toSet().length;
    final healthyCount = inhabitants
        .where((i) => i.healthStatus == HealthStatus.healthy)
        .fold<int>(0, (sum, i) => sum + i.quantity);

    return Card(
      color: AppTheme.primaryColor.withOpacity(0.1),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildSummaryItem(
              context,
              Icons.pets,
              totalCount.toString(),
              'Total Fish',
              AppTheme.primaryColor,
            ),
            _buildSummaryItem(
              context,
              Icons.category,
              speciesCount.toString(),
              'Species',
              AppTheme.secondaryColor,
            ),
            _buildSummaryItem(
              context,
              Icons.favorite,
              healthyCount.toString(),
              'Healthy',
              AppTheme.successColor,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryItem(
    BuildContext context,
    IconData icon,
    String value,
    String label,
    Color color,
  ) {
    return Column(
      children: [
        Icon(icon, color: color, size: 28),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: AppTheme.textSecondary,
          ),
        ),
      ],
    );
  }

  Widget _buildInhabitantCard(BuildContext context, Inhabitant inhabitant) {
    final healthColor = _getHealthColor(inhabitant.healthStatus);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: inhabitant.imageUrl != null
              ? CachedNetworkImage(
                  imageUrl: inhabitant.imageUrl!,
                  width: 56,
                  height: 56,
                  fit: BoxFit.cover,
                  placeholder: (context, url) => Container(
                    width: 56,
                    height: 56,
                    color: AppTheme.lightGreyColor,
                    child: const Center(
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                  errorWidget: (context, url, error) => Container(
                    width: 56,
                    height: 56,
                    color: AppTheme.lightGreyColor,
                    child: Icon(
                      Icons.pets,
                      color: AppTheme.greyColor,
                    ),
                  ),
                )
              : Container(
                  width: 56,
                  height: 56,
                  color: AppTheme.lightGreyColor,
                  child: Icon(
                    Icons.pets,
                    color: AppTheme.greyColor,
                  ),
                ),
        ),
        title: Row(
          children: [
            Expanded(
              child: Text(
                inhabitant.name,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
            if (inhabitant.quantity > 1)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '×${inhabitant.quantity}',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.primaryColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            const SizedBox(width: 8),
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: healthColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 4),
            Text(
              _getHealthStatusText(inhabitant.healthStatus),
              style: TextStyle(
                fontSize: 12,
                color: healthColor,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            if (inhabitant.scientificName != null)
              Text(
                inhabitant.scientificName!,
                style: TextStyle(
                  fontSize: 12,
                  color: AppTheme.textSecondary,
                  fontStyle: FontStyle.italic,
                ),
              ),
            Row(
              children: [
                Icon(
                  Icons.calendar_today,
                  size: 12,
                  color: AppTheme.textSecondary,
                ),
                const SizedBox(width: 4),
                Text(
                  'Added ${DateFormat('MMM d, yyyy').format(inhabitant.addedDate)}',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
            if (inhabitant.notes != null && inhabitant.notes!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                inhabitant.notes!,
                style: TextStyle(
                  fontSize: 12,
                  color: AppTheme.textSecondary,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ],
        ),
        trailing: PopupMenuButton<String>(
          icon: const Icon(Icons.more_vert),
          onSelected: (value) {
            switch (value) {
              case 'edit':
                onEdit?.call(inhabitant);
                break;
              case 'health':
                // TODO: Update health status
                break;
              case 'delete':
                onDelete?.call(inhabitant);
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
            const PopupMenuItem(
              value: 'health',
              child: Row(
                children: [
                  Icon(Icons.favorite, size: 20),
                  SizedBox(width: 8),
                  Text('Update Health'),
                ],
              ),
            ),
            const PopupMenuItem(
              value: 'delete',
              child: Row(
                children: [
                  Icon(Icons.delete, size: 20, color: Colors.red),
                  SizedBox(width: 8),
                  Text('Remove', style: TextStyle(color: Colors.red)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getHealthColor(HealthStatus status) {
    switch (status) {
      case HealthStatus.healthy:
        return AppTheme.successColor;
      case HealthStatus.sick:
        return AppTheme.errorColor;
      case HealthStatus.recovering:
        return AppTheme.warningColor;
      case HealthStatus.deceased:
        return AppTheme.greyColor;
    }
  }

  String _getHealthStatusText(HealthStatus status) {
    switch (status) {
      case HealthStatus.healthy:
        return 'Healthy';
      case HealthStatus.sick:
        return 'Sick';
      case HealthStatus.recovering:
        return 'Recovering';
      case HealthStatus.deceased:
        return 'Deceased';
    }
  }
}