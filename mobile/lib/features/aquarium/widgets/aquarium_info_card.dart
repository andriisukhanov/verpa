import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../models/aquarium_model.dart';

class AquariumInfoCard extends StatelessWidget {
  final Aquarium aquarium;

  const AquariumInfoCard({
    super.key,
    required this.aquarium,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Aquarium Information',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            _buildInfoRow(
              context,
              Icons.category,
              'Type',
              aquarium.type.displayName,
            ),
            _buildInfoRow(
              context,
              Icons.water,
              'Water Type',
              _formatWaterType(aquarium.waterType),
            ),
            _buildInfoRow(
              context,
              Icons.straighten,
              'Volume',
              '${aquarium.volume} ${aquarium.volumeUnit}',
            ),
            _buildInfoRow(
              context,
              Icons.aspect_ratio,
              'Dimensions',
              _formatDimensions(aquarium.dimensions),
            ),
            if (aquarium.location != null)
              _buildInfoRow(
                context,
                Icons.location_on,
                'Location',
                aquarium.location!,
              ),
            _buildInfoRow(
              context,
              Icons.calendar_today,
              'Created',
              DateFormat('MMM d, yyyy').format(aquarium.createdAt),
            ),
            if (aquarium.description != null) ...[
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 16),
              Text(
                'Description',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                aquarium.description!,
                style: TextStyle(
                  color: AppTheme.textSecondary,
                  height: 1.5,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(
    BuildContext context,
    IconData icon,
    String label,
    String value,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(
            icon,
            size: 20,
            color: AppTheme.primaryColor,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: AppTheme.textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  value,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatWaterType(WaterType type) {
    switch (type) {
      case WaterType.freshwater:
        return 'Freshwater';
      case WaterType.saltwater:
        return 'Saltwater';
      case WaterType.brackish:
        return 'Brackish';
    }
  }

  String _formatDimensions(AquariumDimensions dimensions) {
    return '${dimensions.length}" × ${dimensions.width}" × ${dimensions.height}" ${dimensions.unit}';
  }
}