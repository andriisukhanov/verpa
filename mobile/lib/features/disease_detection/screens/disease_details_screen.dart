import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'dart:io';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../models/disease_detection_result.dart';
import '../widgets/health_score_widget.dart';
import '../widgets/disease_info_card.dart';
import '../widgets/treatment_card.dart';
import '../widgets/observation_widget.dart';

class DiseaseDetailsScreen extends StatefulWidget {
  final String resultId;
  final DiseaseDetectionResult result;

  const DiseaseDetailsScreen({
    super.key,
    required this.resultId,
    required this.result,
  });

  @override
  State<DiseaseDetailsScreen> createState() => _DiseaseDetailsScreenState();
}

class _DiseaseDetailsScreenState extends State<DiseaseDetailsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: widget.result.hasDisease ? 4 : 3,
      vsync: this,
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            SliverAppBar(
              expandedHeight: 300,
              pinned: true,
              backgroundColor: AppTheme.primaryColor,
              foregroundColor: Colors.white,
              flexibleSpace: FlexibleSpaceBar(
                title: Text(
                  widget.result.hasDisease 
                      ? 'Disease Analysis'
                      : 'Health Check Results',
                ),
                background: Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.file(
                      File(widget.result.imageUrl),
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Container(
                          color: AppTheme.primaryColor,
                          child: const Icon(
                            Icons.image_not_supported,
                            size: 64,
                            color: Colors.white,
                          ),
                        );
                      },
                    ),
                    Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            Colors.black.withOpacity(0.7),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.share),
                  onPressed: _shareReport,
                ),
                PopupMenuButton<String>(
                  icon: const Icon(Icons.more_vert),
                  onSelected: (value) {
                    switch (value) {
                      case 'delete':
                        _deleteResult();
                        break;
                      case 'export':
                        _exportReport();
                        break;
                    }
                  },
                  itemBuilder: (context) => [
                    const PopupMenuItem(
                      value: 'export',
                      child: Row(
                        children: [
                          Icon(Icons.download, color: Colors.black54),
                          SizedBox(width: 8),
                          Text('Export Report'),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'delete',
                      child: Row(
                        children: [
                          Icon(Icons.delete, color: Colors.red),
                          SizedBox(width: 8),
                          Text('Delete', style: TextStyle(color: Colors.red)),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
              bottom: TabBar(
                controller: _tabController,
                labelColor: Colors.white,
                unselectedLabelColor: Colors.white70,
                indicatorColor: Colors.white,
                tabs: [
                  const Tab(text: 'Overview'),
                  if (widget.result.hasDisease)
                    const Tab(text: 'Diseases'),
                  const Tab(text: 'Observations'),
                  const Tab(text: 'Treatment'),
                ],
              ),
            ),
          ];
        },
        body: TabBarView(
          controller: _tabController,
          children: [
            _buildOverviewTab(),
            if (widget.result.hasDisease)
              _buildDiseasesTab(),
            _buildObservationsTab(),
            _buildTreatmentTab(),
          ],
        ),
      ),
      bottomNavigationBar: widget.result.hasDisease
          ? _buildBottomBar()
          : null,
    );
  }

  Widget _buildOverviewTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Analysis Info
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.info_outline,
                        color: AppTheme.primaryColor,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Analysis Information',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _buildInfoRow(
                    'Date',
                    DateFormat('MMM d, yyyy • h:mm a').format(
                      widget.result.analyzedAt,
                    ),
                  ),
                  _buildInfoRow(
                    'Confidence',
                    '${(widget.result.confidence * 100).toStringAsFixed(0)}%',
                  ),
                  _buildInfoRow(
                    'Status',
                    widget.result.hasDisease 
                        ? 'Disease Detected'
                        : 'No Disease Detected',
                    valueColor: widget.result.hasDisease 
                        ? AppTheme.errorColor
                        : AppTheme.successColor,
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Health Score
          HealthScoreWidget(
            score: widget.result.overallHealth.score,
            status: widget.result.overallHealth.status,
            summary: widget.result.overallHealth.summary,
            showDetails: true,
            concerns: widget.result.overallHealth.concerns,
            positives: widget.result.overallHealth.positives,
          ),
          
          const SizedBox(height: 16),
          
          // Quick Summary
          if (widget.result.detectedDiseases.isNotEmpty) ...[
            Card(
              color: AppTheme.errorColor.withOpacity(0.1),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.warning,
                          color: AppTheme.errorColor,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Detected Issues',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppTheme.errorColor,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ...widget.result.detectedDiseases.map((disease) => 
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: _getSeverityColor(disease.severity),
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                disease.name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: _getSeverityColor(disease.severity)
                                    .withOpacity(0.2),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                disease.severity.displayName,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: _getSeverityColor(disease.severity),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDiseasesTab() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: widget.result.detectedDiseases.length,
      itemBuilder: (context, index) {
        final disease = widget.result.detectedDiseases[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: DiseaseInfoCard(
            disease: disease,
            onLearnMore: () {
              context.push('/disease-guide', extra: disease.id);
            },
          ),
        );
      },
    );
  }

  Widget _buildObservationsTab() {
    final grouped = <ObservationType, List<HealthObservation>>{};
    
    for (final observation in widget.result.observations) {
      grouped.putIfAbsent(observation.type, () => []).add(observation);
    }
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Positive Observations
          if (grouped[ObservationType.positive]?.isNotEmpty ?? false) ...[
            _buildObservationSection(
              'Positive Observations',
              grouped[ObservationType.positive]!,
              Icons.check_circle,
              AppTheme.successColor,
            ),
            const SizedBox(height: 24),
          ],
          
          // Negative Observations
          if (grouped[ObservationType.negative]?.isNotEmpty ?? false) ...[
            _buildObservationSection(
              'Areas of Concern',
              grouped[ObservationType.negative]!,
              Icons.error,
              AppTheme.errorColor,
            ),
            const SizedBox(height: 24),
          ],
          
          // Warning Observations
          if (grouped[ObservationType.warning]?.isNotEmpty ?? false) ...[
            _buildObservationSection(
              'Warnings',
              grouped[ObservationType.warning]!,
              Icons.warning,
              AppTheme.warningColor,
            ),
            const SizedBox(height: 24),
          ],
          
          // Neutral Observations
          if (grouped[ObservationType.neutral]?.isNotEmpty ?? false) ...[
            _buildObservationSection(
              'Other Observations',
              grouped[ObservationType.neutral]!,
              Icons.info,
              AppTheme.greyColor,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildObservationSection(
    String title,
    List<HealthObservation> observations,
    IconData icon,
    Color color,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, color: color),
            const SizedBox(width: 8),
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ...observations.map((obs) => 
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: ObservationWidget(observation: obs),
          ),
        ),
      ],
    );
  }

  Widget _buildTreatmentTab() {
    if (widget.result.recommendations.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              widget.result.hasDisease 
                  ? Icons.medical_services
                  : Icons.check_circle,
              size: 64,
              color: widget.result.hasDisease 
                  ? AppTheme.greyColor
                  : AppTheme.successColor,
            ),
            const SizedBox(height: 16),
            Text(
              widget.result.hasDisease
                  ? 'No specific treatment recommendations'
                  : 'No treatment needed - fish appears healthy!',
              style: TextStyle(
                fontSize: 16,
                color: AppTheme.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            if (!widget.result.hasDisease) ...[
              const SizedBox(height: 8),
              Text(
                'Continue regular maintenance and monitoring',
                style: TextStyle(
                  fontSize: 14,
                  color: AppTheme.textSecondary,
                ),
              ),
            ],
          ],
        ),
      );
    }
    
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: widget.result.recommendations.length,
      itemBuilder: (context, index) {
        final treatment = widget.result.recommendations[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: TreatmentCard(
            treatment: treatment,
            onStartTreatment: () => _startTreatment(treatment),
          ),
        );
      },
    );
  }

  Widget _buildBottomBar() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 4,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: CustomButton(
              text: 'Get Second Opinion',
              icon: Icons.refresh,
              variant: ButtonVariant.outline,
              onPressed: () {
                context.pop();
              },
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: CustomButton(
              text: 'Start Treatment',
              icon: Icons.medical_services,
              onPressed: () {
                context.push(
                  '/disease-treatment/${widget.result.id}',
                  extra: widget.result,
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: AppTheme.textSecondary,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: valueColor,
            ),
          ),
        ],
      ),
    );
  }

  Color _getSeverityColor(DiseaseSeverity severity) {
    switch (severity) {
      case DiseaseSeverity.mild:
        return AppTheme.warningColor;
      case DiseaseSeverity.moderate:
        return Colors.orange;
      case DiseaseSeverity.severe:
        return AppTheme.errorColor;
      case DiseaseSeverity.critical:
        return Colors.red[900]!;
    }
  }

  void _shareReport() {
    // TODO: Implement share functionality
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Share feature coming soon!'),
      ),
    );
  }

  void _exportReport() {
    // TODO: Implement export functionality
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Export feature coming soon!'),
      ),
    );
  }

  void _deleteResult() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Analysis?'),
        content: const Text(
          'Are you sure you want to delete this analysis result? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              // TODO: Delete result
              context.pop();
            },
            style: TextButton.styleFrom(
              foregroundColor: AppTheme.errorColor,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _startTreatment(TreatmentRecommendation treatment) {
    context.push(
      '/disease-treatment/${widget.result.id}',
      extra: widget.result,
    );
  }
}