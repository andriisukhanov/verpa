import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../models/water_change.dart';

class WaterChangeStatsCard extends StatelessWidget {
  final WaterChangeStats stats;

  const WaterChangeStatsCard({
    super.key,
    required this.stats,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      color: AppTheme.primaryColor,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title
            Row(
              children: [
                const Icon(
                  Icons.insights,
                  color: Colors.white,
                  size: 24,
                ),
                const SizedBox(width: 8),
                Text(
                  'Water Change Statistics',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 20),
            
            // Stats Grid
            Row(
              children: [
                Expanded(
                  child: _buildStatItem(
                    context,
                    icon: Icons.water_drop,
                    value: stats.totalChanges.toString(),
                    label: 'Total Changes',
                  ),
                ),
                Container(
                  width: 1,
                  height: 60,
                  color: Colors.white.withOpacity(0.3),
                ),
                Expanded(
                  child: _buildStatItem(
                    context,
                    icon: Icons.water,
                    value: '${stats.totalVolume.toStringAsFixed(1)}L',
                    label: 'Total Volume',
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 16),
            
            Row(
              children: [
                Expanded(
                  child: _buildStatItem(
                    context,
                    icon: Icons.percent,
                    value: '${stats.averagePercentage.toStringAsFixed(1)}%',
                    label: 'Avg. Percentage',
                  ),
                ),
                Container(
                  width: 1,
                  height: 60,
                  color: Colors.white.withOpacity(0.3),
                ),
                Expanded(
                  child: _buildStatItem(
                    context,
                    icon: Icons.calendar_today,
                    value: _getDaysSinceText(),
                    label: 'Days Since Last',
                    valueColor: _getDaysSinceColor(),
                  ),
                ),
              ],
            ),
            
            // Last Change Date
            if (stats.lastChangeDate != null) ...[
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.history,
                      color: Colors.white.withOpacity(0.8),
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Last change: ${DateFormat('MMM d, yyyy').format(stats.lastChangeDate!)}',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.9),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            
            // Change Types Breakdown
            if (stats.changesByType.isNotEmpty) ...[
              const SizedBox(height: 20),
              Text(
                'Change Types',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.8),
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              ...stats.changesByType.entries.map((entry) {
                final percentage = (entry.value / stats.totalChanges * 100);
                return Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.8),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          entry.key.displayName,
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.8),
                            fontSize: 13,
                          ),
                        ),
                      ),
                      Text(
                        '${entry.value} (${percentage.toStringAsFixed(0)}%)',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.9),
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(
    BuildContext context, {
    required IconData icon,
    required String value,
    required String label,
    Color? valueColor,
  }) {
    return Column(
      children: [
        Icon(
          icon,
          color: Colors.white.withOpacity(0.7),
          size: 24,
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: TextStyle(
            color: valueColor ?? Colors.white,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withOpacity(0.7),
            fontSize: 12,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  String _getDaysSinceText() {
    if (stats.daysSinceLastChange < 0) {
      return 'Never';
    } else if (stats.daysSinceLastChange == 0) {
      return 'Today';
    } else if (stats.daysSinceLastChange == 1) {
      return 'Yesterday';
    } else {
      return '${stats.daysSinceLastChange}';
    }
  }

  Color _getDaysSinceColor() {
    if (stats.daysSinceLastChange < 0) {
      return Colors.white.withOpacity(0.5);
    } else if (stats.daysSinceLastChange <= 7) {
      return Colors.greenAccent;
    } else if (stats.daysSinceLastChange <= 14) {
      return Colors.yellowAccent;
    } else {
      return Colors.redAccent;
    }
  }
}