import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';

import '../../../../core/theme/app_theme.dart';
import '../../models/expense.dart';

class CategoryChart extends StatefulWidget {
  final Map<ExpenseCategory, double> categoryBreakdown;

  const CategoryChart({
    super.key,
    required this.categoryBreakdown,
  });

  @override
  State<CategoryChart> createState() => _CategoryChartState();
}

class _CategoryChartState extends State<CategoryChart> {
  int? _touchedIndex;

  @override
  Widget build(BuildContext context) {
    if (widget.categoryBreakdown.isEmpty) {
      return Center(
        child: Text(
          'No expense data',
          style: TextStyle(color: AppTheme.textSecondary),
        ),
      );
    }

    final total = widget.categoryBreakdown.values
        .fold(0.0, (sum, value) => sum + value);

    // Sort categories by value
    final sortedEntries = widget.categoryBreakdown.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return Column(
      children: [
        // Pie Chart
        Expanded(
          child: PieChart(
            PieChartData(
              pieTouchData: PieTouchData(
                touchCallback: (FlTouchEvent event, pieTouchResponse) {
                  setState(() {
                    if (!event.isInterestedForInteractions ||
                        pieTouchResponse == null ||
                        pieTouchResponse.touchedSection == null) {
                      _touchedIndex = -1;
                      return;
                    }
                    _touchedIndex = pieTouchResponse
                        .touchedSection!.touchedSectionIndex;
                  });
                },
              ),
              sectionsSpace: 2,
              centerSpaceRadius: 60,
              sections: sortedEntries.asMap().entries.map((entry) {
                final index = entry.key;
                final category = entry.value.key;
                final value = entry.value.value;
                final percentage = (value / total * 100);
                final isTouched = index == _touchedIndex;

                return PieChartSectionData(
                  color: category.color,
                  value: value,
                  title: percentage >= 5
                      ? '${percentage.toStringAsFixed(0)}%'
                      : '',
                  radius: isTouched ? 80 : 70,
                  titleStyle: TextStyle(
                    fontSize: isTouched ? 16 : 14,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                  badgeWidget: isTouched
                      ? Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.2),
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Icon(
                            category.icon,
                            color: category.color,
                            size: 20,
                          ),
                        )
                      : null,
                  badgePositionPercentageOffset: 0.98,
                );
              }).toList(),
            ),
          ),
        ),
        
        // Legend
        Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Wrap(
            spacing: 16,
            runSpacing: 12,
            alignment: WrapAlignment.center,
            children: sortedEntries.map((entry) {
              final category = entry.key;
              final value = entry.value;
              final percentage = (value / total * 100);
              
              return GestureDetector(
                onTap: () {
                  setState(() {
                    _touchedIndex = sortedEntries.indexOf(entry);
                  });
                },
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 16,
                      height: 16,
                      decoration: BoxDecoration(
                        color: category.color,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      category.displayName,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: _touchedIndex == sortedEntries.indexOf(entry)
                            ? FontWeight.bold
                            : FontWeight.normal,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '(${percentage.toStringAsFixed(0)}%)',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}