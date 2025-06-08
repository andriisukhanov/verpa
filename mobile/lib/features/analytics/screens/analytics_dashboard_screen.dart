import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/api_client.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_view.dart';
import '../../aquarium/bloc/aquarium_bloc.dart';
import '../models/analytics_model.dart';
import '../services/analytics_service.dart';
import '../widgets/health_score_trend_chart.dart';
import '../widgets/parameter_trend_chart.dart';

class AnalyticsDashboardScreen extends StatefulWidget {
  final String aquariumId;

  const AnalyticsDashboardScreen({
    super.key,
    required this.aquariumId,
  });

  @override
  State<AnalyticsDashboardScreen> createState() => _AnalyticsDashboardScreenState();
}

class _AnalyticsDashboardScreenState extends State<AnalyticsDashboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late AnalyticsService _analyticsService;
  
  String _selectedPeriod = '7d';
  DateTime? _startDate;
  DateTime? _endDate;
  
  Future<AquariumAnalytics>? _analyticsFuture;
  Future<List<ParameterTrend>>? _parameterTrendsFuture;
  Future<HealthScoreTrend>? _healthScoreFuture;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _analyticsService = AnalyticsService(
      apiClient: context.read<ApiClient>(),
    );
    _loadAnalytics();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _loadAnalytics() {
    setState(() {
      _analyticsFuture = _analyticsService.getAquariumAnalytics(
        aquariumId: widget.aquariumId,
        period: _selectedPeriod,
        startDate: _startDate,
        endDate: _endDate,
      );
      
      _parameterTrendsFuture = _analyticsService.getParameterTrends(
        aquariumId: widget.aquariumId,
        parameterIds: ['temperature', 'ph', 'ammonia', 'nitrite', 'nitrate'],
        startDate: _startDate,
        endDate: _endDate,
      );
      
      _healthScoreFuture = _analyticsService.getHealthScoreTrend(
        aquariumId: widget.aquariumId,
        startDate: _startDate,
        endDate: _endDate,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Analytics Dashboard'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Parameters'),
            Tab(text: 'Insights'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.date_range),
            onPressed: _showPeriodSelector,
          ),
        ],
      ),
      body: TabBarView(
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
    return FutureBuilder<AquariumAnalytics>(
      future: _analyticsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const LoadingView();
        }
        
        if (snapshot.hasError) {
          return ErrorView(
            message: 'Failed to load analytics',
            onRetry: _loadAnalytics,
          );
        }
        
        final analytics = snapshot.data;
        if (analytics == null) {
          return const Center(
            child: Text('No analytics data available'),
          );
        }
        
        return RefreshIndicator(
          onRefresh: () async => _loadAnalytics(),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Period info
                _buildPeriodInfo(analytics.startDate, analytics.endDate),
                const SizedBox(height: 24),
                
                // Health Score Section
                _buildSectionTitle('Health Score Trend'),
                const SizedBox(height: 16),
                Card(
                  elevation: 2,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildHealthScoreStats(analytics.healthScoreTrend),
                        const SizedBox(height: 16),
                        HealthScoreTrendChart(
                          trend: analytics.healthScoreTrend,
                          height: 250,
                        ),
                      ],
                    ),
                  ),
                ),
                
                const SizedBox(height: 24),
                
                // Active Alerts
                if (analytics.activeAlerts.isNotEmpty) ...[
                  _buildSectionTitle('Active Alerts (${analytics.activeAlerts.length})'),
                  const SizedBox(height: 16),
                  ...analytics.activeAlerts.map((alert) => _buildAlertCard(alert)),
                  const SizedBox(height: 24),
                ],
                
                // Recent Maintenance
                if (analytics.maintenanceEvents.isNotEmpty) ...[
                  _buildSectionTitle('Recent Maintenance'),
                  const SizedBox(height: 16),
                  Card(
                    elevation: 2,
                    child: ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: analytics.maintenanceEvents.take(5).length,
                      separatorBuilder: (context, index) => const Divider(height: 1),
                      itemBuilder: (context, index) {
                        final event = analytics.maintenanceEvents[index];
                        return _buildMaintenanceItem(event);
                      },
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildParametersTab() {
    return FutureBuilder<List<ParameterTrend>>(
      future: _parameterTrendsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const LoadingView();
        }
        
        if (snapshot.hasError) {
          return ErrorView(
            message: 'Failed to load parameter trends',
            onRetry: _loadAnalytics,
          );
        }
        
        final trends = snapshot.data;
        if (trends == null || trends.isEmpty) {
          return const Center(
            child: Text('No parameter data available'),
          );
        }
        
        return RefreshIndicator(
          onRefresh: () async => _loadAnalytics(),
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: trends.length,
            itemBuilder: (context, index) {
              final trend = trends[index];
              return Card(
                elevation: 2,
                margin: const EdgeInsets.only(bottom: 16),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            trend.parameterName,
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Row(
                            children: [
                              Icon(
                                trend.trend.icon,
                                color: trend.trend.color,
                                size: 20,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                trend.trend.displayName,
                                style: TextStyle(
                                  color: trend.trend.color,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      _buildParameterStats(trend),
                      const SizedBox(height: 16),
                      ParameterTrendChart(
                        trend: trend,
                        height: 200,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildInsightsTab() {
    return FutureBuilder<AquariumAnalytics>(
      future: _analyticsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const LoadingView();
        }
        
        if (snapshot.hasError) {
          return ErrorView(
            message: 'Failed to load insights',
            onRetry: _loadAnalytics,
          );
        }
        
        final analytics = snapshot.data;
        if (analytics == null) {
          return const Center(
            child: Text('No insights available'),
          );
        }
        
        return RefreshIndicator(
          onRefresh: () async => _loadAnalytics(),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Insights
                if (analytics.insights.insights.isNotEmpty) ...[
                  _buildSectionTitle('Key Insights'),
                  const SizedBox(height: 16),
                  ...analytics.insights.insights.map((insight) => 
                    _buildInsightCard(insight)
                  ),
                  const SizedBox(height: 24),
                ],
                
                // Recommendations
                if (analytics.insights.recommendations.isNotEmpty) ...[
                  _buildSectionTitle('Recommendations'),
                  const SizedBox(height: 16),
                  ...analytics.insights.recommendations.map((rec) => 
                    _buildRecommendationCard(rec)
                  ),
                  const SizedBox(height: 24),
                ],
                
                // Predictive Analysis
                if (analytics.insights.predictiveAnalysis != null) ...[
                  _buildSectionTitle('Predictions'),
                  const SizedBox(height: 16),
                  _buildPredictiveAnalysisCard(analytics.insights.predictiveAnalysis!),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildPeriodInfo(DateTime startDate, DateTime endDate) {
    final formatter = DateFormat('MMM d, yyyy');
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(
            Icons.date_range,
            color: AppTheme.primaryColor,
            size: 20,
          ),
          const SizedBox(width: 8),
          Text(
            '${formatter.format(startDate)} - ${formatter.format(endDate)}',
            style: TextStyle(
              color: AppTheme.primaryColor,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
        fontWeight: FontWeight.bold,
      ),
    );
  }

  Widget _buildHealthScoreStats(HealthScoreTrend trend) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _buildStatItem(
          'Current',
          '${trend.currentScore.toStringAsFixed(0)}%',
          _getColorForScore(trend.currentScore),
        ),
        _buildStatItem(
          'Average',
          '${trend.averageScore.toStringAsFixed(0)}%',
          _getColorForScore(trend.averageScore),
        ),
        _buildStatItem(
          'Lowest',
          '${trend.lowestScore.toStringAsFixed(0)}%',
          _getColorForScore(trend.lowestScore),
        ),
        _buildStatItem(
          'Highest',
          '${trend.highestScore.toStringAsFixed(0)}%',
          _getColorForScore(trend.highestScore),
        ),
      ],
    );
  }

  Widget _buildParameterStats(ParameterTrend trend) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _buildStatItem(
          'Current',
          '${trend.dataPoints.isNotEmpty ? trend.dataPoints.last.value.toStringAsFixed(2) : '-'} ${trend.unit}',
          Colors.blue,
        ),
        _buildStatItem(
          'Average',
          '${trend.average.toStringAsFixed(2)} ${trend.unit}',
          Colors.orange,
        ),
        _buildStatItem(
          'Min',
          '${trend.min.toStringAsFixed(2)} ${trend.unit}',
          Colors.purple,
        ),
        _buildStatItem(
          'Max',
          '${trend.max.toStringAsFixed(2)} ${trend.unit}',
          Colors.green,
        ),
      ],
    );
  }

  Widget _buildStatItem(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          label,
          style: TextStyle(
            color: Colors.grey[600],
            fontSize: 12,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            color: color,
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildAlertCard(Alert alert) {
    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(
          alert.severity.icon,
          color: alert.severity.color,
        ),
        title: Text(alert.title),
        subtitle: Text(alert.message),
        trailing: Text(
          _formatTimeAgo(alert.createdAt),
          style: TextStyle(
            color: Colors.grey[600],
            fontSize: 12,
          ),
        ),
      ),
    );
  }

  Widget _buildMaintenanceItem(MaintenanceEvent event) {
    return ListTile(
      leading: Icon(
        event.icon,
        color: event.color,
      ),
      title: Text(event.description),
      subtitle: Text(DateFormat('MMM d, HH:mm').format(event.date)),
      trailing: event.completed
          ? Icon(Icons.check_circle, color: AppTheme.successColor, size: 20)
          : Icon(Icons.schedule, color: Colors.grey, size: 20),
    );
  }

  Widget _buildInsightCard(Insight insight) {
    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(
          insight.type.icon,
          color: insight.type.color,
        ),
        title: Text(insight.title),
        subtitle: Text(insight.description),
      ),
    );
  }

  Widget _buildRecommendationCard(Recommendation rec) {
    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: rec.priority.color.withOpacity(0.2),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            Icons.lightbulb,
            color: rec.priority.color,
            size: 20,
          ),
        ),
        title: Text(rec.title),
        subtitle: Text(rec.description),
        trailing: TextButton(
          onPressed: () {
            // TODO: Handle action
          },
          child: const Text('Action'),
        ),
      ),
    );
  }

  Widget _buildPredictiveAnalysisCard(PredictiveAnalysis analysis) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Health Score Prediction
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Health Score Prediction',
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(
                          '${analysis.healthScorePrediction.currentScore.toStringAsFixed(0)}%',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Icon(
                          Icons.arrow_forward,
                          color: Colors.grey[400],
                          size: 16,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${analysis.healthScorePrediction.predictedScore.toStringAsFixed(0)}%',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: _getColorForScore(analysis.healthScorePrediction.predictedScore),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'Confidence',
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 12,
                      ),
                    ),
                    Text(
                      '${(analysis.healthScorePrediction.confidence * 100).toStringAsFixed(0)}%',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            
            if (analysis.potentialIssues.isNotEmpty) ...[
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 16),
              Text(
                'Potential Issues',
                style: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 8),
              ...analysis.potentialIssues.map((issue) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Icon(
                      Icons.warning,
                      color: AppTheme.warningColor,
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        issue.title,
                        style: const TextStyle(fontSize: 14),
                      ),
                    ),
                    Text(
                      '${(issue.probability * 100).toStringAsFixed(0)}%',
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              )),
            ],
          ],
        ),
      ),
    );
  }

  Color _getColorForScore(double score) {
    if (score >= 80) return AppTheme.successColor;
    if (score >= 60) return AppTheme.warningColor;
    return AppTheme.errorColor;
  }

  String _formatTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);
    
    if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return DateFormat('MMM d').format(dateTime);
    }
  }

  void _showPeriodSelector() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Select Time Period',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ...['24h', '7d', '30d', '90d', 'custom'].map((period) => ListTile(
              title: Text(_getPeriodLabel(period)),
              trailing: _selectedPeriod == period
                  ? Icon(Icons.check, color: AppTheme.primaryColor)
                  : null,
              onTap: () async {
                Navigator.pop(context);
                if (period == 'custom') {
                  await _showDateRangePicker();
                } else {
                  setState(() {
                    _selectedPeriod = period;
                    _startDate = null;
                    _endDate = null;
                  });
                  _loadAnalytics();
                }
              },
            )),
          ],
        ),
      ),
    );
  }

  String _getPeriodLabel(String period) {
    switch (period) {
      case '24h':
        return 'Last 24 Hours';
      case '7d':
        return 'Last 7 Days';
      case '30d':
        return 'Last 30 Days';
      case '90d':
        return 'Last 90 Days';
      case 'custom':
        return 'Custom Range';
      default:
        return period;
    }
  }

  Future<void> _showDateRangePicker() async {
    final DateTimeRange? picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now(),
      initialDateRange: _startDate != null && _endDate != null
          ? DateTimeRange(start: _startDate!, end: _endDate!)
          : DateTimeRange(
              start: DateTime.now().subtract(const Duration(days: 30)),
              end: DateTime.now(),
            ),
    );

    if (picked != null) {
      setState(() {
        _selectedPeriod = 'custom';
        _startDate = picked.start;
        _endDate = picked.end;
      });
      _loadAnalytics();
    }
  }
}