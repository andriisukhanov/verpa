import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../models/analytics_model.dart';

class HealthScoreTrendChart extends StatelessWidget {
  final HealthScoreTrend trend;
  final double height;
  final bool showAverage;

  const HealthScoreTrendChart({
    super.key,
    required this.trend,
    this.height = 200,
    this.showAverage = true,
  });

  @override
  Widget build(BuildContext context) {
    if (trend.dataPoints.isEmpty) {
      return Container(
        height: height,
        alignment: Alignment.center,
        child: Text(
          'No health score data available',
          style: TextStyle(
            color: Colors.grey[600],
            fontSize: 16,
          ),
        ),
      );
    }

    return Container(
      height: height,
      padding: const EdgeInsets.only(right: 16, top: 16),
      child: LineChart(
        LineChartData(
          gridData: FlGridData(
            show: true,
            drawVerticalLine: true,
            horizontalInterval: 10,
            getDrawingHorizontalLine: (value) {
              return FlLine(
                color: Colors.grey[300]!,
                strokeWidth: 1,
              );
            },
            getDrawingVerticalLine: (value) {
              return FlLine(
                color: Colors.grey[300]!,
                strokeWidth: 1,
              );
            },
          ),
          titlesData: FlTitlesData(
            show: true,
            rightTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            topTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 32,
                interval: _calculateTimeInterval(),
                getTitlesWidget: (value, meta) {
                  if (value.toInt() >= 0 && value.toInt() < trend.dataPoints.length) {
                    final date = trend.dataPoints[value.toInt()].timestamp;
                    return Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        _formatDate(date),
                        style: const TextStyle(
                          fontSize: 10,
                          color: Colors.grey,
                        ),
                      ),
                    );
                  }
                  return const SizedBox.shrink();
                },
              ),
            ),
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                interval: 10,
                reservedSize: 40,
                getTitlesWidget: (value, meta) {
                  return Text(
                    '${value.toInt()}',
                    style: const TextStyle(
                      fontSize: 10,
                      color: Colors.grey,
                    ),
                  );
                },
              ),
            ),
          ),
          borderData: FlBorderData(
            show: true,
            border: Border(
              bottom: BorderSide(color: Colors.grey[300]!),
              left: BorderSide(color: Colors.grey[300]!),
            ),
          ),
          minX: 0,
          maxX: trend.dataPoints.length.toDouble() - 1,
          minY: 0,
          maxY: 100,
          lineBarsData: [
            // Health score line
            LineChartBarData(
              spots: _generateSpots(),
              isCurved: true,
              gradient: LinearGradient(
                colors: _getGradientColors(),
                begin: Alignment.bottomCenter,
                end: Alignment.topCenter,
              ),
              barWidth: 3,
              isStrokeCapRound: true,
              dotData: FlDotData(
                show: trend.dataPoints.length <= 10,
                getDotPainter: (spot, percent, barData, index) {
                  return FlDotCirclePainter(
                    radius: 4,
                    color: _getColorForScore(spot.y),
                    strokeWidth: 2,
                    strokeColor: Colors.white,
                  );
                },
              ),
              belowBarData: BarAreaData(
                show: true,
                gradient: LinearGradient(
                  colors: _getGradientColors().map((c) => c.withOpacity(0.15)).toList(),
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                ),
              ),
            ),
          ],
          lineTouchData: LineTouchData(
            touchTooltipData: LineTouchTooltipData(
              tooltipBgColor: Colors.blueGrey.withOpacity(0.8),
              getTooltipItems: (touchedSpots) {
                return touchedSpots.map((spot) {
                  final dataPoint = trend.dataPoints[spot.x.toInt()];
                  final factors = dataPoint.factors.isNotEmpty
                      ? '\n${dataPoint.factors.join(', ')}'
                      : '';
                  return LineTooltipItem(
                    'Score: ${dataPoint.score.toStringAsFixed(0)}%\n${_formatDateTime(dataPoint.timestamp)}$factors',
                    const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                    ),
                  );
                }).toList();
              },
            ),
          ),
          extraLinesData: ExtraLinesData(
            horizontalLines: _buildRangeLines(),
          ),
        ),
      ),
    );
  }

  List<FlSpot> _generateSpots() {
    return trend.dataPoints.asMap().entries.map((entry) {
      return FlSpot(entry.key.toDouble(), entry.value.score);
    }).toList();
  }

  List<Color> _getGradientColors() {
    return [
      AppTheme.errorColor,
      AppTheme.warningColor,
      AppTheme.successColor,
    ];
  }

  Color _getColorForScore(double score) {
    if (score >= 80) return AppTheme.successColor;
    if (score >= 60) return AppTheme.warningColor;
    return AppTheme.errorColor;
  }

  double _calculateTimeInterval() {
    final count = trend.dataPoints.length;
    if (count <= 7) return 1;
    if (count <= 30) return count / 7;
    return count / 10;
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);
    
    if (difference.inDays == 0) {
      return DateFormat('HH:mm').format(date);
    } else if (difference.inDays < 7) {
      return DateFormat('E').format(date);
    } else if (difference.inDays < 30) {
      return DateFormat('d MMM').format(date);
    } else {
      return DateFormat('MMM').format(date);
    }
  }

  String _formatDateTime(DateTime date) {
    return DateFormat('MMM d, HH:mm').format(date);
  }

  List<HorizontalLine> _buildRangeLines() {
    final lines = <HorizontalLine>[];
    
    // Average line
    if (showAverage) {
      lines.add(
        HorizontalLine(
          y: trend.averageScore,
          color: Colors.blue.withOpacity(0.7),
          strokeWidth: 2,
          dashArray: [5, 5],
          label: HorizontalLineLabel(
            show: true,
            labelResolver: (line) => 'Average: ${trend.averageScore.toStringAsFixed(0)}%',
            style: const TextStyle(
              color: Colors.blue,
              fontSize: 10,
            ),
          ),
        ),
      );
    }
    
    // Health zones
    lines.addAll([
      // Good health threshold
      HorizontalLine(
        y: 80,
        color: AppTheme.successColor.withOpacity(0.3),
        strokeWidth: 1,
        dashArray: [3, 3],
      ),
      // Warning threshold
      HorizontalLine(
        y: 60,
        color: AppTheme.warningColor.withOpacity(0.3),
        strokeWidth: 1,
        dashArray: [3, 3],
      ),
    ]);
    
    return lines;
  }
}