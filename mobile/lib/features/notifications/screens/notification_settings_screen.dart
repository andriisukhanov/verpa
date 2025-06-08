import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/loading_view.dart';
import '../../../shared/services/notification_service.dart';
import '../services/aquarium_notification_service.dart';

class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({super.key});

  @override
  State<NotificationSettingsScreen> createState() => _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState extends State<NotificationSettingsScreen> {
  bool _isLoading = true;
  bool _hasPermission = false;
  Map<String, bool> _notificationSettings = {};

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    setState(() => _isLoading = true);

    // Check notification permission
    final status = await Permission.notification.status;
    _hasPermission = status.isGranted;

    // Load notification settings
    _notificationSettings = await AquariumNotificationService.getNotificationSettings();

    setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notification Settings'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const LoadingView()
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Permission Status
                  _buildPermissionCard(),
                  
                  const SizedBox(height: 24),
                  
                  // Notification Types
                  Text(
                    'Notification Types',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  _buildNotificationToggle(
                    title: 'Maintenance Reminders',
                    subtitle: 'Get reminded when equipment maintenance is due',
                    icon: Icons.build,
                    settingKey: 'maintenance',
                  ),
                  
                  _buildNotificationToggle(
                    title: 'Feeding Reminders',
                    subtitle: 'Daily reminders to feed your fish',
                    icon: Icons.restaurant,
                    settingKey: 'feeding',
                  ),
                  
                  _buildNotificationToggle(
                    title: 'Water Testing Reminders',
                    subtitle: 'Regular reminders to test water parameters',
                    icon: Icons.science,
                    settingKey: 'parameters',
                  ),
                  
                  _buildNotificationToggle(
                    title: 'Health Alerts',
                    subtitle: 'Critical alerts about aquarium health issues',
                    icon: Icons.warning,
                    settingKey: 'health',
                  ),
                  
                  const SizedBox(height: 32),
                  
                  // Test Notification
                  _buildTestSection(),
                ],
              ),
            ),
    );
  }

  Widget _buildPermissionCard() {
    return Card(
      color: _hasPermission 
          ? AppTheme.successColor.withOpacity(0.1)
          : AppTheme.warningColor.withOpacity(0.1),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                Icon(
                  _hasPermission ? Icons.check_circle : Icons.warning,
                  color: _hasPermission ? AppTheme.successColor : AppTheme.warningColor,
                  size: 24,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _hasPermission 
                            ? 'Notifications Enabled'
                            : 'Notifications Disabled',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: _hasPermission 
                              ? AppTheme.successColor 
                              : AppTheme.warningColor,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _hasPermission
                            ? 'You will receive notifications from Verpa'
                            : 'Enable notifications to get important alerts',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (!_hasPermission) ...[
              const SizedBox(height: 16),
              CustomButton(
                text: 'Enable Notifications',
                icon: Icons.notifications_active,
                size: ButtonSize.small,
                onPressed: _requestPermission,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationToggle({
    required String title,
    required String subtitle,
    required IconData icon,
    required String settingKey,
  }) {
    final isEnabled = _notificationSettings[settingKey] ?? true;
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: SwitchListTile(
        secondary: Icon(
          icon,
          color: isEnabled ? AppTheme.primaryColor : Colors.grey,
        ),
        title: Text(title),
        subtitle: Text(
          subtitle,
          style: TextStyle(
            color: Colors.grey[600],
            fontSize: 14,
          ),
        ),
        value: isEnabled,
        onChanged: _hasPermission
            ? (value) async {
                await AquariumNotificationService.setNotificationEnabled(
                  settingKey,
                  value,
                );
                setState(() {
                  _notificationSettings[settingKey] = value;
                });
                
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      value 
                          ? '$title enabled'
                          : '$title disabled',
                    ),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              }
            : null,
        activeColor: AppTheme.primaryColor,
      ),
    );
  }

  Widget _buildTestSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.bug_report,
                  color: AppTheme.primaryColor,
                ),
                const SizedBox(width: 8),
                Text(
                  'Test Notifications',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Send a test notification to verify everything is working',
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 16),
            CustomButton(
              text: 'Send Test Notification',
              icon: Icons.send,
              variant: ButtonVariant.outline,
              size: ButtonSize.small,
              onPressed: _hasPermission ? _sendTestNotification : null,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _requestPermission() async {
    final status = await Permission.notification.request();
    
    if (status.isGranted) {
      setState(() {
        _hasPermission = true;
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Notifications enabled successfully'),
          backgroundColor: Colors.green,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } else if (status.isPermanentlyDenied) {
      // Show dialog to open settings
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Permission Required'),
          content: const Text(
            'Notifications are disabled. Please enable them in your device settings to receive important alerts about your aquariums.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                openAppSettings();
              },
              child: const Text('Open Settings'),
            ),
          ],
        ),
      );
    }
  }

  Future<void> _sendTestNotification() async {
    await NotificationService.showLocalNotification(
      title: 'Test Notification',
      body: 'This is a test notification from Verpa. Notifications are working correctly!',
      payload: 'test',
    );
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Test notification sent'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}