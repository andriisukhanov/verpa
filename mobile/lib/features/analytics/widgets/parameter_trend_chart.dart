import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../models/analytics_model.dart';

class ParameterTrendChart extends StatelessWidget {
  final ParameterTrend trend;
  final double height;
  final bool showIdealRange;

  const ParameterTrendChart({
    super.key,
    required this.trend,
    this.height = 200,
    this.showIdealRange = true,
  });

  @override
  Widget build(BuildContext context) {
    if (trend.dataPoints.isEmpty) {
      return Container(
        height: height,
        alignment: Alignment.center,
        child: Text(
          'No data available',
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
            horizontalInterval: _calculateInterval(),
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
                interval: _calculateInterval(),
                reservedSize: 40,
                getTitlesWidget: (value, meta) {
                  return Text(
                    value.toStringAsFixed(1),
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
          minY: _calculateMinY(),
          maxY: _calculateMaxY(),
          lineBarsData: [
            // Main trend line
            LineChartBarData(
              spots: _generateSpots(),
              isCurved: true,
              color: _getTrendColor(),
              barWidth: 3,
              isStrokeCapRound: true,
              dotData: FlDotData(
                show: trend.dataPoints.length <= 10,
                getDotPainter: (spot, percent, barData, index) {
                  return FlDotCirclePainter(
                    radius: 4,
                    color: _getTrendColor(),
                    strokeWidth: 2,
                    strokeColor: Colors.white,
                  );
                },
              ),
              belowBarData: BarAreaData(
                show: true,
                color: _getTrendColor().withOpacity(0.15),
              ),
            ),
          ],
          lineTouchData: LineTouchData(
            touchTooltipData: LineTouchTooltipData(
              tooltipBgColor: Colors.blueGrey.withOpacity(0.8),
              getTooltipItems: (touchedSpots) {
                return touchedSpots.map((spot) {
                  final dataPoint = trend.dataPoints[spot.x.toInt()];
                  return LineTooltipItem(
                    '${dataPoint.value.toStringAsFixed(2)} ${trend.unit}\n${_formatDateTime(dataPoint.timestamp)}',
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
      return FlSpot(entry.key.toDouble(), entry.value.value);
    }).toList();
  }

  double _calculateMinY() {
    double minValue = trend.min;
    
    if (showIdealRange && trend.hasWarningRange && trend.warningMin != null) {
      minValue = minValue < trend.warningMin! ? minValue : trend.warningMin!;
    }
    
    return minValue - (minValue * 0.1);
  }

  double _calculateMaxY() {
    double maxValue = trend.max;
    
    if (showIdealRange && trend.hasWarningRange && trend.warningMax != null) {
      maxValue = maxValue > trend.warningMax! ? maxValue : trend.warningMax!;
    }
    
    return maxValue + (maxValue * 0.1);
  }

  double _calculateInterval() {
    final range = _calculateMaxY() - _calculateMinY();
    if (range <= 10) return 1;
    if (range <= 50) return 5;
    if (range <= 100) return 10;
    if (range <= 500) return 50;
    return 100;
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

  Color _getTrendColor() {
    // Check if most recent values are outside ideal range
    if (trend.dataPoints.isNotEmpty) {
      final lastValue = trend.dataPoints.last.value;
      if (trend.isInWarningRange(lastValue)) {
        return AppTheme.errorColor;
      } else if (!trend.isInIdealRange(lastValue)) {
        return AppTheme.warningColor;
      }
    }
    
    // Otherwise use trend direction color
    return trend.trend.color;
  }

  List<HorizontalLine> _buildRangeLines() {
    final lines = <HorizontalLine>[];
    
    if (!showIdealRange) return lines;
    
    // Ideal range lines
    if (trend.hasIdealRange) {
      if (trend.idealMin != null) {
        lines.add(
          HorizontalLine(
            y: trend.idealMin!,
            color: AppTheme.successColor.withOpacity(0.7),
            strokeWidth: 2,
            dashArray: [5, 5],
            label: HorizontalLineLabel(
              show: true,
              labelResolver: (line) => 'Ideal Min',
              style: TextStyle(
                color: AppTheme.successColor,
                fontSize: 10,
              ),
            ),
          ),
        );
      }
      
      if (trend.idealMax != null) {
        lines.add(
          HorizontalLine(
            y: trend.idealMax!,
            color: AppTheme.successColor.withOpacity(0.7),
            strokeWidth: 2,
            dashArray: [5, 5],
            label: HorizontalLineLabel(
              show: true,
              labelResolver: (line) => 'Ideal Max',
              style: TextStyle(
                color: AppTheme.successColor,
                fontSize: 10,
              ),
            ),
          ),
        );
      }
    }
    
    // Warning range lines
    if (trend.hasWarningRange) {
      if (trend.warningMin != null) {
        lines.add(
          HorizontalLine(
            y: trend.warningMin!,
            color: AppTheme.errorColor.withOpacity(0.7),
            strokeWidth: 2,
            dashArray: [3, 3],
            label: HorizontalLineLabel(
              show: true,
              labelResolver: (line) => 'Critical Min',
              style: TextStyle(
                color: AppTheme.errorColor,
                fontSize: 10,
              ),
            ),
          ),
        );
      }
      
      if (trend.warningMax != null) {
        lines.add(
          HorizontalLine(
            y: trend.warningMax!,
            color: AppTheme.errorColor.withOpacity(0.7),
            strokeWidth: 2,
            dashArray: [3, 3],
            label: HorizontalLineLabel(
              show: true,
              labelResolver: (line) => 'Critical Max',
              style: TextStyle(
                color: AppTheme.errorColor,
                fontSize: 10,
              ),
            ),
          ),
        );
      }
    }
    
    return lines;
  }
}