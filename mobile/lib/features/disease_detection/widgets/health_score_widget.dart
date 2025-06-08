import 'package:flutter/material.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';

import '../../../core/theme/app_theme.dart';
import '../models/disease_detection_result.dart';

class HealthScoreWidget extends StatelessWidget {
  final double score;
  final HealthStatus status;
  final String summary;
  final bool showDetails;
  final List<String>? concerns;
  final List<String>? positives;

  const HealthScoreWidget({
    super.key,
    required this.score,
    required this.status,
    required this.summary,
    this.showDetails = false,
    this.concerns,
    this.positives,
  });

  @override
  Widget build(BuildContext context) {
    final color = _getStatusColor(status);
    
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                CircularPercentIndicator(
                  radius: 60,
                  lineWidth: 10,
                  percent: score / 100,
                  center: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '${score.toInt()}%',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: color,
                        ),
                      ),
                      Text(
                        status.displayName,
                        style: TextStyle(
                          fontSize: 12,
                          color: color,
                        ),
                      ),
                    ],
                  ),
                  progressColor: color,
                  backgroundColor: color.withOpacity(0.2),
                  animation: true,
                  animationDuration: 1000,
                  circularStrokeCap: CircularStrokeCap.round,
                ),
                const SizedBox(width: 20),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Overall Health',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        summary,
                        style: TextStyle(
                          fontSize: 14,
                          color: AppTheme.textSecondary,
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            
            if (showDetails && (concerns?.isNotEmpty ?? false || positives?.isNotEmpty ?? false)) ...[
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 16),
              
              // Concerns
              if (concerns?.isNotEmpty ?? false) ...[
                _buildDetailSection(
                  context,
                  'Concerns',
                  concerns!,
                  Icons.warning,
                  AppTheme.errorColor,
                ),
                if (positives?.isNotEmpty ?? false)
                  const SizedBox(height: 16),
              ],
              
              // Positives
              if (positives?.isNotEmpty ?? false)
                _buildDetailSection(
                  context,
                  'Positive Signs',
                  positives!,
                  Icons.check_circle,
                  AppTheme.successColor,
                ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDetailSection(
    BuildContext context,
    String title,
    List<String> items,
    IconData icon,
    Color color,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(width: 8),
            Text(
              title,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ...items.map((item) => 
          Padding(
            padding: const EdgeInsets.only(bottom: 4, left: 28),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '• ',
                  style: TextStyle(
                    color: AppTheme.textSecondary,
                  ),
                ),
                Expanded(
                  child: Text(
                    item,
                    style: TextStyle(
                      fontSize: 13,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Color _getStatusColor(HealthStatus status) {
    switch (status) {
      case HealthStatus.excellent:
        return AppTheme.excellentColor;
      case HealthStatus.good:
        return AppTheme.goodColor;
      case HealthStatus.fair:
        return AppTheme.fairColor;
      case HealthStatus.poor:
        return AppTheme.poorColor;
      case HealthStatus.critical:
        return AppTheme.criticalColor;
      case HealthStatus.unknown:
        return AppTheme.greyColor;
    }
  }
}