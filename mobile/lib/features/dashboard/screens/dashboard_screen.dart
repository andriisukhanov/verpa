import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../auth/bloc/auth_bloc.dart';
import '../../aquarium/bloc/aquarium_bloc.dart';
import '../../aquarium/models/aquarium_model.dart';
import '../../voice_assistant/widgets/voice_assistant_button.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const DashboardHomeTab(),
    const AquariumsTab(),
    const MonitoringTab(),
    const ProfileTab(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        type: BottomNavigationBarType.fixed,
        selectedItemColor: AppTheme.primaryColor,
        unselectedItemColor: AppTheme.greyColor,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.waves),
            label: 'Aquariums',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.analytics),
            label: 'Monitor',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

class DashboardHomeTab extends StatelessWidget {
  const DashboardHomeTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.groups),
            onPressed: () {
              context.push('/community');
            },
          ),
          IconButton(
            icon: const Icon(Icons.notifications),
            onPressed: () {
              // TODO: Show notifications
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Welcome Card
            BlocBuilder<AuthBloc, AuthState>(
              builder: (context, state) {
                if (state is AuthAuthenticated) {
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 24,
                            backgroundColor: AppTheme.primaryColor,
                            child: Text(
                              state.user.firstName.isNotEmpty 
                                ? state.user.firstName[0].toUpperCase()
                                : 'U',
                              style: const TextStyle(
                                color: Colors.white,
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
                                  'Welcome back,',
                                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: AppTheme.textSecondary,
                                  ),
                                ),
                                Text(
                                  '${state.user.firstName} ${state.user.lastName}',
                                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                    fontWeight: FontWeight.w600,
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
                return const SizedBox.shrink();
              },
            ),
            
            const SizedBox(height: 24),
            
            // Quick Stats
            Text(
              'Quick Overview',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            
            const SizedBox(height: 16),
            
            Row(
              children: [
                Expanded(
                  child: _buildStatCard(
                    context,
                    'Aquariums',
                    '0',
                    Icons.waves,
                    AppTheme.primaryColor,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatCard(
                    context,
                    'Fish',
                    '0',
                    Icons.pets,
                    AppTheme.secondaryColor,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 12),
            
            Row(
              children: [
                Expanded(
                  child: _buildStatCard(
                    context,
                    'Alerts',
                    '0',
                    Icons.warning,
                    AppTheme.warningColor,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatCard(
                    context,
                    'Health Score',
                    '100%',
                    Icons.favorite,
                    AppTheme.successColor,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 32),
            
            // Quick Actions
            Text(
              'Quick Actions',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            
            const SizedBox(height: 16),
            
            CustomButton(
              text: 'Add Your First Aquarium',
              icon: Icons.add,
              onPressed: () {
                context.go('/dashboard/add-aquarium');
              },
            ),
            
            const SizedBox(height: 12),
            
            CustomButton(
              text: 'Record Water Parameters',
              icon: Icons.science,
              variant: ButtonVariant.outline,
              onPressed: () {
                // TODO: Navigate to water parameters screen
              },
            ),
            
            const SizedBox(height: 12),
            
            CustomButton(
              text: 'Fish Disease Guide',
              icon: Icons.biotech,
              variant: ButtonVariant.outline,
              onPressed: () {
                context.push('/disease-guide');
              },
            ),
            
            const SizedBox(height: 12),
            
            CustomButton(
              text: 'Scan Product Barcode',
              icon: Icons.qr_code_scanner,
              variant: ButtonVariant.outline,
              onPressed: () {
                context.push('/barcode-scanner');
              },
            ),
            
            const SizedBox(height: 32),
            
            // Recent Activity (placeholder)
            Text(
              'Recent Activity',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            
            const SizedBox(height: 16),
            
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Icon(
                      Icons.inbox,
                      size: 48,
                      color: AppTheme.greyColor,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No recent activity',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppTheme.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Start by adding your first aquarium to see activity here.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppTheme.textSecondary,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: const VoiceAssistantButton(),
    );
  }

  Widget _buildStatCard(
    BuildContext context,
    String title,
    String value,
    IconData icon,
    Color color,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Icon(
                  icon,
                  color: color,
                  size: 24,
                ),
                Text(
                  value,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Aquariums Tab with BLoC integration
class AquariumsTab extends StatefulWidget {
  const AquariumsTab({super.key});

  @override
  State<AquariumsTab> createState() => _AquariumsTabState();
}

class _AquariumsTabState extends State<AquariumsTab> {
  @override
  void initState() {
    super.initState();
    // Load aquariums when tab is created
    context.read<AquariumBloc>().add(AquariumsLoadRequested());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Aquariums'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.go('/dashboard/add-aquarium'),
          ),
        ],
      ),
      body: BlocBuilder<AquariumBloc, AquariumState>(
        builder: (context, state) {
          if (state is AquariumsLoading) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          } else if (state is AquariumError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 64,
                    color: AppTheme.errorColor,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Error loading aquariums',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    state.message,
                    style: TextStyle(color: AppTheme.textSecondary),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  CustomButton(
                    text: 'Retry',
                    icon: Icons.refresh,
                    onPressed: () {
                      context.read<AquariumBloc>().add(AquariumsLoadRequested());
                    },
                    fullWidth: false,
                  ),
                ],
              ),
            );
          } else if (state is AquariumEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.waves,
                    size: 80,
                    color: AppTheme.greyColor,
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'No Aquariums Yet',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    state.message,
                    style: TextStyle(color: AppTheme.textSecondary),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32),
                  CustomButton(
                    text: 'Add Your First Aquarium',
                    icon: Icons.add,
                    onPressed: () => context.go('/dashboard/add-aquarium'),
                    fullWidth: false,
                  ),
                ],
              ),
            );
          } else if (state is AquariumsLoaded) {
            return RefreshIndicator(
              onRefresh: () async {
                context.read<AquariumBloc>().add(AquariumRefreshRequested());
              },
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: state.aquariums.length,
                itemBuilder: (context, index) {
                  final aquarium = state.aquariums[index];
                  return _buildAquariumCard(context, aquarium);
                },
              ),
            );
          }
          
          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildAquariumCard(BuildContext context, Aquarium aquarium) {
    final healthColor = _getHealthColor(aquarium.healthScore);
    
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: InkWell(
        onTap: () {
          context.read<AquariumBloc>().add(AquariumSelected(aquarium: aquarium));
          context.go('/dashboard/aquarium/${aquarium.id}');
        },
        borderRadius: BorderRadius.circular(12),
        child: Column(
          children: [
            // Image Section
            if (aquarium.imageUrl != null)
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                child: CachedNetworkImage(
                  imageUrl: aquarium.imageUrl!,
                  height: 150,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  placeholder: (context, url) => Container(
                    height: 150,
                    color: AppTheme.lightGreyColor,
                    child: const Center(
                      child: CircularProgressIndicator(),
                    ),
                  ),
                  errorWidget: (context, url, error) => Container(
                    height: 150,
                    color: AppTheme.primaryColor.withOpacity(0.1),
                    child: Icon(
                      Icons.waves,
                      size: 48,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                ),
              )
            else
              Container(
                height: 150,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withOpacity(0.1),
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                ),
                child: Icon(
                  Icons.waves,
                  size: 48,
                  color: AppTheme.primaryColor,
                ),
              ),
            
            // Content Section
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          aquarium.name,
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: healthColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: healthColor.withOpacity(0.3)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.favorite,
                              size: 16,
                              color: healthColor,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '${aquarium.healthScore.toInt()}%',
                              style: TextStyle(
                                color: healthColor,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 8),
                  
                  // Info Row
                  Row(
                    children: [
                      _buildInfoChip(
                        Icons.category,
                        aquarium.type.displayName,
                        AppTheme.primaryColor,
                      ),
                      const SizedBox(width: 8),
                      _buildInfoChip(
                        Icons.water,
                        '${aquarium.volume} ${aquarium.volumeUnit}',
                        AppTheme.secondaryColor,
                      ),
                      if (aquarium.location != null) ...[
                        const SizedBox(width: 8),
                        _buildInfoChip(
                          Icons.location_on,
                          aquarium.location!,
                          AppTheme.greyColor,
                        ),
                      ],
                    ],
                  ),
                  
                  const SizedBox(height: 12),
                  
                  // Stats Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildStatItem(
                        Icons.pets,
                        aquarium.inhabitants.length.toString(),
                        'Fish',
                      ),
                      _buildStatItem(
                        Icons.settings,
                        aquarium.equipment.length.toString(),
                        'Equipment',
                      ),
                      if (aquarium.alerts.isNotEmpty)
                        _buildStatItem(
                          Icons.warning,
                          aquarium.alerts.length.toString(),
                          'Alerts',
                          color: AppTheme.warningColor,
                        )
                      else
                        _buildStatItem(
                          Icons.check_circle,
                          'OK',
                          'Status',
                          color: AppTheme.successColor,
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoChip(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(IconData icon, String value, String label, {Color? color}) {
    return Column(
      children: [
        Icon(
          icon,
          size: 20,
          color: color ?? AppTheme.textSecondary,
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: AppTheme.textSecondary,
          ),
        ),
      ],
    );
  }

  Color _getHealthColor(double score) {
    if (score >= 80) return AppTheme.excellentColor;
    if (score >= 60) return AppTheme.goodColor;
    if (score >= 40) return AppTheme.fairColor;
    if (score >= 20) return AppTheme.poorColor;
    return AppTheme.criticalColor;
  }
}

class MonitoringTab extends StatelessWidget {
  const MonitoringTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Monitoring'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: const Center(
        child: Text('Monitoring Tab - Coming Soon'),
      ),
    );
  }
}

class ProfileTab extends StatelessWidget {
  const ProfileTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: BlocBuilder<AuthBloc, AuthState>(
        builder: (context, state) {
          if (state is AuthAuthenticated) {
            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  // Profile Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          CircleAvatar(
                            radius: 40,
                            backgroundColor: AppTheme.primaryColor,
                            child: Text(
                              state.user.firstName.isNotEmpty 
                                ? state.user.firstName[0].toUpperCase()
                                : 'U',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 32,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            '${state.user.firstName} ${state.user.lastName}',
                            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            state.user.email,
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Logout Button
                  CustomButton(
                    text: 'Logout',
                    icon: Icons.logout,
                    variant: ButtonVariant.outline,
                    onPressed: () {
                      context.read<AuthBloc>().add(AuthLogoutRequested());
                    },
                  ),
                ],
              ),
            );
          }
          
          return const Center(
            child: CircularProgressIndicator(),
          );
        },
      ),
    );
  }
}