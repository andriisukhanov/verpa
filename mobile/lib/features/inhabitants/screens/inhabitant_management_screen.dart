import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/loading_view.dart';
import '../../../shared/widgets/error_view.dart';
import '../../aquarium/bloc/aquarium_bloc.dart';
import '../../aquarium/models/aquarium_model.dart';

class InhabitantManagementScreen extends StatefulWidget {
  final String aquariumId;

  const InhabitantManagementScreen({
    super.key,
    required this.aquariumId,
  });

  @override
  State<InhabitantManagementScreen> createState() => _InhabitantManagementScreenState();
}

class _InhabitantManagementScreenState extends State<InhabitantManagementScreen> {
  String _searchQuery = '';
  HealthStatus? _filterStatus;
  String _sortBy = 'name';

  @override
  void initState() {
    super.initState();
    _loadAquarium();
  }

  void _loadAquarium() {
    context.read<AquariumBloc>().add(
      AquariumDetailRequested(aquariumId: widget.aquariumId),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Inhabitant Management'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.sort),
            onPressed: _showSortOptions,
          ),
          IconButton(
            icon: const Icon(Icons.filter_alt),
            onPressed: _showFilterOptions,
          ),
        ],
      ),
      body: BlocBuilder<AquariumBloc, AquariumState>(
        builder: (context, state) {
          if (state is AquariumLoading || state is AquariumsLoading) {
            return const LoadingView();
          }

          if (state is AquariumError) {
            return ErrorView(
              message: state.message,
              onRetry: _loadAquarium,
            );
          }

          if (state is AquariumLoaded) {
            return _buildContent(state.aquarium);
          }

          if (state is AquariumsLoaded) {
            final aquarium = state.aquariums.firstWhere(
              (a) => a.id == widget.aquariumId,
              orElse: () => throw Exception('Aquarium not found'),
            );
            return _buildContent(aquarium);
          }

          return const SizedBox.shrink();
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          context.push('/add-inhabitant/${widget.aquariumId}');
        },
        backgroundColor: AppTheme.primaryColor,
        icon: const Icon(Icons.add),
        label: const Text('Add Inhabitant'),
      ),
    );
  }

  Widget _buildContent(Aquarium aquarium) {
    if (aquarium.inhabitants.isEmpty) {
      return _buildEmptyState();
    }

    final filteredInhabitants = _filterAndSortInhabitants(aquarium.inhabitants);

    return Column(
      children: [
        // Search Bar
        Container(
          padding: const EdgeInsets.all(16),
          child: TextField(
            decoration: InputDecoration(
              hintText: 'Search inhabitants...',
              prefixIcon: const Icon(Icons.search),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              filled: true,
              fillColor: Colors.grey[100],
            ),
            onChanged: (value) {
              setState(() {
                _searchQuery = value;
              });
            },
          ),
        ),
        
        // Stats Summary
        _buildStatsSummary(aquarium.inhabitants),
        
        // Inhabitants List
        Expanded(
          child: RefreshIndicator(
            onRefresh: () async => _loadAquarium(),
            child: filteredInhabitants.isEmpty
                ? _buildNoResultsState()
                : ListView.builder(
                    padding: const EdgeInsets.only(
                      left: 16,
                      right: 16,
                      bottom: 80,
                    ),
                    itemCount: filteredInhabitants.length,
                    itemBuilder: (context, index) {
                      final inhabitant = filteredInhabitants[index];
                      return _buildInhabitantCard(inhabitant);
                    },
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.pets,
              size: 80,
              color: AppTheme.greyColor,
            ),
            const SizedBox(height: 24),
            Text(
              'No Inhabitants Yet',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: AppTheme.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Start adding fish, corals, or plants to track their health and care',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppTheme.textSecondary,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 32),
            CustomButton(
              text: 'Add First Inhabitant',
              icon: Icons.add,
              onPressed: () {
                context.push('/add-inhabitant/${widget.aquariumId}');
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNoResultsState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.search_off,
            size: 64,
            color: AppTheme.greyColor,
          ),
          const SizedBox(height: 16),
          Text(
            'No inhabitants found',
            style: TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsSummary(List<Inhabitant> inhabitants) {
    final healthStats = _calculateHealthStats(inhabitants);
    final speciesCount = inhabitants.map((i) => i.species).toSet().length;
    final totalCount = inhabitants.fold<int>(0, (sum, i) => sum + i.quantity);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildStatItem(
            icon: Icons.pets,
            label: 'Total',
            value: totalCount.toString(),
          ),
          _buildStatItem(
            icon: Icons.category,
            label: 'Species',
            value: speciesCount.toString(),
          ),
          _buildStatItem(
            icon: Icons.favorite,
            label: 'Healthy',
            value: healthStats['healthy'].toString(),
            color: HealthStatus.healthy.color,
          ),
          if (healthStats['sick']! > 0)
            _buildStatItem(
              icon: Icons.sick,
              label: 'Sick',
              value: healthStats['sick'].toString(),
              color: HealthStatus.sick.color,
            ),
        ],
      ),
    );
  }

  Widget _buildStatItem({
    required IconData icon,
    required String label,
    required String value,
    Color? color,
  }) {
    return Column(
      children: [
        Icon(
          icon,
          color: color ?? AppTheme.primaryColor,
          size: 24,
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
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

  Widget _buildInhabitantCard(Inhabitant inhabitant) {
    final dateFormatter = DateFormat('MMM d, yyyy');

    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 16),
      child: InkWell(
        onTap: () {
          _showInhabitantDetails(inhabitant);
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Image
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  color: Colors.grey[200],
                ),
                child: inhabitant.imageUrl != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: CachedNetworkImage(
                          imageUrl: inhabitant.imageUrl!,
                          fit: BoxFit.cover,
                          placeholder: (context, url) => Center(
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                          errorWidget: (context, url, error) => Icon(
                            Icons.pets,
                            color: Colors.grey[400],
                            size: 32,
                          ),
                        ),
                      )
                    : Icon(
                        Icons.pets,
                        color: Colors.grey[400],
                        size: 32,
                      ),
              ),
              const SizedBox(width: 16),
              
              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            inhabitant.name,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        _buildHealthStatusChip(inhabitant.healthStatus),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      inhabitant.species,
                      style: TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 14,
                      ),
                    ),
                    if (inhabitant.scientificName != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        inhabitant.scientificName!,
                        style: TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 12,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(
                          Icons.numbers,
                          size: 16,
                          color: AppTheme.textSecondary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Qty: ${inhabitant.quantity}',
                          style: TextStyle(
                            color: AppTheme.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Icon(
                          Icons.calendar_today,
                          size: 16,
                          color: AppTheme.textSecondary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Added: ${dateFormatter.format(inhabitant.addedDate)}',
                          style: TextStyle(
                            color: AppTheme.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              
              // Actions
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert),
                onSelected: (value) {
                  switch (value) {
                    case 'edit':
                      context.push('/add-inhabitant/${widget.aquariumId}', 
                        extra: inhabitant,
                      );
                      break;
                    case 'health':
                      _showHealthStatusDialog(inhabitant);
                      break;
                    case 'delete':
                      _confirmDelete(inhabitant);
                      break;
                  }
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(
                    value: 'edit',
                    child: Row(
                      children: [
                        Icon(Icons.edit, size: 20),
                        SizedBox(width: 8),
                        Text('Edit'),
                      ],
                    ),
                  ),
                  const PopupMenuItem(
                    value: 'health',
                    child: Row(
                      children: [
                        Icon(Icons.favorite, size: 20),
                        SizedBox(width: 8),
                        Text('Update Health'),
                      ],
                    ),
                  ),
                  const PopupMenuItem(
                    value: 'delete',
                    child: Row(
                      children: [
                        Icon(Icons.delete, size: 20, color: Colors.red),
                        SizedBox(width: 8),
                        Text('Delete', style: TextStyle(color: Colors.red)),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHealthStatusChip(HealthStatus status) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: status.color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: status.color.withOpacity(0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            status.icon,
            size: 14,
            color: status.color,
          ),
          const SizedBox(width: 4),
          Text(
            status.displayName,
            style: TextStyle(
              color: status.color,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  List<Inhabitant> _filterAndSortInhabitants(List<Inhabitant> inhabitants) {
    var filtered = inhabitants;

    // Apply search filter
    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((inhabitant) {
        final query = _searchQuery.toLowerCase();
        return inhabitant.name.toLowerCase().contains(query) ||
               inhabitant.species.toLowerCase().contains(query) ||
               (inhabitant.scientificName?.toLowerCase().contains(query) ?? false);
      }).toList();
    }

    // Apply health status filter
    if (_filterStatus != null) {
      filtered = filtered.where((i) => i.healthStatus == _filterStatus).toList();
    }

    // Apply sorting
    switch (_sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.compareTo(b.name));
        break;
      case 'species':
        filtered.sort((a, b) => a.species.compareTo(b.species));
        break;
      case 'date':
        filtered.sort((a, b) => b.addedDate.compareTo(a.addedDate));
        break;
      case 'health':
        filtered.sort((a, b) => a.healthStatus.index.compareTo(b.healthStatus.index));
        break;
    }

    return filtered;
  }

  Map<String, int> _calculateHealthStats(List<Inhabitant> inhabitants) {
    final stats = {
      'healthy': 0,
      'sick': 0,
      'recovering': 0,
      'deceased': 0,
    };

    for (final inhabitant in inhabitants) {
      switch (inhabitant.healthStatus) {
        case HealthStatus.healthy:
          stats['healthy'] = stats['healthy']! + inhabitant.quantity;
          break;
        case HealthStatus.sick:
          stats['sick'] = stats['sick']! + inhabitant.quantity;
          break;
        case HealthStatus.recovering:
          stats['recovering'] = stats['recovering']! + inhabitant.quantity;
          break;
        case HealthStatus.deceased:
          stats['deceased'] = stats['deceased']! + inhabitant.quantity;
          break;
      }
    }

    return stats;
  }

  void _showSortOptions() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Sort by',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ...[
              {'value': 'name', 'label': 'Name'},
              {'value': 'species', 'label': 'Species'},
              {'value': 'date', 'label': 'Date Added'},
              {'value': 'health', 'label': 'Health Status'},
            ].map((option) => ListTile(
              title: Text(option['label']!),
              trailing: _sortBy == option['value']
                  ? Icon(Icons.check, color: AppTheme.primaryColor)
                  : null,
              onTap: () {
                setState(() {
                  _sortBy = option['value']!;
                });
                Navigator.pop(context);
              },
            )),
          ],
        ),
      ),
    );
  }

  void _showFilterOptions() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Filter by Health Status',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ListTile(
              title: const Text('All'),
              trailing: _filterStatus == null
                  ? Icon(Icons.check, color: AppTheme.primaryColor)
                  : null,
              onTap: () {
                setState(() {
                  _filterStatus = null;
                });
                Navigator.pop(context);
              },
            ),
            ...HealthStatus.values.map((status) => ListTile(
              leading: Icon(status.icon, color: status.color),
              title: Text(status.displayName),
              trailing: _filterStatus == status
                  ? Icon(Icons.check, color: AppTheme.primaryColor)
                  : null,
              onTap: () {
                setState(() {
                  _filterStatus = status;
                });
                Navigator.pop(context);
              },
            )),
          ],
        ),
      ),
    );
  }

  void _showInhabitantDetails(Inhabitant inhabitant) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _InhabitantDetailsSheet(
        inhabitant: inhabitant,
        onEdit: () {
          Navigator.pop(context);
          context.push('/add-inhabitant/${widget.aquariumId}', 
            extra: inhabitant,
          );
        },
        onDelete: () {
          Navigator.pop(context);
          _confirmDelete(inhabitant);
        },
        onUpdateHealth: () {
          Navigator.pop(context);
          _showHealthStatusDialog(inhabitant);
        },
      ),
    );
  }

  void _showHealthStatusDialog(Inhabitant inhabitant) {
    HealthStatus selectedStatus = inhabitant.healthStatus;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Update Health Status for ${inhabitant.name}'),
        content: StatefulBuilder(
          builder: (context, setState) => Column(
            mainAxisSize: MainAxisSize.min,
            children: HealthStatus.values.map((status) {
              return RadioListTile<HealthStatus>(
                title: Text(status.displayName),
                secondary: Icon(status.icon, color: status.color),
                value: status,
                groupValue: selectedStatus,
                onChanged: (value) {
                  setState(() {
                    selectedStatus = value!;
                  });
                },
              );
            }).toList(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              final updatedInhabitant = inhabitant.copyWith(
                healthStatus: selectedStatus,
              );
              context.read<AquariumBloc>().add(
                AquariumInhabitantUpdateRequested(
                  aquariumId: widget.aquariumId,
                  inhabitant: updatedInhabitant,
                ),
              );
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(Inhabitant inhabitant) {
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
}

class _InhabitantDetailsSheet extends StatelessWidget {
  final Inhabitant inhabitant;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onUpdateHealth;

  const _InhabitantDetailsSheet({
    required this.inhabitant,
    required this.onEdit,
    required this.onDelete,
    required this.onUpdateHealth,
  });

  @override
  Widget build(BuildContext context) {
    final dateFormatter = DateFormat('MMMM d, yyyy');

    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(20),
          topRight: Radius.circular(20),
        ),
      ),
      child: Column(
        children: [
          // Handle
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          
          // Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Image and Name
                  Row(
                    children: [
                      Container(
                        width: 100,
                        height: 100,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          color: Colors.grey[200],
                        ),
                        child: inhabitant.imageUrl != null
                            ? ClipRRect(
                                borderRadius: BorderRadius.circular(16),
                                child: CachedNetworkImage(
                                  imageUrl: inhabitant.imageUrl!,
                                  fit: BoxFit.cover,
                                  placeholder: (context, url) => Center(
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: AppTheme.primaryColor,
                                    ),
                                  ),
                                  errorWidget: (context, url, error) => Icon(
                                    Icons.pets,
                                    color: Colors.grey[400],
                                    size: 40,
                                  ),
                                ),
                              )
                            : Icon(
                                Icons.pets,
                                color: Colors.grey[400],
                                size: 40,
                              ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              inhabitant.name,
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              inhabitant.species,
                              style: TextStyle(
                                fontSize: 16,
                                color: AppTheme.textSecondary,
                              ),
                            ),
                            if (inhabitant.scientificName != null) ...[
                              const SizedBox(height: 2),
                              Text(
                                inhabitant.scientificName!,
                                style: TextStyle(
                                  fontSize: 14,
                                  color: AppTheme.textSecondary,
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Health Status
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: inhabitant.healthStatus.color.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: inhabitant.healthStatus.color.withOpacity(0.3),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          inhabitant.healthStatus.icon,
                          color: inhabitant.healthStatus.color,
                          size: 32,
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Health Status',
                                style: TextStyle(
                                  color: AppTheme.textSecondary,
                                  fontSize: 14,
                                ),
                              ),
                              Text(
                                inhabitant.healthStatus.displayName,
                                style: TextStyle(
                                  color: inhabitant.healthStatus.color,
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                        TextButton(
                          onPressed: onUpdateHealth,
                          child: const Text('Update'),
                        ),
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Details
                  _buildDetailSection(
                    title: 'Details',
                    children: [
                      _buildDetailRow('Quantity', inhabitant.quantity.toString()),
                      _buildDetailRow(
                        'Added to Aquarium',
                        dateFormatter.format(inhabitant.addedDate),
                      ),
                      _buildDetailRow(
                        'Days in Tank',
                        '${DateTime.now().difference(inhabitant.addedDate).inDays} days',
                      ),
                    ],
                  ),
                  
                  if (inhabitant.notes != null) ...[
                    const SizedBox(height: 24),
                    _buildDetailSection(
                      title: 'Notes',
                      children: [
                        Text(
                          inhabitant.notes!,
                          style: TextStyle(
                            color: AppTheme.textSecondary,
                            fontSize: 14,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
          
          // Actions
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -5),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: CustomButton(
                    text: 'Edit',
                    icon: Icons.edit,
                    variant: ButtonVariant.outline,
                    onPressed: onEdit,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: CustomButton(
                    text: 'Delete',
                    icon: Icons.delete,
                    variant: ButtonVariant.outline,
                    onPressed: onDelete,
                    foregroundColor: AppTheme.errorColor,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailSection({
    required String title,
    required List<Widget> children,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        ...children,
      ],
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
            style: TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 14,
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
      ),
    );
  }
}