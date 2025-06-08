import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'dart:io';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/loading_overlay.dart';
import '../models/backup_data.dart';
import '../services/backup_service.dart';

class BackupRestoreScreen extends StatefulWidget {
  const BackupRestoreScreen({super.key});

  @override
  State<BackupRestoreScreen> createState() => _BackupRestoreScreenState();
}

class _BackupRestoreScreenState extends State<BackupRestoreScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<BackupHistory> _backupHistory = [];
  bool _isLoading = false;
  bool _isAutoBackupEnabled = false;
  BackupLocation _selectedBackupLocation = BackupLocation.local;

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
      final history = await BackupService.getBackupHistory();
      final autoBackupEnabled = await BackupService.isAutoBackupEnabled();
      
      setState(() {
        _backupHistory = history;
        _isAutoBackupEnabled = autoBackupEnabled;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error loading backup data: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Backup & Restore'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(text: 'Backup'),
            Tab(text: 'Restore'),
            Tab(text: 'History'),
          ],
        ),
      ),
      body: LoadingOverlay(
        isLoading: _isLoading,
        child: TabBarView(
          controller: _tabController,
          children: [
            _buildBackupTab(),
            _buildRestoreTab(),
            _buildHistoryTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildBackupTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Backup Info Card
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
                        size: 24,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'About Backups',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Backups include all your aquarium data, including:',
                    style: TextStyle(color: AppTheme.textSecondary),
                  ),
                  const SizedBox(height: 8),
                  ...[
                    'Aquariums and their configurations',
                    'Water parameters history',
                    'Equipment and inhabitants',
                    'Maintenance tasks and schedules',
                    'Expenses and budgets',
                    'Scanned products',
                    'Disease detection history',
                    'Settings and preferences',
                  ].map((item) => Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('• ', style: TextStyle(fontWeight: FontWeight.bold)),
                        Expanded(child: Text(item)),
                      ],
                    ),
                  )),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Manual Backup Section
          Text(
            'Manual Backup',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          
          CustomButton(
            text: 'Create Backup Now',
            icon: Icons.backup,
            onPressed: _createBackup,
          ),
          
          const SizedBox(height: 12),
          
          CustomButton(
            text: 'Export Backup',
            icon: Icons.share,
            variant: ButtonVariant.outline,
            onPressed: _exportBackup,
          ),
          
          const SizedBox(height: 32),
          
          // Automatic Backup Section
          Text(
            'Automatic Backup',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Enable Auto Backup',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      Switch(
                        value: _isAutoBackupEnabled,
                        onChanged: _toggleAutoBackup,
                        activeColor: AppTheme.primaryColor,
                      ),
                    ],
                  ),
                  
                  if (_isAutoBackupEnabled) ...[
                    const SizedBox(height: 16),
                    const Divider(),
                    const SizedBox(height: 16),
                    
                    // Backup Location
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Backup Location',
                          style: TextStyle(
                            fontSize: 14,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        ...BackupLocation.values.map((location) => 
                          RadioListTile<BackupLocation>(
                            title: Text(location.displayName),
                            value: location,
                            groupValue: _selectedBackupLocation,
                            onChanged: (value) {
                              if (value != null) {
                                setState(() {
                                  _selectedBackupLocation = value;
                                });
                                _updateBackupLocation(value);
                              }
                            },
                            contentPadding: EdgeInsets.zero,
                          ),
                        ),
                      ],
                    ),
                    
                    const SizedBox(height: 16),
                    
                    // Backup Frequency
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.schedule,
                            color: AppTheme.primaryColor,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Backs up automatically every 7 days',
                            style: TextStyle(
                              color: AppTheme.primaryColor,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Storage Management
          Text(
            'Storage Management',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          
          CustomButton(
            text: 'Clean Old Backups',
            icon: Icons.cleaning_services,
            variant: ButtonVariant.outline,
            onPressed: _cleanOldBackups,
          ),
        ],
      ),
    );
  }

  Widget _buildRestoreTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Warning Card
          Card(
            color: AppTheme.warningColor.withOpacity(0.1),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.warning,
                    color: AppTheme.warningColor,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Important',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: AppTheme.warningColor,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Restoring a backup will replace your current data. Make sure to create a backup of your current data before proceeding.',
                          style: TextStyle(
                            fontSize: 14,
                            color: AppTheme.warningColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Restore Options
          Text(
            'Restore From',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          
          // From File
          _buildRestoreOption(
            icon: Icons.file_upload,
            title: 'Import from File',
            subtitle: 'Select a backup file from your device',
            onTap: _importFromFile,
          ),
          
          const SizedBox(height: 12),
          
          // From Recent Backup
          if (_backupHistory.isNotEmpty) ...[
            _buildRestoreOption(
              icon: Icons.history,
              title: 'Recent Backup',
              subtitle: 'Restore from ${DateFormat('MMM d, yyyy').format(_backupHistory.first.date)}',
              onTap: () => _restoreFromHistory(_backupHistory.first),
            ),
            const SizedBox(height: 12),
          ],
          
          // From Cloud (if enabled)
          if (_isAutoBackupEnabled && _selectedBackupLocation != BackupLocation.local) ...[
            _buildRestoreOption(
              icon: Icons.cloud_download,
              title: 'Cloud Backup',
              subtitle: 'Restore from ${_selectedBackupLocation.displayName}',
              onTap: _restoreFromCloud,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildHistoryTab() {
    if (_backupHistory.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.history,
              size: 80,
              color: AppTheme.greyColor,
            ),
            const SizedBox(height: 24),
            Text(
              'No Backup History',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Your backup history will appear here',
              style: TextStyle(
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _backupHistory.length,
      itemBuilder: (context, index) {
        final backup = _backupHistory[index];
        return _buildHistoryItem(backup);
      },
    );
  }

  Widget _buildRestoreOption({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  color: AppTheme.primaryColor,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 14,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right,
                color: AppTheme.greyColor,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHistoryItem(BackupHistory backup) {
    final statusColor = backup.status == BackupStatus.success
        ? AppTheme.successColor
        : backup.status == BackupStatus.failed
            ? AppTheme.errorColor
            : AppTheme.warningColor;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: backup.status == BackupStatus.success
            ? () => _showBackupDetails(backup)
            : null,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(
                        backup.type == BackupType.automatic
                            ? Icons.backup
                            : Icons.save,
                        color: AppTheme.primaryColor,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        backup.type.displayName,
                        style: const TextStyle(
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      backup.status.displayName,
                      style: TextStyle(
                        fontSize: 12,
                        color: statusColor,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                DateFormat('MMMM d, yyyy h:mm a').format(backup.date),
                style: TextStyle(
                  fontSize: 14,
                  color: AppTheme.textSecondary,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(
                    Icons.storage,
                    size: 16,
                    color: AppTheme.textSecondary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    backup.location.displayName,
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Icon(
                    Icons.folder,
                    size: 16,
                    color: AppTheme.textSecondary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    _formatFileSize(backup.fileSize),
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ],
              ),
              if (backup.errorMessage != null) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.errorColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    backup.errorMessage!,
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.errorColor,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }

  Future<void> _createBackup() async {
    setState(() => _isLoading = true);
    
    try {
      final backup = await BackupService.createBackup();
      final file = await BackupService.saveBackupToFile(backup);
      
      await _loadData();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Backup created successfully'),
            backgroundColor: AppTheme.successColor,
            action: SnackBarAction(
              label: 'Share',
              textColor: Colors.white,
              onPressed: () => BackupService.exportBackup(backup),
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Backup failed: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _exportBackup() async {
    setState(() => _isLoading = true);
    
    try {
      final backup = await BackupService.createBackup();
      await BackupService.exportBackup(backup);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Export failed: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _toggleAutoBackup(bool enabled) async {
    setState(() => _isLoading = true);
    
    try {
      if (enabled) {
        await BackupService.enableAutoBackup(location: _selectedBackupLocation);
      } else {
        await BackupService.disableAutoBackup();
      }
      
      setState(() {
        _isAutoBackupEnabled = enabled;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              enabled ? 'Auto backup enabled' : 'Auto backup disabled',
            ),
            backgroundColor: AppTheme.successColor,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _updateBackupLocation(BackupLocation location) async {
    // Update backup location
    if (_isAutoBackupEnabled) {
      await BackupService.enableAutoBackup(location: location);
    }
  }

  Future<void> _cleanOldBackups() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clean Old Backups'),
        content: const Text(
          'This will delete old backup files to free up storage space. '
          'Only the most recent 10 backups will be kept. Continue?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Clean'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _isLoading = true);
      
      try {
        await BackupService.cleanOldBackups();
        await _loadData();
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Old backups cleaned successfully'),
              backgroundColor: AppTheme.successColor,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Error: $e'),
              backgroundColor: AppTheme.errorColor,
            ),
          );
        }
      } finally {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _importFromFile() async {
    setState(() => _isLoading = true);
    
    try {
      final backup = await BackupService.importBackupFromFile();
      
      if (mounted) {
        // Show restore options dialog
        _showRestoreOptionsDialog(backup);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Import failed: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _restoreFromHistory(BackupHistory history) async {
    // Load backup from file and show restore options
    // Implementation depends on how backups are stored
  }

  Future<void> _restoreFromCloud() async {
    // Implement cloud restore
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Cloud restore coming soon'),
      ),
    );
  }

  void _showBackupDetails(BackupHistory backup) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => BackupDetailsSheet(backup: backup),
    );
  }

  void _showRestoreOptionsDialog(BackupData backup) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => RestoreOptionsDialog(
        backup: backup,
        onRestore: (options) async {
          Navigator.pop(context);
          await _performRestore(backup, options);
        },
      ),
    );
  }

  Future<void> _performRestore(BackupData backup, RestoreOptions options) async {
    setState(() => _isLoading = true);
    
    try {
      await BackupService.restoreBackup(backup, options);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Restore completed successfully'),
            backgroundColor: AppTheme.successColor,
          ),
        );
        
        // Restart app or navigate to dashboard
        context.go('/dashboard');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Restore failed: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }
}

// Backup Details Sheet
class BackupDetailsSheet extends StatelessWidget {
  final BackupHistory backup;

  const BackupDetailsSheet({
    super.key,
    required this.backup,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Container(
            width: 40,
            height: 5,
            margin: const EdgeInsets.only(top: 12),
            decoration: BoxDecoration(
              color: AppTheme.greyColor,
              borderRadius: BorderRadius.circular(2.5),
            ),
          ),
          
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Backup Details',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                
                const SizedBox(height: 24),
                
                _buildDetailRow(
                  'Date',
                  DateFormat('MMMM d, yyyy h:mm a').format(backup.date),
                ),
                _buildDetailRow('Type', backup.type.displayName),
                _buildDetailRow('Location', backup.location.displayName),
                _buildDetailRow('Size', _formatFileSize(backup.fileSize)),
                _buildDetailRow('Status', backup.status.displayName),
                
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 16),
                
                Text(
                  'Contents',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),
                
                _buildContentRow(
                  'Aquariums',
                  backup.metadata.aquariumCount.toString(),
                ),
                _buildContentRow(
                  'Parameter Records',
                  backup.metadata.parameterRecordCount.toString(),
                ),
                _buildContentRow(
                  'Equipment',
                  backup.metadata.equipmentCount.toString(),
                ),
                _buildContentRow(
                  'Inhabitants',
                  backup.metadata.inhabitantCount.toString(),
                ),
                _buildContentRow(
                  'Water Changes',
                  backup.metadata.waterChangeCount.toString(),
                ),
                _buildContentRow(
                  'Maintenance Tasks',
                  backup.metadata.maintenanceTaskCount.toString(),
                ),
                _buildContentRow(
                  'Expenses',
                  backup.metadata.expenseCount.toString(),
                ),
                _buildContentRow(
                  'Products',
                  backup.metadata.productCount.toString(),
                ),
                
                const SizedBox(height: 24),
                
                CustomButton(
                  text: 'Restore This Backup',
                  icon: Icons.restore,
                  onPressed: () {
                    Navigator.pop(context);
                    // Trigger restore
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(color: AppTheme.textSecondary),
          ),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }

  Widget _buildContentRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 14),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    if (bytes < 1024 * 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
  }
}

// Restore Options Dialog
class RestoreOptionsDialog extends StatefulWidget {
  final BackupData backup;
  final Function(RestoreOptions) onRestore;

  const RestoreOptionsDialog({
    super.key,
    required this.backup,
    required this.onRestore,
  });

  @override
  State<RestoreOptionsDialog> createState() => _RestoreOptionsDialogState();
}

class _RestoreOptionsDialogState extends State<RestoreOptionsDialog> {
  bool _clearExistingData = false;
  bool _mergeData = true;
  ConflictResolution _conflictResolution = ConflictResolution.keepNewer;
  final Set<String> _selectedCollections = {};

  @override
  void initState() {
    super.initState();
    // Select all collections by default
    _selectedCollections.addAll(widget.backup.metadata.includedCollections);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Restore Options'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Warning
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.warningColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.warning,
                    color: AppTheme.warningColor,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'This action cannot be undone. Make sure you have a current backup.',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppTheme.warningColor,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Options
            SwitchListTile(
              title: const Text('Clear Existing Data'),
              subtitle: const Text('Remove all current data before restoring'),
              value: _clearExistingData,
              onChanged: (value) {
                setState(() {
                  _clearExistingData = value;
                  if (value) _mergeData = false;
                });
              },
              contentPadding: EdgeInsets.zero,
            ),
            
            SwitchListTile(
              title: const Text('Merge Data'),
              subtitle: const Text('Combine backup with existing data'),
              value: _mergeData,
              onChanged: _clearExistingData ? null : (value) {
                setState(() {
                  _mergeData = value;
                });
              },
              contentPadding: EdgeInsets.zero,
            ),
            
            if (_mergeData) ...[
              const SizedBox(height: 16),
              Text(
                'Conflict Resolution',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              ...ConflictResolution.values.map((resolution) => 
                RadioListTile<ConflictResolution>(
                  title: Text(resolution.displayName),
                  value: resolution,
                  groupValue: _conflictResolution,
                  onChanged: (value) {
                    if (value != null) {
                      setState(() {
                        _conflictResolution = value;
                      });
                    }
                  },
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ],
            
            const SizedBox(height: 16),
            
            Text(
              'Data to Restore',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            
            ...widget.backup.metadata.includedCollections.map((collection) => 
              CheckboxListTile(
                title: Text(_getCollectionDisplayName(collection)),
                value: _selectedCollections.contains(collection),
                onChanged: (value) {
                  setState(() {
                    if (value == true) {
                      _selectedCollections.add(collection);
                    } else {
                      _selectedCollections.remove(collection);
                    }
                  });
                },
                contentPadding: EdgeInsets.zero,
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        TextButton(
          onPressed: _selectedCollections.isEmpty ? null : () {
            final options = RestoreOptions(
              clearExistingData: _clearExistingData,
              mergeData: _mergeData,
              collectionsToRestore: _selectedCollections.toList(),
              conflictResolution: _conflictResolution,
            );
            widget.onRestore(options);
          },
          child: const Text('Restore'),
        ),
      ],
    );
  }

  String _getCollectionDisplayName(String collection) {
    final names = {
      'aquariums': 'Aquariums',
      'waterChanges': 'Water Changes',
      'maintenanceTasks': 'Maintenance Tasks',
      'expenses': 'Expenses',
      'budgets': 'Budgets',
      'products': 'Products',
      'diseaseDetections': 'Disease Detections',
      'feedingSchedules': 'Feeding Schedules',
      'sharedAquariums': 'Shared Aquariums',
      'settings': 'Settings',
      'notifications': 'Notifications',
    };
    return names[collection] ?? collection;
  }
}