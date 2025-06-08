import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../models/disease_detection_result.dart';

class ObservationWidget extends StatelessWidget {
  final HealthObservation observation;

  const ObservationWidget({
    super.key,
    required this.observation,
  });

  @override
  Widget build(BuildContext context) {
    final color = _getTypeColor(observation.type);
    final icon = _getTypeIcon(observation.type);
    
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: color.withOpacity(0.2),
          width: 1,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            size: 20,
            color: color,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      observation.category,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: color,
                      ),
                    ),
                    if (observation.affectedPart != null) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          observation.affectedPart!,
                          style: TextStyle(
                            fontSize: 11,
                            color: color,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  observation.observation,
                  style: TextStyle(
                    fontSize: 14,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _getTypeColor(ObservationType type) {
    switch (type) {
      case ObservationType.positive:
        return AppTheme.successColor;
      case ObservationType.negative:
        return AppTheme.errorColor;
      case ObservationType.warning:
        return AppTheme.warningColor;
      case ObservationType.neutral:
        return AppTheme.greyColor;
    }
  }

  IconData _getTypeIcon(ObservationType type) {
    switch (type) {
      case ObservationType.positive:
        return Icons.check_circle;
      case ObservationType.negative:
        return Icons.error;
      case ObservationType.warning:
        return Icons.warning;
      case ObservationType.neutral:
        return Icons.info;
    }
  }
}