import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';
import '../models/maintenance_task.dart';

class MaintenanceTaskCard extends StatelessWidget {
  final MaintenanceTask task;
  final VoidCallback onComplete;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const MaintenanceTaskCard({
    super.key,
    required this.task,
    required this.onComplete,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final isOverdue = task.isOverdue;
    final daysUntilDue = task.daysUntilDue;
    
    return Card(
      elevation: isOverdue ? 2 : 1,
      color: isOverdue ? AppTheme.errorColor.withOpacity(0.05) : null,
      child: InkWell(
        onTap: onEdit,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  // Category Icon
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: task.category.color.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      task.category.icon,
                      color: task.category.color,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  
                  // Title and Category
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          task.title,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            decoration: task.isCompleted 
                                ? TextDecoration.lineThrough 
                                : null,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          task.category.displayName,
                          style: TextStyle(
                            fontSize: 12,
                            color: task.category.color,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  // Priority Badge
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: task.priority.color.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: task.priority.color.withOpacity(0.3),
                        width: 1,
                      ),
                    ),
                    child: Text(
                      task.priority.displayName,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: task.priority.color,
                      ),
                    ),
                  ),
                ],
              ),
              
              // Description
              if (task.description != null && task.description!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  task.description!,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[600],
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              
              const SizedBox(height: 12),
              
              // Due Date and Recurrence
              Row(
                children: [
                  // Due Date
                  if (task.dueDate != null) ...[
                    Icon(
                      Icons.calendar_today,
                      size: 16,
                      color: isOverdue ? AppTheme.errorColor : Colors.grey[600],
                    ),
                    const SizedBox(width: 4),
                    Text(
                      _formatDueDate(),
                      style: TextStyle(
                        fontSize: 13,
                        color: isOverdue ? AppTheme.errorColor : Colors.grey[600],
                        fontWeight: isOverdue ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                    const SizedBox(width: 16),
                  ],
                  
                  // Recurrence
                  if (task.recurrence != null) ...[
                    Icon(
                      Icons.repeat,
                      size: 16,
                      color: Colors.grey[600],
                    ),
                    const SizedBox(width: 4),
                    Text(
                      task.recurrence!.displayName,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                  
                  const Spacer(),
                  
                  // Complete/Uncomplete Button
                  if (!task.isCompleted)
                    IconButton(
                      icon: Icon(
                        Icons.check_circle_outline,
                        color: AppTheme.successColor,
                      ),
                      onPressed: onComplete,
                      tooltip: 'Mark as complete',
                    )
                  else
                    Row(
                      children: [
                        Icon(
                          Icons.check_circle,
                          size: 16,
                          color: AppTheme.successColor,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Completed',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppTheme.successColor,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        IconButton(
                          icon: Icon(
                            Icons.undo,
                            size: 20,
                            color: Colors.grey[600],
                          ),
                          onPressed: onComplete,
                          tooltip: 'Mark as pending',
                        ),
                      ],
                    ),
                ],
              ),
              
              // Completed Info
              if (task.isCompleted && task.completedDate != null) ...[
                const Divider(),
                Row(
                  children: [
                    Icon(
                      Icons.person,
                      size: 14,
                      color: Colors.grey[600],
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Completed by ${task.completedBy ?? 'Unknown'}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      DateFormat('MMM d, h:mm a').format(task.completedDate!),
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ],
              
              // Actions
              if (!task.isCompleted) ...[
                const Divider(),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton.icon(
                      onPressed: onEdit,
                      icon: const Icon(Icons.edit, size: 18),
                      label: const Text('Edit'),
                      style: TextButton.styleFrom(
                        foregroundColor: AppTheme.primaryColor,
                      ),
                    ),
                    const SizedBox(width: 8),
                    TextButton.icon(
                      onPressed: onDelete,
                      icon: const Icon(Icons.delete, size: 18),
                      label: const Text('Delete'),
                      style: TextButton.styleFrom(
                        foregroundColor: AppTheme.errorColor,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _formatDueDate() {
    if (task.dueDate == null) return 'No due date';
    
    final now = DateTime.now();
    final dueDate = task.dueDate!;
    final formatter = DateFormat('MMM d');
    
    if (task.isCompleted) {
      return formatter.format(dueDate);
    }
    
    if (dueDate.year == now.year && 
        dueDate.month == now.month && 
        dueDate.day == now.day) {
      return 'Due today';
    } else if (dueDate.year == now.year && 
               dueDate.month == now.month && 
               dueDate.day == now.day + 1) {
      return 'Due tomorrow';
    } else if (task.isOverdue) {
      final daysOverdue = now.difference(dueDate).inDays;
      return 'Overdue by $daysOverdue days';
    } else {
      final daysUntil = dueDate.difference(now).inDays;
      if (daysUntil <= 7) {
        return 'Due in $daysUntil days';
      } else {
        return 'Due ${formatter.format(dueDate)}';
      }
    }
  }
}