import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_provider.dart';
import '../../../core/localization/app_localizations.dart';
import '../../../core/localization/language_provider.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/services/biometric_service.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../../notifications/screens/notification_settings_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  String _appVersion = '';
  String _temperatureUnit = 'celsius';
  String _volumeUnit = 'liters';
  bool _enableAnalytics = true;
  bool _enableCrashReporting = true;

  @override
  void initState() {
    super.initState();
    _loadSettings();
    _loadAppInfo();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    
    setState(() {
      _temperatureUnit = prefs.getString('temperature_unit') ?? 'celsius';
      _volumeUnit = prefs.getString('volume_unit') ?? 'liters';
      _enableAnalytics = prefs.getBool('enable_analytics') ?? true;
      _enableCrashReporting = prefs.getBool('enable_crash_reporting') ?? true;
    });
  }

  Future<void> _loadAppInfo() async {
    final packageInfo = await PackageInfo.fromPlatform();
    setState(() {
      _appVersion = '${packageInfo.version} (${packageInfo.buildNumber})';
    });
  }

  @override
  Widget build(BuildContext context) {
    final authBloc = context.read<AuthBloc>();
    final user = (authBloc.state as AuthAuthenticated).user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // User Info Card
            Container(
              padding: const EdgeInsets.all(16),
              color: AppTheme.primaryColor.withOpacity(0.1),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: AppTheme.primaryColor,
                    child: Text(
                      user.name[0].toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user.name,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          user.email,
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.edit, color: AppTheme.primaryColor),
                    onPressed: () {
                      context.push('/dashboard/profile');
                    },
                  ),
                ],
              ),
            ),

            // Settings Sections
            _buildSection(
              title: 'Preferences',
              children: [
                _buildListTile(
                  title: 'Theme',
                  subtitle: _getThemeModeName(context),
                  icon: Icons.palette,
                  onTap: _showThemeDialog,
                ),
                _buildListTile(
                  title: 'Temperature Unit',
                  subtitle: _temperatureUnit == 'celsius' ? 'Celsius (°C)' : 'Fahrenheit (°F)',
                  icon: Icons.thermostat,
                  onTap: _showTemperatureUnitDialog,
                ),
                _buildListTile(
                  title: 'Volume Unit',
                  subtitle: _volumeUnit == 'liters' ? 'Liters' : 'Gallons',
                  icon: Icons.water_drop,
                  onTap: _showVolumeUnitDialog,
                ),
                _buildListTile(
                  title: 'Language',
                  subtitle: _getCurrentLanguageName(),
                  icon: Icons.language,
                  onTap: () {
                    context.push('/language-selection');
                  },
                ),
              ],
            ),

            _buildSection(
              title: 'Notifications',
              children: [
                _buildListTile(
                  title: 'Notification Settings',
                  subtitle: 'Manage notification preferences',
                  icon: Icons.notifications,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const NotificationSettingsScreen(),
                      ),
                    );
                  },
                ),
              ],
            ),

            _buildSection(
              title: 'Privacy & Data',
              children: [
                _buildSwitchTile(
                  title: 'Analytics',
                  subtitle: 'Help improve Verpa by sharing usage data',
                  icon: Icons.analytics,
                  value: _enableAnalytics,
                  onChanged: (value) => _updateSetting('enable_analytics', value),
                ),
                _buildSwitchTile(
                  title: 'Crash Reporting',
                  subtitle: 'Automatically report crashes',
                  icon: Icons.bug_report,
                  value: _enableCrashReporting,
                  onChanged: (value) => _updateSetting('enable_crash_reporting', value),
                ),
                _buildListTile(
                  title: 'Clear Cache',
                  subtitle: 'Free up storage space',
                  icon: Icons.delete_sweep,
                  onTap: _clearCache,
                ),
              ],
            ),

            _buildSection(
              title: 'Account',
              children: [
                FutureBuilder<bool>(
                  future: BiometricService.isBiometricAvailable(),
                  builder: (context, snapshot) {
                    if (snapshot.data == true) {
                      return FutureBuilder<bool>(
                        future: BiometricService.isBiometricEnabled(),
                        builder: (context, enabledSnapshot) {
                          final isEnabled = enabledSnapshot.data ?? false;
                          return _buildSwitchTile(
                            title: 'Biometric Authentication',
                            subtitle: 'Use fingerprint or face to unlock',
                            icon: Icons.fingerprint,
                            value: isEnabled,
                            onChanged: _toggleBiometric,
                          );
                        },
                      );
                    }
                    return const SizedBox.shrink();
                  },
                ),
                _buildListTile(
                  title: 'Change Password',
                  subtitle: 'Update your account password',
                  icon: Icons.lock,
                  onTap: () {
                    // TODO: Navigate to change password screen
                  },
                ),
                _buildListTile(
                  title: 'Backup & Restore',
                  subtitle: 'Manage your data backups',
                  icon: Icons.backup,
                  onTap: () {
                    context.push('/backup-restore');
                  },
                ),
                _buildListTile(
                  title: 'Delete Account',
                  subtitle: 'Permanently delete your account',
                  icon: Icons.delete_forever,
                  iconColor: AppTheme.errorColor,
                  textColor: AppTheme.errorColor,
                  onTap: _showDeleteAccountDialog,
                ),
              ],
            ),

            _buildSection(
              title: 'Collaboration',
              children: [
                _buildListTile(
                  title: 'Invitations',
                  subtitle: 'Manage collaboration invitations',
                  icon: Icons.mail,
                  onTap: () {
                    context.push('/invitations');
                  },
                ),
              ],
            ),

            _buildSection(
              title: 'Support',
              children: [
                _buildListTile(
                  title: 'Voice Commands',
                  subtitle: 'View voice assistant help and history',
                  icon: Icons.mic,
                  onTap: () {
                    context.push('/voice-history');
                  },
                ),
                _buildListTile(
                  title: 'Help Center',
                  subtitle: 'Get help and learn about features',
                  icon: Icons.help,
                  onTap: () {
                    // TODO: Open help center
                  },
                ),
                _buildListTile(
                  title: 'Contact Support',
                  subtitle: 'Get in touch with our team',
                  icon: Icons.mail,
                  onTap: () {
                    // TODO: Open contact form
                  },
                ),
                _buildListTile(
                  title: 'Privacy Policy',
                  subtitle: 'Learn how we protect your data',
                  icon: Icons.privacy_tip,
                  onTap: () {
                    // TODO: Open privacy policy
                  },
                ),
                _buildListTile(
                  title: 'Terms of Service',
                  subtitle: 'Read our terms and conditions',
                  icon: Icons.description,
                  onTap: () {
                    // TODO: Open terms of service
                  },
                ),
              ],
            ),

            _buildSection(
              title: 'About',
              children: [
                _buildListTile(
                  title: 'Version',
                  subtitle: _appVersion,
                  icon: Icons.info,
                  onTap: null,
                ),
                _buildListTile(
                  title: 'Licenses',
                  subtitle: 'Open source licenses',
                  icon: Icons.article,
                  onTap: () {
                    showLicensePage(
                      context: context,
                      applicationName: 'Verpa',
                      applicationVersion: _appVersion,
                      applicationIcon: const Padding(
                        padding: EdgeInsets.all(8),
                        child: CircleAvatar(
                          radius: 40,
                          backgroundColor: AppTheme.primaryColor,
                          child: Icon(
                            Icons.water,
                            size: 40,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),

            const SizedBox(height: 32),

            // Sign Out Button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: CustomButton(
                text: 'Sign Out',
                icon: Icons.logout,
                variant: ButtonVariant.outline,
                onPressed: _signOut,
              ),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildSection({
    required String title,
    required List<Widget> children,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
          child: Text(
            title,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppTheme.primaryColor,
            ),
          ),
        ),
        ...children,
      ],
    );
  }

  Widget _buildListTile({
    required String title,
    required String subtitle,
    required IconData icon,
    VoidCallback? onTap,
    Color? iconColor,
    Color? textColor,
  }) {
    return ListTile(
      leading: Icon(
        icon,
        color: iconColor ?? AppTheme.primaryColor,
      ),
      title: Text(
        title,
        style: TextStyle(
          color: textColor,
          fontWeight: FontWeight.w500,
        ),
      ),
      subtitle: Text(subtitle),
      trailing: onTap != null
          ? Icon(
              Icons.chevron_right,
              color: Colors.grey[400],
            )
          : null,
      onTap: onTap,
    );
  }

  Widget _buildSwitchTile({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return SwitchListTile(
      secondary: Icon(
        icon,
        color: AppTheme.primaryColor,
      ),
      title: Text(
        title,
        style: const TextStyle(fontWeight: FontWeight.w500),
      ),
      subtitle: Text(subtitle),
      value: value,
      onChanged: onChanged,
      activeColor: AppTheme.primaryColor,
    );
  }

  Future<void> _updateSetting(String key, dynamic value) async {
    final prefs = await SharedPreferences.getInstance();
    
    if (value is bool) {
      await prefs.setBool(key, value);
    } else if (value is String) {
      await prefs.setString(key, value);
    }
    
    setState(() {
      switch (key) {
        case 'temperature_unit':
          _temperatureUnit = value as String;
          break;
        case 'volume_unit':
          _volumeUnit = value as String;
          break;
        case 'enable_analytics':
          _enableAnalytics = value as bool;
          break;
        case 'enable_crash_reporting':
          _enableCrashReporting = value as bool;
          break;
      }
    });
  }

  void _showTemperatureUnitDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Temperature Unit'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            RadioListTile<String>(
              title: const Text('Celsius (°C)'),
              value: 'celsius',
              groupValue: _temperatureUnit,
              onChanged: (value) {
                Navigator.pop(context);
                _updateSetting('temperature_unit', value!);
              },
            ),
            RadioListTile<String>(
              title: const Text('Fahrenheit (°F)'),
              value: 'fahrenheit',
              groupValue: _temperatureUnit,
              onChanged: (value) {
                Navigator.pop(context);
                _updateSetting('temperature_unit', value!);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showVolumeUnitDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Volume Unit'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            RadioListTile<String>(
              title: const Text('Liters'),
              value: 'liters',
              groupValue: _volumeUnit,
              onChanged: (value) {
                Navigator.pop(context);
                _updateSetting('volume_unit', value!);
              },
            ),
            RadioListTile<String>(
              title: const Text('Gallons'),
              value: 'gallons',
              groupValue: _volumeUnit,
              onChanged: (value) {
                Navigator.pop(context);
                _updateSetting('volume_unit', value!);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _clearCache() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear Cache'),
        content: const Text(
          'This will delete all cached data. Your aquarium data will not be affected.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Clear'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      // TODO: Implement cache clearing
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Cache cleared successfully'),
          backgroundColor: AppTheme.successColor,
        ),
      );
    }
  }

  Future<void> _exportData() async {
    // TODO: Implement data export
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Data export started. You will receive an email when ready.'),
      ),
    );
  }

  void _showDeleteAccountDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Account'),
        content: const Text(
          'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              // TODO: Implement account deletion
            },
            style: TextButton.styleFrom(
              foregroundColor: AppTheme.errorColor,
            ),
            child: const Text('Delete Account'),
          ),
        ],
      ),
    );
  }

  void _signOut() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<AuthBloc>().add(AuthLogoutRequested());
              context.go('/login');
            },
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }

  String _getCurrentLanguageName() {
    final languageProvider = Provider.of<LanguageProvider>(context);
    return AppLocales.getLanguageName(languageProvider.currentLocale.languageCode);
  }

  String _getThemeModeName(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);
    switch (themeProvider.themeMode) {
      case ThemeMode.light:
        return 'Light';
      case ThemeMode.dark:
        return 'Dark';
      case ThemeMode.system:
        return 'System Default';
    }
  }

  void _showThemeDialog() {
    final themeProvider = Provider.of<ThemeProvider>(context, listen: false);
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Choose Theme'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            RadioListTile<ThemeMode>(
              title: const Text('Light'),
              subtitle: const Text('Always use light theme'),
              value: ThemeMode.light,
              groupValue: themeProvider.themeMode,
              onChanged: (value) {
                Navigator.pop(context);
                if (value != null) {
                  themeProvider.setThemeMode(value);
                }
              },
            ),
            RadioListTile<ThemeMode>(
              title: const Text('Dark'),
              subtitle: const Text('Always use dark theme'),
              value: ThemeMode.dark,
              groupValue: themeProvider.themeMode,
              onChanged: (value) {
                Navigator.pop(context);
                if (value != null) {
                  themeProvider.setThemeMode(value);
                }
              },
            ),
            RadioListTile<ThemeMode>(
              title: const Text('System Default'),
              subtitle: const Text('Follow system theme'),
              value: ThemeMode.system,
              groupValue: themeProvider.themeMode,
              onChanged: (value) {
                Navigator.pop(context);
                if (value != null) {
                  themeProvider.setThemeMode(value);
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _toggleBiometric(bool enable) async {
    if (enable) {
      final success = await BiometricService.enableBiometric();
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Biometric authentication enabled'),
            backgroundColor: AppTheme.successColor,
          ),
        );
        setState(() {}); // Refresh the UI
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Failed to enable biometric authentication'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } else {
      final success = await BiometricService.disableBiometric();
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Biometric authentication disabled'),
            backgroundColor: AppTheme.successColor,
          ),
        );
        setState(() {}); // Refresh the UI
      }
    }
  }
}