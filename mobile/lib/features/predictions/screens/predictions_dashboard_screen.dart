import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../aquarium/bloc/aquarium_bloc.dart';
import '../../aquarium/models/water_parameters.dart';
import '../models/parameter_prediction.dart';
import '../services/prediction_service.dart';

class PredictionsDashboardScreen extends StatefulWidget {
  final String aquariumId;

  const PredictionsDashboardScreen({
    super.key,
    required this.aquariumId,
  });

  @override
  State<PredictionsDashboardScreen> createState() => _PredictionsDashboardScreenState();
}

class _PredictionsDashboardScreenState extends State<PredictionsDashboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<ParameterPrediction> _predictions = [];
  List<PredictionInsight> _insights = [];
  bool _isLoading = true;
  String? _error;
  WaterParameter? _selectedParameter;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadPredictions();
    PredictionService.initializeModel();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadPredictions() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final predictions = await PredictionService.getPredictions(widget.aquariumId);
      final insights = await PredictionService.getInsights(widget.aquariumId);

      setState(() {
        _predictions = predictions;
        _insights = insights;
        _isLoading = false;
      });

      // Generate predictions if none exist
      if (_predictions.isEmpty) {
        await _generateInitialPredictions();
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _generateInitialPredictions() async {
    // In a real app, we would fetch historical data from the backend
    // For demo, we'll create sample predictions
    final parameters = [
      WaterParameterPresets.ph,
      WaterParameterPresets.ammonia,
      WaterParameterPresets.nitrite,
      WaterParameterPresets.nitrate,
      WaterParameterPresets.temperature,
    ];

    for (final param in parameters) {
      try {
        // Create sample historical data
        final historicalData = List.generate(10, (index) {
          final date = DateTime.now().subtract(Duration(days: 10 - index));
          final baseValue = param.optimalRange?.min ?? 7.0;
          final range = (param.optimalRange?.max ?? 8.0) - baseValue;
          final value = baseValue + (range * 0.5) + (index * 0.01);
          
          return WaterParameterReading(
            parameter: param,
            value: value + (DateTime.now().millisecond % 10 - 5) * 0.01,
            recordedAt: date,
          );
        });

        final prediction = await PredictionService.generatePrediction(
          aquariumId: widget.aquariumId,
          parameter: param,
          historicalData: historicalData,
        );

        setState(() {
          _predictions.add(prediction);
        });
      } catch (e) {
        print('Failed to generate prediction for ${param.name}: $e');
      }
    }

    // Reload insights after generating predictions
    final insights = await PredictionService.getInsights(widget.aquariumId);
    setState(() {
      _insights = insights;
    });
  }

  @override
  Widget build(BuildContext context) {
    final aquariumBloc = context.read<AquariumBloc>();
    final state = aquariumBloc.state;
    
    String aquariumName = 'Aquarium';
    if (state is AquariumsLoaded) {
      final aquarium = state.aquariums.firstWhere(
        (a) => a.id == widget.aquariumId,
        orElse: () => state.aquariums.first,
      );
      aquariumName = aquarium.name;
    }

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('AI Predictions'),
            Text(
              aquariumName,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.normal),
            ),
          ],
        ),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Parameters'),
            Tab(text: 'Insights'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadPredictions,
          ),
          IconButton(
            icon: const Icon(Icons.help_outline),
            onPressed: _showHelpDialog,
          ),
        ],
      ),
      body: _isLoading
          ? const LoadingIndicator()
          : _error != null
              ? ErrorView(
                  message: _error!,
                  onRetry: _loadPredictions,
                )
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildOverviewTab(),
                    _buildParametersTab(),
                    _buildInsightsTab(),
                  ],
                ),
    );
  }

  Widget _buildOverviewTab() {
    if (_predictions.isEmpty) {
      return EmptyState(
        icon: Icons.auto_graph,
        title: 'No Predictions Yet',
        message: 'Add water parameter readings to generate AI predictions',
        actionLabel: 'Record Parameters',
        onAction: () {
          context.push('/record-parameters/${widget.aquariumId}');
        },
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSummaryCard(),
          const SizedBox(height: 16),
          _buildTrendChart(),
          const SizedBox(height: 16),
          _buildQuickRecommendations(),
        ],
      ),
    );
  }

  Widget _buildSummaryCard() {
    final criticalCount = _predictions.where((p) => p.trend == PredictionTrend.critical).length;
    final concerningCount = _predictions.where((p) => p.trend == PredictionTrend.concerning).length;
    final stableCount = _predictions.where((p) => p.trend == PredictionTrend.stable).length;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.analytics, color: AppTheme.primaryColor),
                const SizedBox(width: 8),
                Text(
                  'Prediction Summary',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildSummaryItem(
                  'Critical',
                  criticalCount.toString(),
                  PredictionTrend.critical.color,
                  PredictionTrend.critical.icon,
                ),
                _buildSummaryItem(
                  'Concerning',
                  concerningCount.toString(),
                  PredictionTrend.concerning.color,
                  PredictionTrend.concerning.icon,
                ),
                _buildSummaryItem(
                  'Stable',
                  stableCount.toString(),
                  PredictionTrend.stable.color,
                  PredictionTrend.stable.icon,
                ),
              ],
            ),
            if (criticalCount > 0) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.errorColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.errorColor.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.warning, color: AppTheme.errorColor),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '$criticalCount parameter${criticalCount > 1 ? 's' : ''} predicted to reach critical levels',
                        style: TextStyle(color: AppTheme.errorColor),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryItem(String label, String value, Color color, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: color, size: 32),
        const SizedBox(height: 8),
        Text(
          value,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            color: Colors.grey[600],
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  Widget _buildTrendChart() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '7-Day Prediction Trends',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: LineChart(
                LineChartData(
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    horizontalInterval: 1,
                    getDrawingHorizontalLine: (value) {
                      return FlLine(
                        color: Colors.grey[300]!,
                        strokeWidth: 1,
                      );
                    },
                  ),
                  titlesData: FlTitlesData(
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 40,
                        getTitlesWidget: (value, meta) {
                          return Text(
                            value.toStringAsFixed(0),
                            style: const TextStyle(fontSize: 10),
                          );
                        },
                      ),
                    ),
                    rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 30,
                        getTitlesWidget: (value, meta) {
                          final date = DateTime.now().add(Duration(days: value.toInt()));
                          return Text(
                            DateFormat('MM/dd').format(date),
                            style: const TextStyle(fontSize: 10),
                          );
                        },
                      ),
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  minX: 0,
                  maxX: 7,
                  minY: 0,
                  maxY: 10,
                  lineBarsData: _predictions.take(3).map((prediction) {
                    final normalizedCurrent = _normalizeValue(
                      prediction.currentValue,
                      prediction.parameter,
                    );
                    final normalizedPredicted = _normalizeValue(
                      prediction.predictedValue,
                      prediction.parameter,
                    );

                    return LineChartBarData(
                      spots: [
                        FlSpot(0, normalizedCurrent),
                        FlSpot(7, normalizedPredicted),
                      ],
                      isCurved: true,
                      color: _getParameterColor(prediction.parameter),
                      barWidth: 3,
                      isStrokeCapRound: true,
                      dotData: const FlDotData(show: true),
                      belowBarData: BarAreaData(
                        show: true,
                        color: _getParameterColor(prediction.parameter).withOpacity(0.1),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 16,
              children: _predictions.take(3).map((prediction) {
                return Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: _getParameterColor(prediction.parameter),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      prediction.parameter.name,
                      style: const TextStyle(fontSize: 12),
                    ),
                  ],
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickRecommendations() {
    final highPriorityRecs = _predictions
        .expand((p) => p.recommendations)
        .where((r) => r.priority == RecommendationPriority.high)
        .take(3)
        .toList();

    if (highPriorityRecs.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.lightbulb_outline, color: AppTheme.primaryColor),
                const SizedBox(width: 8),
                Text(
                  'Top Recommendations',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...highPriorityRecs.map((rec) => _buildRecommendationTile(rec)),
          ],
        ),
      ),
    );
  }

  Widget _buildRecommendationTile(Recommendation rec) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: rec.priority.color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: rec.priority.color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.priority_high,
                color: rec.priority.color,
                size: 16,
              ),
              const SizedBox(width: 4),
              Text(
                rec.title,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: rec.priority.color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            rec.description,
            style: const TextStyle(fontSize: 12),
          ),
          if (rec.actions.isNotEmpty) ...[
            const SizedBox(height: 8),
            ...rec.actions.map((action) => Padding(
              padding: const EdgeInsets.only(left: 16, top: 2),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('• ', style: TextStyle(fontSize: 12)),
                  Expanded(
                    child: Text(
                      action,
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
            )),
          ],
        ],
      ),
    );
  }

  Widget _buildParametersTab() {
    if (_predictions.isEmpty) {
      return const Center(
        child: Text('No parameter predictions available'),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _predictions.length,
      itemBuilder: (context, index) {
        final prediction = _predictions[index];
        return _buildParameterCard(prediction);
      },
    );
  }

  Widget _buildParameterCard(ParameterPrediction prediction) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: InkWell(
        onTap: () => _showParameterDetails(prediction),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    prediction.parameter.icon,
                    color: _getParameterColor(prediction.parameter),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          prediction.parameter.name,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        Text(
                          '${prediction.parameter.unit}',
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: prediction.trend.color.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: prediction.trend.color.withOpacity(0.3)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          prediction.trend.icon,
                          color: prediction.trend.color,
                          size: 16,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          prediction.trend.displayName,
                          style: TextStyle(
                            color: prediction.trend.color,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildValueColumn(
                    'Current',
                    prediction.currentValue.toStringAsFixed(2),
                    Colors.blue,
                  ),
                  Icon(
                    Icons.arrow_forward,
                    color: Colors.grey[400],
                  ),
                  _buildValueColumn(
                    'Predicted',
                    prediction.predictedValue.toStringAsFixed(2),
                    prediction.trend.color,
                  ),
                  _buildValueColumn(
                    'Change',
                    '${prediction.changePercentage > 0 ? '+' : ''}${prediction.changePercentage.toStringAsFixed(1)}%',
                    prediction.trend.color,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              LinearProgressIndicator(
                value: prediction.confidence,
                backgroundColor: Colors.grey[300],
                valueColor: AlwaysStoppedAnimation<Color>(
                  prediction.confidenceLevel.color,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Confidence: ${(prediction.confidence * 100).toStringAsFixed(0)}%',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                ),
              ),
              if (prediction.recommendations.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.amber.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.lightbulb_outline,
                        color: Colors.amber,
                        size: 16,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${prediction.recommendations.length} recommendation${prediction.recommendations.length > 1 ? 's' : ''}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.amber,
                        ),
                      ),
                      const Spacer(),
                      const Icon(
                        Icons.chevron_right,
                        color: Colors.amber,
                        size: 16,
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildValueColumn(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _buildInsightsTab() {
    if (_insights.isEmpty) {
      return const Center(
        child: Text('No insights available yet'),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _insights.length,
      itemBuilder: (context, index) {
        final insight = _insights[index];
        return _buildInsightCard(insight);
      },
    );
  }

  Widget _buildInsightCard(PredictionInsight insight) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  insight.type.icon,
                  color: insight.type.color,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    insight.title,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              insight.description,
              style: TextStyle(
                color: Colors.grey[700],
              ),
            ),
            if (insight.affectedParameters.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                children: insight.affectedParameters.map((param) {
                  final parameter = WaterParameterPresets.all.firstWhere(
                    (p) => p.key == param,
                    orElse: () => WaterParameterPresets.ph,
                  );
                  return Chip(
                    label: Text(
                      parameter.name,
                      style: const TextStyle(fontSize: 12),
                    ),
                    backgroundColor: _getParameterColor(parameter).withOpacity(0.1),
                    labelStyle: TextStyle(
                      color: _getParameterColor(parameter),
                    ),
                  );
                }).toList(),
              ),
            ],
            const SizedBox(height: 8),
            Text(
              DateFormat('MMM d, h:mm a').format(insight.createdAt),
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[500],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showParameterDetails(ParameterPrediction prediction) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        minChildSize: 0.5,
        expand: false,
        builder: (context, scrollController) => _buildParameterDetailsSheet(
          prediction,
          scrollController,
        ),
      ),
    );
  }

  Widget _buildParameterDetailsSheet(
    ParameterPrediction prediction,
    ScrollController scrollController,
  ) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: ListView(
        controller: scrollController,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Icon(
                prediction.parameter.icon,
                color: _getParameterColor(prediction.parameter),
                size: 32,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      prediction.parameter.name,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'Prediction for ${DateFormat('MMM d').format(prediction.targetDate)}',
                      style: TextStyle(
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildDetailSection(
            'Prediction Range',
            Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Minimum', style: TextStyle(color: Colors.grey[600])),
                    Text(
                      prediction.predictedMin.toStringAsFixed(2),
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Most Likely', style: TextStyle(color: Colors.grey[600])),
                    Text(
                      prediction.predictedValue.toStringAsFixed(2),
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                        color: prediction.trend.color,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Maximum', style: TextStyle(color: Colors.grey[600])),
                    Text(
                      prediction.predictedMax.toStringAsFixed(2),
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ],
            ),
          ),
          if (prediction.factors.isNotEmpty) ...[
            const SizedBox(height: 16),
            _buildDetailSection(
              'Contributing Factors',
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: prediction.factors.map((factor) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.info_outline, size: 16, color: Colors.blue),
                      const SizedBox(width: 8),
                      Expanded(child: Text(factor)),
                    ],
                  ),
                )).toList(),
              ),
            ),
          ],
          if (prediction.recommendations.isNotEmpty) ...[
            const SizedBox(height: 16),
            _buildDetailSection(
              'Recommendations',
              Column(
                children: prediction.recommendations.map((rec) => 
                  _buildRecommendationTile(rec)
                ).toList(),
              ),
            ),
          ],
          const SizedBox(height: 16),
          _buildDetailSection(
            'Model Information',
            Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Algorithm', style: TextStyle(color: Colors.grey[600])),
                    Text(prediction.metadata['algorithm'] ?? 'Unknown'),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Data Points', style: TextStyle(color: Colors.grey[600])),
                    Text('${prediction.metadata['dataPoints'] ?? 0}'),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Model Version', style: TextStyle(color: Colors.grey[600])),
                    Text(prediction.metadata['modelVersion'] ?? '1.0.0'),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailSection(String title, Widget content) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        content,
      ],
    );
  }

  Color _getParameterColor(WaterParameter parameter) {
    switch (parameter.key) {
      case 'ph':
        return Colors.purple;
      case 'temperature':
        return Colors.orange;
      case 'ammonia':
        return Colors.red;
      case 'nitrite':
        return Colors.pink;
      case 'nitrate':
        return Colors.amber;
      case 'salinity':
        return Colors.blue;
      default:
        return AppTheme.primaryColor;
    }
  }

  double _normalizeValue(double value, WaterParameter parameter) {
    // Normalize values to 0-10 scale for chart display
    if (parameter.optimalRange == null) return 5.0;
    
    final range = parameter.optimalRange!;
    final normalizedValue = ((value - range.min) / (range.max - range.min)) * 10;
    return normalizedValue.clamp(0.0, 10.0);
  }

  void _showHelpDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('AI Predictions Help'),
        content: const SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'How Predictions Work:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                '• AI analyzes your historical water parameter data\n'
                '• Machine learning models identify patterns and trends\n'
                '• Predictions are generated for the next 7 days\n'
                '• Confidence levels indicate prediction reliability',
              ),
              SizedBox(height: 16),
              Text(
                'Trend Indicators:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                '• Stable: Parameter expected to remain steady\n'
                '• Increasing/Decreasing: Gradual change predicted\n'
                '• Concerning: Parameter approaching limits\n'
                '• Critical: Immediate attention required',
              ),
              SizedBox(height: 16),
              Text(
                'Recommendations:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text(
                'The AI provides actionable recommendations based on predicted trends to help maintain optimal water conditions.',
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Got it'),
          ),
        ],
      ),
    );
  }
}