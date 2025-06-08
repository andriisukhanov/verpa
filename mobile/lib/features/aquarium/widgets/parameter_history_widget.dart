import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/loading_view.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/custom_button.dart';
import '../bloc/aquarium_bloc.dart';
import '../models/aquarium_model.dart';
import '../../analytics/models/analytics_model.dart';
import '../../analytics/widgets/parameter_trend_chart.dart';

class ParameterHistoryWidget extends StatefulWidget {
  final String aquariumId;
  final List<WaterParameters>? parameterHistory;

  const ParameterHistoryWidget({
    super.key,
    required this.aquariumId,
    this.parameterHistory,
  });

  @override
  State<ParameterHistoryWidget> createState() => _ParameterHistoryWidgetState();
}

class _ParameterHistoryWidgetState extends State<ParameterHistoryWidget>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _selectedPeriod = '7d';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 6, vsync: this);
    _loadParameterHistory();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _loadParameterHistory() {
    if (!_isLoading) {
      setState(() => _isLoading = true);
      context.read<AquariumBloc>().add(
        AquariumParametersHistoryRequested(
          aquariumId: widget.aquariumId,
          startDate: _getStartDate(),
          limit: 100,
        ),
      );
    }
  }

  DateTime _getStartDate() {
    final now = DateTime.now();
    switch (_selectedPeriod) {
      case '24h':
        return now.subtract(const Duration(hours: 24));
      case '7d':
        return now.subtract(const Duration(days: 7));
      case '30d':
        return now.subtract(const Duration(days: 30));
      case '90d':
        return now.subtract(const Duration(days: 90));
      default:
        return now.subtract(const Duration(days: 7));
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AquariumBloc, AquariumState>(
      listener: (context, state) {
        if (state is AquariumParameterHistoryLoaded) {
          setState(() => _isLoading = false);
        } else if (state is AquariumError) {
          setState(() => _isLoading = false);
        }
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeader(),
          const SizedBox(height: 16),
          _buildPeriodSelector(),
          const SizedBox(height: 16),
          _buildContent(),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      children: [
        Expanded(
          child: Text(
            'Parameter History',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        IconButton(
          icon: const Icon(Icons.refresh),
          onPressed: _loadParameterHistory,
          tooltip: 'Refresh',
        ),
      ],
    );
  }

  Widget _buildPeriodSelector() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _buildPeriodChip('24h', 'Last 24h'),
          const SizedBox(width: 8),
          _buildPeriodChip('7d', 'Last 7 days'),
          const SizedBox(width: 8),
          _buildPeriodChip('30d', 'Last 30 days'),
          const SizedBox(width: 8),
          _buildPeriodChip('90d', 'Last 3 months'),
        ],
      ),
    );
  }

  Widget _buildPeriodChip(String value, String label) {
    final isSelected = _selectedPeriod == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        if (selected) {
          setState(() {
            _selectedPeriod = value;
          });
          _loadParameterHistory();
        }
      },
      selectedColor: AppTheme.primaryColor.withOpacity(0.2),
      checkmarkColor: AppTheme.primaryColor,
    );
  }

  Widget _buildContent() {
    if (_isLoading) {
      return const LoadingView();
    }

    return BlocBuilder<AquariumBloc, AquariumState>(
      builder: (context, state) {
        List<WaterParameters> parameters = [];

        if (state is AquariumParameterHistoryLoaded) {
          parameters = state.parameters;
        } else if (widget.parameterHistory != null) {
          parameters = widget.parameterHistory!;
        }

        if (parameters.isEmpty) {
          return _buildEmptyState();
        }

        return _buildParameterCharts(parameters);
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        children: [
          Icon(
            Icons.show_chart,
            size: 64,
            color: AppTheme.greyColor,
          ),
          const SizedBox(height: 16),
          Text(
            'No parameter history available',
            style: TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Start recording parameters to see trends',
            style: TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 14,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          CustomButton(
            text: 'Record Parameters',
            icon: Icons.science,
            onPressed: () {
              // Navigate to record parameters screen
            },
          ),
        ],
      ),
    );
  }

  Widget _buildParameterCharts(List<WaterParameters> parameters) {
    return Column(
      children: [
        // Tab bar for different parameters
        Container(
          height: 40,
          child: TabBar(
            controller: _tabController,
            isScrollable: true,
            labelColor: AppTheme.primaryColor,
            unselectedLabelColor: AppTheme.textSecondary,
            indicatorColor: AppTheme.primaryColor,
            tabs: const [
              Tab(text: 'Temperature'),
              Tab(text: 'pH'),
              Tab(text: 'Ammonia'),
              Tab(text: 'Nitrite'),
              Tab(text: 'Nitrate'),
              Tab(text: 'All'),
            ],
          ),
        ),
        const SizedBox(height: 16),
        
        // Chart content
        SizedBox(
          height: 350,
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildParameterChart(parameters, 'temperature', '°C'),
              _buildParameterChart(parameters, 'ph', 'pH'),
              _buildParameterChart(parameters, 'ammonia', 'ppm'),
              _buildParameterChart(parameters, 'nitrite', 'ppm'),
              _buildParameterChart(parameters, 'nitrate', 'ppm'),
              _buildAllParametersView(parameters),
            ],
          ),
        ),
        
        const SizedBox(height: 24),
        
        // Recent readings list
        _buildRecentReadings(parameters),
      ],
    );
  }

  Widget _buildParameterChart(List<WaterParameters> parameters, String parameterType, String unit) {
    final dataPoints = _extractParameterData(parameters, parameterType);
    
    if (dataPoints.isEmpty) {
      return Center(
        child: Text(
          'No ${parameterType} data available',
          style: TextStyle(
            color: AppTheme.textSecondary,
            fontSize: 16,
          ),
        ),
      );
    }

    final trend = ParameterTrend(
      parameterName: _getParameterDisplayName(parameterType),
      unit: unit,
      dataPoints: dataPoints,
      trend: _calculateTrend(dataPoints),
      idealMin: _getIdealMin(parameterType),
      idealMax: _getIdealMax(parameterType),
      warningMin: _getWarningMin(parameterType),
      warningMax: _getWarningMax(parameterType),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '${trend.parameterName} Trend',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: ParameterTrendChart(
            trend: trend,
            showIdealRange: true,
          ),
        ),
        const SizedBox(height: 8),
        _buildParameterStats(dataPoints, unit),
      ],
    );
  }

  Widget _buildAllParametersView(List<WaterParameters> parameters) {
    return SingleChildScrollView(
      child: Column(
        children: [
          _buildMiniChart(parameters, 'temperature', '°C'),
          const SizedBox(height: 16),
          _buildMiniChart(parameters, 'ph', 'pH'),
          const SizedBox(height: 16),
          _buildMiniChart(parameters, 'ammonia', 'ppm'),
          const SizedBox(height: 16),
          _buildMiniChart(parameters, 'nitrite', 'ppm'),
          const SizedBox(height: 16),
          _buildMiniChart(parameters, 'nitrate', 'ppm'),
        ],
      ),
    );
  }

  Widget _buildMiniChart(List<WaterParameters> parameters, String parameterType, String unit) {
    final dataPoints = _extractParameterData(parameters, parameterType);
    
    if (dataPoints.isEmpty) {
      return SizedBox.shrink();
    }

    final trend = ParameterTrend(
      parameterName: _getParameterDisplayName(parameterType),
      unit: unit,
      dataPoints: dataPoints,
      trend: _calculateTrend(dataPoints),
      idealMin: _getIdealMin(parameterType),
      idealMax: _getIdealMax(parameterType),
      warningMin: _getWarningMin(parameterType),
      warningMax: _getWarningMax(parameterType),
    );

    return Container(
      height: 120,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            trend.parameterName,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Expanded(
            child: ParameterTrendChart(
              trend: trend,
              height: 80,
              showIdealRange: false,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildParameterStats(List<ParameterDataPoint> dataPoints, String unit) {
    final latest = dataPoints.last.value;
    final min = dataPoints.map((p) => p.value).reduce((a, b) => a < b ? a : b);
    final max = dataPoints.map((p) => p.value).reduce((a, b) => a > b ? a : b);
    final avg = dataPoints.map((p) => p.value).reduce((a, b) => a + b) / dataPoints.length;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _buildStatItem('Latest', '${latest.toStringAsFixed(2)} $unit'),
        _buildStatItem('Min', '${min.toStringAsFixed(2)} $unit'),
        _buildStatItem('Max', '${max.toStringAsFixed(2)} $unit'),
        _buildStatItem('Avg', '${avg.toStringAsFixed(2)} $unit'),
      ],
    );
  }

  Widget _buildStatItem(String label, String value) {
    return Column(
      children: [
        Text(
          label,
          style: TextStyle(
            color: AppTheme.textSecondary,
            fontSize: 12,
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _buildRecentReadings(List<WaterParameters> parameters) {
    final recentParameters = parameters.take(5).toList();
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Recent Readings',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        ...recentParameters.map((params) => _buildParameterRow(params)),
      ],
    );
  }

  Widget _buildParameterRow(WaterParameters parameters) {
    final dateFormatter = DateFormat('MMM d, HH:mm');
    
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.science,
                  size: 16,
                  color: AppTheme.primaryColor,
                ),
                const SizedBox(width: 8),
                Text(
                  dateFormatter.format(parameters.recordedAt),
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 12,
              runSpacing: 4,
              children: [
                if (parameters.temperature != null)
                  _buildParameterChip('Temp', '${parameters.temperature!.toStringAsFixed(1)}°C'),
                if (parameters.ph != null)
                  _buildParameterChip('pH', parameters.ph!.toStringAsFixed(1)),
                if (parameters.ammonia != null)
                  _buildParameterChip('NH₃', '${parameters.ammonia!.toStringAsFixed(2)} ppm'),
                if (parameters.nitrite != null)
                  _buildParameterChip('NO₂', '${parameters.nitrite!.toStringAsFixed(2)} ppm'),
                if (parameters.nitrate != null)
                  _buildParameterChip('NO₃', '${parameters.nitrate!.toStringAsFixed(1)} ppm'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildParameterChip(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        '$label: $value',
        style: TextStyle(
          fontSize: 12,
          color: AppTheme.primaryColor,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  // Helper methods
  List<ParameterDataPoint> _extractParameterData(List<WaterParameters> parameters, String parameterType) {
    final dataPoints = <ParameterDataPoint>[];
    
    for (final param in parameters) {
      double? value;
      switch (parameterType) {
        case 'temperature':
          value = param.temperature;
          break;
        case 'ph':
          value = param.ph;
          break;
        case 'ammonia':
          value = param.ammonia;
          break;
        case 'nitrite':
          value = param.nitrite;
          break;
        case 'nitrate':
          value = param.nitrate;
          break;
      }
      
      if (value != null) {
        dataPoints.add(ParameterDataPoint(
          timestamp: param.recordedAt,
          value: value,
        ));
      }
    }
    
    return dataPoints;
  }

  String _getParameterDisplayName(String parameterType) {
    switch (parameterType) {
      case 'temperature':
        return 'Temperature';
      case 'ph':
        return 'pH';
      case 'ammonia':
        return 'Ammonia (NH₃)';
      case 'nitrite':
        return 'Nitrite (NO₂)';
      case 'nitrate':
        return 'Nitrate (NO₃)';
      default:
        return parameterType;
    }
  }

  TrendDirection _calculateTrend(List<ParameterDataPoint> dataPoints) {
    if (dataPoints.length < 2) return TrendDirection.stable;
    
    final first = dataPoints.first.value;
    final last = dataPoints.last.value;
    final diff = last - first;
    
    if (diff.abs() < 0.1) return TrendDirection.stable;
    return diff > 0 ? TrendDirection.increasing : TrendDirection.decreasing;
  }

  double? _getIdealMin(String parameterType) {
    switch (parameterType) {
      case 'temperature':
        return 24.0; // Tropical fish
      case 'ph':
        return 6.5;
      case 'ammonia':
        return 0.0;
      case 'nitrite':
        return 0.0;
      case 'nitrate':
        return 0.0;
      default:
        return null;
    }
  }

  double? _getIdealMax(String parameterType) {
    switch (parameterType) {
      case 'temperature':
        return 26.0;
      case 'ph':
        return 7.5;
      case 'ammonia':
        return 0.25;
      case 'nitrite':
        return 0.5;
      case 'nitrate':
        return 20.0;
      default:
        return null;
    }
  }

  double? _getWarningMin(String parameterType) {
    switch (parameterType) {
      case 'temperature':
        return 20.0;
      case 'ph':
        return 6.0;
      default:
        return null;
    }
  }

  double? _getWarningMax(String parameterType) {
    switch (parameterType) {
      case 'temperature':
        return 30.0;
      case 'ph':
        return 8.5;
      case 'ammonia':
        return 1.0;
      case 'nitrite':
        return 2.0;
      case 'nitrate':
        return 50.0;
      default:
        return null;
    }
  }
}