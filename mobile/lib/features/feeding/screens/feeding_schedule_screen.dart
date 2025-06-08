import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:uuid/uuid.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/loading_view.dart';
import '../../aquarium/bloc/aquarium_bloc.dart';
import '../../aquarium/models/aquarium_model.dart';
import '../models/feeding_schedule.dart';
import '../services/feeding_schedule_service.dart';
import '../widgets/feeding_schedule_form.dart';
import '../widgets/feeding_schedule_card.dart';

class FeedingScheduleScreen extends StatefulWidget {
  final String aquariumId;

  const FeedingScheduleScreen({
    super.key,
    required this.aquariumId,
  });

  @override
  State<FeedingScheduleScreen> createState() => _FeedingScheduleScreenState();
}

class _FeedingScheduleScreenState extends State<FeedingScheduleScreen> {
  final _uuid = const Uuid();
  bool _isLoading = true;
  List<FeedingSchedule> _schedules = [];
  Aquarium? _aquarium;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);

    try {
      // Load aquarium data
      final aquariumBloc = context.read<AquariumBloc>();
      aquariumBloc.add(AquariumLoadRequested(aquariumId: widget.aquariumId));

      // Load feeding schedules
      final schedules = await FeedingScheduleService.getSchedules(widget.aquariumId);
      
      setState(() {
        _schedules = schedules..sort((a, b) {
          // Sort by time
          final aMinutes = a.time.hour * 60 + a.time.minute;
          final bMinutes = b.time.hour * 60 + b.time.minute;
          return aMinutes.compareTo(bMinutes);
        });
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load feeding schedules: $e'),
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
        title: const Text('Feeding Schedule'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: BlocListener<AquariumBloc, AquariumState>(
        listener: (context, state) {
          if (state is AquariumLoaded) {
            setState(() {
              _aquarium = state.aquarium;
            });
          }
        },
        child: _isLoading
            ? const LoadingView()
            : _schedules.isEmpty
                ? _buildEmptyState()
                : _buildScheduleList(),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddScheduleDialog,
        backgroundColor: AppTheme.primaryColor,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildEmptyState() {
    return EmptyState(
      icon: Icons.restaurant,
      title: 'No Feeding Schedules',
      message: 'Set up feeding reminders to keep your fish healthy and happy',
      actionText: 'Add Schedule',
      onAction: _showAddScheduleDialog,
    );
  }

  Widget _buildScheduleList() {
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Today's Schedule Summary
          _buildTodaySummary(),
          
          const SizedBox(height: 24),
          
          // All Schedules
          Text(
            'All Schedules',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          
          ..._schedules.map((schedule) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: FeedingScheduleCard(
              schedule: schedule,
              onEdit: () => _showEditScheduleDialog(schedule),
              onDelete: () => _deleteSchedule(schedule),
              onMarkFed: () => _markFed(schedule),
            ),
          )).toList(),
        ],
      ),
    );
  }

  Widget _buildTodaySummary() {
    final todaySchedules = _schedules.where((s) => 
      s.isActive && s.shouldFeedToday
    ).toList();

    if (todaySchedules.isEmpty) {
      return Card(
        color: AppTheme.surfaceColor,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Icon(
                Icons.info_outline,
                color: AppTheme.primaryColor,
                size: 24,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'No Feedings Today',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Enjoy your day off!',
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    }

    final completedCount = todaySchedules.where((s) => s.wasRecentlyFed).length;
    final totalCount = todaySchedules.length;
    final progress = totalCount > 0 ? completedCount / totalCount : 0.0;

    return Card(
      color: AppTheme.surfaceColor,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.today,
                  color: AppTheme.primaryColor,
                ),
                const SizedBox(width: 8),
                Text(
                  "Today's Feedings",
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Progress indicator
            Row(
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: progress,
                      minHeight: 8,
                      backgroundColor: Colors.grey[300],
                      valueColor: AlwaysStoppedAnimation<Color>(
                        progress == 1.0 
                            ? AppTheme.successColor 
                            : AppTheme.primaryColor,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  '$completedCount/$totalCount',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: progress == 1.0 
                        ? AppTheme.successColor 
                        : null,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 16),
            
            // Schedule items
            ...todaySchedules.map((schedule) {
              final isCompleted = schedule.wasRecentlyFed;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Icon(
                      isCompleted 
                          ? Icons.check_circle 
                          : Icons.radio_button_unchecked,
                      color: isCompleted 
                          ? AppTheme.successColor 
                          : Colors.grey,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      schedule.timeString,
                      style: TextStyle(
                        fontWeight: FontWeight.w500,
                        decoration: isCompleted 
                            ? TextDecoration.lineThrough 
                            : null,
                        color: isCompleted 
                            ? Colors.grey 
                            : null,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        schedule.name,
                        style: TextStyle(
                          decoration: isCompleted 
                              ? TextDecoration.lineThrough 
                              : null,
                          color: isCompleted 
                              ? Colors.grey 
                              : null,
                        ),
                      ),
                    ),
                    if (!isCompleted)
                      TextButton(
                        onPressed: () => _markFed(schedule),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          minimumSize: const Size(0, 0),
                        ),
                        child: const Text('Mark Fed'),
                      ),
                  ],
                ),
              );
            }).toList(),
          ],
        ),
      ),
    );
  }

  void _showAddScheduleDialog() {
    if (_aquarium == null) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: FeedingScheduleForm(
          onSave: (name, time, weekdays, notes) async {
            final schedule = FeedingSchedule(
              id: _uuid.v4(),
              aquariumId: widget.aquariumId,
              name: name,
              time: time,
              weekdays: weekdays,
              notes: notes,
              createdAt: DateTime.now(),
            );

            await _saveSchedule(schedule);
          },
        ),
      ),
    );
  }

  void _showEditScheduleDialog(FeedingSchedule schedule) {
    if (_aquarium == null) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: FeedingScheduleForm(
          schedule: schedule,
          onSave: (name, time, weekdays, notes) async {
            final updatedSchedule = schedule.copyWith(
              name: name,
              time: time,
              weekdays: weekdays,
              notes: notes,
            );

            await _saveSchedule(updatedSchedule);
          },
        ),
      ),
    );
  }

  Future<void> _saveSchedule(FeedingSchedule schedule) async {
    try {
      await FeedingScheduleService.saveSchedule(
        schedule,
        _aquarium!.name,
      );

      await _loadData();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Feeding schedule saved'),
            backgroundColor: AppTheme.successColor,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save schedule: $e'),
            backgroundColor: AppTheme.errorColor,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _deleteSchedule(FeedingSchedule schedule) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Schedule'),
        content: Text('Are you sure you want to delete "${schedule.name}"?'),
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
        await FeedingScheduleService.deleteSchedule(schedule.id);
        await _loadData();
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Schedule deleted'),
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to delete schedule: $e'),
              backgroundColor: AppTheme.errorColor,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    }
  }

  Future<void> _markFed(FeedingSchedule schedule) async {
    try {
      await FeedingScheduleService.markFed(schedule.id);
      await _loadData();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Marked as fed'),
            backgroundColor: AppTheme.successColor,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to mark as fed: $e'),
            backgroundColor: AppTheme.errorColor,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }
}