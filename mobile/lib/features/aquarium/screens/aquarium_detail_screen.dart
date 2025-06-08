import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/loading_overlay.dart';
import '../bloc/aquarium_bloc.dart';
import '../models/aquarium_model.dart';
import '../widgets/aquarium_info_card.dart';
import '../widgets/parameter_display.dart';
import '../widgets/parameter_history_widget.dart';
import '../widgets/equipment_list.dart';
import '../widgets/inhabitant_list.dart';
import '../../maintenance/models/maintenance_task.dart';
import '../../maintenance/services/maintenance_service.dart';
import '../../maintenance/widgets/maintenance_task_card.dart';
import '../../maintenance/widgets/add_task_dialog.dart';
import '../../voice_assistant/widgets/voice_assistant_button.dart';
import '../../collaboration/widgets/realtime_indicator.dart';

class AquariumDetailScreen extends StatefulWidget {
  final String aquariumId;
  
  const AquariumDetailScreen({
    super.key,
    required this.aquariumId,
  });

  @override
  State<AquariumDetailScreen> createState() => _AquariumDetailScreenState();
}

class _AquariumDetailScreenState extends State<AquariumDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    
    // Load aquarium data
    context.read<AquariumBloc>().add(
      AquariumLoadRequested(aquariumId: widget.aquariumId),
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AquariumBloc, AquariumState>(
      listener: (context, state) {
        setState(() {
          _isLoading = state is AquariumLoading;
        });

        if (state is AquariumError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppTheme.errorColor,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      },
      builder: (context, state) {
        if (state is AquariumLoaded) {
          return _buildLoadedContent(state.aquarium);
        } else if (state is AquariumsLoaded && state.selectedAquarium != null) {
          return _buildLoadedContent(state.selectedAquarium!);
        }
        
        return Scaffold(
          appBar: AppBar(
            title: const Text('Loading...'),
            backgroundColor: AppTheme.primaryColor,
            foregroundColor: Colors.white,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => context.go('/dashboard'),
            ),
          ),
          body: LoadingOverlay(
            isLoading: true,
            child: const SizedBox.expand(),
          ),
        );
      },
    );
  }

  Widget _buildLoadedContent(Aquarium aquarium) {
    return Scaffold(
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            SliverAppBar(
              expandedHeight: 250,
              floating: false,
              pinned: true,
              backgroundColor: AppTheme.primaryColor,
              foregroundColor: Colors.white,
              leading: IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => context.go('/dashboard'),
              ),
              actions: [
                // Real-time indicator
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: RealtimeIndicator(
                    aquariumId: aquarium.id,
                    showOnlineCount: true,
                    showActivityPulse: true,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.edit),
                  onPressed: () {
                    // TODO: Navigate to edit screen
                  },
                ),
                PopupMenuButton<String>(
                  icon: const Icon(Icons.more_vert),
                  onSelected: (value) {
                    switch (value) {
                      case 'delete':
                        _showDeleteConfirmation(aquarium);
                        break;
                      case 'share':
                        context.push('/share-aquarium?aquariumId=${aquarium.id}');
                        break;
                    }
                  },
                  itemBuilder: (context) => [
                    const PopupMenuItem(
                      value: 'share',
                      child: Row(
                        children: [
                          Icon(Icons.share, color: Colors.black54),
                          SizedBox(width: 8),
                          Text('Share'),
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
              flexibleSpace: FlexibleSpaceBar(
                title: Text(
                  aquarium.name,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                background: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (aquarium.imageUrl != null)
                      CachedNetworkImage(
                        imageUrl: aquarium.imageUrl!,
                        fit: BoxFit.cover,
                        placeholder: (context, url) => Container(
                          color: AppTheme.primaryColor,
                          child: const Center(
                            child: CircularProgressIndicator(
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          ),
                        ),
                        errorWidget: (context, url, error) => Container(
                          color: AppTheme.primaryColor,
                          child: const Icon(
                            Icons.waves,
                            size: 60,
                            color: Colors.white,
                          ),
                        ),
                      )
                    else
                      Container(
                        color: AppTheme.primaryColor,
                        child: const Icon(
                          Icons.waves,
                          size: 60,
                          color: Colors.white,
                        ),
                      ),
                    // Gradient overlay for text readability
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
              bottom: TabBar(
                controller: _tabController,
                labelColor: Colors.white,
                unselectedLabelColor: Colors.white70,
                indicatorColor: Colors.white,
                tabs: const [
                  Tab(text: 'Overview'),
                  Tab(text: 'Parameters'),
                  Tab(text: 'Equipment'),
                  Tab(text: 'Inhabitants'),
                  Tab(text: 'Maintenance'),
                ],
              ),
            ),
          ];
        },
        body: LoadingOverlay(
          isLoading: _isLoading,
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildOverviewTab(aquarium),
              _buildParametersTab(aquarium),
              _buildEquipmentTab(aquarium),
              _buildInhabitantsTab(aquarium),
              _buildMaintenanceTab(aquarium),
            ],
          ),
        ),
      ),
      floatingActionButton: _buildFAB(aquarium),
    );
  }

  Widget _buildOverviewTab(Aquarium aquarium) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Health Score Card
          _buildHealthScoreCard(aquarium),
          
          const SizedBox(height: 16),
          
          // Basic Information
          AquariumInfoCard(aquarium: aquarium),
          
          const SizedBox(height: 16),
          
          // Alerts
          if (aquarium.alerts.isNotEmpty) ...[
            _buildAlertsSection(aquarium.alerts),
            const SizedBox(height: 16),
          ],
          
          // Current Parameters Summary
          if (aquarium.currentParameters != null) ...[
            _buildCurrentParametersCard(aquarium.currentParameters!),
            const SizedBox(height: 16),
          ],
          
          // Quick Actions
          _buildQuickActions(aquarium),
          
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildParametersTab(Aquarium aquarium) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Record Parameters Button
          CustomButton(
            text: 'Record New Parameters',
            icon: Icons.science,
            onPressed: () {
              context.push('/record-parameters/${aquarium.id}');
            },
          ),
          
          const SizedBox(height: 24),
          
          // Current Parameters
          if (aquarium.currentParameters != null) ...[
            Text(
              'Current Parameters',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ParameterDisplay(parameters: aquarium.currentParameters!),
            const SizedBox(height: 24),
          ],
          
          // Parameter History
          ParameterHistoryWidget(
            aquariumId: aquarium.id,
          ),
        ],
      ),
    );
  }

  Widget _buildEquipmentTab(Aquarium aquarium) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Add Equipment Button
          Row(
            children: [
              Expanded(
                child: CustomButton(
                  text: 'Manage Equipment',
                  icon: Icons.settings,
                  variant: ButtonVariant.outline,
                  onPressed: () {
                    context.push('/equipment/${aquarium.id}');
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: CustomButton(
                  text: 'Add Equipment',
                  icon: Icons.add,
                  variant: ButtonVariant.primary,
                  onPressed: () {
                    context.push('/add-equipment/${aquarium.id}');
                  },
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 24),
          
          // Equipment List
          if (aquarium.equipment.isEmpty) ...[
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.settings,
                    size: 64,
                    color: AppTheme.greyColor,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No equipment added yet',
                    style: TextStyle(
                      color: AppTheme.textSecondary,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),
          ] else ...[
            EquipmentList(
              equipment: aquarium.equipment,
              onEdit: (equipment) {
                context.push('/add-equipment/${aquarium.id}', extra: equipment);
              },
              onDelete: (equipment) {
                _confirmDeleteEquipment(equipment);
              },
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInhabitantsTab(Aquarium aquarium) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Add Inhabitant Button
          Row(
            children: [
              Expanded(
                child: CustomButton(
                  text: 'Manage Inhabitants',
                  icon: Icons.pets,
                  variant: ButtonVariant.outline,
                  onPressed: () {
                    context.push('/inhabitants/${aquarium.id}');
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: CustomButton(
                  text: 'Add Inhabitant',
                  icon: Icons.add,
                  variant: ButtonVariant.primary,
                  onPressed: () {
                    context.push('/add-inhabitant/${aquarium.id}');
                  },
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 24),
          
          // Inhabitants List
          if (aquarium.inhabitants.isEmpty) ...[
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.pets,
                    size: 64,
                    color: AppTheme.greyColor,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No inhabitants added yet',
                    style: TextStyle(
                      color: AppTheme.textSecondary,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),
          ] else ...[
            InhabitantList(
              inhabitants: aquarium.inhabitants,
              onEdit: (inhabitant) {
                context.push('/add-inhabitant/${aquarium.id}', extra: inhabitant);
              },
              onDelete: (inhabitant) {
                _confirmDeleteInhabitant(inhabitant);
              },
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMaintenanceTab(Aquarium aquarium) {
    return FutureBuilder<List<MaintenanceTask>>(
      future: MaintenanceService.getTasksForAquarium(aquarium.id),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        
        final tasks = snapshot.data ?? [];
        final pendingTasks = tasks.where((t) => !t.isCompleted).toList()
          ..sort((a, b) {
            if (a.dueDate == null && b.dueDate == null) return 0;
            if (a.dueDate == null) return 1;
            if (b.dueDate == null) return -1;
            return a.dueDate!.compareTo(b.dueDate!);
          });
        
        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Action Buttons
              Row(
                children: [
                  Expanded(
                    child: CustomButton(
                      text: 'View All Tasks',
                      icon: Icons.list_alt,
                      variant: ButtonVariant.outline,
                      onPressed: () {
                        context.push('/maintenance/${aquarium.id}');
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: CustomButton(
                      text: 'Add Task',
                      icon: Icons.add,
                      variant: ButtonVariant.primary,
                      onPressed: () {
                        showDialog(
                          context: context,
                          barrierDismissible: false,
                          builder: (context) => AddTaskDialog(
                            aquariumId: aquarium.id,
                            aquariumName: aquarium.name,
                            onTaskAdded: () {
                              setState(() {}); // Refresh the tab
                            },
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 24),
              
              // Stats Summary
              if (tasks.isNotEmpty) ...[
                _buildMaintenanceStats(tasks),
                const SizedBox(height: 24),
              ],
              
              // Pending Tasks
              Text(
                'Upcoming Tasks',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              
              if (pendingTasks.isEmpty) ...[
                Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.task_alt,
                        size: 64,
                        color: AppTheme.greyColor,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No pending maintenance tasks',
                        style: TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Great job keeping up with maintenance!',
                        style: TextStyle(
                          color: AppTheme.successColor,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              ] else ...[
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: pendingTasks.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final task = pendingTasks[index];
                    return MaintenanceTaskCard(
                      task: task,
                      onComplete: () async {
                        await MaintenanceService.completeTask(
                          task.id,
                          aquarium.id,
                          aquarium.name,
                          'User', // TODO: Get actual user name
                        );
                        setState(() {});
                      },
                      onEdit: () {
                        showDialog(
                          context: context,
                          barrierDismissible: false,
                          builder: (context) => AddTaskDialog(
                            aquariumId: aquarium.id,
                            aquariumName: aquarium.name,
                            task: task,
                            onTaskAdded: () {
                              setState(() {});
                            },
                          ),
                        );
                      },
                      onDelete: () async {
                        final confirm = await showDialog<bool>(
                          context: context,
                          builder: (context) => AlertDialog(
                            title: const Text('Delete Task?'),
                            content: Text('Are you sure you want to delete "${task.title}"?'),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(context, false),
                                child: const Text('Cancel'),
                              ),
                              TextButton(
                                onPressed: () => Navigator.pop(context, true),
                                style: TextButton.styleFrom(
                                  foregroundColor: AppTheme.errorColor,
                                ),
                                child: const Text('Delete'),
                              ),
                            ],
                          ),
                        );
                        
                        if (confirm == true) {
                          await MaintenanceService.deleteTask(task.id, aquarium.id);
                          setState(() {});
                        }
                      },
                    );
                  },
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _buildMaintenanceStats(List<MaintenanceTask> tasks) {
    final stats = MaintenanceService.getTaskStatistics(tasks);
    final completionRate = (stats['completionRate'] as double) * 100;
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Maintenance Overview',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildStatItem(
                    'Total',
                    stats['total'].toString(),
                    Icons.assignment,
                    AppTheme.primaryColor,
                  ),
                ),
                Container(
                  width: 1,
                  height: 40,
                  color: Colors.grey[300],
                ),
                Expanded(
                  child: _buildStatItem(
                    'Completed',
                    stats['completed'].toString(),
                    Icons.check_circle,
                    AppTheme.successColor,
                  ),
                ),
                Container(
                  width: 1,
                  height: 40,
                  color: Colors.grey[300],
                ),
                Expanded(
                  child: _buildStatItem(
                    'Overdue',
                    stats['overdue'].toString(),
                    Icons.warning,
                    AppTheme.errorColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: stats['completionRate'] as double,
                minHeight: 8,
                backgroundColor: Colors.grey[300],
                valueColor: AlwaysStoppedAnimation<Color>(
                  completionRate >= 80
                      ? AppTheme.successColor
                      : completionRate >= 50
                          ? AppTheme.warningColor
                          : AppTheme.errorColor,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '${completionRate.toStringAsFixed(0)}% completion rate',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Widget _buildHealthScoreCard(Aquarium aquarium) {
    final healthColor = _getHealthColor(aquarium.healthScore);
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: healthColor.withOpacity(0.2),
                border: Border.all(
                  color: healthColor,
                  width: 4,
                ),
              ),
              child: Center(
                child: Text(
                  '${aquarium.healthScore.toInt()}%',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: healthColor,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Health Score',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _getHealthStatus(aquarium.healthScore),
                    style: TextStyle(
                      color: healthColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(
                    value: aquarium.healthScore / 100,
                    backgroundColor: Colors.grey[300],
                    valueColor: AlwaysStoppedAnimation<Color>(healthColor),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAlertsSection(List<String> alerts) {
    return Card(
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
                  'Alerts',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppTheme.errorColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...alerts.map((alert) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('• ', style: TextStyle(fontWeight: FontWeight.bold)),
                  Expanded(child: Text(alert)),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentParametersCard(WaterParameters parameters) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Current Parameters',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  DateFormat('MMM d, h:mm a').format(parameters.recordedAt),
                  style: TextStyle(
                    color: AppTheme.textSecondary,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildParameterRow('Temperature', parameters.temperature, '°F'),
            _buildParameterRow('pH', parameters.ph),
            _buildParameterRow('Ammonia', parameters.ammonia, 'ppm'),
            _buildParameterRow('Nitrite', parameters.nitrite, 'ppm'),
            _buildParameterRow('Nitrate', parameters.nitrate, 'ppm'),
          ],
        ),
      ),
    );
  }

  Widget _buildParameterRow(String label, double? value, [String unit = '']) {
    if (value == null) return const SizedBox.shrink();
    
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
            '$value$unit',
            style: const TextStyle(
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions(Aquarium aquarium) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quick Actions',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _buildActionButton(
                icon: Icons.science,
                label: 'Record\nParameters',
                color: AppTheme.primaryColor,
                onPressed: () {
                  context.push('/record-parameters/${aquarium.id}');
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionButton(
                icon: Icons.analytics,
                label: 'View\nAnalytics',
                color: Colors.purple,
                onPressed: () {
                  context.push('/analytics/${aquarium.id}');
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildActionButton(
                icon: Icons.water_drop,
                label: 'Water\nChanges',
                color: AppTheme.secondaryColor,
                onPressed: () {
                  context.push('/water-change-history/${aquarium.id}');
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionButton(
                icon: Icons.restaurant,
                label: 'Feeding\nSchedule',
                color: AppTheme.accentColor,
                onPressed: () {
                  context.push('/feeding/${aquarium.id}');
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildActionButton(
                icon: Icons.build,
                label: 'Maintenance\nTasks',
                color: Colors.orange,
                onPressed: () {
                  context.push('/maintenance/${aquarium.id}');
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionButton(
                icon: Icons.biotech,
                label: 'Disease\nDetection',
                color: Colors.teal,
                onPressed: () {
                  context.push('/disease-detection/${aquarium.id}');
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildActionButton(
                icon: Icons.qr_code_scanner,
                label: 'Scan\nProduct',
                color: Colors.deepPurple,
                onPressed: () {
                  context.push('/barcode-scanner', extra: {
                    'aquariumId': aquarium.id,
                  });
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionButton(
                icon: Icons.inventory_2,
                label: 'Product\nInventory',
                color: Colors.brown,
                onPressed: () {
                  context.push('/product-inventory?aquariumId=${aquarium.id}');
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildActionButton(
                icon: Icons.account_balance_wallet,
                label: 'Expense\nTracker',
                color: Colors.indigo,
                onPressed: () {
                  context.push('/expenses/${aquarium.id}');
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionButton(
                icon: Icons.auto_graph,
                label: 'AI\nPredictions',
                color: Colors.deepOrange,
                onPressed: () {
                  context.push('/predictions/${aquarium.id}');
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildActionButton(
                icon: Icons.camera_alt,
                label: 'Test Strip\nScanner',
                color: Colors.teal,
                onPressed: () {
                  context.push('/water-test-camera/${aquarium.id}');
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionButton(
                icon: Icons.sensors,
                label: 'IoT\nDevices',
                color: Colors.blue,
                onPressed: () {
                  context.push('/iot-devices/${aquarium.id}');
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildActionButton(
                icon: Icons.people,
                label: 'Collaborators',
                color: Colors.purple,
                onPressed: () {
                  context.push('/collaborators/${aquarium.id}?name=${Uri.encodeComponent(aquarium.name)}');
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Container(), // Empty space for balance
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onPressed,
  }) {
    return InkWell(
      onTap: onPressed,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: color.withOpacity(0.3),
          ),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              color: color,
              size: 32,
            ),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: color,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFAB(Aquarium aquarium) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        VoiceAssistantButton(
          aquariumId: aquarium.id,
        ),
        const SizedBox(height: 16),
        FloatingActionButton.extended(
          onPressed: () {
            // TODO: Show quick action menu
          },
          backgroundColor: AppTheme.secondaryColor,
          icon: const Icon(Icons.add),
          label: const Text('Quick Add'),
        ),
      ],
    );
  }

  void _showDeleteConfirmation(Aquarium aquarium) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Aquarium?'),
        content: Text(
          'Are you sure you want to delete "${aquarium.name}"? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              context.read<AquariumBloc>().add(
                AquariumDeleteRequested(aquariumId: aquarium.id),
              );
              context.go('/dashboard');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.errorColor,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteEquipment(Equipment equipment) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Equipment'),
        content: Text('Are you sure you want to delete "${equipment.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<AquariumBloc>().add(
                AquariumEquipmentRemoveRequested(
                  aquariumId: widget.aquariumId,
                  equipmentId: equipment.id,
                ),
              );
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

  void _confirmDeleteInhabitant(Inhabitant inhabitant) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Inhabitant'),
        content: Text('Are you sure you want to delete "${inhabitant.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<AquariumBloc>().add(
                AquariumInhabitantRemoveRequested(
                  aquariumId: widget.aquariumId,
                  inhabitantId: inhabitant.id,
                ),
              );
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

  Color _getHealthColor(double score) {
    if (score >= 80) return AppTheme.excellentColor;
    if (score >= 60) return AppTheme.goodColor;
    if (score >= 40) return AppTheme.fairColor;
    if (score >= 20) return AppTheme.poorColor;
    return AppTheme.criticalColor;
  }

  String _getHealthStatus(double score) {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    if (score >= 20) return 'Poor';
    return 'Critical';
  }
}