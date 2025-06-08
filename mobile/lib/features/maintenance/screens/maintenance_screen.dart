import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/loading_view.dart';
import '../../aquarium/bloc/aquarium_bloc.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../models/maintenance_task.dart';
import '../services/maintenance_service.dart';
import '../widgets/maintenance_task_card.dart';
import '../widgets/maintenance_stats_widget.dart';
import '../widgets/add_task_dialog.dart';

class MaintenanceScreen extends StatefulWidget {
  final String aquariumId;

  const MaintenanceScreen({
    super.key,
    required this.aquariumId,
  });

  @override
  State<MaintenanceScreen> createState() => _MaintenanceScreenState();
}

class _MaintenanceScreenState extends State<MaintenanceScreen> 
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;
  List<MaintenanceTask> _allTasks = [];
  List<MaintenanceTask> _pendingTasks = [];
  List<MaintenanceTask> _completedTasks = [];
  List<MaintenanceTask> _overdueTasks = [];
  Map<String, dynamic> _stats = {};
  String? _aquariumName;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);

    try {
      // Load aquarium info
      context.read<AquariumBloc>().add(
        AquariumLoadRequested(aquariumId: widget.aquariumId),
      );

      // Load tasks
      final tasks = await MaintenanceService.getTasks(widget.aquariumId);
      final stats = await MaintenanceService.getTaskStats(widget.aquariumId);
      
      setState(() {
        _allTasks = tasks;
        _pendingTasks = tasks.where((t) => !t.isCompleted).toList();
        _completedTasks = tasks.where((t) => t.isCompleted).toList();
        _overdueTasks = tasks.where((t) => t.isOverdue).toList();
        _stats = stats;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load tasks: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Maintenance Tasks'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          indicatorWeight: 3,
          tabs: [
            Tab(
              text: 'Pending',
              icon: Badge(
                label: Text(_pendingTasks.length.toString()),
                child: const Icon(Icons.pending_actions),
              ),
            ),
            Tab(
              text: 'Completed',
              icon: Badge(
                label: Text(_completedTasks.length.toString()),
                child: const Icon(Icons.check_circle),
              ),
            ),
            const Tab(
              text: 'Templates',
              icon: Icon(Icons.library_books),
            ),
          ],
        ),
      ),
      body: BlocListener<AquariumBloc, AquariumState>(
        listener: (context, state) {
          if (state is AquariumLoaded) {
            setState(() {
              _aquariumName = state.aquarium.name;
            });
          }
        },
        child: _isLoading
            ? const LoadingView()
            : TabBarView(
                controller: _tabController,
                children: [
                  _buildPendingTab(),
                  _buildCompletedTab(),
                  _buildTemplatesTab(),
                ],
              ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddTaskDialog,
        backgroundColor: AppTheme.primaryColor,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildPendingTab() {
    if (_pendingTasks.isEmpty) {
      return EmptyState(
        icon: Icons.task_alt,
        title: 'No Pending Tasks',
        message: 'All caught up! Add new tasks to stay on top of maintenance',
        actionText: 'Add Task',
        onAction: _showAddTaskDialog,
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: CustomScrollView(
        slivers: [
          // Stats Overview
          if (_stats.isNotEmpty)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: MaintenanceStatsWidget(stats: _stats),
              ),
            ),
          
          // Overdue Tasks Section
          if (_overdueTasks.isNotEmpty) ...[
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                child: Row(
                  children: [
                    Icon(
                      Icons.warning,
                      color: AppTheme.errorColor,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Overdue Tasks (${_overdueTasks.length})',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.errorColor,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final task = _overdueTasks[index];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: MaintenanceTaskCard(
                        task: task,
                        onComplete: () => _completeTask(task),
                        onEdit: () => _editTask(task),
                        onDelete: () => _deleteTask(task),
                      ),
                    );
                  },
                  childCount: _overdueTasks.length,
                ),
              ),
            ),
          ],
          
          // Upcoming Tasks Section
          SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.fromLTRB(
                16, 
                _overdueTasks.isEmpty ? 8 : 16, 
                16, 
                8,
              ),
              child: Text(
                'Upcoming Tasks',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final upcomingTasks = _pendingTasks
                      .where((t) => !t.isOverdue)
                      .toList();
                  
                  if (index >= upcomingTasks.length) return null;
                  
                  final task = upcomingTasks[index];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: MaintenanceTaskCard(
                      task: task,
                      onComplete: () => _completeTask(task),
                      onEdit: () => _editTask(task),
                      onDelete: () => _deleteTask(task),
                    ),
                  );
                },
                childCount: _pendingTasks.where((t) => !t.isOverdue).length,
              ),
            ),
          ),
          
          // Bottom padding
          const SliverToBoxAdapter(
            child: SizedBox(height: 80),
          ),
        ],
      ),
    );
  }

  Widget _buildCompletedTab() {
    if (_completedTasks.isEmpty) {
      return const EmptyState(
        icon: Icons.check_circle_outline,
        title: 'No Completed Tasks',
        message: 'Complete your pending tasks to see them here',
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _completedTasks.length,
        itemBuilder: (context, index) {
          final task = _completedTasks[index];
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: MaintenanceTaskCard(
              task: task,
              onComplete: () => _uncompleteTask(task),
              onEdit: () => _editTask(task),
              onDelete: () => _deleteTask(task),
            ),
          );
        },
      ),
    );
  }

  Widget _buildTemplatesTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.auto_awesome,
                      color: AppTheme.primaryColor,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Quick Setup',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Add common maintenance tasks with one tap',
                  style: TextStyle(
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 16),
                CustomButton(
                  text: 'Add All Recommended Tasks',
                  icon: Icons.add_task,
                  onPressed: _addAllTemplates,
                ),
              ],
            ),
          ),
        ),
        
        const SizedBox(height: 16),
        
        Text(
          'Task Templates',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        
        const SizedBox(height: 8),
        
        ...MaintenanceTaskTemplate.commonTemplates.map((template) {
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: template.category.color.withOpacity(0.2),
                child: Icon(
                  template.category.icon,
                  color: template.category.color,
                ),
              ),
              title: Text(
                template.title,
                style: const TextStyle(fontWeight: FontWeight.w500),
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(template.description),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: template.priority.color.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          template.priority.displayName,
                          style: TextStyle(
                            fontSize: 12,
                            color: template.priority.color,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        template.recurrence.displayName,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              trailing: IconButton(
                icon: const Icon(Icons.add_circle_outline),
                color: AppTheme.primaryColor,
                onPressed: () => _addTemplateTask(template),
              ),
            ),
          );
        }).toList(),
      ],
    );
  }

  void _showAddTaskDialog() {
    showDialog(
      context: context,
      builder: (context) => AddTaskDialog(
        aquariumId: widget.aquariumId,
        aquariumName: _aquariumName ?? 'Aquarium',
        onTaskAdded: () {
          _loadData();
        },
      ),
    );
  }

  void _editTask(MaintenanceTask task) {
    showDialog(
      context: context,
      builder: (context) => AddTaskDialog(
        aquariumId: widget.aquariumId,
        aquariumName: _aquariumName ?? 'Aquarium',
        task: task,
        onTaskAdded: () {
          _loadData();
        },
      ),
    );
  }

  Future<void> _completeTask(MaintenanceTask task) async {
    try {
      final user = (context.read<AuthBloc>().state as AuthAuthenticated).user;
      await MaintenanceService.completeTask(
        task.id,
        widget.aquariumId,
        _aquariumName ?? 'Aquarium',
        user.name,
      );
      
      await _loadData();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Marked "${task.title}" as complete'),
            backgroundColor: AppTheme.successColor,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to complete task: $e'),
            backgroundColor: AppTheme.errorColor,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _uncompleteTask(MaintenanceTask task) async {
    try {
      await MaintenanceService.uncompleteTask(
        task.id,
        widget.aquariumId,
        _aquariumName ?? 'Aquarium',
      );
      
      await _loadData();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Task marked as pending'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update task: $e'),
            backgroundColor: AppTheme.errorColor,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _deleteTask(MaintenanceTask task) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Task'),
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

    if (confirmed == true) {
      try {
        await MaintenanceService.deleteTask(task.id);
        await _loadData();
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Task deleted'),
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to delete task: $e'),
              backgroundColor: AppTheme.errorColor,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    }
  }

  Future<void> _addTemplateTask(MaintenanceTaskTemplate template) async {
    try {
      final task = MaintenanceTask(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        aquariumId: widget.aquariumId,
        title: template.title,
        description: template.description,
        category: template.category,
        priority: template.priority,
        dueDate: DateTime.now().add(Duration(days: template.recurrenceInterval)),
        recurrence: template.recurrence,
        recurrenceInterval: template.recurrenceInterval,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
      
      await MaintenanceService.saveTask(task, _aquariumName ?? 'Aquarium');
      await _loadData();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Added "${template.title}" to tasks'),
            backgroundColor: AppTheme.successColor,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to add task: $e'),
            backgroundColor: AppTheme.errorColor,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _addAllTemplates() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add All Templates?'),
        content: Text(
          'This will add ${MaintenanceTaskTemplate.commonTemplates.length} maintenance tasks to your aquarium. You can edit or delete them later.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Add All'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await MaintenanceService.createTasksFromTemplates(
          widget.aquariumId,
          _aquariumName ?? 'Aquarium',
          MaintenanceTaskTemplate.commonTemplates,
        );
        
        await _loadData();
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('All recommended tasks added'),
              backgroundColor: AppTheme.successColor,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to add tasks: $e'),
              backgroundColor: AppTheme.errorColor,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    }
  }
}